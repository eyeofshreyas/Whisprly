# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Whisprly

A Tauri v2 desktop dictation app targeting Windows and Linux. Trigger recording via hotkey, release/toggle to transcribe. The transcript is post-processed by an LLM, auto-typed into the previously focused window, and saved to a local SQLite history. Transcription uses Groq (`whisper-large-v3-turbo`) with a local Python/faster-whisper fallback.

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

- **`main.tsx`** — entry point for both windows, distinguished by `?window=overlay` in the URL.
- **`App.tsx`** — single-file React app, no router, no state library. All state is `useState`.
- **`LoginScreen.tsx`** — Firebase auth gate rendered before `App.tsx` when the user is unauthenticated.
- **`auth.ts`** / **`firebase.ts`** — Firebase project config and auth helpers (Google sign-in).
- **`Overlay.tsx`** / **`overlay.css`** — minimal second window: 100×25 transparent floating pill shown during recording/transcribing.
- **`index.css`** — flat CSS with CSS custom properties (design tokens) at `:root`. No Tailwind, no CSS modules.

Backend events consumed by the frontend:
| Event | Payload |
|---|---|
| `"status"` | `{ status: "idle" \| "recording" \| "transcribing", message?: string }` |
| `"transcript"` | `TranscriptEntry { id, text, raw_text, engine, mode, language, timestamp }` |
| `"setup_progress"` | `{ stage: string, percent: number, message: string }` |

Tauri commands: `get_settings`, `save_settings`, `get_transcript_log`, `search_transcripts`, `delete_transcript`, `update_transcript`, `clear_all_db_transcripts`, `stop_recording`, `get_output_mode`, `set_output_mode`, `trigger_auto_type`.

### Backend — `src-tauri/src/`

| File | Role |
|---|---|
| `lib.rs` | `AppState`, `coordinator` async loop, all Tauri command handlers, system tray, close-to-tray logic |
| `hotkey.rs` | Blocks on `rdev::listen`; tracks Ctrl+Win hold/release state (X11 / Windows); sends `HotkeyEvent::{Start,Stop}` |
| `shortcut_wayland.rs` | XDG portal global shortcut (`Ctrl+Shift+Space` toggle) for native Wayland sessions |
| `audio.rs` | Records via `cpal` (any sample format → f32); `is_silent()` RMS gate; encodes to 16 kHz mono WAV via `hound` |
| `transcribe.rs` | `groq()` — multipart HTTP to Groq API; `local()` — shells out to Python sidecar; shared `is_hallucination()` filter |
| `postprocess.rs` | LLM cleanup via Ollama (`gemma4:4b`) or Groq API; output modes: `prose`, `email`, `code`, `auto` |
| `auto_type.rs` | Types text into the focused window via `enigo`; appends a trailing space |
| `db.rs` | SQLite (rusqlite) storage: `transcripts` table with FTS5 full-text search; key-value `settings` table for persistence |
| `oauth.rs` | Google OAuth PKCE flow (used by Firebase auth) |
| `setup.rs` | First-run wizard: checks/installs Ollama, imports `gemma4:4b` from bundled GGUF; emits `setup_progress` events |
| `platform/` | Active window title detection — `linux.rs` (xdotool → xprop fallback), `windows.rs` |

### Coordinator flow (`lib.rs::coordinator`)

```
HotkeyEvent::Start
  └─ show overlay, emit "recording", spawn blocking thread → audio::record()

HotkeyEvent::Stop
  └─ set stop flag, join thread
  └─ combined_samples.is_empty()  → idle, hide overlay
  └─ audio::to_wav()
  └─ build Whisper initial_prompt: last transcript (context) + Hinglish seed + custom vocab (≤850 chars)
  └─ transcribe::groq()  → on error/missing key → transcribe::local()
  └─ raw_text.is_empty() or is_hallucination() → idle, hide overlay
  └─ resolve output_mode ("auto" → detect via platform::get_active_window_title())
  └─ postprocess::polish(raw_text, mode, ...)
  └─ hide overlay, sleep 300ms (restores focus on Wayland before ydotool fires)
  └─ auto_type::type_text()
  └─ db::insert_transcript(), emit "transcript", emit "idle"
```

### Output modes

| Mode | Behaviour |
|---|---|
| `prose` / `standard` | Light cleanup, preserves filler words |
| `email` | Adds greeting/sign-off, removes fillers |
| `code` | Strips punctuation, preserves camelCase/snake_case |
| `auto` | Detects active window title → picks `code`, `email`, or `prose` |

### Settings & persistence

`AppSettings` is held in `Arc<Mutex<AppSettings>>` and **also persisted to SQLite** via `db::get_setting` / `db::set_setting` (key-value table). The Groq key can be seeded at startup via `.env` (`GROQ_API` var, loaded by `dotenvy`). The first-run setup state (`setup_complete`) is also stored in the settings table.

## Key constraints

- `rdev::listen` blocks its thread; the X11/Windows hotkey listener must run on a dedicated `std::thread`.
- Audio recording is synchronous/blocking and runs on a `std::thread` to avoid blocking the Tokio runtime.
- On native Wayland, `shortcut_wayland.rs` registers via the XDG global-shortcuts portal (toggle, not hold). On X11 or Windows, `hotkey.rs` uses `rdev` (hold-to-record).
- The 300 ms sleep before `auto_type` is intentional — GNOME Wayland needs the overlay hidden before ydotool can inject keystrokes into the target window.
- The overlay window (`label: "overlay"`) centres itself at the bottom of the primary monitor's work area via `show_overlay()` in `lib.rs`.
- The Python sidecar is at `sidecar/whisper_sidecar.py` relative to the binary in production, or relative to the project root in dev.
- The bundled Ollama binary and GGUF model (`gemma-4-E4B-it-Q4_K_M.gguf`) live in the Tauri resource dir. `setup.rs` handles first-run import.
- Tauri capabilities are minimal: only `core:default` (`src-tauri/capabilities/default.json`).
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
