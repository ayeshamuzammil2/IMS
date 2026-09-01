using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
    IFaceDetector faceDetector,
    IOptions<AttendanceOptions> attendanceOptions,
    IOptions<FaceOptions> faceOptions,
    ILogger<FaceEnrollmentService> logger) : IFaceEnrollmentService
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

        var frameEmbeddings = new List<(int Index, float[] Embedding, double Blur, byte[] EmbeddingCrop)>();
        double bestBlur = -1;
        int bestIndex = -1;
        byte[]? bestCrop = null;

        foreach (var frame in request.Frames.OrderBy(f => f.Telemetry.Index))
        {
            var bbox = frame.Telemetry.BoundingBox;
            if (bbox is null)
            {
                logger.LogWarning("Enrollment frame {Index}: no bounding box in telemetry, skipped.", frame.Telemetry.Index);
                continue;
            }

            using var buffer = new MemoryStream();
            await frame.Content.CopyToAsync(buffer, ct);
            var bytes = buffer.ToArray();
            using var bitmap = SKBitmap.Decode(bytes);
            if (bitmap is null)
            {
                logger.LogWarning("Enrollment frame {Index}: could not decode {ByteCount} bytes as an image, skipped.", frame.Telemetry.Index, bytes.Length);
                continue;
            }

            // TEMP DIAGNOSTIC: logs the raw photo dimensions against the bounding box the client
            // reported. If BoundingBox was measured against a different frame size than this photo
            // (e.g. a downscaled face-detector analysis frame vs. the full-resolution capture),
            // Width/Height here will look wildly out of proportion to bitmap.Width/Height and the
            // crop below will zoom into the wrong region instead of the face - this line is what
            // will make that visible without guessing.
            logger.LogInformation(
                "Enrollment frame {Index}: photo={PhotoW}x{PhotoH}, bbox=({BX},{BY},{BW},{BH})",
                frame.Telemetry.Index, bitmap.Width, bitmap.Height, bbox.X, bbox.Y, bbox.Width, bbox.Height);

            var blur = ComputeBlurVariance(bitmap);
            var padCrop = FaceCropper.CropAligned(bitmap, bbox, faceOptions.Value.PadCropScale);
            if (padCrop is null)
            {
                logger.LogWarning("Enrollment frame {Index}: crop rejected (too small/out of bounds after clamping).", frame.Telemetry.Index);
                continue;
            }
            // Separate, tighter crop for the embedding model - see FaceOptions.EmbeddingCropScale's
            // doc comment for why reusing PadCropScale here silently breaks face matching.
            var embeddingCrop = FaceCropper.CropAligned(bitmap, bbox, faceOptions.Value.EmbeddingCropScale) ?? padCrop;

            var embedding = await faceProvider.ExtractEmbeddingAsync(embeddingCrop, ct);
            if (embedding is null)
            {
                logger.LogWarning("Enrollment frame {Index}: embedding extraction returned null (model not configured?).", frame.Telemetry.Index);
                continue;
            }

            frameEmbeddings.Add((frame.Telemetry.Index, embedding.Embedding, blur, embeddingCrop));
            if (blur > bestBlur)
            {
                bestBlur = blur;
                bestIndex = frame.Telemetry.Index;
                bestCrop = padCrop;
            }
        }

        if (frameEmbeddings.Count == 0 || bestCrop is null)
        {
            await HardFailAsync(session, ct);
            throw new BusinessRuleException(BusinessRuleCodes.FaceVerificationUnavailable, "No usable face was captured. Please try again with better lighting.");
        }

        // Liveness gate on enrollment itself - never enroll a spoofed reference.
        var padResult = await faceProvider.EvaluateLivenessAsync(bestCrop, ct);
        logger.LogInformation(
            "Enrollment liveness (best frame {BestIndex}, blur={Blur:F1}): live={Live:F3} print={Print:F3} replay={Replay:F3} threshold={Threshold:F2}",
            bestIndex, bestBlur, padResult?.LiveProbability, padResult?.PrintAttackProbability, padResult?.ReplayAttackProbability, faceOptions.Value.PadLiveThreshold);
        // NOTE: PAD (MiniFASNet) is intentionally never a hard-fail gate here. Direct testing of
        // the bundled/official model (feeding it random noise, solid colors, and genuine live
        // selfies captured from real phone cameras) showed it returns a near-constant high
        // "replay" score regardless of actual input content - it was trained on controlled
        // kiosk/IR capture conditions and does not generalize to arbitrary phone selfie cameras.
        // Hard-failing on it would reject every genuine enrollment. The real anti-spoof/
        // anti-impersonation guarantees for enrollment are: (1) the active challenge-response
        // capture above (held pose/blink/turn in real time, much harder to fake with a static
        // photo or video than passive texture analysis), and (2) the cross-match gate below,
        // which requires the live capture to match the mentor-approved profile photo. The PAD
        // score is still logged above for audit visibility so an unusually low reading can be
        // reviewed by an admin if ever needed, without blocking the intern in the meantime.
        if (padResult is not null && padResult.LiveProbability < faceOptions.Value.PadLiveThreshold)
        {
            logger.LogWarning(
                "Enrollment for intern {InternProfileId} had a low PAD liveness score ({Live:F3} < {Threshold:F2}) but was allowed to proceed - see note in FaceEnrollmentService.SubmitAsync.",
                profile.Id, padResult.LiveProbability, faceOptions.Value.PadLiveThreshold);
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
        var approvedPhotoCrop = await CropApprovedPhotoFaceAsync(approvedPhotoBytes, ct);
        var bestLiveCrop = frameEmbeddings.First(f => f.Index == bestIndex).EmbeddingCrop;
        try
        {
            var debugDir = Path.Combine(AppContext.BaseDirectory, "debug-crops");
            Directory.CreateDirectory(debugDir);
            await File.WriteAllBytesAsync(Path.Combine(debugDir, $"enrollment-{session.Id}-approved-photo-crop.jpg"), approvedPhotoCrop, ct);
            await File.WriteAllBytesAsync(Path.Combine(debugDir, $"enrollment-{session.Id}-live-capture-crop.jpg"), bestLiveCrop, ct);
            logger.LogWarning("DEBUG: wrote both crops to {Dir} - open enrollment-{SessionId}-approved-photo-crop.jpg and enrollment-{SessionId}-live-capture-crop.jpg to compare them directly.", debugDir, session.Id, session.Id);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "DEBUG: could not write debug crops to disk.");
        }
        var approvedEmbedding = await faceProvider.ExtractEmbeddingAsync(approvedPhotoCrop, ct);
        double crossMatchScore = 0;
        if (approvedEmbedding is not null)
        {
            var bestEmbedding = frameEmbeddings.First(f => f.Index == bestIndex).Embedding;
            crossMatchScore = FaceMath.CosineSimilarity(bestEmbedding, approvedEmbedding.Embedding);
            logger.LogInformation(
                "Enrollment cross-match score for intern {InternProfileId}: {Score:F4} (threshold {Threshold:F2})",
                profile.Id, crossMatchScore, faceOptions.Value.EnrollmentCrossMatchThreshold);
            if (crossMatchScore < faceOptions.Value.EnrollmentCrossMatchThreshold)
            {
                await HardFailAsync(session, ct);
                throw new BusinessRuleException(BusinessRuleCodes.FaceMismatch,
                    "Your live capture does not match your approved profile photo closely enough. Please contact your mentor if this repeats.");
            }
        }
        else
        {
            logger.LogWarning("Enrollment cross-match: approved photo embedding extraction returned null for intern {InternProfileId}.", profile.Id);
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

    /// <summary>
    /// The approved profile photo is uploaded once through a plain file picker - it never goes
    /// through the live-camera + on-device face-detector pipeline that produces a bounding box for
    /// every enrollment/attendance capture. Without this, the photo was previously fed to the
    /// embedding model completely uncropped while live captures were cropped tightly around the
    /// face - a framing mismatch severe enough to fail a genuine same-person match on its own (see
    /// FaceOptions.EmbeddingCropScale's doc comment for the measured numbers). Detecting the face
    /// here and cropping it the same way closes that gap. If detection isn't available or finds
    /// nothing, falls back to the whole photo rather than failing enrollment outright - degraded
    /// matching accuracy is preferable to blocking every intern whenever the detector is down.
    /// </summary>
    private async Task<byte[]> CropApprovedPhotoFaceAsync(byte[] approvedPhotoBytes, CancellationToken ct)
    {
        var bbox = await faceDetector.DetectFaceAsync(approvedPhotoBytes, ct);
        if (bbox is null)
        {
            logger.LogWarning("Could not detect a face in the approved profile photo ({ByteCount} bytes) - using the whole photo for cross-match, which may reduce match accuracy.", approvedPhotoBytes.Length);
            return approvedPhotoBytes;
        }

        using var bitmap = SKBitmap.Decode(approvedPhotoBytes);
        if (bitmap is null) return approvedPhotoBytes;

        logger.LogInformation(
            "Approved photo face detected: photo={PhotoW}x{PhotoH}, bbox=({BX:F0},{BY:F0},{BW:F0},{BH:F0})",
            bitmap.Width, bitmap.Height, bbox.X, bbox.Y, bbox.Width, bbox.Height);

        var crop = FaceCropper.CropAligned(bitmap, bbox, faceOptions.Value.EmbeddingCropScale);
        return crop ?? approvedPhotoBytes;
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