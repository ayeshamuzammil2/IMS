# Face verification models

`OnnxFaceVerificationProvider` (via `IFaceVerificationProvider`) loads two `.onnx` files from this
folder at runtime, used for attendance and enrollment. **Both files are already committed here** -
if you've just cloned this repo, face verification should work out of the box, no extra setup
needed for the models themselves.

If either file is ever missing (e.g. removed by a `.gitignore` mistake, or you're setting this
project up somewhere models aren't tracked), the app doesn't crash - it degrades gracefully to
**NotConfigured** mode (identical in spirit to the Email/SMTP fallback): face match and passive
anti-spoofing simply report "not configured", and attendance falls back to geofence-only, until
the files are restored.

## Quick check when setting this project up

1. Confirm both files exist in this exact folder: `facenet.onnx` and `minifasnet.onnx`.
2. Run the backend as usual (`dotnet run` from `backend/src/PIA.Api`). Startup logs and the first
   enrollment/attendance attempt should behave normally - no "NotConfigured" warnings.
3. Before trusting results in production, run `tools/PIA.FaceBench` against a small labeled sample
   set of your own (see the root README) - shape-correctness doesn't guarantee real-world accuracy
   on your specific users/devices.

## File reference

| File | Purpose | Expected shape |
|---|---|---|
| `facenet.onnx` | Face embedding | Input `1x3x160x160` RGB, `(pixel-127.5)/128`, CHW. Output: a single `512`-dim embedding vector (L2-normalized by the provider after inference). |
| `minifasnet.onnx` | Passive anti-spoofing (PAD) | Input `1x3x80x80` **BGR**, `pixel/255`, CHW. Output: 3-class logits in the order `[live, print-attack, replay-attack]` (softmax applied by the provider). |

Full provenance (source URL, SHA-256, license verdict) for both files is recorded in
`LICENSES.md` in this same folder - check there before swapping either file out.

## Why `facenet.onnx` and not the more common ArcFace weights

**Do not replace `facenet.onnx` with `buffalo_l` / the standard InsightFace ArcFace release
weights** unless you've separately cleared it for commercial use. Those specific `.onnx` files are
published under a non-commercial research license despite the InsightFace *code* itself being MIT
- using them in a system that leaves a personal research sandbox (like PIA's real deployment)
creates a real licensing liability. `facenet.onnx` was chosen instead specifically because its code
license (from `timesler/facenet-pytorch`, MIT) is clearer, though its VGGFace2 training data still
carries academic-terms provenance worth a legal read before relying on it at scale - see the
verdict recorded in `LICENSES.md`.

If `facenet.onnx` is ever lost and needs regenerating, it was produced by converting the official
`timesler/facenet-pytorch` PyTorch weights to ONNX - `convert_facenet_to_onnx.py` in this folder
reproduces it exactly (`pip install torch facenet-pytorch onnx`, then run the script).

## Sourcing guidance for any future model swap

- Before placing any new `.onnx` file here, record its source URL, SHA-256, and a commercial-use
  verdict in `LICENSES.md`. A CI check (Phase 9) is expected to fail the build if a model file has
  no corresponding entry - don't skip this step even for a "just testing" file.
- If no commercially-clear embedding model can be sourced, the `FaceProviderName.AwsRekognition`
  enum value and `FaceTemplate.ExternalFaceId`/`ExternalCollection` columns are already reserved
  for a cloud-provider swap - but see the root README's "AWS Rekognition" section before assuming
  that swap is a drop-in `IFaceVerificationProvider` implementation. It genuinely is not: AWS
  Rekognition's public API never returns a raw embedding, so honoring this interface as designed
  would mean fabricating vector data. A real integration needs a small, deliberate interface
  change (collection-based IndexFaces/SearchFacesByImage) documented there, not an unlicensed model.
- MiniFASNet-family PAD models are more commonly released under permissive licenses (e.g. the
  Silent-Face-Anti-Spoofing project), but still verify and record the specific release you use.

## Verifying a new model reproduces the reference implementation

`tools/PIA.FaceBench` exists specifically so a crop-scale or preprocessing mismatch doesn't
silently halve accuracy with no visible error - run it against a small labeled sample set after
swapping in any new model file before trusting its numbers in production.