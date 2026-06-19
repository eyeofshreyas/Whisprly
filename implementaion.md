# MASTER RESEARCH REPORT: DICTATION SYSTEM ARCHITECTURES & ACCURACY OPTIMIZATION
*Prepared on: 2026-06-19*

---

## 1. Executive Summary

AI-powered voice dictation is transitioning from traditional speech-to-text (which outputs raw, error-prone transcriptions) to **voice-native writing systems**. The primary technological driver is OpenAI's Whisper model (running locally via frameworks like `whisper.cpp` or in the cloud via fast providers like Groq). The key differentiator in today's landscape is **cognitive cleanup**—removing filler words ("um", "ah"), fixing punctuation, and using Large Language Models (LLMs) to format, style, and inject text directly into active cursors.

---

## 2. Competitive Landscape

### A. Wispr Flow (`wisprflow.ai`)
* **Value Prop:** A seamless, context-aware "voice-native" writing layer for desktop and mobile.
* **Transcription Engine:** Primarily uses OpenAI's Whisper model as its foundation.
* **LLM Integration:** Sits on top of LLMs as a model-agnostic formatting layer, utilizing cloud-based speech processing to enable token-level formatting and contextual understanding.
* **HCI:** Heavy emphasis on low-latency interactions and custom decoding patterns to optimize speed and responsiveness.
* **Pricing:** Free (limited words/week), Pro is **$12–15/month**.

### B. Superwhisper (`superwhisper.com`)
* **Value Prop:** Highly popular, privacy-first desktop dictation application that prioritizes 100% on-device processing.
* **ASR Models:** Primarily runs local Whisper models (from Tiny to Large) and NVIDIA's Parakeet on-device.
* **Hardware Optimization:** Heavily optimized for Apple Silicon (M-series chips) and Windows GPUs to provide low-latency processing without cloud overhead.
* **Compliance & Privacy:** Fully SOC 2 Type II and HIPAA compliant, targeting corporate, legal, and medical professionals.
* **Pricing:** Free (small models), Pro is **$8.49/month**, or a **$250 lifetime license**.

### C. Voibe (`getvoibe.com`)
* **Focus:** Offline-first, macOS-only dictation optimized specifically for developers.
* **Key Feature:** Deep integration with **VS Code and Cursor**, allowing it to correctly resolve complex CLI commands, filepath naming conventions, and programming syntax.
* **Execution:** Fully local, leveraging Apple Silicon hardware acceleration. Offers standard hold-to-talk controls (`Fn` key).

### D. Open Source Tauri Alternatives
* **Vibe (`github.com/thewh1teagle/vibe`):** Free, open-source Tauri-based desktop GUI for offline Whisper file/mic transcription.
* **MumbleFlow / Echo / LotusQ:** Open-source, Tauri-based dictation utilities running `whisper.cpp` and local LLMs (Ollama) for cleanups.

---

## 3. Dictation App Comparison Matrix

| Aspect | Wispr Flow | Superwhisper | Voibe | Vibe (thewh1teagle) | **Whisprly (Our App)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Target Platform** | Mac, Win, iOS, Android | Mac, Windows, iOS | macOS only | Mac, Windows, Linux | Windows & Linux (Wayland/X11) |
| **Execution Model** | Cloud-first (Hybrid) | 100% Local / Offline | 100% Local / Offline | 100% Local / Offline | Groq Cloud + Local Fallback |
| **Primary Focus** | Fluid writing assistant | Privacy & customization | Developer coding/Cursor | Open-source file trans. | Universal cursor typing |
| **AI Polish Engine** | Cloud LLM (Proprietary) | Local / Cloud LLMs | Local Models | N/A / Simple transcription | Groq Llama-3.1 + Ollama |
| **Context Aware** | Yes (App-based) | Yes (Screen OCR/App) | Yes (VS Code/Cursor) | No | No (Manual Mode Switch) |
| **Pricing** | Subscription ($12-15/mo) | Free / Sub / Lifetime | Free / Sub / Lifetime | Open Source (Free) | Open Source (Free) |

---

