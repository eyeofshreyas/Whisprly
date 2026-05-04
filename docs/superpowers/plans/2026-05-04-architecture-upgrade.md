# WisperFlow Architecture Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WebRTC VAD, silence-gated chunking, SQLite transcript persistence with FTS5 search, and per-recording language selection to WisperFlow.

**Architecture:** VAD (`webrtcvad` crate) classifies 30ms i16 frames; the `Chunker` struct buffers speech frames and flushes segments after 500ms of silence; each chunk is independently transcribed and stored in SQLite with an FTS5 virtual table; language flows as `Option<String>` through the transcription chain and is stored per-transcript.

**Tech Stack:** Rust, `webrtcvad = "0.4"`, `rusqlite = "0.31"` (bundled), Tauri v2, React/TypeScript

**Spec:** `docs/superpowers/specs/2026-05-04-architecture-upgrade-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src-tauri/Cargo.toml` | Modify | Add `webrtcvad`, `rusqlite` deps |
| `src-tauri/src/db.rs` | **Create** | SQLite init, CRUD, FTS5 search, `TranscriptEntry` struct |
| `src-tauri/src/audio.rs` | Modify | Add `Chunker` struct + `init_vad()`, integrate into `record()` |
| `src-tauri/src/lib.rs` | Modify | `AppState` db field, coordinator chunk loop, updated commands |
| `src-tauri/src/transcribe.rs` | Modify | `language: Option<String>` param on `groq()` + `local()` |
| `src/App.tsx` | Modify | Language dropdown in Settings, search input in History |
| `src/index.css` | Modify | Styles for `.search-input`, `.setting-row select` |

---

## Task 1: Add Cargo dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add dependencies**

In `src-tauri/Cargo.toml` under `[dependencies]`, add these two lines:

```toml
webrtcvad = "0.4"
rusqlite = { version = "0.31", features = ["bundled"] }
```

The `bundled` feature compiles SQLite from source — no system SQLite needed.

- [ ] **Step 2: Verify compilation**

```powershell
cd src-tauri; cargo check
```

Expected: no errors (new download warnings are fine).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add webrtcvad and rusqlite deps"
```

---

## Task 2: Create db.rs — SQLite module

**Files:**
- Create: `src-tauri/src/db.rs`

- [ ] **Step 1: Write the failing tests first**

Create `src-tauri/src/db.rs` containing only the test module (the real code comes next):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn mem_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        conn
    }

    #[test]
    fn insert_and_retrieve() {
        let conn = mem_conn();
        let entry = TranscriptEntry {
            id: 0,
            text: "hello world".to_string(),
            raw_text: Some("hello world".to_string()),
            engine: "groq".to_string(),
            mode: "direct".to_string(),
            language: Some("en".to_string()),
            timestamp: "2026-05-04T00:00:00Z".to_string(),
        };
        insert_transcript(&conn, &entry).unwrap();
        let results = get_transcripts(&conn, 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].text, "hello world");
        assert_eq!(results[0].language, Some("en".to_string()));
    }

    #[test]
    fn fts_search_finds_matching_text() {
        let conn = mem_conn();
        for (text, ts) in [
            ("the quick brown fox", "2026-05-04T00:00:00Z"),
            ("lazy dog jumps over", "2026-05-04T00:01:00Z"),
        ] {
            insert_transcript(&conn, &TranscriptEntry {
                id: 0,
                text: text.to_string(),
                raw_text: None,
                engine: "groq".to_string(),
                mode: "direct".to_string(),
                language: None,
                timestamp: ts.to_string(),
            }).unwrap();
        }
        let results = search_transcripts(&conn, "fox").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].text, "the quick brown fox");
    }

    #[test]
    fn fts_search_empty_query_returns_empty() {
        let conn = mem_conn();
        let results = search_transcripts(&conn, "").unwrap();
        assert!(results.is_empty());
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```powershell
cd src-tauri; cargo test db::tests 2>&1 | head -20
```

Expected: `error[E0433]: failed to resolve: use of undeclared crate or module 'db'`

- [ ] **Step 3: Implement db.rs above the test module**

Prepend the following to `src-tauri/src/db.rs` (before the `#[cfg(test)]` block):

