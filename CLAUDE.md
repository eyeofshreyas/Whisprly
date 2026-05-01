# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Whisprly

A Tauri v2 desktop dictation app (Windows-first). Hold **Ctrl + Win** to record audio, release to transcribe. The transcript is auto-typed into whatever window was focused, and also appended to the in-app log. Transcription uses Groq (cloud, `whisper-large-v3-turbo`) with a local Python/faster-whisper fallback.

## Commands

### Development
```
npm run tauri dev        # start Tauri dev (launches Vite + Rust backend)
npm run dev              # Vite only (no Tauri shell, for pure UI work)
```

### Build
```
npm run tauri build      # production bundle (runs tsc + vite build + cargo release)
npm run build            # frontend only
```

### Rust
```
cd src-tauri
cargo check              # type-check without linking
cargo clippy             # lint
cargo build              # debug build
```

There is no test suite yet.

## Architecture

The app has two distinct layers that communicate via Tauri's IPC bridge.

### Frontend — `src/`
Single-file React app ([src/App.tsx](src/App.tsx)). No router, no state management library. State is plain `useState`. Communicates with the backend via:
- `invoke(command, args)` — request/response (get/save settings, fetch transcript log)
- `listen(event, handler)` — push events from Rust (`"status"`, `"transcript"`)

Styling is a single flat CSS file ([src/index.css](src/index.css)) — no Tailwind, no CSS modules.

### Backend — `src-tauri/src/`

| File | Role |
|---|---|
| [lib.rs](src-tauri/src/lib.rs) | Entry point, `AppState`, `coordinator` async loop, Tauri commands |
| [hotkey.rs](src-tauri/src/hotkey.rs) | Blocks on `rdev::listen`; sends `HotkeyEvent::{Start,Stop}` over an unbounded mpsc channel |
| [audio.rs](src-tauri/src/audio.rs) | Records from default input device via `cpal`; converts any sample format to f32; encodes to WAV bytes via `hound` |
| [transcribe.rs](src-tauri/src/transcribe.rs) | `groq()` — HTTP multipart to Groq API; `local()` — shells out to `sidecar/whisper_sidecar.py` |
| [auto_type.rs](src-tauri/src/auto_type.rs) | Types the transcript text into the focused window using `enigo` |

**Coordinator flow** (`lib.rs::coordinator`):
1. `HotkeyEvent::Start` → spawn blocking thread for `audio::record` (polls `AtomicBool` stop flag)
2. `HotkeyEvent::Stop` → set stop flag, join thread, encode WAV
3. Try Groq; on failure or missing key, fall back to local Python sidecar
4. `auto_type::type_text` the result, push to `transcript_log`, emit `"transcript"` event

**Settings** are held in `Arc<Mutex<AppSettings>>` inside `AppState` (Tauri managed state). They are not persisted to disk across restarts — only stored in-memory. The Groq API key can be seeded from a `.env` file via `dotenvy` (`GROQ_API` env var).

## Key constraints

- Hotkey listener runs on its own OS thread (required by `rdev`) and sends to an async `tokio::mpsc` channel consumed by the coordinator task.
- Audio recording is synchronous/blocking; it runs on a `std::thread` so it doesn't block the async runtime.
- The local transcription sidecar is a Python script at `sidecar/whisper_sidecar.py` (next to the binary in production, or at `sidecar/whisper_sidecar.py` relative to the project root in dev).
- Window size is fixed at 480×680 in [tauri.conf.json](src-tauri/tauri.conf.json).
- Tauri capabilities are minimal — only `core:default` is granted ([capabilities/default.json](src-tauri/capabilities/default.json)).
