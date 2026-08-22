# PIA Wings — Intern Operations Portal

A mobile-first internship management system for Pakistan International Airlines: Admin, Mentor,
and Intern roles across PIA departments (ERP, HR, IR, SCM, ...), with live geofenced,
challenge-response face verification as the core attendance mechanism.

Built as a full rebuild of an earlier scaffold that could not start, had no real anti-spoofing,
and served biometric files publicly. Every claim in this document is either backed by a test in
`backend/tests/PIA.Tests`, a live curl/UI verification performed during development, or explicitly
marked as **not verified** below — nothing here is asserted without one of those three.

---

## Table of contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Backend setup](#backend-setup)
- [Frontend setup](#frontend-setup)
- [Running the test suite](#running-the-test-suite)
- [What's implemented, by phase](#whats-implemented-by-phase)
- [Face verification & anti-spoofing](#face-verification--anti-spoofing)
- [Known limitations](#known-limitations)
- [Packaging](#packaging)

---

## Architecture

```
backend/src/PIA.Domain          entities, enums, value objects, GeoCalculator, FaceMath
backend/src/PIA.Application     abstractions (interfaces), DTOs, options, notification catalog
backend/src/PIA.Infrastructure  EF Core + migrations, all service implementations, ONNX/Rekognition/PlayIntegrity clients, background jobs
backend/src/PIA.Api             controllers, middleware, auth policies, Program.cs
backend/tests/PIA.Tests         xUnit test suite
tools/PIA.FaceBench             offline FAR/FRR/APCER/BPCER calibration harness (see "Face verification" below)
frontend/                       Expo (React Native) app, TypeScript, New Architecture
database/                       generated migration script (schema.generated.sql), not hand-written SQL
```

`PIA.Api` never references EF Core directly — every controller depends on an `Application`-layer
interface implemented in `Infrastructure`. This is what makes it structurally impossible for a
controller to bypass an ownership/scoping check by writing its own query, which was v1's largest
bug class (six controllers each re-implementing, or forgetting, the same check).

---

## Prerequisites

| Requirement | Notes |
|---|---|
| .NET 8 SDK | Backend runtime |
| MySQL Server 8.0 | Running locally or reachable — no Docker Compose is bundled |
| Node.js 20+, npm | Frontend tooling |
| Android device or emulator with Expo Dev Client | **Not** Expo Go — VisionCamera's native module requires a custom dev client build |

---

## Backend setup

```bash
cd backend/src/PIA.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=pia_internship_system;User=root;Password=<yours>;AllowPublicKeyRetrieval=True;SslMode=None;"
dotnet user-secrets set "Jwt:Key" "<a random 64+ character string - startup refuses to boot on a short key or the literal placeholder>"
dotnet run
```

- The database and its full schema are created automatically on first run via
  `db.Database.Migrate()`. `database/schema.generated.sql` is the same migration exported as raw
  SQL, kept for reference/review — not something you need to run by hand.
- A default Admin account (`pia@admin.com`, see `AdminSeed` in `appsettings.json` for the
  password) is seeded on first boot if no Admin exists yet.
- Email (Gmail SMTP via MailKit) is optional in development. Without `Email:Username`/`Password`
  configured, welcome/reset emails queue in the `email_outbox_messages` table instead of sending —
  this is how this project's own live verification read temporary passwords during development:
  `SELECT html_body FROM email_outbox_messages WHERE to_address = '...'`.
- **Connection string / JWT key location:** `dotnet user-secrets` stores these outside the
  project folder entirely (under your Windows user profile, `%APPDATA%\Microsoft\UserSecrets\...`),
  specifically so they never end up committed to source control. They will not appear anywhere
  inside `appsettings.json` or any other file in this repo.

---

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your machine's LAN IP, not localhost
npx expo prebuild --clean
npx expo run:android   # builds and installs a dev client on a connected device/emulator
```

Expo Go will not work once VisionCamera is in the dependency tree — use the dev client build
above, then `npx expo start --dev-client` for subsequent iterations.

---

## Running the test suite

```bash
cd backend/tests/PIA.Tests
dotnet test
```

25 tests, all passing as of this write-up:

| Area | What's covered |
|---|---|
| `GeoCalculator` | Haversine distance correctness, and every branch of the tri-state geofence classifier (Inside/Uncertain/Outside), including the good-GPS-fix carve-out and the accuracy-cap edge case |
| `PasswordPolicyService` | length, uppercase/lowercase/digit/symbol requirements, common-password blocklist, email/name-in-password rejection, current-password reuse rejection |
| `NotificationCatalogTests` | every template has a non-empty key/title/body, keys are unique and follow the dot-notation convention, and a curated list of mandatory workflow keys (document approval, GitHub review, certificate/ID card issuance, etc.) still exist in the catalog — this is the regression net that fails the build if a workflow silently stops notifying |
| `ParagraphMergeFieldReplacerTests` | proves the certificate merge engine correctly reconstructs a `{{InternName}}` token that Word has split across three separate runs (a hand-assembled OpenXml document, not a fixture file), and confirms a paragraph with no merge field is left completely untouched |

This is a meaningful slice, not exhaustive coverage. `GeoCalculator` and `PasswordPolicyService`
were chosen because they're pure/near-pure logic, testable without a database. The larger
attendance/enrollment pipeline (challenge generation, video-replay detectors, risk scoring) was
instead verified live against a real MySQL instance during development, curl-by-curl, and is not
currently covered by automated integration tests — `Testcontainers.MySql` is referenced in the
test project for this purpose but unused, since Docker's daemon was not running in the development
environment. Standing this up is the natural next step for anyone continuing this project.

---

## What's implemented, by phase

1. **Spine** — EF Core entities/migrations, JWT auth with a mandatory password-reset gate,
   security-stamp token invalidation, RFC 7807 error responses, audit logging.
2. **Frontend spine** — theming (light/dark/system), navigation per role, auth flow.
3. **Departments/Mentors/Interns/Files/Email/Notifications** — CRUD, race-free intern-code
   generation, authenticated file serving (no public `/uploads`), the 28+ entry notification
   catalog with push + in-app delivery.
4. **Attendance core, part 1** — geofence + live capture, no ML gating yet.
5. **Attendance core, part 2** — challenge-response liveness, ONNX face match + passive
   anti-spoofing, and a from-scratch video-replay-defense subsystem: parallax/homography residual,
   specular temporal analysis, rolling-shutter banding (with an explicit Pakistan 50Hz-mains-flicker
   guard band), moiré detection, and compression-artifact forensics.
6. **Documents + verification** — upload/versioning, a passport-background validator, a computed
   verification state machine gating attendance.
7. **Mentor features** — GitHub review (SSRF-safe: the submitted URL is validated by regex, never
   fetched server-side), project assignment, certificate templates (a real docx merge-field engine
   that survives Word's run-splitting), ID cards (with the intern's actual photo embedded, unlike
   v1's blank placeholder box).
8. **Admin features + dashboards** — role-scoped KPI/trend/donut dashboards, the attendance review
   queue and manual-override workflow, attendance history with CSV export, department-grouped
   certificate/ID-card issuance with bulk-issue.
9. **Hardening** — see [Known limitations](#known-limitations) below.

---

## Face verification & anti-spoofing

Model files (`facenet.onnx` for face matching, `minifasnet.onnx` for liveness) are included in
this repo under `backend/src/PIA.Infrastructure/Assets/Models/` — see the README there for what
each one does and where it came from. If either file is ever missing, the app degrades gracefully
to geofence-only attendance rather than crashing.

**What this defends against:** printed photos, ID cards, and stills displayed on a phone/tablet
screen are rejected via the challenge-response liveness check plus the video-replay-defense
subsystem (parallax residual, specular temporal analysis, banding, moiré, compression forensics),
fused into a single risk score. A second person performing the challenge perfectly in front of
someone else's phone is rejected by the face-match/cross-identity check — the requirement v1's
hardcoded `livenessScore = 85` never actually tested.

**What this doesn't defend against, and doesn't claim to:** camera-injection attacks (a virtual
camera driver feeding pre-recorded frames directly into the OS camera pipeline, bypassing the
physical lens entirely) and a real-time deepfake/face-swap feed are outside what any of these
detectors can see, because they never touch the physical light reaching the sensor. Closing this
gap requires a certified commercial liveness SDK; this system's honest position is "meaningfully
raises the cost of casual spoofing," not "unspoofable."

**Before trusting any accuracy numbers:** `tools/PIA.FaceBench` (FAR/FRR/APCER/BPCER calibration)
exists and builds, but has not been run against a real, labeled dataset of live/print/replay
attempts in this environment. Until that's done against your own data, no FAR/FRR/APCER/BPCER
numbers should be reported or trusted for this deployment — a fabricated number here would be
strictly worse than an honest "not yet measured."

---

## Known limitations

- **AWS Rekognition provider — not implemented, and here's why.** `FaceProviderName.AwsRekognition`
  and `FaceTemplate.ExternalFaceId`/`ExternalCollection` were reserved early on for this swap, and
  the AWS SDK packages are referenced. Implementing it was attempted and stopped deliberately:
  `IFaceVerificationProvider.ExtractEmbeddingAsync` returns a `float[]` embedding, but AWS
  Rekognition's public API (`CompareFaces`/`IndexFaces`/`SearchFaces`/`SearchFacesByImage`) **never
  exposes a raw embedding vector to the caller** — confirmed against AWS's own documentation, not
  assumed. Rekognition's actual model is collection-based (index a face once, search a probe image
  against the collection later), which is a structurally different call shape than "extract two
  vectors, cosine-compare them" and would require extending the interface and touching every call
  site in the (already live-tested) enrollment/attendance matching logic. That redesign is scoped
  and written up as a plan, not code, because there was no real AWS account available to verify a
  rewrite of a security-critical pipeline against, and shipping an untested rewrite of working
  anti-spoofing logic was judged the wrong trade. The concrete next step for whoever picks this up:
  add `CompareImagesAsync(imageA, imageB)` (backed by Rekognition's `CompareFaces` for the two
  enrollment-time image-vs-image checks, which need no collection) and
  `CreateReferenceAsync`/`MatchProbeAsync` (backed by `IndexFaces`/`SearchFacesByImage`, for the
  one attendance-time check that needs a persisted reference) to `IFaceVerificationProvider`,
  update the two call sites in `AttendanceService.cs`/`FaceEnrollmentService.cs`, and re-run the
  full adversarial test protocol before trusting it.
- **Play Integrity — real client, off by default, not verified against a real device.** A genuine
  Google Play Integrity API client (`GooglePlayIntegrityVerifier`) is implemented and wired into
  the attendance submit path, graded `Off → FlagOnly → Enforce` via `PlayIntegrity:Mode`. Its
  method signatures were verified against the actual installed `Google.Apis.PlayIntegrity.v1`
  package (constructed a throwaway console project and reflected over the real assembly), not
  assumed from training knowledge. What has **not** happened: an actual Google Cloud project +
  Play Console listing + real Android device sending a real integrity token. Mode defaults to
  `Off` for exactly this reason — enforcing an unmeasured signal risks locking out honest devices.
  `DeviceBinding` rows are still populated on every attempt (device/verdict audit trail) regardless
  of mode.
- **Media retention job** — `IFileStorage.PurgeAsync` (new; `SoftDeleteAsync` only ever revoked
  access, never freed disk space) actually deletes attendance selfie/challenge-frame bytes once
  `AttendanceMedia.RetentionExpiresAtUtc` passes. Verified live: ran the job via
  `POST /api/admin/jobs/media-retention/run` against real data and confirmed `processed` counts
  and `PurgedAtUtc` timestamps.
- **Admin biometric erase** — verified live: revokes an intern's active `FaceTemplate`, flips
  `FaceEnrollmentStatus` to `Revoked`, and notifies the intern.
- **Android release signing — needs your keystore, not included.** `eas.json` has
  development/preview/production build profiles, but no signing credentials are configured or
  bundled (correctly — a keystore should never live in source control). To produce a signed
  release AAB: generate/obtain a Play Console upload keystore, configure it via
  `eas credentials` or a local Gradle signing config, then
  `eas build --profile production --platform android` (or
  `npx expo run:android --variant release` for a local build). No signed build has been produced
  in this environment.
- **Device binding at the JWT/session layer** — not built. `DeviceBinding` (and the per-session
  `DeviceId` already captured on every attendance attempt) gives you a device *audit trail*, which
  is what's implemented. Binding *login sessions themselves* to a device (rejecting a stolen JWT
  replayed from a different device) would mean adding a device claim to token issuance and
  refresh-token validation — a real auth-flow change, deliberately not made this late without
  being able to test it against every login path (first-login/password-reset scope, refresh,
  logout-all) that currently works.

---

## Packaging

No pre-built release artifact ships in this repository — see "Android release signing" above for
why. Backend packaging was actually run and verified in this environment:

```bash
cd backend/src/PIA.Api
dotnet publish -c Release -o ../../publish/api   # verified: builds and publishes cleanly
```

The frontend build command below is standard EAS usage and does not need signing credentials for
a preview/internal APK, but it was **not** run in this environment (no configured EAS account, and
a local build additionally needs the Android SDK/NDK toolchain) — treat it as documentation, not
a verified step:

```bash
cd frontend
eas build --profile preview --platform android --local
```

Zip `backend/publish/`, `database/schema.generated.sql`, this README, and the built `.apk`/`.aab`
together for distribution. A `dotnet ef migrations script --idempotent` run against
`PIA.Infrastructure` will regenerate `database/schema.generated.sql` if the schema changes.
