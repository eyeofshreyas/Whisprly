# WisperFlow Architecture Upgrade — Design Spec
**Date:** 2026-05-04
**Scope:** VAD, Chunking, SQLite persistence, Language detection

---

## Goal

Close the four largest functional gaps between WisperFlow and Super Whisper's pipeline: replace the crude silence gate with real VAD, enable mid-recording chunked transcription, persist transcripts to SQLite with full-text search, and expose language selection per-recording.

---

## 1. VAD — WebRTC VAD

**Crate:** `webrtcvad` (Rust bindings to Google's WebRTC VAD)

**Integration point:** `audio.rs` — replaces the `is_silent()` RMS gate.

**Behaviour:**
- Initialise VAD at aggressiveness level 2 (balanced false-positive/false-negative)
- Process 30ms frames of 16kHz mono PCM
- Emit `VadFrame::Speech` / `VadFrame::Silence` per frame
- Feed decisions into the Chunker

**Why WebRTC VAD:** Production-proven in VoIP, single lightweight C dependency, no ML runtime, three tunable aggressiveness levels. More accurate than RMS across variable mic gains and background noise.

---

## 2. Chunker

**Location:** New `audio.rs::Chunker` struct (lives alongside the recorder).

**Algorithm:**
1. Accumulate incoming 30ms VAD frames into an in-progress chunk buffer
2. On `VadFrame::Silence`: start a silence counter
3. If silence runs ≥ 500ms → flush the buffered speech frames as a complete chunk
4. On `VadFrame::Speech` after silence < 500ms → discard the silence counter (mid-word pause)
5. Emit completed chunks via `mpsc::Sender<Vec<f32>>` to the coordinator

**Edge cases:**
- If recording stops mid-speech (hotkey release), flush the in-progress buffer immediately regardless of silence gate
- Discard chunks shorter than 300ms — too short to contain real speech

**Coordinator change (`lib.rs`):** The coordinator switches from waiting for one WAV at the end to receiving chunks from the channel. Each chunk is independently encoded to WAV and transcribed. Results are concatenated in order and typed/stored as a single session entry.

---

## 3. SQLite Persistence

**Crate:** `rusqlite` with the `bundled` feature (no external SQLite install needed)

**New file:** `src-tauri/src/db.rs`

**Schema:**
```sql
CREATE TABLE transcripts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  text      TEXT    NOT NULL,
  raw_text  TEXT,
  engine    TEXT    NOT NULL,
  mode      TEXT    NOT NULL DEFAULT 'direct',
  language  TEXT,
  timestamp TEXT    NOT NULL
);

CREATE VIRTUAL TABLE transcripts_fts USING fts5(
  text, raw_text,
  content='transcripts', content_rowid='id'
);
```

**DB location:** `$APPDATA/wisperflow/transcripts.db` (via `tauri::api::path::app_data_dir`)

**AppState change:** Replace `Arc<Mutex<Vec<TranscriptEntry>>>` with `Arc<Mutex<Connection>>`.

**Tauri commands updated:**
- `get_transcript_log` — `SELECT * FROM transcripts ORDER BY timestamp DESC LIMIT 200`
- New `search_transcripts(query: String)` — queries FTS5 table, returns ranked matches

**Migration:** DB is created fresh on first launch; no migration needed at v1.

---

## 4. Language Detection

**Settings field:** Add `language: String` to `AppSettings` (default `"auto"`)

**Groq API change (`transcribe.rs`):** When `language != "auto"`, include `"language": "<iso-639-1>"` in the multipart form body. When `"auto"`, omit the field entirely and let Whisper detect.

**Local fallback (`transcribe.rs`):** Pass `--language <code>` to the Python sidecar args when set.

**Storage:** Detected/forced language stored in the `language` column of `transcripts`.

**Frontend:** Add a language dropdown to Settings (hardcoded list of common ISO-639-1 codes + "Auto").

---

## Data Flow (updated)

```
HotkeyEvent::Start
  └─ show overlay, emit "recording"
  └─ spawn thread → audio::record() + Chunker
        └─ VAD frames → Chunker → mpsc chunks

HotkeyEvent::Stop (or mid-recording chunk ready)
  └─ coordinator receives chunk
  └─ audio::to_wav(chunk)
  └─ transcribe::groq(wav, language) → on error → transcribe::local(wav, language)
  └─ is_hallucination() → drop
  └─ postprocess (LLM polish)
  └─ auto_type::type_text()
  └─ db::insert_transcript(...)
  └─ emit "transcript"
  └─ idle, hide overlay when all chunks done
```

---

## Affected Files

| File | Change |
|---|---|
| `src-tauri/src/audio.rs` | Add `Chunker` struct, integrate WebRTC VAD, replace `is_silent()` |
| `src-tauri/src/lib.rs` | Coordinator: consume chunk channel, update `AppState` to hold DB connection |
| `src-tauri/src/transcribe.rs` | Add `language` param to `groq()` and `local()` |
| `src-tauri/src/db.rs` | **New** — SQLite init, insert, query, FTS search |
| `src-tauri/Cargo.toml` | Add `webrtcvad`, `rusqlite` (bundled) |
| `src/App.tsx` | Language dropdown in settings, wire `search_transcripts` command |
| `src/index.css` | Minor: style for language selector and search input |

---

## Out of Scope

- Clipboard output path (deferred)
- OS toast notifications (deferred)
- Model cache / local Whisper weight management (deferred)
- UI redesign (separate track)