## 4. Architectural Comparison: How They Work Under the Hood

To achieve human-grade accuracy at lightning speed, premium dictation applications optimize four core pillars of the speech-to-text pipeline:

```
[Audio Input] ──► [Neural VAD (Silero)] ──► [Full-Context Audio] ──► [Whisper API (Groq) or Local Server] ──► [LLM Cleanups]
```

### Pillar A: Voice Activity Detection (VAD)
* **Premium Apps (Superwhisper / Wispr Flow):** Use **neural VADs** (specifically **Silero VAD** run on-device via ONNX Runtime). Neural VADs are trained on diverse speech profiles and are extremely robust at distinguishing human speech from non-speech sounds like keyboard clicks, heavy breathing, sighing, and constant background room hums.
* **Our App (Whisprly):** Uses a basic **RMS (energy-based) threshold** VAD (`rms >= 0.02`). If background noise, AC hum, or keyboard clicks exceed `0.02` amplitude, the frame is classified as speech. This makes the system susceptible to registering empty noise as active dictation, causing transcription errors or triggering hallucinations.

### Pillar B: Audio Processing & Chunking
* **Premium Apps (Superwhisper / Wispr Flow):** Transcribe the **entire audio recording as a single continuous block** (under Whisper's standard 30-second window limit). For long-form recording, they use VAD strictly to locate natural sentence pauses, slice with overlap, and stitch segments.
* **Our App (Whisprly):** Employs a **naive chunking architecture**. When the user holds the hotkey, speaks, and releases, the VAD chops the speech into separate, isolated chunks separated by any pause >500ms. It then sends *each chunk to Groq/local-Whisper individually* in a loop.

### Pillar C: Prompt Chaining & Context Propagation
* **Premium Apps (Superwhisper / Wispr Flow):** Feed preceding context back into Whisper. They use the `prompt` parameter (in Groq/OpenAI APIs) or `initial_prompt` (in local `faster-whisper` / `whisper.cpp`) to pass the transcript of preceding sentences. This propagates capitalization style, spelling of proper nouns, and context boundaries.
* **Our App (Whisprly):** Uses a static `.text("prompt", "Hello.")` parameter for all chunks. This wipes out context memory, forcing Whisper to guess spellings and sentences from scratch for every segment.

### Pillar D: Local Model Persistence
* **Premium Apps (Superwhisper / Voibe):** Keep a **persistent in-memory Whisper instance** (either running as a background HTTP daemon or linked directly to the application process memory).
* **Our App (Whisprly):** Spawns a **new Python sub-process** (`whisper_sidecar.py`) on every single key-release. The process must import libraries, load the Whisper model from disk, copy it into memory, and run inference. This adds **2–4 seconds of initialization overhead**, making local transcription slow.

---

## 5. The Accuracy & UX Gap Analysis

By analyzing the current Whisprly codebase, we identify why our accuracy is lower and where transcription breaks down compared to premium tools:

1. **Sentence Fragmentation (Boundary clipping):** Naive chunking slices audio mid-word if the speaker pauses slightly. Whisper struggles to transcribe truncated audio boundaries, producing typos at the edges of chunks (e.g. transcribing "Tauri" as "auri" or "taur").
2. **Context Loss (Phonetic spelling):** Without prompt propagation, a user saying *"I am building Whisprly. Whisprly is written in Rust."* gets split. The second chunk has no context that "Whisprly" is a proper noun, so Whisper transcribes it phonetically as *"Whisperly"* or *"Whisper lee"*.
3. **Severe Hallucinations on Silence:** On silent frames or background noise, Whisper often outputs hallucinations (e.g., *"Thank you for watching"*, *"Please subscribe"*). Because Whisprly's code drops the *entire* dictation session if *any* single chunk triggers `is_hallucination`, a tiny bit of background static can delete an entire paragraph of dictated text.
4. **Extreme Latency & API Overhead:** Making 4–5 individual API requests to Groq for a single 15-second dictation multiplies network overhead and risks hitting API rate limits.

---

## 6. Actionable Improvements & Implementation Plan

To close the accuracy gap, we should refactor Whisprly's transcription architecture to match premium standards.

### Step 1: Replace Chunker with Single Continuous Audio Transcription
Instead of chopping the recording into multiple fragments and running transcribers in a loop, we will capture the entire audio segment as one block. We will implement **leading and trailing silence trimming** to prevent Whisper from hallucinating on empty spaces, but keep the entire spoken body in one piece.

**Benefits:**
* Single API request to Groq (dramatic speed improvement, e.g. from 1.5s down to 300ms).
* Whisper retains 100% of the sentence context.
* Zero VAD boundary cuts that split words in half.

### Step 2: Implement Context & Prompt Chaining
We will feed the user's recent transcription history and dynamic application context (such as custom nouns) into the `prompt` parameter of Groq and the `initial_prompt` of `faster-whisper`.

### Step 3: Implement a Persistent Local Sidecar Server
Instead of spawning `whisper_sidecar.py` from scratch on every run, we will refactor it into a lightweight, persistent Python HTTP micro-server (e.g., using `FastAPI` or standard `http.server`). It will run in the background (managed by Tauri's lifecycle) and keep the Whisper model loaded in memory, reducing local inference launch time to zero.

---

## 7. Technical Walkthrough: Refactoring Whisprly for High Accuracy

### Refactoring `audio.rs`
We will replace the multi-chunk pipeline in `record` with a single-chunk output that trims leading and trailing silence:

```rust
// New function inside src-tauri/src/audio.rs
pub fn trim_silence(samples: &[f32]) -> &[f32] {
    let mut start = 0;
    while start + 480 <= samples.len() {
        if is_speech_frame(&samples[start..start + 480]) {
            break;
        }
        start += 480;
    }

    let mut end = samples.len();
    while end >= start + 480 {
        if is_speech_frame(&samples[end - 480..end]) {
            break;
        }
        end -= 480;
    }

    if start >= end {
        &[]
    } else {
        &samples[start..end]
    }
}
```

Then in `audio::record`, instead of looping frames into a `Chunker`, we resample and trim:
```rust
    // Convert to mono and resample to 16kHz
    let mono = to_mono(&raw_samples, channels as usize);
    let resampled = resample_to_16k(&mono, sample_rate);

    let trimmed = trim_silence(&resampled);
    if !trimmed.is_empty() && !is_silent(trimmed) {
        chunk_tx.send(trimmed.to_vec()).ok();
    }
```

### Refactoring `lib.rs` Coordinator
This reduces the loop to a single unified call:
```rust
                    // Drain all chunks (which now represents the single unified audio block)
                    let chunks: Vec<Vec<f32>> = chunk_rx.try_iter().collect();
                    if chunks.is_empty() {
                        emit_status(&app, "idle", Some("No audio captured".into()));
                        hide_overlay(&app);
                        continue;
                    }
                    
                    let combined_samples = chunks.into_iter().flatten().collect::<Vec<f32>>();
                    let wav = audio::to_wav_from_samples(combined_samples);
                    
                    // Call transcription once...
```

## 8. Development Roadmap

1. **Milestone 1 (Completed):** Refactored recording flow in `audio.rs` to use a single continuous trimmed buffer.
2. **Milestone 2 (Completed):** Updated the Groq and Local sidecar APIs to accept context-aware prompt chaining.
3. **Milestone 3 (Completed):** Created `whisper_server.py` and refactored `local` transcription to query the persistent HTTP server to eliminate startup/model loading latency.
4. **Milestone 4 (Completed):** Implemented active window title parsing in Rust (`platform::get_active_window_title`) and mapped it to a dynamic `"auto"` output mode selector in the React UI.
5. **Milestone 5 (Completed - Accuracy Supercharger):** Implemented dynamic peak gain normalization to standard 0.8 amplitude in `audio.rs` to optimize quiet microphone volumes for Whisper.
6. **Milestone 6 (Completed - Accuracy Supercharger):** Added Custom Vocabulary spelling guides and Custom Formatting Instructions (React UI panel + Tauri AppSettings). Dynamically prepends them to Whisper prompts and embeds them as instructions in LLM cleanups.
