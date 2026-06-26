<div align="center">
  <img src="src/assets/logo.svg" width="100" alt="Whisprly" />
  <h1>Whisprly</h1>
  <p><strong>Hold a key. Speak. Release. Your words appear — polished and typed — right where you left off.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/version-0.2.0-brightgreen?style=flat-square" />
    <img src="https://img.shields.io/badge/platform-Windows%20|%20Linux-blue?style=flat-square&logo=windows" />
    <img src="https://img.shields.io/badge/built%20with-Tauri%20v2-24C8DB?style=flat-square&logo=tauri" />
    <img src="https://img.shields.io/badge/backend-Rust-orange?style=flat-square&logo=rust" />
    <img src="https://img.shields.io/badge/transcription-Groq%20Whisper-blueviolet?style=flat-square" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </p>

  <p>
    <a href="#-features">Features</a> ·
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#-how-it-works">How It Works</a> ·
    <a href="#-architecture">Architecture</a> ·
    <a href="#-development">Development</a> ·
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

**Whisprly** is a cross-platform (Windows & Linux Wayland/X11) desktop dictation app that turns speech into polished, auto-typed text in any app — browser, IDE, Slack, Word, terminal — in under a second. No clicking. No copy-pasting. Just press a hotkey, speak naturally, and let go.

> Built with Tauri v2 (Rust backend) + React frontend. Transcription via Groq's `whisper-large-v3-turbo` or a local Whisper server. AI cleanup via Groq LLMs or local Ollama models. Everything private by default — all transcripts stay on your machine in SQLite.

---

## ✨ Features

| | |
|---|---|
| 🎙 **One-hotkey dictation** | Hold `Ctrl + Win` to record, release to transcribe — works in every app |
| ✨ **AI polish** | Fixes punctuation, removes filler words, corrects capitalisation — never rephrases |
| 🔄 **4 output modes** | Prose · Email · Code · **Auto** (detects active window — VSCode, Outlook, etc.) |
| 🌐 **12 languages** | Auto-detect or lock to English, Hindi, Spanish, French, Japanese, Arabic, and more |
| 🇮🇳 **Hinglish support** | Automatic phonetic Roman transliteration of Hindi/Devanagari speech |
| ⚡ **Instant auto-type** | Transcript typed directly into whichever window had focus |
| 🔍 **Full-text search** | SQLite FTS5 index over all past transcripts |
| 🔒 **Local-first history** | Every transcript saved locally — no cloud, no tracking |
| 🎚 **Acoustic normalization** | Dynamic 0.8 amplitude normalization for quiet or distant mics |
| 🏠 **Local fallback** | Primary: Groq Whisper cloud API. Fallback: local faster-whisper Python server |
| 🔧 **Custom correction model** | Configure any Groq model ID or fine-tuned Ollama model in Settings |

---

## ⚡ Quick Start

### Option A — Download a release

