# Silent Background Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On first launch after MSI install, silently install winget → Ollama → Gemma 4 in the background while the app remains fully usable; show a slim bottom progress bar and a completion toast.

**Architecture:** A new `setup.rs` Rust module runs once at startup via `tokio::spawn`. It emits `"setup_progress"` Tauri events that the React frontend listens to, rendering a bottom bar and toast. A one-time SQLite flag prevents re-running on subsequent launches.

**Tech Stack:** Rust (tokio, reqwest, rusqlite, serde), Tauri 2 events, React useState/useEffect, CSS custom properties.

---

## Task 1: Add settings table to db.rs

**Files:**
- Modify: `src-tauri/src/db.rs`

- [ ] **Step 1: Add `init_settings`, `get_setting`, `set_setting` to db.rs**

Append these three functions after the existing `delete_transcript` function (around line 124):

```rust
pub fn init_settings(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );"
    )
}

pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    ).ok()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}
```

- [ ] **Step 2: Call `init_settings` inside `init_db`**

In `init_db` (line 15), append a call after `execute_batch`:

```rust
pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS transcripts (
            ...existing SQL unchanged...
        );
        ...existing triggers unchanged...
    ")?;
    init_settings(conn)?;
    Ok(())
}
```

Wait — `init_db` currently uses `execute_batch` which returns `Result<()>` directly (no `?` on it currently). Change it to use `?`:

```rust
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

        CREATE TRIGGER IF NOT EXISTS transcripts_ad
        AFTER DELETE ON transcripts BEGIN
            INSERT INTO transcripts_fts(transcripts_fts, rowid, text, raw_text)
            VALUES('delete', old.id, old.text, old.raw_text);
        END;

        CREATE TRIGGER IF NOT EXISTS transcripts_au
        AFTER UPDATE ON transcripts BEGIN
            INSERT INTO transcripts_fts(transcripts_fts, rowid, text, raw_text)
            VALUES('delete', old.id, old.text, old.raw_text);
            INSERT INTO transcripts_fts(rowid, text, raw_text)
            VALUES (new.id, new.text, new.raw_text);
        END;
    ")?;
    init_settings(conn)
}
```

- [ ] **Step 3: Add tests for settings helpers inside the existing `#[cfg(test)]` block**

Append inside the existing `mod tests { ... }` in db.rs:

```rust
    #[test]
    fn set_and_get_setting() {
        let conn = mem_conn();
        set_setting(&conn, "setup_complete", "true").unwrap();
        assert_eq!(get_setting(&conn, "setup_complete").as_deref(), Some("true"));
    }

    #[test]
    fn get_missing_setting_returns_none() {
        let conn = mem_conn();
        assert_eq!(get_setting(&conn, "nonexistent"), None);
    }

    #[test]
    fn set_setting_overwrites_existing() {
        let conn = mem_conn();
        set_setting(&conn, "key", "v1").unwrap();
        set_setting(&conn, "key", "v2").unwrap();
        assert_eq!(get_setting(&conn, "key").as_deref(), Some("v2"));
    }
```

- [ ] **Step 4: Run tests to verify**

```
cd src-tauri && cargo test db::tests
```

Expected: all tests pass including the 3 new ones.

- [ ] **Step 5: Verify it compiles**

```
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src-tauri/src/db.rs
git commit -m "feat: add settings key-value table to SQLite"
```

---

## Task 2: Create setup.rs

**Files:**
- Create: `src-tauri/src/setup.rs`

- [ ] **Step 1: Create the file with full setup logic**

Create `src-tauri/src/setup.rs` with this content:

