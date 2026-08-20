using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Application.Notifications;
using PIA.Application.Options;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Domain.Services;
using PIA.Infrastructure.Persistence;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Live face enrollment - deliberately separate from the static approved profile photo. Reuses
/// AttendanceChallengeSession with EventType=null to mean "enrollment session", avoiding a
/// duplicate table for what is structurally the same issue/consume/expire lifecycle.
/// </summary>
public sealed class FaceEnrollmentService(
    PiaDbContext db,
    ICurrentUser currentUser,
    ICorrelationContext correlation,
    IFileStorage fileStorage,
    IAuditLogger auditLogger,
    INotificationService notifications,
    IClock clock,
    IChallengeGenerator challengeGenerator,
    IFaceVerificationProvider faceProvider,
    IOptions<AttendanceOptions> attendanceOptions,
    IOptions<FaceOptions> faceOptions) : IFaceEnrollmentService
{
    public async Task RevokeAsync(int internProfileId, string reason, CancellationToken ct)
    {
        var profile = await db.InternProfiles.FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);

        var activeTemplates = await db.FaceTemplates
            .Where(t => t.InternProfileId == internProfileId && t.IsActive)
            .ToListAsync(ct);

        var now = clock.UtcNow;
        foreach (var template in activeTemplates)
        {
            template.IsActive = false;
            template.RevokedAtUtc = now;
            template.RevokedReason = reason;
        }

        profile.FaceEnrollmentStatus = FaceEnrollmentStatus.Revoked;
        await db.SaveChangesAsync(ct);

        await auditLogger.LogAsync("Biometric.Erased", nameof(InternProfile), internProfileId.ToString(), null, ct);

        await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.BiometricErased,
            new Dictionary<string, object?> { ["reason"] = reason }, ct);
    }

    public async Task<EnrollmentSessionResponse> CreateSessionAsync(CreateEnrollmentSessionRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileAsync(ct);

        if (profile.ProfilePhotoStatus != ProfilePhotoStatus.Approved || profile.ApprovedPhotoFileId is null)
        {
            throw new BusinessRuleException(BusinessRuleCodes.NoApprovedPhoto, "You need an approved profile photo before enrolling your face.");
        }

        var challenge = challengeGenerator.Generate();
        var now = clock.UtcNow;
        var session = new AttendanceChallengeSession
        {
            Id = Guid.NewGuid(),
            InternProfileId = profile.Id,
            UserId = currentUser.UserId,
            EventType = null, // null EventType marks this as an enrollment session, not an attendance one.
            DatePk = clock.TodayInPakistan,
            Nonce = RandomNumberGenerator.GetBytes(32),
            ChallengeJson = JsonSerializer.Serialize(challenge),
            JwtJti = string.IsNullOrEmpty(currentUser.Jti) ? Guid.NewGuid().ToString("N") : currentUser.Jti,
            DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "unknown" : request.DeviceId,
            State = ChallengeSessionState.Issued,
            IssuedAtUtc = now,
            ExpiresAtUtc = now.AddSeconds(attendanceOptions.Value.SessionTtlSeconds * 2), // enrollment is unhurried, more steps than attendance
            ClientIp = correlation.IpAddress,
            UserAgent = correlation.UserAgent,
        };
        db.AttendanceChallengeSessions.Add(session);
        await db.SaveChangesAsync(ct);

        return new EnrollmentSessionResponse(session.Id, session.ExpiresAtUtc, challenge);
    }

    public async Task<EnrollmentResult> SubmitAsync(Guid sessionId, SubmitEnrollmentRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileAsync(ct);

        if (!request.ConsentAcknowledged)
        {
            throw new BusinessRuleException("CONSENT_REQUIRED", "You must acknowledge the face enrollment consent notice to continue.");
        }

        var consumed = await db.AttendanceChallengeSessions
            .Where(s => s.Id == sessionId && s.InternProfileId == profile.Id && s.EventType == null && s.State == ChallengeSessionState.Issued)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.State, ChallengeSessionState.Submitted)
                .SetProperty(s => s.SubmittedAtUtc, clock.UtcNow), ct);

        if (consumed == 0)
        {
            throw new BusinessRuleException(BusinessRuleCodes.SessionAlreadyConsumed, "This enrollment session has already been used or has expired.");
        }

        var session = await db.AttendanceChallengeSessions.FirstAsync(s => s.Id == sessionId, ct);
        if (session.ExpiresAtUtc < clock.UtcNow)
        {
            session.State = ChallengeSessionState.Expired;
            await db.SaveChangesAsync(ct);
            throw new BusinessRuleException(BusinessRuleCodes.ChallengeExpired, "This enrollment session expired. Please start again.");
        }

        await auditLogger.LogAsync("FaceEnrollment.ConsentGiven", nameof(InternProfile), profile.Id.ToString(), null, ct);

        if (!faceProvider.IsConfigured)
        {
            session.State = ChallengeSessionState.SoftFailed;
            await db.SaveChangesAsync(ct);
            return new EnrollmentResult(false, "NotConfigured", "Face verification is not configured on this server yet.", null);
        }

        var isRefresh = await db.FaceTemplates.AnyAsync(t => t.InternProfileId == profile.Id, ct);
        if (isRefresh)
        {
            var lastEnrollment = await db.FaceTemplates.Where(t => t.InternProfileId == profile.Id)
                .OrderByDescending(t => t.CreatedAtUtc).FirstAsync(ct);
            var cooldownEnds = lastEnrollment.CreatedAtUtc.AddDays(faceOptions.Value.EnrollmentRefreshCooldownDays);
            if (clock.UtcNow < cooldownEnds)
            {
                await HardFailAsync(session, ct);
                throw new BusinessRuleException("ENROLLMENT_COOLDOWN",
                    $"You can refresh your face enrollment again after {clock.ToPakistan(cooldownEnds):d MMM yyyy}.");
            }
        }

        var frameEmbeddings = new List<(int Index, float[] Embedding, double Blur)>();
        double bestBlur = -1;
        int bestIndex = -1;
        byte[]? bestCrop = null;

        foreach (var frame in request.Frames.OrderBy(f => f.Telemetry.Index))
        {
            var bbox = frame.Telemetry.BoundingBox;
            if (bbox is null) continue;

            using var buffer = new MemoryStream();
            await frame.Content.CopyToAsync(buffer, ct);
            var bytes = buffer.ToArray();
            using var bitmap = SKBitmap.Decode(bytes);
            if (bitmap is null) continue;

            var blur = ComputeBlurVariance(bitmap);
            var crop = FaceCropper.CropAligned(bitmap, bbox, faceOptions.Value.PadCropScale);
            if (crop is null) continue;

            var embedding = await faceProvider.ExtractEmbeddingAsync(crop, ct);
            if (embedding is null) continue;

            frameEmbeddings.Add((frame.Telemetry.Index, embedding.Embedding, blur));
            if (blur > bestBlur)
            {
                bestBlur = blur;
                bestIndex = frame.Telemetry.Index;
                bestCrop = crop;
            }
        }

        if (frameEmbeddings.Count == 0 || bestCrop is null)
        {
            await HardFailAsync(session, ct);
            throw new BusinessRuleException(BusinessRuleCodes.FaceVerificationUnavailable, "No usable face was captured. Please try again with better lighting.");
        }

        // Liveness gate on enrollment itself - never enroll a spoofed reference.
        var padResult = await faceProvider.EvaluateLivenessAsync(bestCrop, ct);
        if (padResult is not null && padResult.LiveProbability < faceOptions.Value.PadLiveThreshold)
        {
            await HardFailAsync(session, ct);
            throw new BusinessRuleException(BusinessRuleCodes.LivenessFailed, "Liveness check failed during enrollment. Please try again with a live camera.");
        }

        // Intra-set gate: every captured frame should plausibly be the same face.
        double? intraSetMin = null;
        if (frameEmbeddings.Count > 1)
        {
            var pairwise = new List<double>();
            for (var i = 0; i < frameEmbeddings.Count; i++)
            {
                for (var j = i + 1; j < frameEmbeddings.Count; j++)
                {
                    pairwise.Add(FaceMath.CosineSimilarity(frameEmbeddings[i].Embedding, frameEmbeddings[j].Embedding));
                }
            }
            intraSetMin = pairwise.Min();
            if (intraSetMin < 0.4)
            {
                await HardFailAsync(session, ct);
                throw new BusinessRuleException(BusinessRuleCodes.FaceVerificationUnavailable, "The captured frames were inconsistent. Please try again in one continuous take.");
            }
        }

        // Cross-match gate: the strongest anti-impersonation control - the live capture must
        // match the mentor-approved static photo, not just be internally self-consistent.
        var approvedPhotoBytes = await ReadApprovedPhotoAsync(profile.ApprovedPhotoFileId!.Value, ct);
        var approvedEmbedding = await faceProvider.ExtractEmbeddingAsync(approvedPhotoBytes, ct);
        double crossMatchScore = 0;
        if (approvedEmbedding is not null)
        {
            var bestEmbedding = frameEmbeddings.First(f => f.Index == bestIndex).Embedding;
            crossMatchScore = FaceMath.CosineSimilarity(bestEmbedding, approvedEmbedding.Embedding);
            if (crossMatchScore < faceOptions.Value.EnrollmentCrossMatchThreshold)
            {
                await HardFailAsync(session, ct);
                throw new BusinessRuleException(BusinessRuleCodes.FaceMismatch,
                    "Your live capture does not match your approved profile photo closely enough. Please contact your mentor if this repeats.");
            }
        }

        var bestResult = frameEmbeddings.First(f => f.Index == bestIndex);
        var newVersion = 1 + await db.FaceTemplates.Where(t => t.InternProfileId == profile.Id).Select(t => (int?)t.Version).MaxAsync(ct) ?? 1;

        var previousActive = await db.FaceTemplates.Where(t => t.InternProfileId == profile.Id && t.IsActive).ToListAsync(ct);

        var template = new FaceTemplate
        {
            InternProfileId = profile.Id,
            Version = newVersion,
            Provider = FaceProviderName.Onnx,
            ModelId = "arcface",
            ModelVersion = "r100-v1",
            Embedding = FloatsToBytes(bestResult.Embedding),
            EmbeddingDim = (short)bestResult.Embedding.Length,
            EmbeddingNorm = 1.0m,
            SourceSessionId = sessionId,
            QualityScore = (decimal)Math.Clamp(bestBlur / 200.0, 0, 1),
            CrossMatchScore = (decimal)crossMatchScore,
            IntraSetMinScore = intraSetMin is null ? null : (decimal)intraSetMin.Value,
            EnrollmentReason = isRefresh ? EnrollmentReason.Refresh : EnrollmentReason.Initial,
            IsActive = true,
            CreatedByUserId = currentUser.UserId,
        };
        db.FaceTemplates.Add(template);
        await db.SaveChangesAsync(ct);

        foreach (var old in previousActive)
        {
            old.IsActive = false;
            old.SupersededAtUtc = clock.UtcNow;
            old.SupersededByTemplateId = template.Id;
        }

        var trackedProfile = await db.InternProfiles.FirstAsync(p => p.Id == profile.Id, ct);
        trackedProfile.FaceEnrollmentStatus = FaceEnrollmentStatus.Active;
        await db.SaveChangesAsync(ct);

        session.State = ChallengeSessionState.Passed;
        session.CompletedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        return new EnrollmentResult(true, "Active", "Face enrollment completed.", newVersion);
    }

    private async Task<byte[]> ReadApprovedPhotoAsync(Guid fileId, CancellationToken ct)
    {
        await using var stream = await fileStorage.OpenReadAsync(fileId, ct);
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, ct);
        return buffer.ToArray();
    }

    private async Task<InternProfile> LoadProfileAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns can enroll their face.");
        return await db.InternProfiles.FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
    }

    private async Task HardFailAsync(AttendanceChallengeSession session, CancellationToken ct)
    {
        session.State = ChallengeSessionState.HardFailed;
        await db.SaveChangesAsync(ct);
    }

    private static byte[] FloatsToBytes(float[] floats)
    {
        var bytes = new byte[floats.Length * sizeof(float)];
        Buffer.BlockCopy(floats, 0, bytes, 0, bytes.Length);
        return bytes;
    }

    private static double ComputeBlurVariance(SKBitmap bitmap)
    {
        var targetWidth = Math.Min(bitmap.Width, 160);
        var targetHeight = Math.Max(1, (int)(bitmap.Height * (targetWidth / (double)bitmap.Width)));
        using var small = bitmap.Resize(new SKImageInfo(targetWidth, targetHeight), SKFilterQuality.Low) ?? bitmap;

        var w = small.Width;
        var h = small.Height;
        var gray = new double[h, w];
        for (var y = 0; y < h; y++)
        {
            for (var x = 0; x < w; x++)
            {
                var p = small.GetPixel(x, y);
                gray[y, x] = 0.299 * p.Red + 0.587 * p.Green + 0.114 * p.Blue;
            }
        }

        double sum = 0, sumSq = 0;
        var count = 0;
        for (var y = 1; y < h - 1; y++)
        {
            for (var x = 1; x < w - 1; x++)
            {
                var lap = gray[y - 1, x] + gray[y + 1, x] + gray[y, x - 1] + gray[y, x + 1] - 4 * gray[y, x];
                sum += lap;
                sumSq += lap * lap;
                count++;
            }
        }
        if (count == 0) return 0;
        var mean = sum / count;
        return sumSq / count - mean * mean;
    }
}
