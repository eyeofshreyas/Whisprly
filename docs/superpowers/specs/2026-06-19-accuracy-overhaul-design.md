# Accuracy Overhaul — Design Spec
*Branch: `feat/accuracy-overhaul` | Locked baseline: `v1.0-stable`*
*Date: 2026-06-19*

---

## Problem

WisperFlow's primary accuracy failure mode is **hallucinations in quiet environments** — short or accidental hotkey presses cause Whisper to output garbage text ("Thank you for watching", etc.) because:

1. The RMS energy gate (0.015 threshold) cannot distinguish real speech from electrical noise floor or very faint sounds.
2. The local model (`base`) has high baseline WER (~15%), making it prone to hallucinating on marginal audio.
3. Neither the Groq nor local path uses Whisper's internal `no_speech_prob` confidence score — all output is accepted as valid text.

---

## Goals

- Eliminate quiet-room hallucinations from short/accidental presses.
- Lower local transcription WER significantly without changing the cloud path model.
- Keep the existing fallback chain (Groq → local) intact.
- No regressions on the Groq path.

---

## Non-Goals

- Streaming / real-time partial transcription.
- Audio denoising / spectral subtraction (deferred to future iteration).
- Rust-native VAD (Silero in Python server is sufficient and avoids ort crate complexity).

---

## Architecture

### Pipeline Before

```
Audio capture → RMS trim → WAV encode
             → Groq (response_format=text) → hallucination wordlist
             OR local http.server → base model (text) → hallucination wordlist
             → LLM polish → type
```

### Pipeline After

```
Audio capture → RMS trim → min-duration gate (< 510ms speech → discard)
             → WAV encode
             → Groq (verbose_json) → no_speech_prob filter (> 0.6 → discard segment)
             OR FastAPI server → Silero VAD gate (< 20% speech ratio → reject entirely)
                              → small model (verbose) → no_speech_prob filter
             → join passing segments → LLM polish → type
```

---

## Components

### 1. `src-tauri/src/audio.rs` — Minimum Duration Gate

After `trim_silence()`, count 30ms speech frames (480 samples each at 16kHz).  
If total speech frames < 17 (< 510ms of actual speech), do **not** send to `chunk_tx`.

**Why 510ms:** Sub-500ms utterances are almost always accidental presses. Real words take at least 300ms; a complete syllable pair is ~500ms. This is a zero-cost gate — no encoding, no network call.

### 2. `sidecar/whisper_server.py` — FastAPI + Silero VAD + Model Upgrade

**Replace:** `http.server.BaseHTTPRequestHandler`  
**With:** FastAPI + uvicorn (async, concurrent-safe)

**Silero VAD pre-filter:**
- Load `silero-vad` ONNX model at server startup (alongside Whisper model).
- On each `/transcribe` request: run Silero VAD on the audio file.
- Compute speech ratio = (frames with speech probability ≥ 0.5) / total frames.
- If speech ratio < 0.2 → return `{"text": "", "no_speech": true}` immediately. Whisper does not run.

**Model upgrade:** `WhisperModel("small", device="cpu", compute_type="int8")`
- `small` ≈ 40% lower WER than `base` on standard benchmarks.
- Size: ~145MB (vs 74MB for `base`). First run downloads automatically via faster-whisper.
- Speed on CPU: ~2–3s for a 5s clip (acceptable for local fallback path).

**Verbose response format:**
```json
{
  "segments": [
    {"text": "Hello world.", "no_speech_prob": 0.02},
    {"text": "How are you?", "no_speech_prob": 0.04}
  ]
}
```

**Fallback behavior:** If `silero-vad` import fails at startup, log a warning and skip the VAD gate — Whisper still runs, `no_speech_prob` filter is still active.

### 3. `sidecar/requirements.txt` — New Dependencies

Add:
```
fastapi
uvicorn[standard]
silero-vad
```

`silero-vad` pulls in `onnxruntime` automatically.

### 4. `src-tauri/src/transcribe.rs` — Confidence Filtering

**Groq path:**
- Change `response_format` from `text` to `verbose_json`.
- Parse `segments` array. Filter out any segment where `no_speech_prob > 0.6`.
- Join remaining segment texts with a space.
- If no segments pass the filter → return `Err("no_speech")` (treated as empty by coordinator).
- **Fallback:** If JSON parsing fails (unexpected Groq response shape), fall back to reading top-level `text` field (preserves current behavior).

**Local path:**
- Parse the new verbose JSON response from FastAPI.
- Apply identical `no_speech_prob > 0.6` filter.
- The existing hallucination wordlist runs after as a final guard.

---

## Error Handling

| Failure | Behavior |
|---|---|
| FastAPI server not running | 30s timeout → coordinator emits "Nothing transcribed" → idle |
| `silero-vad` not installed | VAD gate skipped, Whisper runs, `no_speech_prob` still filters |
| All segments filtered | Treated as empty result → "Nothing transcribed" → idle |
| `small` model not cached | Downloads on first startup (~145MB). Startup log warns user. |
| Groq verbose_json parse error | Falls back to top-level `text` field |
| Min-duration gate fires | Silent discard, overlay hides, status → idle |

---

## Files Changed

| File | Change |
|---|---|
| `src-tauri/src/audio.rs` | Add min-duration gate after `trim_silence()` |
| `sidecar/whisper_server.py` | FastAPI rewrite + Silero VAD + small model + verbose response |
| `sidecar/requirements.txt` | Add fastapi, uvicorn, silero-vad |
| `src-tauri/src/transcribe.rs` | Groq + local paths → verbose_json + no_speech_prob filter |

No changes to `lib.rs`, `App.tsx`, or the settings schema.

---

## Thresholds (tunable)

| Parameter | Value | Rationale |
|---|---|---|
| Min duration gate | 510ms (17 × 30ms frames) | Below this, accidental press |
| Silero speech ratio | 0.20 | < 20% speech frames = not dictation |
| no_speech_prob cutoff | 0.60 | Whisper's own internal confidence; > 0.6 = low confidence |
| Local model | `small` | Best WER/speed trade-off on CPU without GPU |