```rust
use std::io::{BufRead, BufReader};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
struct SetupProgress {
    stage:   String,
    percent: u8,
    message: String,
}

fn emit(app: &AppHandle, stage: &str, percent: u8, message: &str) {
    app.emit("setup_progress", SetupProgress {
        stage:   stage.to_string(),
        percent,
        message: message.to_string(),
    }).ok();
}

pub async fn check_and_setup(app: AppHandle, db: Arc<Mutex<Connection>>) {
    {
        let conn = db.lock().unwrap();
        if crate::db::get_setting(&conn, "setup_complete").as_deref() == Some("true") {
            return;
        }
    }

    emit(&app, "checking", 0, "Checking setup...");

    if !winget_available() {
        emit(&app, "installing_winget", 5, "Installing Windows Package Manager...");
        if let Err(_) = install_winget().await {
            emit(&app, "error", 0,
                "Could not install Package Manager. Install Ollama manually at ollama.com");
            return;
        }
    }

    let (ollama_running, model_present) = check_ollama().await;

    if ollama_running && model_present {
        let conn = db.lock().unwrap();
        crate::db::set_setting(&conn, "setup_complete", "true").ok();
        return;
    }

    if !ollama_running {
        emit(&app, "installing_ollama", 20, "Installing Ollama...");
        if let Err(e) = install_ollama().await {
            emit(&app, "error", 0, &format!("Could not install Ollama: {e}"));
            return;
        }
        tokio::time::sleep(std::time::Duration::from_secs(6)).await;
    }

    if let Err(e) = pull_model(&app).await {
        emit(&app, "error", 0, &format!("Model download failed: {e}"));
        return;
    }

    {
        let conn = db.lock().unwrap();
        crate::db::set_setting(&conn, "setup_complete", "true").ok();
    }

    emit(&app, "done", 100, "Gemma 4 ready. Local AI postprocessing enabled.");
}

fn winget_available() -> bool {
    std::process::Command::new("winget")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

async fn install_winget() -> Result<(), String> {
    let url = "https://github.com/microsoft/winget-cli/releases/latest/download/\
               Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle";

    let bytes = reqwest::get(url)
        .await.map_err(|e| e.to_string())?
        .bytes()
        .await.map_err(|e| e.to_string())?;

    let tmp = std::env::temp_dir().join("AppInstaller.msixbundle");
    std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;

    tokio::task::spawn_blocking(move || {
        let status = std::process::Command::new("powershell")
            .args([
                "-NoProfile", "-NonInteractive", "-Command",
                &format!("Add-AppxPackage -Path '{}'", tmp.display()),
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() { Ok(()) } else { Err("Add-AppxPackage failed".to_string()) }
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn check_ollama() -> (bool, bool) {
    let resp = reqwest::get("http://localhost:11434/api/tags").await;
    match resp {
        Ok(r) if r.status().is_success() => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let has_model = json["models"]
                .as_array()
                .map(|ms| ms.iter().any(|m| {
                    m["name"].as_str().unwrap_or("").starts_with("gemma4-4b")
                }))
                .unwrap_or(false);
            (true, has_model)
        }
        _ => (false, false),
    }
}

async fn install_ollama() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        let status = std::process::Command::new("winget")
            .args([
                "install", "Ollama.Ollama",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() { Ok(()) } else { Err("winget install Ollama failed".to_string()) }
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn pull_model(app: &AppHandle) -> Result<(), String> {
    let app = app.clone();
    tokio::task::spawn_blocking(move || {
        let mut child = std::process::Command::new("ollama")
            .args(["pull", "gemma4-4b"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| e.to_string())?;

        if let Some(stdout) = child.stdout.take() {
            for line in BufReader::new(stdout).lines() {
                let line = match line { Ok(l) => l, Err(_) => continue };
                let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) else { continue };

                let completed = json["completed"].as_u64().unwrap_or(0);
                let total     = json["total"].as_u64().unwrap_or(0);
                let percent   = if total > 0 { (completed * 100 / total).min(99) as u8 } else { 0 };
                let message   = if total > 0 {
                    format!(
                        "Downloading Gemma 4 ({:.1} GB / {:.1} GB)",
                        completed as f64 / 1e9,
                        total as f64 / 1e9,
                    )
                } else {
                    json["status"].as_str().unwrap_or("Downloading...").to_string()
                };

                emit(&app, "pulling_model", percent, &message);
            }
        }

        child.wait().map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
```

- [ ] **Step 2: Verify it compiles**

```
cd src-tauri && cargo check
```

