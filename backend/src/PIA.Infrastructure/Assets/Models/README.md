# Face verification models

This folder contains the two AI model files used for face verification: `facenet.onnx` and
`minifasnet.onnx`. Both are already included in this repo, so face verification works right away
after cloning - no extra downloads or setup needed for the models.

If either file is ever missing, the app doesn't crash - it just falls back to geofence-only
attendance (no face check) until the files are restored.

## What each file does

| File | Purpose |
|---|---|
| `facenet.onnx` | Compares a live face to the enrolled face to verify identity (the actual "is this the same person" check). |
| `minifasnet.onnx` | Checks that the camera is looking at a real, live face - not a printed photo or a video replay. |

## Where these came from

- **`facenet.onnx`** - converted from the official, MIT-licensed `facenet-pytorch` project
  (https://github.com/timesler/facenet-pytorch). The common alternative (InsightFace's
  `buffalo_l`/ArcFace weights) is research-only licensed and was deliberately avoided to keep this
  usable for PIA's actual deployment. `convert_facenet_to_onnx.py` in this folder reproduces
  `facenet.onnx` exactly, in case it's ever lost.
- **`minifasnet.onnx`** - from the Silent-Face-Anti-Spoofing project, Apache-2.0 licensed
  (https://huggingface.co/garciafido/minifasnet-v2-anti-spoofing-onnx).

Full details (exact download links, file checksums, license notes) are in `LICENSES.md` in this
same folder.

## Before trusting results in production

Run `tools/PIA.FaceBench` against a small set of your own test photos first - having the right
files in place doesn't guarantee good accuracy for your specific users and devices until it's
actually been tested.
