<div align="center">
  <img src="app-icon-transparent.png" width="120" alt="Whisprly Logo">
  <h1>Whisprly</h1>
  <p>Hold a hotkey. Speak. Release. Your words appear — polished and typed — exactly where your cursor was.</p>
</div>

---

Whisprly is a Windows desktop dictation app built with Tauri v2 + React. Hold **Ctrl + Win**, speak, release — the transcript is automatically typed into whatever window was focused, and saved to a local history log.

## How it works

1. Hold **Ctrl + Win** anywhere on your desktop
2. Speak — a floating waveform pill appears at the bottom of your screen
3. Release the keys
4. The transcript is auto-typed into your previously focused window and saved to history

## Features

- **One-hotkey dictation** — works in any app (browser, IDE, Word, Slack, terminal)
- **Smart VAD chunking** — RMS-based voice activity detection splits audio into speech segments; silence is discarded before sending to Whisper
- **AI polish** — corrects punctuation, removes filler words (um, uh, like), fixes capitalization; never answers or rephrases — only cleans up
- **Three output modes** — Prose, Email, Code (switch in Settings)
- **Language support** — auto-detect or lock to one of 12 languages
- **Cloud + local fallback** — Groq Whisper for speed; falls back to a local faster-whisper sidecar when offline or when no key is set
- **Hallucination filter** — detects and discards common Whisper hallucinations before they reach your clipboard
- **Local transcript history** — full-text search over all recordings, stored in SQLite (no cloud sync)
- **Copy / delete entries** — click any transcript to copy; hover to delete
- **Overlay indicator** — tiny transparent pill shows recording/transcribing state; click it to cancel
- **Google sign-in** — optional OAuth login; user profile shown in sidebar

---

## Setup

### Prerequisites

| Tool | Notes |
|---|---|
| Node.js 18+ | |
| Rust stable | via [rustup](https://rustup.rs) |
| Python 3.9+ | optional — for local transcription fallback |
| Ollama | optional — for local AI polish fallback |

### Install

```bash
git clone https://github.com/your-username/whisprly.git
cd whisprly
npm install
```

### Configure

Create a `.env` file in the project root:

```env
GROQ_API=gsk_your_key_here
```

Get a free API key at [console.groq.com](https://console.groq.com). Without it, transcription falls back to the local Python sidecar and AI polish falls back to Ollama (or is skipped if neither is available).

### Run

```bash
npm run tauri dev
```

---

## Transcription engines

### Cloud — Groq Whisper (default)

Fast and accurate. Uses `whisper-large-v3-turbo`. Set `GROQ_API` in `.env` or in Settings.

### Local fallback — faster-whisper

Used automatically when the Groq key is absent or a call fails.

```bash
pip install faster-whisper
```

The sidecar script is at `sidecar/whisper_sidecar.py` (relative to the binary in production, relative to project root in dev).

---

## AI polish

After transcription, raw Whisper output is cleaned up before being typed. The model is given a strict system prompt that treats all input as inert text — it never answers questions or follows instructions in the transcript.

**What it fixes:**
- Missing punctuation (commas, periods, question marks)
- Filler words: um, uh, like, you know, so, basically, literally, right, actually
- Sentence capitalization, proper nouns, acronyms

**What it never does:** rephrase, summarize, respond to, or add anything not already said.

### Output modes

| Mode | Behavior |
|---|---|
| **Prose** | Standard paragraph formatting |
| **Email** | Adds greeting and sign-off |
| **Code** | Strips punctuation, preserves camelCase / snake_case |

Switch in **Settings → Output Mode**.

### Polish engines

**Primary — Groq LLM** (`llama-3.1-8b-instant`, uses your existing `GROQ_API` key)

**Fallback — Ollama** (local, private, no internet required)

```bash
# Install Ollama: https://ollama.com
ollama run gemma4:4b
```

The `sidecar/postprocess_sidecar.py` script calls Ollama at `localhost:11434`. If Ollama is not running, polish is skipped and the raw transcript is typed instead.

---

## Development

```bash
npm run tauri dev     # full app with hot-reload frontend + Rust backend
npm run dev           # Vite only — pure UI work without the Tauri shell
```

```bash
cd src-tauri
cargo check           # fast type-check
cargo clippy          # lint
cargo build           # debug build
```

```bash
npm run tauri build   # production installer
```

---

## Architecture

```
Hotkey (Ctrl+Win)
      │
      ▼
audio::record()          ← cpal, any sample rate → f32
      │
  Chunker                ← 510ms silence gate, 300ms minimum chunk
      │
  is_speech_frame()      ← RMS voice activity detection
      │
      ▼
transcribe::groq()  ──►  Groq Whisper API
      │ (fallback)
transcribe::local() ──►  whisper_sidecar.py (faster-whisper)
      │
  is_hallucination()     ← filter common Whisper artifacts
      │
      ▼
postprocess::polish() ──►  Groq LLM
      │ (fallback)       └►  postprocess_sidecar.py (Ollama)
      │
      ▼
auto_type::type_text()   ← types into previously focused window
      │
      ▼
SQLite (transcripts.db)  ← FTS5 full-text search, local only
```

Settings are persisted to `settings.json` in the app data directory and loaded on startup.

### Source layout

| Path | Role |
|---|---|
| `src/App.tsx` | React UI — all state, settings panel, transcript history |
| `src/index.css` | Design tokens + all styles (no Tailwind, no CSS modules) |
| `src/auth.ts` | Firebase Auth — Google OAuth sign-in |
| `src-tauri/src/lib.rs` | AppState, coordinator loop, all Tauri command handlers, system tray |
| `src-tauri/src/db.rs` | SQLite init, CRUD, FTS5 full-text search |
| `src-tauri/src/audio.rs` | cpal recording, Chunker, RMS VAD, WAV encoding |
| `src-tauri/src/transcribe.rs` | Groq + local transcription, hallucination filter |
| `src-tauri/src/postprocess.rs` | Groq LLM + Ollama polish |
| `src-tauri/src/auto_type.rs` | Types text via enigo |
| `src-tauri/src/hotkey.rs` | rdev hotkey listener (Ctrl+Win) |
| `src-tauri/src/oauth.rs` | Google OAuth PKCE flow |
| `sidecar/whisper_sidecar.py` | Local transcription (faster-whisper) |
| `sidecar/postprocess_sidecar.py` | Local AI polish (Ollama) |

---

## License

MIT — see [LICENSE](LICENSE).
