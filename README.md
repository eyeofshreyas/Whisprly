<div align="center">
  <img src="app-icon-transparent.png" width="120" alt="WisperFlow Logo">
  <h1>WisperFlow</h1>
  <p>Hold a hotkey. Speak. Release. Your words appear — polished and typed — exactly where your cursor was.</p>
</div>

---

WisperFlow is a Windows desktop dictation app built with Tauri v2 + React. It records your voice, transcribes it with Whisper, polishes the text with an AI model, and types it directly into whatever window you were using.

## How it works

1. Hold **Ctrl + Win** anywhere on your desktop
2. Speak — a floating waveform pill appears at the bottom of your screen
3. Release the keys
4. The transcript is auto-typed into your previously focused window and saved to history

## Features

- **One-hotkey dictation** — works in any app (browser, IDE, Word, chat)
- **AI polish** — fixes punctuation, removes filler words (um, uh, like), fixes capitalisation
- **Three output modes** — Prose, Email, Code (selectable in Settings)
- **Cloud + local fallback** — Groq Whisper for speed, faster-whisper locally when offline
- **Transcript history** — searchable log with copy/delete, synced to Firebase
- **Overlay indicator** — tiny transparent pill shows recording/transcribing state

---

## Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| Rust | stable (via [rustup](https://rustup.rs)) |
| Tauri CLI | bundled via `npm run tauri` |
| Python | 3.9+ (optional, for local fallback) |
| Ollama | latest (optional, for local AI polish) |

### Install

```bash
git clone https://github.com/your-username/WisperFlow.git
cd WisperFlow
npm install
```

### Configure

Create a `.env` file in the project root:

```env
GROQ_API=gsk_your_key_here
```

Get a free key at [console.groq.com](https://console.groq.com). Without it, transcription falls back to the local Python sidecar.

### Run

```bash
npm run tauri dev
```

---

## Transcription engines

### Cloud — Groq Whisper (default)

Fast, accurate, free tier available. Set `GROQ_API` in `.env`.

### Local fallback — faster-whisper

Used automatically when the Groq key is absent or the call fails.

```bash
pip install faster-whisper
```

The sidecar script lives at `sidecar/whisper_sidecar.py`.

---

## AI Polish

After transcription, the raw Whisper output is cleaned up by an AI model before being typed. This step:

- Adds missing punctuation
- Removes filler words (um, uh, like, you know, basically)
- Fixes sentence capitalisation and proper nouns
- Adapts formatting to your chosen **output mode**

### Output modes

| Mode | What it does |
|---|---|
| **Prose** | Standard paragraph formatting |
| **Email** | Adds greeting and sign-off |
| **Code** | Strips punctuation, preserves camelCase / snake_case |

Switch modes in **Settings → Output Mode**.

### Polish engines

**Primary — Groq LLM** (uses your existing `GROQ_API` key, model: `llama-3.1-8b-instant`)

**Fallback — Ollama** (local, private, no internet required)

```bash
# Install Ollama: https://ollama.com
ollama run gemma:2b-instruct-q4_K_M
```

The `sidecar/postprocess_sidecar.py` script calls Ollama at `localhost:11434`. If Ollama is not running, polish silently skips and the raw transcript is typed instead.

---

## Development

```bash
npm run tauri dev     # full app with hot-reload
npm run dev           # frontend only (no Tauri shell)
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
Hotkey (Ctrl+Win) ──► audio::record()
                           │
                      audio::to_wav()
                           │
                 transcribe::groq()  ──► Groq Whisper API
                      │ (fallback)
                 transcribe::local() ──► whisper_sidecar.py
                           │
                postprocess::polish() ──► Groq LLM  ──► postprocess_sidecar.py (Ollama)
                           │
                  auto_type::type_text()   ← types into focused window
                           │
                   transcript_log + Firebase
```

### Source layout

| Path | Role |
|---|---|
| `src/App.tsx` | React UI — all state, settings panel, history log |
| `src/index.css` | Design tokens + all styles (no Tailwind) |
| `src-tauri/src/lib.rs` | AppState, coordinator loop, Tauri commands |
| `src-tauri/src/audio.rs` | cpal recording → 16 kHz mono WAV |
| `src-tauri/src/transcribe.rs` | Groq + local transcription |
| `src-tauri/src/postprocess.rs` | Groq LLM + Ollama polish |
| `src-tauri/src/auto_type.rs` | Types text via enigo |
| `src-tauri/src/hotkey.rs` | rdev hotkey listener |
| `sidecar/whisper_sidecar.py` | Local transcription (faster-whisper) |
| `sidecar/postprocess_sidecar.py` | Local AI polish (Ollama) |

---

## License

MIT — see [LICENSE](LICENSE).
