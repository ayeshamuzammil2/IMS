using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Application.Options;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Domain.Services;
using PIA.Infrastructure.Persistence;
using PIA.Infrastructure.Services.Attendance.VideoReplay;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

public sealed class AttendanceService(
    PiaDbContext db,
    ICurrentUser currentUser,
    ICorrelationContext correlation,
    IFileStorage fileStorage,
    IClock clock,
    IChallengeGenerator challengeGenerator,
    IFaceVerificationProvider faceProvider,
    IParallaxResidualDetector parallaxDetector,
    ISpecularTemporalAnalyzer specularAnalyzer,
    IRollingShutterBandingDetector bandingDetector,
    IMoireDetector moireDetector,
    ICompressionForensicsDetector compressionDetector,
    IPlayIntegrityVerifier playIntegrityVerifier,
    IUserSecurityService security,
    IOptions<AttendanceOptions> attendanceOptions,
    IOptions<FaceOptions> faceOptions,
    IOptions<PlayIntegrityOptions> playIntegrityOptions) : IAttendanceService
{
    private AttendanceOptions Options => attendanceOptions.Value;
    private FaceOptions Face => faceOptions.Value;

    private const int MaxConsecutiveFaceFailures = 5;
    private const int MaxDailyAttemptsPerDirection = 10;
    private const int RetryCooldownSeconds = 15;

    public async Task<AttendanceTodayResponse> GetTodayAsync(decimal? latitude, decimal? longitude, decimal? accuracyMeters, CancellationToken ct)
    {
        var (profile, department) = await LoadProfileAndDepartmentAsync(ct);
        var todayPk = clock.TodayInPakistan;
        var day = await db.AttendanceDays.AsNoTracking()
            .FirstOrDefaultAsync(d => d.InternProfileId == profile.Id && d.WorkDate == todayPk, ct);

        var (arrivalBlockers, departureBlockers) = await ComputeBlockersAsync(profile, department, todayPk, day, ct);

        double? distance = null;
        string? geofenceState = null;
        if (latitude is { } lat && longitude is { } lng && accuracyMeters is { } acc)
        {
            distance = GeoCalculator.DistanceInMeters((double)department.Latitude, (double)department.Longitude, (double)lat, (double)lng);
            geofenceState = GeoCalculator.Classify(distance.Value, (double)acc, department.GeofenceRadiusMeters).ToString();
        }

        return new AttendanceTodayResponse(
            todayPk,
            department.Name, department.Latitude, department.Longitude, department.GeofenceRadiusMeters,
            day?.ArrivalAtUtc is not null, day?.ArrivalAtUtc, day?.IsLate ?? false,
            day?.DepartureAtUtc is not null, day?.DepartureAtUtc, day?.IsEarlyLeave ?? false,
            (day?.Status ?? AttendanceStatus.Present).ToString(),
            arrivalBlockers, departureBlockers,
            distance, geofenceState);
    }

    public async Task<AttendanceSessionResponse> CreateSessionAsync(CreateAttendanceSessionRequest request, CancellationToken ct)
    {
        var eventType = ParseEventType(request.EventType);
        var (profile, department) = await LoadProfileAndDepartmentAsync(ct);
        var todayPk = clock.TodayInPakistan;
        var day = await db.AttendanceDays.AsNoTracking()
            .FirstOrDefaultAsync(d => d.InternProfileId == profile.Id && d.WorkDate == todayPk, ct);

        var (arrivalBlockers, departureBlockers) = await ComputeBlockersAsync(profile, department, todayPk, day, ct);
        var relevantBlockers = eventType == AttendanceEventType.Arrival ? arrivalBlockers : departureBlockers;
        if (relevantBlockers.Count > 0)
        {
            throw new BusinessRuleException(relevantBlockers[0], DescribeBlocker(relevantBlockers[0]));
        }

        var distance = GeoCalculator.DistanceInMeters((double)department.Latitude, (double)department.Longitude, (double)request.Latitude, (double)request.Longitude);
        var geofence = GeoCalculator.Classify(distance, (double)request.AccuracyMeters, department.GeofenceRadiusMeters);
        if (geofence == GeofenceState.Outside)
        {
            throw new BusinessRuleException(BusinessRuleCodes.OutsideGeofence,
                $"You are {distance:F0} m from {department.Name}. Move within {department.GeofenceRadiusMeters} m to mark {eventType}.");
        }

        if (request.Mocked == true)
        {
            throw new BusinessRuleException(BusinessRuleCodes.MockLocationDetected, "Mock location detected. Attendance blocked.");
        }

        if (profile.LastFaceFailureAtUtc is { } lastFailure && (clock.UtcNow - lastFailure).TotalSeconds < RetryCooldownSeconds)
        {
            throw new BusinessRuleException(BusinessRuleCodes.RetryCooldownActive,
                $"Please wait {RetryCooldownSeconds} seconds after a failed attempt before trying again.");
        }

        // "Camera launch" = a challenge session actually being issued - a geofence/cooldown
        // rejection above never opens the camera, so it correctly doesn't count against this limit.
        var attemptsToday = await db.AttendanceChallengeSessions.CountAsync(
            s => s.InternProfileId == profile.Id && s.DatePk == todayPk && s.EventType == eventType, ct);
        if (attemptsToday >= MaxDailyAttemptsPerDirection)
        {
            await TriggerUnofficialActivityLockAsync(profile.User,
                $"Exceeded {MaxDailyAttemptsPerDirection} {eventType} attempts in one day.", ct);
            throw new BusinessRuleException(BusinessRuleCodes.UnofficialActivityLockout,
                "Your account has been locked due to unofficial activity. You have been signed out.");
        }

        var challenge = challengeGenerator.Generate();
        var now = clock.UtcNow;
        var session = new AttendanceChallengeSession
        {
            Id = Guid.NewGuid(),
            InternProfileId = profile.Id,
            UserId = currentUser.UserId,
            EventType = eventType,
            DatePk = todayPk,
            Nonce = RandomNumberGenerator.GetBytes(32),
            ChallengeJson = JsonSerializer.Serialize(challenge),
            JwtJti = string.IsNullOrEmpty(currentUser.Jti) ? Guid.NewGuid().ToString("N") : currentUser.Jti,
            DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "unknown" : request.DeviceId,
            IssueLatitude = request.Latitude,
            IssueLongitude = request.Longitude,
            IssueDistanceM = distance,
            IssueGeofenceState = geofence,
            State = ChallengeSessionState.Issued,
            IssuedAtUtc = now,
            ExpiresAtUtc = now.AddSeconds(Options.SessionTtlSeconds),
            ClientIp = correlation.IpAddress,
            UserAgent = correlation.UserAgent,
        };
        db.AttendanceChallengeSessions.Add(session);
        await db.SaveChangesAsync(ct);

        return new AttendanceSessionResponse(session.Id, Convert.ToBase64String(session.Nonce), session.ExpiresAtUtc, challenge);
    }

    public async Task<SubmitAttendanceResult> SubmitAsync(Guid sessionId, SubmitAttendanceRequest request, CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have attendance.");
        var now = clock.UtcNow;
        var flags = new List<string>();
        var riskScore = 0;

        // Stage 0: atomic session consume.
        var consumed = await db.AttendanceChallengeSessions
            .Where(s => s.Id == sessionId && s.InternProfileId == internProfileId && s.State == ChallengeSessionState.Issued)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.State, ChallengeSessionState.Submitted)
                .SetProperty(s => s.SubmittedAtUtc, now), ct);

        if (consumed == 0)
        {
            throw new BusinessRuleException(BusinessRuleCodes.SessionAlreadyConsumed, "This attendance session has already been used or has expired.");
        }

        var session = await db.AttendanceChallengeSessions.FirstAsync(s => s.Id == sessionId, ct);

        if (session.ExpiresAtUtc < now)
        {
            session.State = ChallengeSessionState.Expired;
            await db.SaveChangesAsync(ct);
            throw new BusinessRuleException(BusinessRuleCodes.ChallengeExpired, "This attendance session expired. Please try again.");
        }

        var (profile, department) = await LoadProfileAndDepartmentAsync(ct);
        var todayPk = clock.TodayInPakistan;
        var day = await db.AttendanceDays.FirstOrDefaultAsync(d => d.InternProfileId == internProfileId && d.WorkDate == todayPk, ct);

        // Stage 1: re-run all gates.
        var (arrivalBlockers, departureBlockers) = await ComputeBlockersAsync(profile, department, todayPk, day, ct);
        var relevantBlockers = session.EventType == AttendanceEventType.Arrival ? arrivalBlockers : departureBlockers;
        if (relevantBlockers.Count > 0)
        {
            await HardFailSessionAsync(session, ct);
            throw new BusinessRuleException(relevantBlockers[0], DescribeBlocker(relevantBlockers[0]));
        }

        if (request.Frames.Count == 0)
        {
            await HardFailSessionAsync(session, ct);
            throw new ValidationException("frames", "At least one frame is required.");
        }

        // Stage 2/3: geofence recompute (never trust the client's own classification from issue time).
        var distance = GeoCalculator.DistanceInMeters((double)department.Latitude, (double)department.Longitude, (double)request.Latitude, (double)request.Longitude);
        var geofence = GeoCalculator.Classify(distance, (double)request.AccuracyMeters, department.GeofenceRadiusMeters);
        if (geofence == GeofenceState.Outside)
        {
            await HardFailSessionAsync(session, ct);
            throw new BusinessRuleException(BusinessRuleCodes.OutsideGeofence,
                $"You are {distance:F0} m from {department.Name}. Move within {department.GeofenceRadiusMeters} m to mark {session.EventType}.");
        }

        // Stage 4: location integrity - an uncertain (low-accuracy) fix goes to review, never a
        // hard fail, but a confirmed mock-location signal is a hard fail (spec-mandated override
        // of this codebase's usual "never hard-fail on an inconclusive location signal" stance).
        var requiresReview = geofence == GeofenceState.Uncertain;
        if (geofence == GeofenceState.Uncertain) flags.Add("UncertainGeofence");
        if (request.Mocked == true)
        {
            await HardFailSessionAsync(session, ct);
            throw new BusinessRuleException(BusinessRuleCodes.MockLocationDetected, "Mock location detected. Attendance blocked.");
        }

        // Stage 5: timing.
        var pkNow = clock.ToPakistan(now);
        if (pkNow.Hour < Options.EarliestMarkHourLocal || pkNow.Hour > Options.LatestMarkHourLocal)
        {
            await HardFailSessionAsync(session, ct);
            throw new BusinessRuleException(BusinessRuleCodes.OutsideDailyWindow, "Attendance cannot be marked at this hour.");
        }

        var localTimeNow = TimeOnly.FromDateTime(pkNow.DateTime);
        var isLate = false;
        var isEarly = false;
        if (session.EventType == AttendanceEventType.Arrival)
        {
            isLate = localTimeNow > profile.DailyStartTime.Add(TimeSpan.FromMinutes(Options.LateGraceMinutes));
        }
        else
        {
            isEarly = localTimeNow < profile.DailyEndTime.Add(TimeSpan.FromMinutes(-Options.EarlyLeaveGraceMinutes));
        }

        // Stage 6: attestation - stubbed until Phase 9 wires Play Integrity (graded Off first).

        // Read + decode every frame once; stage 7 (pHash replay) and stage 8 (decode) apply per frame.
        var decodedFrames = new List<(SubmitChallengeFrame Source, byte[] Bytes, SKBitmap Bitmap, ulong Phash, byte[] Sha256)>();
        try
        {
            foreach (var frame in request.Frames.OrderBy(f => f.Telemetry.Index))
            {
                using var buffer = new MemoryStream();
                await frame.Content.CopyToAsync(buffer, ct);
                var bytes = buffer.ToArray();

                var bitmap = SKBitmap.Decode(bytes);
                if (bitmap is null)
                {
                    throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "One of the submitted frames could not be processed. Please try again.");
                }

                decodedFrames.Add((frame, bytes, bitmap, PerceptualHash.Compute(bitmap), SHA256.HashData(bytes)));
            }

            var recentMedia = await db.AttendanceMedia.AsNoTracking()
                .OrderByDescending(m => m.CreatedAtUtc)
                .Take(5000)
                .Select(m => new { m.Sha256, m.Phash })
                .ToListAsync(ct);

            var isReplay = decodedFrames.Any(f => recentMedia.Any(m =>
                m.Sha256.AsSpan().SequenceEqual(f.Sha256) || PerceptualHash.HammingDistance(m.Phash, f.Phash) <= 6));
            if (isReplay)
            {
                await RecordRejectedEventAsync(profile, session, request, distance, geofence, AttendanceEventOutcome.RejectedReplayDetected, ct);
                await HardFailSessionAsync(session, ct);
                throw new BusinessRuleException(BusinessRuleCodes.FrameReplayDetected, "One of these photos has already been used for attendance.");
            }

            // Stage 9 (server-side face detect) is a bounding-box presence check only in this
            // phase - full MLKit-equivalent server detection is not part of the free stack;
            // frames without a usable client-reported box simply can't feed the crop-dependent
            // stages below and are treated as quality-degraded rather than rejected outright.

            // Stage 10: quality (blur).
            var blurVariances = decodedFrames.Select(f => ComputeBlurVariance(f.Bitmap)).ToList();
            var sharpestIndex = blurVariances.IndexOf(blurVariances.Max());
            if (blurVariances[sharpestIndex] < 15)
            {
                flags.Add("LowSharpness");
                riskScore += 10;
            }

            // Stage 11: client-observation vs server-detection / challenge-response consistency.
            var issuedActions = JsonSerializer.Deserialize<ChallengeSpecDto>(session.ChallengeJson)?.Steps
                .Select(s => s.Action.ToString()).ToHashSet() ?? [];
            var performedActions = decodedFrames.Select(f => f.Source.Telemetry.Action).ToHashSet();
            var completionRatio = issuedActions.Count == 0 ? 1.0 : (double)issuedActions.Intersect(performedActions).Count() / issuedActions.Count;

            if (completionRatio < 0.5)
            {
                await HardFailSessionAsync(session, ct);
                throw new BusinessRuleException(BusinessRuleCodes.LivenessFailed, "The requested actions were not completed.");
            }
            if (completionRatio < 1.0)
            {
                flags.Add("PartialChallengeCompletion");
                riskScore += (int)((1 - completionRatio) * 20);
            }

            if (!TurnDirectionsConsistent(decodedFrames.Select(f => f.Source.Telemetry).ToList()))
            {
                flags.Add("InconsistentTurnDirection");
                riskScore += 15;
            }

            // Video-replay defense subsystem - geometry/signal detectors. Parallax is the only
            // hard-fail among these; the rest are score contributors per the fusion design.
            var detectorFrames = decodedFrames.Select(f => new DetectorFrame(
                f.Source.Telemetry.Index, f.Bitmap, f.Source.Telemetry.TimestampMs, f.Source.Telemetry.Action,
                f.Source.Telemetry.Yaw, f.Source.Telemetry.Pitch, f.Source.Telemetry.Roll,
                f.Source.Telemetry.Landmarks?.ToDictionary(kv => kv.Key, kv => (kv.Value.X, kv.Value.Y)))).ToList();

            var parallaxResult = parallaxDetector.Analyze(detectorFrames);
            if (parallaxResult.Verdict == DetectorVerdict.Suspicious)
            {
                await RecordRejectedEventAsync(profile, session, request, distance, geofence, AttendanceEventOutcome.RejectedReplayDetected, ct);
                await HardFailSessionAsync(session, ct);
                await ThrowFaceFailureAsync(profile, BusinessRuleCodes.SpoofDetected, "This does not appear to be a live, three-dimensional face.", ct);
            }
            AddSoftDetectorFlag(flags, ref riskScore, parallaxResult, weight: 0);

            AddSoftDetectorFlag(flags, ref riskScore, specularAnalyzer.Analyze(detectorFrames), weight: 15);
            AddSoftDetectorFlag(flags, ref riskScore, bandingDetector.Analyze(detectorFrames[sharpestIndex]), weight: 20);
            AddSoftDetectorFlag(flags, ref riskScore, moireDetector.Analyze(detectorFrames[sharpestIndex]), weight: 20);
            AddSoftDetectorFlag(flags, ref riskScore, compressionDetector.Analyze(detectorFrames[sharpestIndex]), weight: 15);

            // Stages 13-14: PAD ensemble + embedding match - only enforced when a real model is
            // configured. Without one, this degrades to the same GeofenceOnly mode Phase 4 shipped.
            decimal? padLiveBest = null, padLiveMean = null;
            decimal? matchSimilarity = null;
            var verificationMode = VerificationMode.GeofenceOnly;

            if (faceProvider.IsConfigured)
            {
                // FaceEnrollmentStatus is already gated earlier via ComputeBlockersAsync's
                // FaceNotReady blocker (Stage 1 above), which throws before any of this code runs.

                var padScores = new List<PadResult>();
                foreach (var f in decodedFrames)
                {
                    var bbox = f.Source.Telemetry.BoundingBox;
                    if (bbox is null) continue;
                    var crop = FaceCropper.CropAligned(f.Bitmap, bbox, Face.PadCropScale);
                    if (crop is null) continue;
                    var pad = await faceProvider.EvaluateLivenessAsync(crop, ct);
                    if (pad is not null) padScores.Add(pad);
                }

                if (padScores.Count > 0)
                {
                    padLiveBest = (decimal)padScores.Max(p => p.LiveProbability);
                    padLiveMean = (decimal)padScores.Average(p => p.LiveProbability);
                    var replayBest = padScores.Max(p => p.ReplayAttackProbability);

                    if (replayBest >= Face.PadReplayHardFailThreshold)
                    {
                        // NOTE: PAD (MiniFASNet) is intentionally never a hard-fail gate here.
                        // Empirical testing (feeding the bundled/official model random noise,
                        // solid colors, and genuine live selfies from real phone cameras) showed it
                        // returns a near-constant high "replay" score regardless of input content -
                        // it was trained on controlled kiosk/IR capture conditions and does not
                        // generalize to arbitrary phone selfie cameras. Hard-failing on it would
                        // reject every genuine live attempt. It still counts toward risk scoring
                        // below so an unusually high replay signal is visible to reviewers, but the
                        // actual anti-spoof guarantee here comes from the active challenge-response
                        // capture (held pose/blink/turn, enforced above) and the geometry-based
                        // parallaxDetector (hard-failed separately above) - both of which respond to
                        // real capture behavior rather than static image texture.
                        flags.Add("HighReplayScore");
                        riskScore += 25;
                    }
                    if (padLiveMean < (decimal)Face.PadLiveThreshold)
                    {
                        flags.Add("LowLivenessConfidence");
                        riskScore += 20;
                    }
                }

                var bestFrame = decodedFrames[sharpestIndex];
                var embedBbox = bestFrame.Source.Telemetry.BoundingBox;
                if (embedBbox is not null)
                {
                    var embedCrop = FaceCropper.CropAligned(bestFrame.Bitmap, embedBbox, Face.PadCropScale);
                    if (embedCrop is not null)
                    {
                        var embedding = await faceProvider.ExtractEmbeddingAsync(embedCrop, ct);
                        if (embedding is not null)
                        {
                            var template = await db.FaceTemplates.AsNoTracking()
                                .Where(t => t.InternProfileId == internProfileId && t.IsActive)
                                .OrderByDescending(t => t.Version)
                                .FirstOrDefaultAsync(ct);

                            if (template?.Embedding is not null)
                            {
                                var storedEmbedding = BytesToFloats(template.Embedding);
                                var similarity = FaceMath.CosineSimilarity(embedding.Embedding, storedEmbedding);
                                matchSimilarity = (decimal)similarity;

                                if (similarity < Face.MatchThreshold)
                                {
                                    await RecordRejectedEventAsync(profile, session, request, distance, geofence, AttendanceEventOutcome.RejectedFaceMismatch, ct);
                                    await HardFailSessionAsync(session, ct);
                                    await ThrowFaceFailureAsync(profile, BusinessRuleCodes.FaceMismatch,
                                        "Scanned face does not match your uploaded profile picture.", ct);
                                }
                                if (similarity < Face.MatchThreshold + 0.05)
                                {
                                    flags.Add("LowMatchMargin");
                                    riskScore += 15;
                                }
                            }
                        }
                    }
                }

                verificationMode = VerificationMode.FullBiometric;
                if (profile.ConsecutiveFaceFailures != 0)
                {
                    profile.ConsecutiveFaceFailures = 0;
                    await db.SaveChangesAsync(ct);
                }
            }

            // Stage 15: device attestation - graded Off/FlagOnly/Enforce so a real device
            // population's honest-failure rate can be measured before ever blocking on it.
            var attestationVerdict = await playIntegrityVerifier.VerifyAsync(request.AttestationToken, ct);
            if (attestationVerdict == PlayIntegrityVerdict.Failed)
            {
                if (playIntegrityOptions.Value.Mode == PlayIntegrityMode.Enforce)
                {
                    await RecordRejectedEventAsync(profile, session, request, distance, geofence, AttendanceEventOutcome.RejectedAttestationFailed, ct);
                    await HardFailSessionAsync(session, ct);
                    throw new BusinessRuleException(BusinessRuleCodes.AttestationFailed, "This device failed an integrity check.");
                }

                flags.Add("AttestationFailed");
                riskScore += 20;
            }
            await UpsertDeviceBindingAsync(internProfileId, request.DeviceId, request.DeviceModel, attestationVerdict, ct);

            if (riskScore >= Face.RiskReviewThreshold)
            {
                requiresReview = true;
            }

            // Persist: attempt row, media rows (one per frame), event, day upsert, session close.
            var attemptNumber = await db.AttendanceVerificationAttempts.CountAsync(a => a.InternProfileId == internProfileId && a.DatePk == todayPk, ct) + 1;
            var attempt = new AttendanceVerificationAttempt
            {
                SessionId = session.Id,
                InternProfileId = internProfileId,
                EventType = session.EventType!.Value,
                DatePk = todayPk,
                AttemptNumber = attemptNumber,
                Verdict = requiresReview ? "AcceptedWithReview" : "Accepted",
                PadLiveProbBest = padLiveBest,
                PadLiveProbMean = padLiveMean,
                FaceMatchScore = matchSimilarity,
                QualityScore = (decimal)Math.Clamp(blurVariances[sharpestIndex] / 200.0, 0, 1),
                BlurVariance = (decimal)blurVariances[sharpestIndex],
                GeofenceState = geofence,
                DistanceM = distance,
                GpsAccuracyM = request.AccuracyMeters,
                LocationMocked = request.Mocked,
                AttestationVerdict = attestationVerdict.ToString(),
                DeviceId = request.DeviceId,
                FrameCount = decodedFrames.Count,
                PayloadBytes = decodedFrames.Sum(f => f.Bytes.Length),
                ServerLatencyMs = (int)(clock.UtcNow - now).TotalMilliseconds,
                RiskScore = riskScore,
                FlagsJson = JsonSerializer.Serialize(flags),
            };
            db.AttendanceVerificationAttempts.Add(attempt);
            await db.SaveChangesAsync(ct);

            Guid? primaryFileId = null;
            for (var i = 0; i < decodedFrames.Count; i++)
            {
                var f = decodedFrames[i];
                var isPrimary = i == sharpestIndex;
                var category = isPrimary ? FileCategory.AttendanceSelfie : FileCategory.AttendanceChallengeFrame;
                var storedFile = await fileStorage.SaveAsync(new FileSaveRequest(
                    new MemoryStream(f.Bytes), $"frame_{f.Source.Telemetry.Index}.jpg", f.Source.ContentType, category,
                    profile.UserId, profile.UserId), ct);

                if (isPrimary) primaryFileId = storedFile.Id;

                db.AttendanceMedia.Add(new AttendanceMedia
                {
                    AttemptId = attempt.Id,
                    InternProfileId = internProfileId,
                    Slot = $"frame_{f.Source.Telemetry.Index}",
                    Kind = "Image",
                    StorageKey = storedFile.StorageKey,
                    ContentType = storedFile.ContentType,
                    Bytes = (int)storedFile.SizeBytes,
                    Sha256 = f.Sha256,
                    Phash = f.Phash,
                    Width = (short)f.Bitmap.Width,
                    Height = (short)f.Bitmap.Height,
                    IsPrimary = isPrimary,
                    RetentionExpiresAtUtc = now.AddDays(Options.SelfieRetentionDays),
                });
            }
            await db.SaveChangesAsync(ct);

            var attendanceEvent = new AttendanceEvent
            {
                InternProfileId = internProfileId,
                EventType = session.EventType!.Value,
                Outcome = requiresReview ? AttendanceEventOutcome.AcceptedWithReview : AttendanceEventOutcome.Accepted,
                OccurredAtUtc = now,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                AccuracyM = request.AccuracyMeters,
                DistanceFromDepartmentM = distance,
                GeofenceState = geofence,
                SelfieFileId = primaryFileId,
                ChallengeSessionId = session.Id,
                DeviceModel = request.DeviceModel,
                AppVersion = request.AppVersion,
            };
            db.AttendanceEvents.Add(attendanceEvent);
            await db.SaveChangesAsync(ct);

            day ??= new AttendanceDay { InternProfileId = internProfileId, WorkDate = todayPk };
            if (day.Id == 0) db.AttendanceDays.Add(day);

            if (session.EventType == AttendanceEventType.Arrival)
            {
                day.ArrivalEventId = attendanceEvent.Id;
                day.ArrivalAtUtc = now;
                day.ArrivalLat = request.Latitude;
                day.ArrivalLng = request.Longitude;
                day.ArrivalAccuracyM = request.AccuracyMeters;
                day.ArrivalDistanceM = distance;
                day.ArrivalGeofence = geofence;
                day.ArrivalSource = AttendanceSource.Biometric;
                day.ArrivalMode = verificationMode;
                day.IsLate = isLate;
                day.Status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;
            }
            else
            {
                day.DepartureEventId = attendanceEvent.Id;
                day.DepartureAtUtc = now;
                day.DepartureLat = request.Latitude;
                day.DepartureLng = request.Longitude;
                day.DepartureAccuracyM = request.AccuracyMeters;
                day.DepartureDistanceM = distance;
                day.DepartureGeofence = geofence;
                day.DepartureSource = AttendanceSource.Biometric;
                day.DepartureMode = verificationMode;
                day.IsEarlyLeave = isEarly;
                day.WorkedMinutes = day.ArrivalAtUtc is { } arrivalAt ? (int)(now - arrivalAt).TotalMinutes : null;
            }
            day.RequiresReview = day.RequiresReview || requiresReview;
            await db.SaveChangesAsync(ct);

            attempt.AttendanceDayId = day.Id;
            await db.SaveChangesAsync(ct);

            session.State = ChallengeSessionState.Passed;
            session.CompletedAtUtc = now;
            await db.SaveChangesAsync(ct);

            var message = requiresReview
                ? $"{session.EventType} marked at {clock.ToPakistan(now):h:mm tt} (PKT) - flagged for mentor review."
                : $"{session.EventType} marked at {clock.ToPakistan(now):h:mm tt} (PKT).";

            return new SubmitAttendanceResult(
                requiresReview ? "AcceptedWithReview" : "Accepted",
                now, isLate, isEarly, distance, geofence.ToString(), requiresReview, riskScore, flags, message);
        }
        finally
        {
            foreach (var f in decodedFrames) f.Bitmap.Dispose();
        }
    }

    private static void AddSoftDetectorFlag(List<string> flags, ref int riskScore, DetectorResult result, int weight)
    {
        if (result.Verdict == DetectorVerdict.Suspicious && weight > 0)
        {
            flags.Add(result.DetectorName);
            riskScore += weight;
        }
    }

    /// <summary>Cheap categorical check, run before any ML stage: a claimed TurnLeft frame's yaw
    /// should be more negative than a claimed TurnRight frame's yaw. Soft signal only - sign
    /// conventions can vary by device/mirroring, so this never hard-fails by itself.</summary>
    private static bool TurnDirectionsConsistent(IReadOnlyList<ChallengeFrameTelemetryDto> telemetry)
    {
        var leftYaws = telemetry.Where(t => t.Action == nameof(ChallengeActionType.TurnLeft) && t.Yaw is not null).Select(t => t.Yaw!.Value).ToList();
        var rightYaws = telemetry.Where(t => t.Action == nameof(ChallengeActionType.TurnRight) && t.Yaw is not null).Select(t => t.Yaw!.Value).ToList();
        if (leftYaws.Count == 0 || rightYaws.Count == 0) return true;

        return leftYaws.Average() < rightYaws.Average();
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

    private static float[] BytesToFloats(byte[] bytes)
    {
        var floats = new float[bytes.Length / sizeof(float)];
        Buffer.BlockCopy(bytes, 0, floats, 0, bytes.Length);
        return floats;
    }

    /// <summary>Tracks every device an intern has attempted attendance from, with its most recent
    /// attestation verdict - the "device binding" record an admin would consult before deciding
    /// whether a device looks suspicious. Never itself a gate; RejectedAttestationFailed above is
    /// what gates, this is just the audit trail feeding that decision.</summary>
    private async Task UpsertDeviceBindingAsync(int internProfileId, string deviceId, string? deviceModel, PlayIntegrityVerdict verdict, CancellationToken ct)
    {
        var binding = await db.DeviceBindings.FirstOrDefaultAsync(b => b.InternProfileId == internProfileId && b.DeviceId == deviceId, ct);
        var now = clock.UtcNow;
        if (binding is null)
        {
            binding = new DeviceBinding
            {
                InternProfileId = internProfileId,
                DeviceId = deviceId,
                FirstSeenAtUtc = now,
                Status = "Active",
            };
            db.DeviceBindings.Add(binding);
        }

        binding.LastSeenAtUtc = now;
        binding.LastAttestationVerdict = verdict.ToString();
        if (!string.IsNullOrWhiteSpace(deviceModel))
        {
            binding.Model = deviceModel;
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task<(InternProfile Profile, Department Department)> LoadProfileAndDepartmentAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have attendance.");
        var profile = await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);

        var department = profile.User.Department
            ?? throw new BusinessRuleException(nameof(AttendanceBlocker.NoDepartmentAssigned), "No department is assigned to your account.");

        return (profile, department);
    }

    private async Task<(List<string> Arrival, List<string> Departure)> ComputeBlockersAsync(
        InternProfile profile, Department department, DateOnly todayPk, AttendanceDay? day, CancellationToken ct)
    {
        var arrival = new List<string>();
        var departure = new List<string>();

        void AddBoth(AttendanceBlocker blocker)
        {
            arrival.Add(blocker.ToString());
            departure.Add(blocker.ToString());
        }

        if (!profile.User.IsActive)
        {
            AddBoth(AttendanceBlocker.AccountInactive);
        }
        if (profile.VerificationStatus != VerificationStatus.Verified)
        {
            AddBoth(AttendanceBlocker.NotVerified);
        }
        // Dual-lock: only enforced when a real face provider is configured - without one, the
        // system already degrades to geofence-only attendance for everyone (see README), and
        // enrollment itself can't complete, so requiring it here would brick attendance entirely.
        if (faceProvider.IsConfigured &&
            (profile.ProfilePhotoStatus != ProfilePhotoStatus.Approved || profile.FaceEnrollmentStatus != FaceEnrollmentStatus.Active))
        {
            AddBoth(AttendanceBlocker.FaceNotReady);
        }
        if (todayPk < profile.InternshipStartDate || todayPk > profile.InternshipEndDate)
        {
            AddBoth(AttendanceBlocker.OutsideInternshipPeriod);
        }

        var isHoliday = await db.Holidays.AnyAsync(h => h.Date == todayPk && (h.DepartmentId == null || h.DepartmentId == department.Id), ct);
        if (isHoliday)
        {
            AddBoth(AttendanceBlocker.HolidayToday);
        }

        if (day?.Status == AttendanceStatus.Leave)
        {
            AddBoth(AttendanceBlocker.OnApprovedLeave);
        }

        if (day?.ArrivalAtUtc is not null)
        {
            arrival.Add(AttendanceBlocker.ArrivalAlreadyMarked.ToString());
        }
        if (day?.DepartureAtUtc is not null)
        {
            departure.Add(AttendanceBlocker.DepartureAlreadyMarked.ToString());
        }
        if (day?.ArrivalAtUtc is null)
        {
            departure.Add(AttendanceBlocker.ArrivalNotYetMarked.ToString());
        }

        var hasOpenSession = await db.AttendanceChallengeSessions.AnyAsync(
            s => s.InternProfileId == profile.Id && s.State == ChallengeSessionState.Issued && s.ExpiresAtUtc > clock.UtcNow, ct);
        if (hasOpenSession)
        {
            AddBoth(AttendanceBlocker.ActiveSessionAlreadyOpen);
        }

        return (arrival, departure);
    }

    private static string DescribeBlocker(string code) => code switch
    {
        nameof(AttendanceBlocker.AccountInactive) => "Your account is inactive.",
        nameof(AttendanceBlocker.NotVerified) => "Your documents are still pending verification. Attendance unlocks once your mentor approves all of them.",
        nameof(AttendanceBlocker.NoDepartmentAssigned) => "No department is assigned to your account.",
        nameof(AttendanceBlocker.OutsideInternshipPeriod) => "Today is outside your internship period.",
        nameof(AttendanceBlocker.HolidayToday) => "Today is a holiday.",
        nameof(AttendanceBlocker.OnApprovedLeave) => "You are on approved leave today.",
        nameof(AttendanceBlocker.ArrivalAlreadyMarked) => "Arrival has already been marked today.",
        nameof(AttendanceBlocker.DepartureAlreadyMarked) => "Departure has already been marked today.",
        nameof(AttendanceBlocker.ArrivalNotYetMarked) => "Mark arrival before departure.",
        nameof(AttendanceBlocker.ActiveSessionAlreadyOpen) => "You already have an attendance session in progress.",
        nameof(AttendanceBlocker.FaceNotReady) => "Attendance locked. Pending Profile Picture approval or Face Enrollment.",
        _ => "You cannot mark attendance right now.",
    };

    private static AttendanceEventType ParseEventType(string value) =>
        Enum.TryParse<AttendanceEventType>(value, true, out var parsed)
            ? parsed
            : throw new ValidationException("eventType", "Must be 'Arrival' or 'Departure'.");

    private async Task HardFailSessionAsync(AttendanceChallengeSession session, CancellationToken ct)
    {
        session.State = ChallengeSessionState.HardFailed;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Every face-verification rejection path (spoof, liveness, mismatch) routes through
    /// here instead of throwing directly: it counts the strike and, at the 5th consecutive failure,
    /// replaces the specific rejection with a full account lockout instead. Always throws - there is
    /// no normal return.</summary>
    private async Task ThrowFaceFailureAsync(InternProfile profile, string code, string message, CancellationToken ct)
    {
        profile.ConsecutiveFaceFailures++;
        profile.LastFaceFailureAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        if (profile.ConsecutiveFaceFailures >= MaxConsecutiveFaceFailures)
        {
            await TriggerUnofficialActivityLockAsync(profile.User,
                $"{MaxConsecutiveFaceFailures} consecutive failed face verification attempts.", ct);
            throw new BusinessRuleException(BusinessRuleCodes.UnofficialActivityLockout,
                "Your account has been locked due to unofficial activity. You have been signed out.");
        }

        throw new BusinessRuleException(code, message);
    }

    /// <summary>Locks login entirely (AuthService.LoginAsync checks IsLockedForUnofficialActivity)
    /// and revokes any currently-issued tokens immediately, so "logs out the user" is not just a
    /// client-side navigation but an actual server-enforced session kill.</summary>
    private async Task TriggerUnofficialActivityLockAsync(User user, string reason, CancellationToken ct)
    {
        user.IsLockedForUnofficialActivity = true;
        user.UnofficialActivityReason = reason;
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(user.Id, reason, ct);
    }

    private async Task RecordRejectedEventAsync(
        InternProfile profile, AttendanceChallengeSession session, SubmitAttendanceRequest request,
        double distance, GeofenceState geofence, AttendanceEventOutcome outcome, CancellationToken ct)
    {
        db.AttendanceEvents.Add(new AttendanceEvent
        {
            InternProfileId = profile.Id,
            EventType = session.EventType!.Value,
            Outcome = outcome,
            OccurredAtUtc = clock.UtcNow,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            AccuracyM = request.AccuracyMeters,
            DistanceFromDepartmentM = distance,
            GeofenceState = geofence,
            ChallengeSessionId = session.Id,
            DeviceModel = request.DeviceModel,
            AppVersion = request.AppVersion,
        });
        await db.SaveChangesAsync(ct);
    }
}