```rust
use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptEntry {
    pub id: i64,
    pub text: String,
    pub raw_text: Option<String>,
    pub engine: String,
    pub mode: String,
    pub language: Option<String>,
    pub timestamp: String,
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS transcripts (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            text      TEXT    NOT NULL,
            raw_text  TEXT,
            engine    TEXT    NOT NULL,
            mode      TEXT    NOT NULL DEFAULT 'direct',
            language  TEXT,
            timestamp TEXT    NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
            text, raw_text,
            content='transcripts',
            content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS transcripts_ai
        AFTER INSERT ON transcripts BEGIN
            INSERT INTO transcripts_fts(rowid, text, raw_text)
            VALUES (new.id, new.text, new.raw_text);
        END;
    ")
}

pub fn insert_transcript(conn: &Connection, entry: &TranscriptEntry) -> Result<i64> {
    conn.execute(
        "INSERT INTO transcripts (text, raw_text, engine, mode, language, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            entry.text, entry.raw_text, entry.engine,
            entry.mode, entry.language, entry.timestamp
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_transcripts(conn: &Connection, limit: usize) -> Result<Vec<TranscriptEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, text, raw_text, engine, mode, language, timestamp
         FROM transcripts ORDER BY id DESC LIMIT ?1"
    )?;
    let rows = stmt.query_map(params![limit as i64], |row| {
        Ok(TranscriptEntry {
            id: row.get(0)?,
            text: row.get(1)?,
            raw_text: row.get(2)?,
            engine: row.get(3)?,
            mode: row.get(4)?,
            language: row.get(5)?,
            timestamp: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn search_transcripts(conn: &Connection, query: &str) -> Result<Vec<TranscriptEntry>> {
    if query.is_empty() {
        return Ok(vec![]);
    }
    let mut stmt = conn.prepare(
        "SELECT t.id, t.text, t.raw_text, t.engine, t.mode, t.language, t.timestamp
         FROM transcripts t
         JOIN transcripts_fts f ON t.id = f.rowid
         WHERE transcripts_fts MATCH ?1
         ORDER BY rank"
    )?;
    let rows = stmt.query_map(params![query], |row| {
        Ok(TranscriptEntry {
            id: row.get(0)?,
            text: row.get(1)?,
            raw_text: row.get(2)?,
            engine: row.get(3)?,
            mode: row.get(4)?,
            language: row.get(5)?,
            timestamp: row.get(6)?,
        })
    })?;
    rows.collect()
}
```

- [ ] **Step 4: Register db module in lib.rs**

Open `src-tauri/src/lib.rs`. Find the `mod` declarations at the top (e.g. `mod audio;`, `mod transcribe;`). Add:

```rust
mod db;
```

- [ ] **Step 5: Run tests**

```powershell
cd src-tauri; cargo test db::tests
```

Expected: `test db::tests::insert_and_retrieve ... ok`, `test db::tests::fts_search_finds_matching_text ... ok`, `test db::tests::fts_search_empty_query_returns_empty ... ok`

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/lib.rs
git commit -m "feat: add SQLite db module with FTS5 full-text search"
```

---

## Task 3: Wire db into AppState — replace in-memory log

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Identify the existing TranscriptEntry and AppState**

Open `src-tauri/src/lib.rs`. Find:
1. The `TranscriptEntry` struct definition — note all its fields.
2. The `AppState` struct — it will have a field like `transcript_log: Arc<Mutex<Vec<TranscriptEntry>>>`.
3. Where `AppState` is constructed (likely inside `pub fn run()`).

- [ ] **Step 2: Update imports**

At the top of `lib.rs`, add:

```rust
use rusqlite::Connection;
use crate::db::{
    TranscriptEntry, init_db,
    insert_transcript, get_transcripts,
    search_transcripts as db_search,
};
```

Delete the old `TranscriptEntry` struct definition from `lib.rs` (it now lives in `db.rs`).

- [ ] **Step 3: Replace transcript_log field in AppState**

Change `AppState`:

```rust
pub struct AppState {
    // keep all existing fields except transcript_log
    pub db: Arc<Mutex<Connection>>,
}
```

Remove the `transcript_log` field entirely.

- [ ] **Step 4: Open DB in AppState constructor**

In the `run()` function where `AppState` is built, replace the `Vec::new()` initialization with:

```rust
let db_path = app.path().app_data_dir()
    .expect("no app data dir")
    .join("transcripts.db");
