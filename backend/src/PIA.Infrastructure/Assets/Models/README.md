# Face verification models

This folder is intentionally empty in source control. `IFaceVerificationProvider` (via
`OnnxFaceVerificationProvider`) looks here at runtime for two files and runs in graceful
**NotConfigured** mode - identical in spirit to the Email/SMTP fallback - if either is missing.
Nothing crashes; face match and passive anti-spoofing simply report "not configured" until real
weights are dropped in here.

| File | Purpose | Expected shape |
|---|---|---|
| `facenet.onnx` | Face embedding | Input `1x3x160x160` RGB, `(pixel-127.5)/128`, CHW. Output: a single `512`-dim embedding vector (L2-normalized by the provider after inference). Converted from the official `timesler/facenet-pytorch` weights (MIT-licensed code; weights pretrained on VGGFace2) - see `LICENSES.md` in this folder for the exact source, SHA-256, and licensing notes recorded for this specific file. |
| `minifasnet.onnx` | Passive anti-spoofing (PAD) | Input `1x3x80x80` BGR, `pixel/255`, CHW. Output: 3-class logits in the order `[live, print-attack, replay-attack]` (softmax applied by the provider). |

## Sourcing guidance (do this before enabling face verification)

- **Do not use `buffalo_l` / the standard InsightFace ArcFace release weights** for anything other
  than research - those specific `.onnx` files are published under a non-commercial research
  license despite the InsightFace *code* itself being MIT. Using them in this system would create
  a real licensing liability the moment it left a personal research sandbox. This is why this
  project uses `facenet.onnx` (converted from `timesler/facenet-pytorch`, MIT code license)
  instead - see `LICENSES.md` for the recorded commercial-use verdict on this specific file.
- Before placing any `.onnx` file here, record its source URL, SHA-256, and a commercial-use
  verdict in `LICENSES.md` in this same folder. A CI check (Phase 9) is expected to fail the build
  if a model file has no corresponding entry - don't skip this step even for a "just testing" file.
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