Expected: error — `setup` module not declared yet (that's fine, we wire it next).

- [ ] **Step 3: Commit**

```
git add src-tauri/src/setup.rs
git commit -m "feat: add setup.rs — silent background dependency installer"
```

---

## Task 3: Wire setup.rs into lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add `mod setup;` declaration**

After the existing `mod postprocess;` line (line 18 in lib.rs), add:

```rust
mod setup;
```

- [ ] **Step 2: Spawn setup task after the coordinator spawn**

In the `setup()` closure inside `tauri::Builder::default().setup(|app| { ... })`, find this line (around line 370):

```rust
tauri::async_runtime::spawn(coordinator(rx, app_handle.clone(), settings, db));
```

Immediately after it, add:

```rust
let db_for_setup = db.clone();
let app_for_setup = app_handle.clone();
tauri::async_runtime::spawn(setup::check_and_setup(app_for_setup, db_for_setup));
```

- [ ] **Step 3: Verify it compiles**

```
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add src-tauri/src/lib.rs
git commit -m "feat: spawn silent setup task on app startup"
```

---

## Task 4: Add CSS for progress bar and toast

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append styles to the end of index.css**

```css
/* ── Setup progress bar ─────────────────────────────────────────────────────── */
.setup-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 36px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  font-size: 11px;
  color: var(--text-2);
  z-index: 200;
}

.setup-bar--error {
  background: rgba(224, 82, 82, 0.12);
  border-top-color: rgba(224, 82, 82, 0.3);
  color: var(--red);
}

.setup-bar__icon {
  font-size: 12px;
  flex-shrink: 0;
}

.setup-bar__message {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setup-bar__track {
  width: 120px;
  height: 3px;
  background: var(--border);
  border-radius: var(--radius-pill);
  flex-shrink: 0;
  overflow: hidden;
}

.setup-bar__fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width 0.4s ease-out;
}

/* ── Setup toast ────────────────────────────────────────────────────────────── */
.setup-toast {
  position: fixed;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  z-index: 300;
  animation: toast-in 0.2s ease-out;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

- [ ] **Step 2: Commit**

```
git add src/index.css
git commit -m "feat: add CSS for setup progress bar and toast"
```

---

## Task 5: Add frontend progress bar and toast to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add SetupProgress type and state**

Inside `export default function App()`, after the existing state declarations (around line 298), add:

```tsx
type SetupProgress = { stage: string; percent: number; message: string };
const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
const [showToast, setShowToast] = useState(false);
```

- [ ] **Step 2: Add event listener for "setup_progress"**

Inside the existing `useEffect` that sets up `listen` calls (starting around line 300), add a third listener alongside the existing `unStatus` and `unAuth`:

```tsx
const unSetup = listen<SetupProgress>("setup_progress", (e) => {
  const p = e.payload;
  if (p.stage === "done") {
    setSetupProgress(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  } else {
    setSetupProgress(p);
  }
});
```

And include it in the cleanup return:

```tsx
return () => {
  void unStatus.then(f => f());
  void unSetup.then(f => f());
  // unAuth cleanup if present
};
```

- [ ] **Step 3: Add SetupBar and SetupToast to JSX**

At the very bottom of the returned JSX (just before the final closing `</div>` of the root element), add:

```tsx
{setupProgress && (
  <div className={`setup-bar${setupProgress.stage === "error" ? " setup-bar--error" : ""}`}>
    <span className="setup-bar__icon">
      {setupProgress.stage === "error" ? "✕" : "⬇"}
    </span>
    <span className="setup-bar__message">{setupProgress.message}</span>
    {setupProgress.stage !== "error" && (
      <div className="setup-bar__track">
        <div
          className="setup-bar__fill"
          style={{ width: `${setupProgress.percent}%` }}
        />
      </div>
    )}
    {setupProgress.stage !== "error" && (
      <span style={{ color: "var(--text-3)", flexShrink: 0 }}>
        {setupProgress.percent}%
      </span>
    )}
  </div>
)}

{showToast && (
  <div className="setup-toast">✓ Gemma 4 ready. Local AI postprocessing enabled.</div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```
npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 5: Commit**

```
git add src/App.tsx
git commit -m "feat: add setup progress bar and toast to frontend"
```

---

## Task 6: Smoke test end-to-end

- [ ] **Step 1: Run dev build**

```
npm run tauri dev
```

- [ ] **Step 2: Verify no regression**

App should open normally. No progress bar should appear (since `gemma4-4b` is already installed on your machine and the SQLite flag will be set to `true` after first run).

- [ ] **Step 3: Force-test the progress bar by temporarily bypassing the flag**

In `setup.rs`, temporarily comment out the early-return check:

```rust
// if crate::db::get_setting(&conn, "setup_complete").as_deref() == Some("true") {
//     return;
// }
```

Rerun `npm run tauri dev`. The bar should appear briefly and complete immediately (Ollama + model already present → jumps straight to `done`).

- [ ] **Step 4: Restore the flag check**

Uncomment those lines, save.

- [ ] **Step 5: Final commit**

```
git add src-tauri/src/setup.rs
git commit -m "chore: restore setup_complete flag check after smoke test"
```