std::fs::create_dir_all(db_path.parent().unwrap()).ok();
let conn = Connection::open(&db_path).expect("open db");
init_db(&conn).expect("init db");

// Pass into AppState:
AppState {
    // ... other fields ...
    db: Arc::new(Mutex::new(conn)),
}
```

- [ ] **Step 5: Update get_transcript_log command**

Find the `get_transcript_log` Tauri command. Replace its body:

```rust
#[tauri::command]
fn get_transcript_log(state: tauri::State<'_, AppState>) -> Vec<TranscriptEntry> {
    let conn = state.db.lock().unwrap();
    get_transcripts(&conn, 200).unwrap_or_default()
}
```

- [ ] **Step 6: Add search_transcripts command**

Add a new command directly after `get_transcript_log`:

```rust
#[tauri::command]
fn search_transcripts(query: String, state: tauri::State<'_, AppState>) -> Vec<TranscriptEntry> {
    let conn = state.db.lock().unwrap();
    db_search(&conn, &query).unwrap_or_default()
}
```

- [ ] **Step 7: Register search_transcripts in invoke_handler**

Find `.invoke_handler(tauri::generate_handler![...])`. Add `search_transcripts` to the list:

```rust
tauri::generate_handler![
    get_settings,
    save_settings,
    get_transcript_log,
    search_transcripts,
    stop_recording,
]
```

- [ ] **Step 8: cargo check**

```powershell
cd src-tauri; cargo check
```

Expected: no errors. Common fix: if `Arc<Mutex<Connection>>` complains about `Send`, add `unsafe impl Send for ...` is NOT needed — `rusqlite::Connection` is `Send` in the bundled build.

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: replace in-memory transcript log with SQLite, add search command"
```

---

## Task 4: Language param — settings + transcription chain

**Files:**
- Modify: `src-tauri/src/lib.rs` (AppSettings)
- Modify: `src-tauri/src/transcribe.rs`

- [ ] **Step 1: Write failing tests in transcribe.rs**

