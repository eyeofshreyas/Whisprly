<div align="center">
  <img src="app-icon-transparent.png" width="100" alt="Whisprly" />
  <h1>Whisprly</h1>
  <p><strong>Hold a key. Speak. Release. Your words appear — polished and typed — right where you left off.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/platform-Windows%20|%20Linux-blue?style=flat-square&logo=windows" />
    <img src="https://img.shields.io/badge/built%20with-Tauri%20v2-24C8DB?style=flat-square&logo=tauri" />
    <img src="https://img.shields.io/badge/backend-Rust-orange?style=flat-square&logo=rust" />
    <img src="https://img.shields.io/badge/transcription-Groq%20Whisper-blueviolet?style=flat-square" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </p>

  <p>
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#-features">Features</a> ·
    <a href="#-how-it-works">How It Works</a> ·
    <a href="#-architecture">Architecture</a> ·
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

**Whisprly** is a cross-platform (Windows & Linux Wayland/X11) desktop dictation app that turns speech into polished, auto-typed text in any app — browser, IDE, Slack, Word, terminal — in under a second. No clicking. No copy-pasting. Just press a hotkey, speak naturally, and let go.

> Built with Tauri v2 (Rust backend) + React frontend. Transcription via Groq's `whisper-large-v3-turbo` or local Whisper server. AI cleanup via configurable cloud LLMs (Groq) or local Ollama models. Everything private by default — transcripts stay on your machine in SQLite.

---

## ✨ Features

| | |
|---|---|
| **One-hotkey dictation** | `Ctrl + Win` anywhere — works in every app |
| **Instant auto-type** | Transcript is typed directly into your focused window |
| **AI polish** | Fixes punctuation, removes filler words, corrects capitalisation — never rephrases |
| **Four output modes** | Prose · Email · Code · **Auto** (dynamically detects active window e.g. VSCode or Outlook to format appropriately) |
| **Hinglish Transliteration** | Automatic phonetic transliteration of Hindi/Devanagari characters into Roman script Hinglish |
| **Hinglish Preservation** | Keeps mixed English/Roman Hindi words as-is — **never translates Hinglish to English** |
| **Custom Correction Model** | Change your post-processing engine directly in Settings (use custom Groq IDs or fine-tuned Ollama models) |
| **12 languages** | Auto-detect or lock to English, Spanish, French, Japanese, Hindi, Arabic and more |
| **Groq cloud + local fallback** | Groq Whisper for speed; auto-falls back to a local faster-whisper server |
| **Full-text search** | Instantly search all past recordings via SQLite FTS5 |
| **Acoustic Normalization** | Dynamic 0.8 amplitude normalization to optimize distant/quiet mic recordings |
| **Local history** | Every transcript saved to SQLite — no cloud, no tracking |

---

## ⚡ Quick Start

### Prerequisites