1. Go to the [Releases](https://github.com/eyeofshreyas/Whisprly/releases) page and download the installer for your platform.
2. Create a `.env` file next to the binary with your Groq API key:
   ```env
   GROQ_API=gsk_your_key_here
   ```
   Get a **free** key at [console.groq.com](https://console.groq.com) — takes 30 seconds. Skip this to use the local fallback.
3. Launch the app — the tray icon appears.
4. Hold **`Ctrl + Win`**, speak, release — your words are typed into the active window.

### Option B — Build from source

**Prerequisites:** Node.js 18+, Rust stable ([rustup.rs](https://rustup.rs)), Python 3.9+ *(optional — local fallback only)*

```bash
git clone https://github.com/eyeofshreyas/Whisprly.git
cd Whisprly

# Linux only: install system dependencies
chmod +x scripts/install-linux-deps.sh && ./scripts/install-linux-deps.sh

npm install
cp .env.example .env   # add your GROQ_API key
npm run tauri dev
```

---

## 🎯 How It Works

```
Hold Ctrl + Win
      │
      ▼
Floating pill appears — recording starts
      │
Speak naturally (um, uh, pauses are all fine)
      │
Release the keys
      │
      ▼
Audio → silence detection → 16 kHz mono WAV
      │
      ▼
Groq Whisper API  (< 300 ms for most clips)
└─ fallback: local faster-whisper sidecar
      │
      ▼
Hallucination filter  (drops Whisper artifacts)
      │
      ▼
AI polish via Groq LLM / Ollama
  — adds punctuation, removes filler words
  — NEVER rephrases, answers, or adds content
      │
      ▼
Text typed into your previously focused window ✓
Transcript saved to local SQLite history       ✓
```

---

## 🧠 AI Polish

Raw Whisper output is cleaned before reaching your cursor. The LLM receives a strict system prompt that treats every input as **inert text** — it will never answer a question, follow an instruction, or rephrase what you said.

**Fixes:** missing commas · periods · question marks · filler words (um, uh, like, you know) · capitalisation · acronyms

**Never does:** rephrase · summarise · respond · add anything not said

### Output modes

| Mode | Behaviour |
|---|---|
| **Prose** | Standard paragraph formatting |
| **Email** | Adds a greeting and sign-off |
| **Code** | Strips punctuation, preserves `camelCase` / `snake_case` |
| **Auto** | Checks the active window title (e.g. VSCode → Code mode, Outlook → Email mode) |

### Polish engines

| Engine | Default model | How to change |
|---|---|---|
| **Groq cloud** | `llama-3.1-8b-instant` | Settings → Postprocessing Model |
| **Local Ollama** | `gemma4:4b` | Settings → Postprocessing Model |

---

## 🔌 Local Fallback *(optional)*

No Groq key? No internet? Whisprly still works with local Python sidecars.

```bash
# Transcription — starts a local server on port 11435
python sidecar/whisper_server.py

# AI polish — requires Ollama (https://ollama.com)
ollama run gemma4:4b
```

### Custom fine-tuning

Train a specialized Gemma 2B or Llama 3.1 8B model on Hinglish and custom formatting styles for ~150 ms local latency. See the [Gemma/Llama Fine-Tuning Guide](gemma_finetuning_guide.md).

---

## 🏗 Architecture

Whisprly is two layers connected by Tauri's IPC bridge. The React frontend handles all UI state; the Rust backend handles audio, transcription, text injection, and persistence.

| File | Role |
|---|---|
| `src/App.tsx` | React UI — all state via `useState`, single entry point |
| `src/Overlay.tsx` | Transparent floating pill shown during recording |
| `src-tauri/src/lib.rs` | Coordinator loop, Tauri commands, system tray, IPC |
| `src-tauri/src/audio.rs` | cpal recording, silence detection (RMS), WAV encoding |
| `src-tauri/src/hotkey.rs` | Global `Ctrl + Win` listener via rdev |
| `src-tauri/src/transcribe.rs` | Groq + local transcription, hallucination filter |
| `src-tauri/src/postprocess.rs` | AI polish via Groq LLM or Ollama |
| `src-tauri/src/auto_type.rs` | Text injection via enigo (ydotool on Wayland) |
| `src-tauri/src/db.rs` | SQLite init, CRUD, FTS5 full-text search |

**Stack:** Tauri v2 · Rust · React · TypeScript · SQLite (rusqlite) · cpal · enigo / ydotool · rdev · Groq API

---

## 🛠 Development

```bash
# Full app — hot-reload frontend + Rust backend
npm run tauri dev

# Frontend only (no Tauri shell)
npm run dev

# Production installer
npm run tauri build
```

```bash
cd src-tauri
cargo check    # fast type-check (no linking)
cargo clippy   # lint
cargo build    # debug build
```

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Open a pull request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, see [SECURITY.md](SECURITY.md).

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  <p>If Whisprly saves you time, consider giving it a ⭐ — it helps others find the project.</p>
  <p>Built with <a href="https://tauri.app">Tauri</a> · Powered by <a href="https://groq.com">Groq</a></p>
</div>