At the bottom of `src-tauri/src/transcribe.rs`, add:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_language_yields_none() {
        assert_eq!(language_param("auto"), None);
    }

    #[test]
    fn specific_language_yields_some() {
        assert_eq!(language_param("en"), Some("en".to_string()));
        assert_eq!(language_param("ja"), Some("ja".to_string()));
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```powershell
cd src-tauri; cargo test transcribe::tests 2>&1 | head -10
```

Expected: `error[E0425]: cannot find function 'language_param'`

- [ ] **Step 3: Add language_param helper to transcribe.rs**

Add this function near the top of `src-tauri/src/transcribe.rs`:

```rust
pub fn language_param(language: &str) -> Option<String> {
    if language == "auto" { None } else { Some(language.to_string()) }
}
```

- [ ] **Step 4: Run tests**

```powershell
cd src-tauri; cargo test transcribe::tests
```

Expected: `auto_language_yields_none ... ok`, `specific_language_yields_some ... ok`

- [ ] **Step 5: Update groq() signature**

Find the `groq()` function. Change its signature from:

```rust
pub async fn groq(wav: Vec<u8>, api_key: &str) -> Result<String, String>
```

to:

```rust
pub async fn groq(wav: Vec<u8>, api_key: &str, language: Option<String>) -> Result<String, String>
```

Inside `groq()`, after building the multipart form but before sending, conditionally append the language field:

```rust
// existing:
let form = reqwest::multipart::Form::new()
    .part("file", file_part)
    .text("model", "whisper-large-v3-turbo");

// add:
let form = match language {
    Some(lang) => form.text("language", lang),
    None => form,
};
```

- [ ] **Step 6: Update local() signature**

Find the `local()` function. Change its signature from:

```rust
pub async fn local(wav: Vec<u8>) -> Result<String, String>
```

to:

```rust
pub async fn local(wav: Vec<u8>, language: Option<String>) -> Result<String, String>
```

Inside `local()`, when constructing the sidecar command args, append language if set:

```rust
let mut cmd = std::process::Command::new(&sidecar_path);
cmd.arg("--input").arg(&wav_path);
if let Some(lang) = language {
    cmd.arg("--language").arg(lang);
}
```

- [ ] **Step 7: Add language field to AppSettings**

In `lib.rs`, find the `AppSettings` struct. Add:

```rust
pub language: String,
```

In the `Default` impl for `AppSettings`, add:

```rust
language: "auto".to_string(),
```

- [ ] **Step 8: cargo check**

```powershell
cd src-tauri; cargo check
```

Expected: errors only on call sites of `groq()` and `local()` — those are fixed in Task 7. If you see other errors, fix them now.

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/transcribe.rs src-tauri/src/lib.rs
git commit -m "feat: add language param to AppSettings and transcription functions"
```

---

## Task 5: VAD integration — init_vad() in audio.rs

**Files:**
- Modify: `src-tauri/src/audio.rs`

- [ ] **Step 1: Write failing test**

At the bottom of `src-tauri/src/audio.rs`, add:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vad_classifies_silence_as_non_speech() {
        // 30ms at 16kHz = 480 i16 samples
        let silence = vec![0i16; 480];
        let mut vad = init_vad();
        let result = vad.is_voice_segment(&silence);
        assert!(result.is_ok(), "VAD must not error on valid frame");
        assert_eq!(result.unwrap(), false, "zeros must be classified as silence");
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```powershell
cd src-tauri; cargo test audio::tests 2>&1 | head -10
```

Expected: `error[E0425]: cannot find function 'init_vad'`

- [ ] **Step 3: Add import and init_vad() to audio.rs**

At the top of `src-tauri/src/audio.rs`, add:

```rust
use webrtcvad::{Vad, VadMode};
```

Add the function anywhere in the file:

```rust
pub fn init_vad() -> Vad {
    let mut vad = Vad::new();
    vad.set_mode(VadMode::Aggressive); // aggressiveness level 2
    vad
}
```

- [ ] **Step 4: Run test**

```powershell
cd src-tauri; cargo test audio::tests::vad_classifies_silence_as_non_speech
```

Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/audio.rs
git commit -m "feat: add WebRTC VAD initializer to audio module"
```

---

## Task 6: Chunker struct in audio.rs

**Files:**
- Modify: `src-tauri/src/audio.rs`

- [ ] **Step 1: Write failing tests**

Add to the `tests` module in `audio.rs` (inside the existing `mod tests { }` block):

```rust
    #[test]
    fn chunker_emits_after_silence_threshold() {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut chunker = Chunker::new(tx);

        // 20 speech frames (600ms) then 20 silence frames (600ms > 510ms threshold)
        let speech = vec![8000i16; 480];
        let silence = vec![0i16; 480];

        for _ in 0..20 { chunker.push_frame(&speech, true); }
        for _ in 0..20 { chunker.push_frame(&silence, false); }

        let chunk = rx.try_recv().expect("chunk must be emitted after silence threshold");
        assert!(!chunk.is_empty());
    }

    #[test]
    fn chunker_flush_emits_in_progress_speech() {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut chunker = Chunker::new(tx);

        let speech = vec![8000i16; 480];
        for _ in 0..15 { chunker.push_frame(&speech, true); }
        chunker.flush();

        rx.try_recv().expect("flush must emit chunk when speech buffered");
    }

    #[test]
    fn chunker_discards_chunks_under_300ms() {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut chunker = Chunker::new(tx);

        // Only 5 frames = 150ms — below MIN_CHUNK_FRAMES (10 × 30ms = 300ms)
        let speech = vec![8000i16; 480];
        for _ in 0..5 { chunker.push_frame(&speech, true); }
        chunker.flush();

        assert!(rx.try_recv().is_err(), "chunk under 300ms must be discarded");
    }
```

- [ ] **Step 2: Run to confirm failure**

```powershell
cd src-tauri; cargo test audio::tests::chunker 2>&1 | head -10
```

Expected: `error[E0422]: cannot find struct 'Chunker'`

- [ ] **Step 3: Implement Chunker**

Add the following to `src-tauri/src/audio.rs` (outside the test module):

```rust
// 17 × 30ms ≈ 510ms silence before flushing a chunk
const SILENCE_THRESHOLD_FRAMES: usize = 17;
// 10 × 30ms = 300ms minimum chunk to avoid sub-word fragments
const MIN_CHUNK_FRAMES: usize = 10;

pub struct Chunker {
    sender: std::sync::mpsc::Sender<Vec<f32>>,
    buffer: Vec<i16>,
    silence_count: usize,
    has_speech: bool,
}

impl Chunker {
    pub fn new(sender: std::sync::mpsc::Sender<Vec<f32>>) -> Self {
        Chunker {
            sender,
            buffer: Vec::new(),
            silence_count: 0,
            has_speech: false,
        }
    }

    pub fn push_frame(&mut self, frame: &[i16], is_speech: bool) {
        if is_speech {
            self.has_speech = true;
            self.silence_count = 0;
            self.buffer.extend_from_slice(frame);
        } else if self.has_speech {
            self.silence_count += 1;
            self.buffer.extend_from_slice(frame);
            if self.silence_count >= SILENCE_THRESHOLD_FRAMES {
                self.emit();
            }
        }
    }

    pub fn flush(&mut self) {
        if self.has_speech {
            self.emit();
        }
    }

    fn emit(&mut self) {
        let frame_count = self.buffer.len() / 480;
        if frame_count >= MIN_CHUNK_FRAMES {
            let samples: Vec<f32> = self.buffer
                .iter()
                .map(|&s| s as f32 / 32768.0)
                .collect();
            self.sender.send(samples).ok();
        }
        self.buffer.clear();
        self.silence_count = 0;
        self.has_speech = false;
    }
}
```

- [ ] **Step 4: Run all audio tests**

```powershell
cd src-tauri; cargo test audio::tests
```

Expected: all 4 tests pass (`vad_classifies_silence_as_non_speech` + 3 Chunker tests).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/audio.rs
git commit -m "feat: add Chunker with 510ms silence gate and 300ms minimum chunk"
```

---

## Task 7: Wire VAD+Chunker into record() and update coordinator

**Files:**
- Modify: `src-tauri/src/audio.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Update record() signature**

In `src-tauri/src/audio.rs`, find the `record()` function. Its current signature is something like:

```rust
pub fn record(stop_flag: Arc<AtomicBool>) -> Vec<f32>
```

Change it to:

```rust
pub fn record(stop_flag: Arc<AtomicBool>, chunk_tx: std::sync::mpsc::Sender<Vec<f32>>)
```

(No return value — chunks are sent via the channel as they complete.)

- [ ] **Step 2: Replace record() internals**

Inside `record()`, keep the existing cpal stream setup (host, device, config, stream). Replace the sample collection loop with VAD + Chunker. The key change is in the data callback and the post-recording logic:

```rust
pub fn record(stop_flag: Arc<AtomicBool>, chunk_tx: std::sync::mpsc::Sender<Vec<f32>>) {
    let host = cpal::default_host();
    let device = host.default_input_device().expect("no input device");
    let config = device.default_input_config().expect("no config");

    let mut vad = init_vad();
    let mut chunker = Chunker::new(chunk_tx);

    // Accumulate incoming f32 samples into 30ms frames (480 samples at 16kHz)
    let frame_buf: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
    let frame_buf_clone = frame_buf.clone();

    // Build cpal stream — keep the existing conversion logic (any format → f32).
    // In the data callback, push samples to frame_buf_clone.
    // (Keep the existing stream-building code, only change what happens after collection.)

    // After the cpal stream runs until stop_flag is set:
    // Process any remaining samples in frame_buf as VAD frames:
    let remaining = frame_buf.lock().unwrap().clone();
    let resampled = resample_to_16k(&remaining, config.sample_rate().0); // existing resample logic
    let i16_samples: Vec<i16> = resampled.iter().map(|&s| (s.clamp(-1.0,1.0) * 32767.0) as i16).collect();

    for frame in i16_samples.chunks(480) {
        if frame.len() == 480 {
            let frame_arr: [i16; 480] = frame.try_into().unwrap();
            // Convert to slice for VAD call
            let is_speech = vad.is_voice_segment(frame).unwrap_or(false);
            chunker.push_frame(frame, is_speech);
        }
    }
    chunker.flush(); // emit any in-progress chunk on hotkey release
}
```

**Note:** The exact cpal stream-building code (callbacks, stream type matching) is already in `audio.rs`. Do not rewrite it — only replace the part that collected `Vec<f32>` into a growing buffer. Instead, process frames incrementally through VAD + Chunker. The `resample_to_16k` function already exists in `audio.rs`.

- [ ] **Step 3: Update coordinator in lib.rs**

Find the section in the coordinator (`coordinator()` or the `HotkeyEvent::Stop` arm) that:
1. Joins the audio thread
2. Gets `Vec<f32>` back
3. Calls `audio::to_wav()`
4. Calls `transcribe::groq()`

Replace it with a chunk-consuming loop:

```rust
// Before spawning the audio thread:
let (chunk_tx, chunk_rx) = std::sync::mpsc::channel::<Vec<f32>>();

// Spawn audio thread (update to new signature):
let stop_clone = stop_flag.clone();
std::thread::spawn(move || {
    audio::record(stop_clone, chunk_tx);
});

// After stop_flag is set and audio thread is joined:
let settings = state.settings.lock().unwrap().clone();
let language = transcribe::language_param(&settings.language);
let api_key = settings.groq_api_key.clone().unwrap_or_default();
let mut session_texts: Vec<String> = Vec::new();

for chunk in chunk_rx {
    let wav = audio::to_wav(chunk);
    if audio::is_silent(&wav) { continue; } // existing silence check

    let text = transcribe::groq(wav.clone(), &api_key, language.clone()).await
        .unwrap_or_default();
    let text = if text.is_empty() || transcribe::is_hallucination(&text) {
        transcribe::local(wav, language.clone()).await.unwrap_or_default()
    } else {
        text
    };

    if !text.is_empty() && !transcribe::is_hallucination(&text) {
        session_texts.push(text);
    }
}

let combined = session_texts.join(" ");
if !combined.is_empty() {
    // postprocess (existing Ollama polish call — keep as-is)
    let polished = postprocess::polish(&combined).await.unwrap_or(combined.clone());

    // store to SQLite
    let entry = db::TranscriptEntry {
        id: 0,
        text: polished.clone(),
        raw_text: Some(combined.clone()),
        engine: "groq".to_string(),
        mode: settings.output_mode.clone(),
        language: language.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    {
        let conn = state.db.lock().unwrap();
        db::insert_transcript(&conn, &entry).ok();
    }

    // auto-type and emit event (keep existing calls)
    auto_type::type_text(&polished);
    app_handle.emit("transcript", &entry).ok();
}
```

- [ ] **Step 4: cargo check**

```powershell
cd src-tauri; cargo check
```

Expected: no errors. If `groq()` or `local()` call sites still use the old signature, update them to pass `language.clone()`.

- [ ] **Step 5: Build and smoke test**

```powershell
cd src-tauri; cargo build
```

Then run `npm run tauri dev`. Hold Ctrl+Win, say a sentence, release. Verify:
- Transcript appears in the app
- No crash
- Transcript is stored (restart app and check history — it should persist now)

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/audio.rs src-tauri/src/lib.rs
git commit -m "feat: wire VAD+Chunker into record(), update coordinator for streaming chunks"
```

---

## Task 8: Frontend — language selector + transcript search

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add LANGUAGES constant to App.tsx**

At the top of `src/App.tsx`, after the imports, add:

```tsx
const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en",   label: "English" },
  { code: "es",   label: "Spanish" },
  { code: "fr",   label: "French" },
  { code: "de",   label: "German" },
  { code: "it",   label: "Italian" },
  { code: "pt",   label: "Portuguese" },
  { code: "ru",   label: "Russian" },
  { code: "ja",   label: "Japanese" },
  { code: "zh",   label: "Chinese" },
  { code: "hi",   label: "Hindi" },
  { code: "ar",   label: "Arabic" },
];
```

- [ ] **Step 2: Add language to AppSettings type**

Find the TypeScript type or interface for `AppSettings` in `App.tsx`. Add:

```tsx
language: string;
```

- [ ] **Step 3: Add language to default settings**

Find where `AppSettings` is initialized (e.g. a `useState` default or a `getDefaultSettings()` call). Add:

```tsx
language: "auto",
```

- [ ] **Step 4: Add language dropdown in Settings panel**

Find the JSX block that renders settings fields (where `groqApiKey` input lives). Add:

```tsx
<div className="setting-row">
  <label htmlFor="lang-select">Transcription Language</label>
  <select
    id="lang-select"
    value={settings.language ?? "auto"}
    onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
  >
    {LANGUAGES.map((l) => (
      <option key={l.code} value={l.code}>{l.label}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 5: Add search state and handler**

In the component that renders the transcript history, add state and handler:

```tsx
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<TranscriptEntry[] | null>(null);

async function handleSearch(q: string) {
  setSearchQuery(q);
  if (q.trim() === "") {
    setSearchResults(null);
    return;
  }
  const results = await invoke<TranscriptEntry[]>("search_transcripts", { query: q });
  setSearchResults(results);
}
```

- [ ] **Step 6: Add search input above history list**

Find the JSX that renders the transcript list. Add the search input above it, and use `searchResults ?? transcriptLog` as the data source:

```tsx
<input
  className="search-input"
  type="search"
  placeholder="Search transcripts..."
  value={searchQuery}
  onChange={(e) => handleSearch(e.target.value)}
/>

{(searchResults ?? transcriptLog).map((entry) => (
  // existing transcript card JSX
))}
```

- [ ] **Step 7: Add CSS for new elements**

In `src/index.css`, add:

```css
.search-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-0);
  font-size: 13px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-muted);
}

.setting-row label {
  color: var(--text-1);
  font-size: 13px;
}

.setting-row select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-0);
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
}

.setting-row select:focus {
  outline: none;
  border-color: var(--accent);
}
```

- [ ] **Step 8: Run dev server and verify in browser**

```bash
npm run dev
```

Open the app and verify:
- Settings panel shows "Transcription Language" dropdown, defaulting to "Auto-detect"
- Changing language and saving works (no console errors)
- Typing in the search box shows filtered results from SQLite
- Clearing search restores the full history list

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: add language selector and transcript search to frontend"
```

---

## Self-Review

| Spec requirement | Covered by |
|---|---|
| WebRTC VAD at aggressiveness 2 | Task 5 (`VadMode::Aggressive`) |
| 30ms frames, 16kHz | Task 5 (480 i16 samples) |
| Chunker 500ms silence gate | Task 6 (`SILENCE_THRESHOLD_FRAMES = 17`) |
| Chunker 300ms minimum | Task 6 (`MIN_CHUNK_FRAMES = 10`) |
| Flush on hotkey release | Task 7 (`chunker.flush()` after stop_flag) |
| Discard chunks < 300ms | Task 6 (`emit()` checks `frame_count >= MIN_CHUNK_FRAMES`) |
| SQLite schema: transcripts + FTS5 | Task 2 |
| Insert trigger for FTS sync | Task 2 |
| DB at `$APPDATA/wisperflow/transcripts.db` | Task 3 |
| `get_transcript_log` queries SQLite | Task 3 |
| `search_transcripts` Tauri command | Task 3 |
| `language` field in AppSettings | Task 4 |
| `language_param()` auto → None | Task 4 |
| Groq API language param | Task 4 |
| Local sidecar --language arg | Task 4 |
| Language stored per transcript | Task 7 (entry construction) |
| Language dropdown in Settings UI | Task 8 |
| Search input in History UI | Task 8 |

All spec requirements mapped. No placeholders. Type `TranscriptEntry` defined in Task 2 and used consistently through Tasks 3, 7, 8. `language_param()` defined in Task 4, used in Task 7. `Chunker::push_frame(&[i16], bool)` defined in Task 6, used in Task 7.
