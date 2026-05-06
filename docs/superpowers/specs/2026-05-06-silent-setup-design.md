# Silent Background Setup — Design Spec

**Date:** 2026-05-06
**Status:** Approved

## Overview

When a friend installs Whisprly via MSI and launches it for the first time, the app silently installs all dependencies (winget → Ollama → Gemma 4) in the background. The user can use the app immediately via Groq. A slim bottom progress bar shows download status; a toast fires when setup completes. No wizard, no blocking screen.

---

## User Experience

### During setup
- App opens normally — fully usable via Groq transcription
- Slim progress bar appears at the bottom of the main window:
  ```
  [ ⬇ Downloading Gemma 4 (2.1 GB / 5.0 GB) ████████░░░░ 42% ]
  ```
- Bar shows the current stage message and percent

### On completion
- Toast notification appears for 4 seconds then fades:
  ```
  ✓ Gemma 4 ready. Local AI postprocessing enabled.
  ```
- Progress bar disappears

### On error
- Bar turns red with a short message:
  ```
  [ ✕ Could not install Package Manager. Install Ollama manually at ollama.com ]
  ```

### Already set up (existing users)
- No events emitted, no UI shown — zero impact

---

## Backend — `src-tauri/src/setup.rs`

New module called once at startup via `tokio::spawn`.

### Startup sequence

```
app starts
  └─ tokio::spawn(setup::check_and_setup(app))
       └─ read setup_complete flag from SQLite
            ├─ true → return immediately (silent)
            └─ false → run setup chain:
                 1. check_winget()
                    ├─ found → continue
                    └─ missing → install_winget()
                         └─ download .msixbundle from Microsoft GitHub
                         └─ PowerShell: Add-AppxPackage <path>
                 2. check_ollama()  (ping http://localhost:11434/api/tags)
                    ├─ running + gemma4-4b present → skip to step 4
                    ├─ running + model missing → go to step 3
                    └─ not running → winget install Ollama.Ollama --silent
                 3. ollama pull gemma4-4b  (parse JSON progress lines)
                 4. write setup_complete = true to SQLite
                 5. emit { stage: "done", percent: 100 }
```

### Tauri event: `"setup_progress"`

Emitted throughout the setup chain. Shape:

```json
{
  "stage": "checking" | "installing_winget" | "installing_ollama" | "pulling_model" | "done" | "error",
  "percent": 0-100,
  "message": "Downloading Gemma 4 (2.1 GB / 5.0 GB)"
}
```

### Progress parsing

`ollama pull` outputs JSON lines to stdout:
```json
{"status":"pulling manifest"}
{"status":"pulling abc123","completed":2100000000,"total":5000000000}
```

Parse `completed / total * 100` for the percent value during `pulling_model` stage.

### Winget installation

- Source: `https://github.com/microsoft/winget-cli/releases/latest` — download `Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle`
- Install: `powershell Add-AppxPackage <path>`
- Works on Windows 10 1809+ and Windows 11 — no admin rights required
- On failure: emit `{ stage: "error", message: "Could not install Package Manager. Install Ollama manually at ollama.com" }`

### Error handling

| Situation | Behaviour |
|---|---|
| winget install fails / Windows too old | Error event with manual install message |
| Ollama install fails | Error event with error text |
| Model pull interrupted | Error event; user restarts the app to retry |
| Already set up (`setup_complete` flag) | Silent return, no events |

### One-time flag

After successful setup, write `setup_complete = true` to the existing SQLite database (new `settings` key-value table). Future launches read this flag and skip the entire setup chain.

---

## Frontend — `App.tsx` + `index.css`

No new files. Two additions:

### 1. Setup progress state

```ts
const [setupProgress, setSetupProgress] = useState<{
  stage: string;
  percent: number;
  message: string;
} | null>(null);
```

Listen to `"setup_progress"` event (same pattern as existing `"status"` listener). Clear state when `stage === "done"` after showing toast.

### 2. Bottom progress bar

Rendered below the main content, above nothing — pinned to bottom of window. Visible only when `setupProgress !== null && setupProgress.stage !== "done"`. Error state renders the same bar with red background.

```
[ ⬇ {message} ████████░░░░ {percent}% ]
```

Error state: same bar, red background, `✕` icon, no percent.

### 3. Toast notification

On `stage === "done"`: render a toast overlay for 4 seconds using a `setTimeout` to clear it. Styled with `--accent` (#6c47ff) background.

```
✓ Gemma 4 ready. Local AI postprocessing enabled.
```

---

## SQLite — settings table

New key-value table added to `db.rs`:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Used to persist `setup_complete = "true"` after successful setup. Extensible for future persistent settings.

---

## Files changed

| File | Change |
|---|---|
| `src-tauri/src/setup.rs` | New — entire setup logic |
| `src-tauri/src/lib.rs` | Add `mod setup;`, spawn `setup::check_and_setup` in `run()` |
| `src-tauri/src/db.rs` | Add `settings` table + `get_setting` / `set_setting` helpers |
| `src/App.tsx` | Add setup event listener, bottom bar, toast |
| `src/index.css` | Add styles for progress bar and toast |

---

## Out of scope

- Groq API key prompting (already handled in Settings)
- Python / faster-whisper installation (optional local fallback, not required)
- macOS / Linux support (Windows-only for now)
