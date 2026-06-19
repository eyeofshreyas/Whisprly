# Accuracy Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate quiet-room hallucinations from short/accidental hotkey presses by adding a Rust-side minimum-duration gate, upgrading the local Whisper model from `base` → `small` with built-in Silero VAD filtering, and switching both the Groq and local transcription paths to `verbose_json` responses with `no_speech_prob` confidence filtering.

**Architecture:** Three coordinated layers: (1) Rust `audio.rs` gate discards audio with < 17 speech frames (510ms) before encoding; (2) Python `whisper_server.py` rewritten to FastAPI with `vad_filter=True` (faster-whisper's built-in Silero VAD) and upgraded to `small` model; (3) Rust `transcribe.rs` parses `verbose_json` from both Groq and local, discarding segments with `no_speech_prob > 0.6`.

**Tech Stack:** Rust/Tauri (existing), Python 3, faster-whisper ≥ 1.0.0 (existing, bundles Silero VAD ONNX), FastAPI, uvicorn, reqwest (existing), serde_json (existing).

## Global Constraints

- Branch: `feat/accuracy-overhaul`. Push after every task.
- Baseline tag `v1.0-stable` must remain untouched on `main`.
- No new Rust crates — serde_json and reqwest are already in Cargo.toml.
- `no_speech_prob` filter threshold: **0.6** (segments with prob > 0.6 are discarded).
- Min-duration gate: **17 speech frames × 480 samples = 510ms** at 16kHz.
- Local model: `"small"` with `compute_type="int8"` on CPU.
- Python server port stays **11435** (hardcoded in transcribe.rs local path).
- `vad_filter=True` uses faster-whisper's bundled Silero VAD ONNX — no extra pip packages.

---

## File Map

| File | Change |
|---|---|
| `src-tauri/src/audio.rs` | Add min-duration gate after `trim_silence()` in `record()` |
| `sidecar/requirements.txt` | Add `fastapi`, `uvicorn[standard]` |
| `sidecar/whisper_server.py` | Full rewrite: FastAPI + `small` model + `vad_filter=True` + verbose segments response |
| `src-tauri/src/transcribe.rs` | Add `filter_segments()` helper; Groq path → `verbose_json`; local path → parse new verbose response |

No changes to `lib.rs`, `App.tsx`, `index.css`, or any settings schema.

---

## Task 1: Min-Duration Gate in `audio.rs`

**Files:**
- Modify: `src-tauri/src/audio.rs:125-129` (the final send block in `record()`)
- Test: `src-tauri/src/audio.rs` (existing `#[cfg(test)]` module, add 2 tests)

**Interfaces:**
- Consumes: `trim_silence()` → `&[f32]`, `is_speech_frame(&[f32])` → `bool` (both already defined in this file)
- Produces: `chunk_tx.send()` now only fires when speech frame count ≥ 17

- [ ] **Step 1: Add the gate and a log line**

In `src-tauri/src/audio.rs`, replace lines 125–129:

```rust
    // Trim leading/trailing silence and send a single unified audio buffer
    let trimmed = trim_silence(&resampled);
    if !trimmed.is_empty() && !is_silent(trimmed) {
        chunk_tx.send(trimmed.to_vec()).ok();
    }
```

With:

```rust
    // Trim leading/trailing silence and apply minimum-duration gate.
    // Each speech frame is 480 samples = 30ms at 16kHz.
    // Fewer than 17 frames (< 510ms) = accidental press; discard silently.
    let trimmed = trim_silence(&resampled);
    if !trimmed.is_empty() && !is_silent(trimmed) {
        let speech_frames = trimmed.chunks(480)
            .filter(|frame| is_speech_frame(frame))
            .count();
        if speech_frames >= 17 {
            chunk_tx.send(trimmed.to_vec()).ok();
        } else {
            eprintln!("[audio] discarding: only {} speech frames (need ≥17)", speech_frames);
        }
    }
```

- [ ] **Step 2: Write two tests in the existing `#[cfg(test)]` block**

At the bottom of the `mod tests` block in `src-tauri/src/audio.rs`, add:

```rust
    #[test]
    fn min_duration_gate_rejects_short_audio() {
        // 10 speech frames = 300ms — below 510ms gate
        let short = vec![0.5f32; 480 * 10];
        let count = short.chunks(480)
            .filter(|f| is_speech_frame(f))
            .count();
        assert!(count < 17, "10 speech frames must be below gate (got {count})");
    }

    #[test]
    fn min_duration_gate_passes_long_audio() {
        // 20 speech frames = 600ms — above 510ms gate
        let long = vec![0.5f32; 480 * 20];
        let count = long.chunks(480)
            .filter(|f| is_speech_frame(f))
            .count();
        assert!(count >= 17, "20 speech frames must pass gate (got {count})");
    }
```

- [ ] **Step 3: Run the audio tests**

```bash
cd src-tauri && cargo test audio -- --nocapture
```

Expected output includes:
```
test audio::tests::min_duration_gate_rejects_short_audio ... ok
test audio::tests::min_duration_gate_passes_long_audio ... ok
```

All pre-existing audio tests must also pass.

- [ ] **Step 4: Commit and push**

```bash
git add src-tauri/src/audio.rs
git commit -m "feat(audio): add 510ms min-duration gate to discard accidental presses"
git push -u origin feat/accuracy-overhaul
```

---

## Task 2: Python Server — FastAPI + `small` Model + Silero VAD + Verbose Response

**Files:**
- Modify: `sidecar/requirements.txt`
- Rewrite: `sidecar/whisper_server.py`

**Interfaces:**
- Consumes: same request body as before: `{"file": "<path>", "language": "<lang>|null", "prompt": "<text>|null"}`
- Produces: new response shape: `{"segments": [{"text": "...", "no_speech_prob": 0.02}, ...]}`
  - Empty segments list `{"segments": []}` when VAD finds no speech.
  - Task 4 depends on this exact shape.

- [ ] **Step 1: Update requirements.txt**

Replace the contents of `sidecar/requirements.txt` with:

```
faster-whisper>=1.0.0
fastapi
uvicorn[standard]
```

No `silero-vad` needed — faster-whisper ≥ 1.0.0 bundles the Silero VAD ONNX model internally. `vad_filter=True` activates it.

- [ ] **Step 2: Rewrite whisper_server.py**

Replace the entire contents of `sidecar/whisper_server.py` with:

```python
#!/usr/bin/env python3
"""
Persistent local Whisper transcription server.
Loads faster-whisper 'small' model + Silero VAD once at startup.
POST /transcribe  →  {"segments": [{"text": "...", "no_speech_prob": 0.02}]}
"""
import os
import sys
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from faster_whisper import WhisperModel
from pydantic import BaseModel

_model: Optional[WhisperModel] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    print("[whisper_server] Loading 'small' model (first run may download ~145MB)...", flush=True)
    try:
        _model = WhisperModel("small", device="cpu", compute_type="int8")
        print("[whisper_server] Model ready.", flush=True)
    except Exception as exc:
        print(f"[whisper_server] Failed to load model: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
    yield


app = FastAPI(lifespan=lifespan)


class TranscribeRequest(BaseModel):
    file: str
    language: Optional[str] = None
    prompt: Optional[str] = None


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest):
    if not os.path.exists(req.file):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {req.file}")

    try:
        segments_gen, _ = _model.transcribe(
            req.file,
            beam_size=5,
            language=req.language or None,
            initial_prompt=req.prompt or None,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )
        segments = [
            {"text": seg.text.strip(), "no_speech_prob": seg.no_speech_prob}
            for seg in segments_gen
            if seg.text.strip()
        ]
        return {"segments": segments}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=11435, log_level="error")
```

- [ ] **Step 3: Install updated dependencies**

```bash
cd sidecar
pip install -r requirements.txt
```

Expected: fastapi and uvicorn install cleanly. faster-whisper already present.

- [ ] **Step 4: Smoke-test the server manually**

In one terminal:
```bash
cd sidecar
python3 whisper_server.py
```

Expected output:
```
[whisper_server] Loading 'small' model (first run may download ~145MB)...
[whisper_server] Model ready.
```

In a second terminal, record a short WAV file (or use any existing WAV at 16kHz mono) and test:
```bash
curl -s -X POST http://127.0.0.1:11435/transcribe \
  -H "Content-Type: application/json" \
  -d '{"file": "/tmp/test.wav", "language": null, "prompt": null}' | python3 -m json.tool
```

Expected shape (actual text varies):
```json
{
    "segments": [
        {
            "text": "Hello world.",
            "no_speech_prob": 0.03
        }
    ]
}
```

For a silent WAV, expect:
```json
{"segments": []}
```

Stop the server with Ctrl+C.

- [ ] **Step 5: Commit and push**

```bash
git add sidecar/requirements.txt sidecar/whisper_server.py
git commit -m "feat(sidecar): rewrite to FastAPI, upgrade model base→small, enable Silero VAD"
git push
```

---

## Task 3: `transcribe.rs` — Shared Helper + Groq verbose_json

**Files:**
- Modify: `src-tauri/src/transcribe.rs`

**Interfaces:**
- Consumes: Groq API `verbose_json` response (shape: `{"segments": [{"text": "...", "no_speech_prob": 0.02}], "text": "..."}`)
- Produces: `filter_segments(&serde_json::Value) -> Option<String>` — used by both Groq and local paths (Task 4 depends on this exact function name and signature)

- [ ] **Step 1: Write tests for `filter_segments` before implementing it**

Add a new test block at the bottom of `src-tauri/src/transcribe.rs` inside the existing `mod tests {}`:

```rust
    #[test]
    fn filter_segments_keeps_low_no_speech_prob() {
        let json = serde_json::json!({
            "segments": [
                {"text": "Hello world.", "no_speech_prob": 0.02},
                {"text": "How are you?", "no_speech_prob": 0.04}
            ]
        });
        assert_eq!(
            filter_segments(&json),
            Some("Hello world. How are you?".to_string())
        );
    }

    #[test]
    fn filter_segments_rejects_high_no_speech_prob() {
        let json = serde_json::json!({
            "segments": [
                {"text": "Thank you for watching.", "no_speech_prob": 0.85},
                {"text": "Please subscribe.", "no_speech_prob": 0.92}
            ]
        });
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_partial_filter() {
        let json = serde_json::json!({
            "segments": [
                {"text": "Good segment.", "no_speech_prob": 0.1},
                {"text": "Bad segment.", "no_speech_prob": 0.75}
            ]
        });
        assert_eq!(
            filter_segments(&json),
            Some("Good segment.".to_string())
        );
    }

    #[test]
    fn filter_segments_returns_none_on_missing_key() {
        // Groq fallback: no "segments" key → None → caller uses top-level "text"
        let json = serde_json::json!({"text": "Hello world."});
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_returns_none_on_empty_array() {
        let json = serde_json::json!({"segments": []});
        assert_eq!(filter_segments(&json), None);
    }
```

- [ ] **Step 2: Run tests — verify they fail (function not yet defined)**

```bash
cd src-tauri && cargo test transcribe -- --nocapture 2>&1 | head -20
```

Expected: compile error — `filter_segments` not found.

- [ ] **Step 3: Add `filter_segments` helper above the `groq()` function**

In `src-tauri/src/transcribe.rs`, add this function before `pub async fn groq(`:

```rust
fn filter_segments(json: &serde_json::Value) -> Option<String> {
    let segments = json["segments"].as_array()?;
    let text: String = segments
        .iter()
        .filter(|seg| seg["no_speech_prob"].as_f64().unwrap_or(1.0) <= 0.6)
        .filter_map(|seg| seg["text"].as_str())
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    if text.is_empty() { None } else { Some(text) }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd src-tauri && cargo test transcribe -- --nocapture
```

Expected: all 5 new tests pass, plus the 3 pre-existing language tests.

- [ ] **Step 5: Update Groq path to use `verbose_json` and `filter_segments`**

In `src-tauri/src/transcribe.rs`, inside `pub async fn groq(...)`, make two changes:

**Change 1** — switch response format in the form builder. Find:
```rust
    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "text")
        .text("prompt", prompt_str)
        .part("file", file_part);
```

Replace with:
```rust
    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "verbose_json")
        .text("prompt", prompt_str)
        .part("file", file_part);
```

**Change 2** — replace the text-parsing block at the bottom of `groq()`. Find:
```rust
    let text = response.text().await.map_err(|e| e.to_string())?;
    let trimmed = text.trim().to_string();

    if is_hallucination(&trimmed) {
        return Err("hallucination".into());
    }

    Ok(trimmed)
```

Replace with:
```rust
    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    // Primary path: filter segments by no_speech_prob
    // Fallback: use top-level "text" if "segments" key is absent (unexpected response shape)
    let text = filter_segments(&json)
        .or_else(|| json["text"].as_str().map(|t| t.trim().to_string()))
        .ok_or_else(|| "no_speech".to_string())?;

    if is_hallucination(&text) {
        return Err("hallucination".into());
    }

    Ok(text)
```

- [ ] **Step 6: Cargo check**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: no errors. (Unit tests for groq() require a live API key so we skip them here.)

- [ ] **Step 7: Commit and push**

```bash
git add src-tauri/src/transcribe.rs
git commit -m "feat(transcribe): add filter_segments helper, switch Groq path to verbose_json"
git push
```

---

## Task 4: `transcribe.rs` — Local Path Verbose Parsing + Final Push

**Files:**
- Modify: `src-tauri/src/transcribe.rs` (local path only)

**Interfaces:**
- Consumes: `filter_segments(&serde_json::Value) -> Option<String>` from Task 3
- Consumes: FastAPI server response `{"segments": [{"text": "...", "no_speech_prob": 0.02}]}` from Task 2

- [ ] **Step 1: Write tests for the local path response parsing**

Add to `mod tests {}` in `src-tauri/src/transcribe.rs`:

```rust
    #[test]
    fn filter_segments_handles_server_empty_response() {
        // FastAPI returns {"segments": []} when Silero VAD finds no speech
        let json = serde_json::json!({"segments": []});
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_strips_whitespace_from_segment_text() {
        let json = serde_json::json!({
            "segments": [
                {"text": "  Hello.  ", "no_speech_prob": 0.01}
            ]
        });
        assert_eq!(filter_segments(&json), Some("Hello.".to_string()));
    }
```

- [ ] **Step 2: Run tests — verify they pass (filter_segments already implemented)**

```bash
cd src-tauri && cargo test transcribe -- --nocapture
```

Expected: all tests pass including the 2 new ones.

- [ ] **Step 3: Update the local path response parsing in `local()`**

In `src-tauri/src/transcribe.rs`, inside `pub async fn local(...)`, find:

```rust
    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let text = json["text"]
        .as_str()
        .ok_or_else(|| "No text returned from whisper server".to_string())?
        .trim()
        .to_string();

    if is_hallucination(&text) {
        return Err("hallucination".into());
    }

    Ok(text)
```

Replace with:

```rust
    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let text = filter_segments(&json)
        .ok_or_else(|| "no_speech".to_string())?;

    if is_hallucination(&text) {
        return Err("hallucination".into());
    }

    Ok(text)
```

- [ ] **Step 4: Full Rust test suite**

```bash
cd src-tauri && cargo test -- --nocapture
```

Expected: all tests pass. Note the output:
- `audio::tests::*` — all pass
- `transcribe::tests::*` — all pass (10 total)

- [ ] **Step 5: Cargo clippy — no warnings**

```bash
cd src-tauri && cargo clippy 2>&1
```

Expected: no warnings. If any, fix before proceeding.

- [ ] **Step 6: End-to-end smoke test**

Start the app in dev mode:
```bash
npm run tauri dev
```

Test scenarios:
1. **Accidental short press** (tap and release hotkey in < 500ms) → overlay shows then hides, nothing typed, no hallucination.
2. **Silent room, hold 2 seconds** → overlay shows, releases → "Nothing transcribed", no hallucination.
3. **Normal dictation, 3–5 words** → transcript appears correctly in focused window.
4. **Local path** (disconnect internet or clear Groq key in settings, restart) → transcription still works via FastAPI server, no hallucinations on silence.

- [ ] **Step 7: Final commit and push**

```bash
git add src-tauri/src/transcribe.rs
git commit -m "feat(transcribe): update local path to parse verbose segments, apply no_speech_prob filter"
git push
```

- [ ] **Step 8: Open Pull Request**

```bash
gh pr create \
  --title "feat: accuracy overhaul — Silero VAD, small model, verbose_json confidence filtering" \
  --body "$(cat <<'EOF'
## Summary
- Adds 510ms minimum-duration gate in Rust (`audio.rs`) — discards accidental short presses before encoding
- Rewrites `whisper_server.py` to FastAPI with `vad_filter=True` (faster-whisper's built-in Silero VAD) and upgrades local model `base` → `small` (~40% lower WER)
- Switches Groq path to `verbose_json` response format; filters segments with `no_speech_prob > 0.6`
- Updates local path to parse new verbose segment response and apply same confidence filter

## Test plan
- [ ] `cargo test` passes (all audio + transcribe unit tests)
- [ ] Short accidental press produces no output
- [ ] Silent 2s hold produces no hallucination
- [ ] Normal dictation transcribes correctly (Groq path)
- [ ] Normal dictation transcribes correctly (local path, Groq key cleared)

Baseline locked at tag `v1.0-stable` on `main`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Appendix: Threshold Reference

| Parameter | Value | Where set |
|---|---|---|
| Min speech frames | 17 (510ms) | `audio.rs` gate |
| `vad_filter` min silence | 500ms | `whisper_server.py` `vad_parameters` |
| `no_speech_prob` cutoff | 0.6 | `transcribe.rs` `filter_segments()` |
| Local model | `small` int8 CPU | `whisper_server.py` |
| Groq model | `whisper-large-v3-turbo` | `transcribe.rs` (unchanged) |
