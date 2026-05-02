# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Whisprly

A Tauri v2 desktop dictation app (Windows-first). Hold **Ctrl + Win** to record audio, release to transcribe. The transcript is auto-typed into the previously focused window and appended to the in-app history log. Transcription uses Groq (cloud, `whisper-large-v3-turbo`) with a local Python/faster-whisper fallback.

## Commands

### Development
```
npm run tauri dev        # Vite + Rust dev server (hot-reload frontend, recompile backend)
npm run dev              # Vite only — pure UI work without the Tauri shell
```

### Build
```
npm run tauri build      # production bundle: tsc + vite build + cargo release
npm run build            # frontend only
```

### Rust
```
cd src-tauri
cargo check              # type-check without linking (fast)
cargo clippy             # lint
cargo build              # debug build
```

There is no test suite.

## Architecture

Two layers connected by Tauri's IPC bridge.

### Frontend — `src/`

- **`App.tsx`** — single-file React app, no router, no state library. All state is `useState`. Two windows share the same entry point (`main.tsx`), distinguished by `?window=overlay` in the URL.
- **`Overlay.tsx`** — minimal second window: a 100×25 transparent floating pill that appears during recording/transcribing, showing an animated waveform. Clicking it stops recording.
- **`index.css`** — flat CSS file with CSS custom properties (design tokens) at `:root`. Dark theme throughout. No Tailwind, no CSS modules.

Backend events consumed by the frontend:
| Event | Payload |
|---|---|
| `"status"` | `{ status: "idle" \| "recording" \| "transcribing", message?: string }` |
| `"transcript"` | `TranscriptEntry { text, engine, timestamp }` |

Tauri commands invoked by the frontend: `get_settings`, `save_settings`, `get_transcript_log`, `stop_recording`.

### Backend — `src-tauri/src/`

| File | Role |
|---|---|
| `lib.rs` | `AppState`, `coordinator` async loop, all Tauri command handlers, system tray, close-to-tray logic |
| `hotkey.rs` | Blocks on `rdev::listen`; tracks Ctrl+Win state; sends `HotkeyEvent::{Start,Stop}` on transitions |
| `audio.rs` | Records via `cpal` (any sample format → f32); `is_silent()` RMS gate; encodes to 16 kHz mono WAV via `hound` |
| `transcribe.rs` | `groq()` — multipart HTTP to Groq API; `local()` — shells out to Python sidecar; shared `is_hallucination()` filter |
| `auto_type.rs` | Types transcript text into the focused window via `enigo`; appends a trailing space |

### Coordinator flow (`lib.rs::coordinator`)

```
HotkeyEvent::Start
  └─ show overlay, emit "recording", spawn blocking thread → audio::record()

HotkeyEvent::Stop
  └─ set stop flag, join thread
  └─ samples.is_empty()  → idle, hide overlay
  └─ audio::is_silent()  → idle, hide overlay   ← RMS < 0.015 threshold
  └─ audio::to_wav()
  └─ transcribe::groq()  → on error/missing key → transcribe::local()
  └─ is_hallucination()  → idle, hide overlay
  └─ auto_type::type_text(), push to log, emit "transcript", idle, hide overlay
```

### Settings

`AppSettings` lives in `Arc<Mutex<AppSettings>>` inside `AppState`. **Not persisted to disk** — resets on restart. Seed the Groq key at startup via a `.env` file (`GROQ_API` var, loaded by `dotenvy`).

## Key constraints

- `rdev::listen` blocks its thread; the hotkey listener must run on a dedicated `std::thread`.
- Audio recording is synchronous/blocking and runs on a `std::thread` to avoid blocking the Tokio runtime.
- The overlay window (`label: "overlay"`) is positioned programmatically by `show_overlay()` in `lib.rs` — it centres itself at the bottom of the primary monitor's work area.
- The Python sidecar is at `sidecar/whisper_sidecar.py` relative to the binary in production, or relative to the project root in dev.
- Tauri capabilities are minimal: only `core:default` ([capabilities/default.json](src-tauri/capabilities/default.json)).
- Main window: 620×700, resizable, minimum 560×560. Overlay window: 100×25, no decorations, transparent, always-on-top.

## Frontend CSS conventions

All colours, radii, and transitions are defined as custom properties in `:root` (`index.css`). Key tokens:

```
--bg / --bg-elevated / --bg-hover   background layers
--border / --border-muted           border colours
--accent                            #6c47ff (purple)
--text-0 … --text-4                 text scale (light → muted)
--recording / --transcribing / --ready   status colours
--radius-sm/md/lg / --radius-pill   border radii
--transition-fast / --transition-mid easing tokens
```

Sidebar is 52 px wide, icon-only. Tooltips are CSS-only via `[data-label]::after`. Nav active state uses a left-edge `::before` bar.