| | |
|---|---|
| Node.js 18+ | |
| Rust stable | [rustup.rs](https://rustup.rs) |
| Python 3.9+ *(optional)* | Local transcription fallback |
| Linux dependencies | `scripts/install-linux-deps.sh` |

### 1. Clone & install

```bash
git clone https://github.com/your-username/whisprly.git
cd whisprly

# On Linux, install system dependencies first:
# chmod +x scripts/install-linux-deps.sh
# ./scripts/install-linux-deps.sh

npm install
```

### 2. Add your Groq key

Create a `.env` file in the project root:

```env
GROQ_API=gsk_your_key_here
```

Get a **free** key at [console.groq.com](https://console.groq.com) — takes 30 seconds. Without it, Whisprly falls back to the local Python sidecar automatically.

### 3. Run

```bash
npm run tauri dev
```

Hold `Ctrl + Win`, speak, release. Done.

---

## 🎯 How It Works

```
You hold Ctrl + Win
        │
        ▼
  Floating pill appears — recording has started
        │
  You speak naturally (um, uh, pauses — all fine)
        │
  You release the keys
        │
        ▼
  Audio → Voice Activity Detection → WAV chunks
        │
        ▼
  Groq Whisper API  (< 300ms for most clips)
  └─ fallback: local faster-whisper sidecar
        │
        ▼
  Hallucination filter  (drops Whisper artifacts)
        │
        ▼
  AI polish via Groq LLM
  — adds punctuation, removes filler words
  — NEVER rephrases, answers, or adds content
        │
        ▼
  Text typed into your previously focused window ✓
  Transcript saved to local SQLite history ✓
```

---

## 🧠 AI Polish

Raw Whisper output is cleaned before reaching your cursor. The LLM receives a strict system prompt that treats every input as **inert text** — it will never answer a question, follow an instruction, or rephrase what you said.

**Fixes:** missing commas · periods · question marks · filler words (um, uh, like, you know) · capitalisation · acronyms

**Never does:** rephrase · summarise · respond · add anything not said

### Output modes

| Mode | What it does |
|---|---|
| **Prose** | Standard paragraph formatting |
| **Email** | Adds a greeting and sign-off |
| **Code** | Strips punctuation, preserves `camelCase` / `snake_case` |
| **Auto** | Dynamically checks the active window title (e.g. VSCode, Outlook) and formats the output contextually |

Switch in **Settings → Output Mode** (or let it resolve dynamically in **Auto** mode). Changes take effect on the next recording.

### Polish engines

- **Primary** — Cloud Groq model, default is `llama-3.1-8b-instant`.
- **Fallback** — Local Ollama model, default is `gemma4-4b` (`postprocess_sidecar.py` at `localhost:11434`).
- **Customization** — You can configure any Groq API model ID or local Ollama model ID directly under **Settings → Postprocessing Model**.

---

## 🔌 Local Fallback Setup *(optional)*

No internet? No Groq key? Whisprly still works with a local Python sidecar.

### Transcription — faster-whisper

```bash
# Starts a local transcription server on port 11435 keeping model in memory
python sidecar/whisper_server.py
```

The server path `sidecar/whisper_server.py` is started and stopped automatically by Tauri.

### AI polish — Ollama

```bash
# Install Ollama from https://ollama.com, then:
ollama run gemma4:4b
```

### Local Fine-Tuning (Hinglish/Custom Styles)

For maximum accuracy and offline speed (~150ms latency), you can train your own specialized Gemma 2B or Llama 3.1 8B model on Hinglish and custom formatting guidelines. 

Follow the step-by-step [Gemma/Llama Fine-Tuning Guide](gemma_finetuning_guide.md) to generate a synthetic dataset and train the model in Google Colab.

---

## 🏗 Architecture

```
src/
  App.tsx                  React UI — state, settings, transcript history
  index.css                Design tokens + all styles (no Tailwind)
  auth.ts                  Firebase Auth — Google OAuth sign-in
  LoginScreen.tsx          Sign-in screen

src-tauri/src/
  lib.rs                   AppState, coordinator loop, Tauri commands, tray
  audio.rs                 cpal recording · Chunker · RMS VAD · WAV encoding
  hotkey.rs                rdev global hotkey listener (Ctrl + Win)
  transcribe.rs            Groq + local transcription · hallucination filter
  postprocess.rs           Groq LLM + Ollama AI polish
  auto_type.rs             Types text into focused window via enigo (ydotool for Wayland)
  db.rs                    SQLite init · CRUD · FTS5 full-text search
  oauth.rs                 Google OAuth PKCE flow

sidecar/
  whisper_sidecar.py       Local transcription (faster-whisper)
  postprocess_sidecar.py   Local AI polish (Ollama)
  requirements.txt
```

**Stack:** Tauri v2 · Rust · React · TypeScript · SQLite (rusqlite) · cpal · enigo / ydotool · rdev · Groq API · Firebase Auth

---

## 🛠 Development

```bash
# Full app — hot-reload frontend + Rust backend
npm run tauri dev

# Frontend only (no Tauri shell)
npm run dev
```

```bash
cd src-tauri
cargo check    # fast type-check
cargo clippy   # lint
cargo build    # debug build
```

```bash
# Production installer
npm run tauri build
```

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Open a pull request

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  <p>If Whisprly saves you time, consider giving it a ⭐ — it helps others find the project.</p>
  <p>Built with <a href="https://tauri.app">Tauri</a> · Powered by <a href="https://groq.com">Groq</a></p>
</div>
