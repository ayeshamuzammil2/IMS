# Model file provenance

One row per `.onnx` file placed in this folder. No file should be added without a row here - see
`README.md` for why this matters (the ArcFace/buffalo_l weight-licensing trap specifically).

| File | Source URL | SHA-256 | Commercial-use verdict | Added by | Date |
|---|---|---|---|---|---|
| `facenet.onnx` | https://github.com/timesler/facenet-pytorch (converted from `.pt` to ONNX) | `459d3ffd6c73b7490168af27d39aa433a5aa87ce084e7514e560acc9cbb9917d` | Code license (MIT) is clear; weights pretrained on VGGFace2 (Oxford), an academic-terms dataset - clearer than InsightFace buffalo_l but not a guaranteed-clean commercial license. Recorded here per project policy; confirm with a lawyer before relying on this for PIA's production rollout. | Ayesha | 2026-08-20 |
| `minifasnet.onnx` | https://huggingface.co/garciafido/minifasnet-v2-anti-spoofing-onnx | `d7b3cd9ba8a7ceb13baa8c4720902e27ca3112eff52f926c08804af6b6eecc7b` | Apache-2.0, sourced from the minivision-ai Silent-Face-Anti-Spoofing project. Clear for commercial use. | Ayesha | 2026-08-20 |