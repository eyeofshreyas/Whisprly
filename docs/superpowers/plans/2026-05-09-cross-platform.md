# Cross-Platform (Windows + Linux) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WisperFlow build and run on both Windows (MSI) and Linux (AppImage) with platform-appropriate hotkeys and Ollama setup.

**Architecture:** A new `platform/` module provides per-OS key constants; `hotkey.rs` and `setup.rs` use `#[cfg(target_os)]` branches for their divergent logic; Linux bundles the Ollama binary inside the AppImage; platform-specific `tauri.*.conf.json` files control bundle targets and external binaries.

**Tech Stack:** Rust `#[cfg(target_os)]`, `rdev` (evdev on Linux), `enigo` (xdo/X11 on Linux), Tauri v2 platform config merging, Node.js pre-build script for Ollama binary download.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src-tauri/src/platform/mod.rs` | Re-export platform constants |
| Create | `src-tauri/src/platform/windows.rs` | Ctrl+Win key constants |
| Create | `src-tauri/src/platform/linux.rs` | Ctrl+Shift+Space constants, input group check |
| Modify | `src-tauri/src/lib.rs` | Add `mod platform;`, `ollama_process` in `AppState`, kill on quit |
| Modify | `src-tauri/src/hotkey.rs` | Use platform constants; Linux 3-key logic |
| Modify | `src-tauri/src/setup.rs` | `#[cfg]` branches for install/serve steps; Linux uses bundled binary |
| Modify | `src-tauri/tauri.conf.json` | Remove `"targets": "all"` (let platform configs set this) |
| Create | `src-tauri/tauri.linux.conf.json` | AppImage target + `externalBin` |
| Create | `src-tauri/tauri.windows.conf.json` | MSI target |
| Create | `scripts/fetch-ollama.js` | Downloads correct Ollama binary before Linux build |
| Modify | `package.json` | Add `prebuild` script that runs `fetch-ollama.js` |

---

### Task 1: Platform module — key constants

**Files:**
- Create: `src-tauri/src/platform/mod.rs`
- Create: `src-tauri/src/platform/windows.rs`
- Create: `src-tauri/src/platform/linux.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod platform;`)

- [ ] **Step 1: Create `src-tauri/src/platform/windows.rs`**

```rust
use rdev::Key;

pub const CTRL_KEYS: [Key; 2] = [Key::ControlLeft, Key::ControlRight];
/// Win/Meta key — acts as both modifier and trigger on Windows
pub const TRIGGER_KEYS: [Key; 2] = [Key::MetaLeft, Key::MetaRight];
```

- [ ] **Step 2: Create `src-tauri/src/platform/linux.rs`**

```rust
use rdev::Key;

pub const CTRL_KEYS: [Key; 2] = [Key::ControlLeft, Key::ControlRight];
pub const SHIFT_KEYS: [Key; 2] = [Key::ShiftLeft, Key::ShiftRight];
/// Space is the trigger key — press while Ctrl+Shift held to record
pub const TRIGGER_KEY: Key = Key::Space;

/// Returns true if the current user can read /dev/input/event0.
/// rdev/evdev requires this; users need to be in the `input` group.
pub fn input_group_ok() -> bool {
    std::fs::metadata("/dev/input/event0")
        .map(|_| std::fs::File::open("/dev/input/event0").is_ok())
        .unwrap_or(false)
}
```

- [ ] **Step 3: Create `src-tauri/src/platform/mod.rs`**

```rust
#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "windows")]
pub use windows::*;
#[cfg(target_os = "linux")]
pub use linux::*;
```

- [ ] **Step 4: Add `mod platform;` to `src-tauri/src/lib.rs`**

In `lib.rs`, find the block of `mod` declarations (lines 12–19) and add `mod platform;`:

```rust
mod audio;
mod auto_type;
mod db;
mod hotkey;
mod oauth;
mod platform;
mod postprocess;
mod setup;
mod transcribe;
```

- [ ] **Step 5: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors. If you see "unused import" warnings for the platform module, that's fine — the constants are used in the next task.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/platform/ src-tauri/src/lib.rs
git commit -m "feat: add platform module with per-OS hotkey constants"
```

---

### Task 2: Refactor hotkey.rs to use platform constants

**Files:**
- Modify: `src-tauri/src/hotkey.rs`

The Windows path reuses the existing two-flag logic but reads keys from `crate::platform`. The Linux path adds a third flag (Shift) and changes the trigger semantic: Space press = Start, Space release = Stop.

- [ ] **Step 1: Replace `src-tauri/src/hotkey.rs` with the cross-platform version**

```rust
use rdev::{listen, EventType, Key};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tokio::sync::mpsc::UnboundedSender;

use crate::HotkeyEvent;

#[cfg(target_os = "windows")]
pub fn start_listener(tx: UnboundedSender<HotkeyEvent>) {
    use crate::platform::{CTRL_KEYS, TRIGGER_KEYS};

    let ctrl     = Arc::new(AtomicBool::new(false));
    let win      = Arc::new(AtomicBool::new(false));
    let was_both = Arc::new(AtomicBool::new(false));

    if let Err(e) = listen(move |event| {
        match event.event_type {
            EventType::KeyPress(k) if CTRL_KEYS.contains(&k) => {
                ctrl.store(true, Ordering::SeqCst);
            }
            EventType::KeyRelease(k) if CTRL_KEYS.contains(&k) => {
                ctrl.store(false, Ordering::SeqCst);
            }
            EventType::KeyPress(k) if TRIGGER_KEYS.contains(&k) => {
                win.store(true, Ordering::SeqCst);
            }
            EventType::KeyRelease(k) if TRIGGER_KEYS.contains(&k) => {
                win.store(false, Ordering::SeqCst);
            }
            _ => return,
        }

        let both = ctrl.load(Ordering::SeqCst) && win.load(Ordering::SeqCst);
        let was  = was_both.load(Ordering::SeqCst);

        if both && !was {
            was_both.store(true, Ordering::SeqCst);
            let _ = tx.send(HotkeyEvent::Start);
        } else if !both && was {
            was_both.store(false, Ordering::SeqCst);
            ctrl.store(false, Ordering::SeqCst);
            win.store(false, Ordering::SeqCst);
            let _ = tx.send(HotkeyEvent::Stop);
        }
    }) {
        eprintln!("rdev listen error: {e:?}");
    }
}

#[cfg(target_os = "linux")]
pub fn start_listener(tx: UnboundedSender<HotkeyEvent>) {
    use crate::platform::{CTRL_KEYS, SHIFT_KEYS, TRIGGER_KEY};

    let ctrl   = Arc::new(AtomicBool::new(false));
    let shift  = Arc::new(AtomicBool::new(false));
    let active = Arc::new(AtomicBool::new(false));

    if let Err(e) = listen(move |event| {
        match event.event_type {
            EventType::KeyPress(k) if CTRL_KEYS.contains(&k) => {
                ctrl.store(true, Ordering::SeqCst);
            }
            EventType::KeyRelease(k) if CTRL_KEYS.contains(&k) => {
                ctrl.store(false, Ordering::SeqCst);
            }
            EventType::KeyPress(k) if SHIFT_KEYS.contains(&k) => {
                shift.store(true, Ordering::SeqCst);
            }
            EventType::KeyRelease(k) if SHIFT_KEYS.contains(&k) => {
                shift.store(false, Ordering::SeqCst);
            }
            EventType::KeyPress(k) if k == TRIGGER_KEY => {
                if ctrl.load(Ordering::SeqCst)
                    && shift.load(Ordering::SeqCst)
                    && !active.load(Ordering::SeqCst)
                {
                    active.store(true, Ordering::SeqCst);
                    let _ = tx.send(HotkeyEvent::Start);
                }
            }
            EventType::KeyRelease(k) if k == TRIGGER_KEY => {
                if active.load(Ordering::SeqCst) {
                    active.store(false, Ordering::SeqCst);
                    let _ = tx.send(HotkeyEvent::Stop);
                }
            }
            _ => return,
        }
    }) {
        eprintln!("rdev listen error: {e:?}");
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors. On Windows the Linux branch is dead code and vice versa — the compiler handles this correctly with `#[cfg]`.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/hotkey.rs
git commit -m "feat: refactor hotkey to use platform key constants, add Linux Ctrl+Shift+Space"
```

---

### Task 3: Add Linux input group check to setup.rs

**Files:**
- Modify: `src-tauri/src/setup.rs`

On Linux, `rdev` reads `/dev/input/event*` directly. The user must be in the `input` group or the listener silently fails. We check this once at setup time and emit a warning if the permission is missing — but we don't block setup, since the user may have just been added to the group.

- [ ] **Step 1: Add Linux input-group check to `check_and_setup()`**

In `setup.rs`, find the line just after the setup_complete early return:

```rust
    emit(&app, "checking", 0, "Checking setup...");
```

Insert below it:

```rust
    #[cfg(target_os = "linux")]
    if !crate::platform::input_group_ok() {
        emit(
            &app,
            "warning",
            0,
            "Hotkey may not work. Run: sudo usermod -aG input $USER  (then log out and back in)",
        );
    }
```

- [ ] **Step 2: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/setup.rs
git commit -m "feat: emit input-group warning on Linux if rdev permissions missing"
```

---

### Task 4: Add `ollama_process` field to `AppState`

**Files:**
- Modify: `src-tauri/src/lib.rs`

On Linux we spawn `ollama serve` ourselves and must kill it when the app quits. We store the `Child` handle in `AppState` and kill it in the tray "quit" handler.

- [ ] **Step 1: Add `ollama_process` to `AppState` struct in `lib.rs`**

Find the `AppState` struct (around line 42) and add the new field:

```rust
pub struct AppState {
    pub settings:        Arc<Mutex<AppSettings>>,
    pub db:              Arc<Mutex<Connection>>,
    pub hotkey_tx:       tokio::sync::mpsc::UnboundedSender<HotkeyEvent>,
    pub settings_path:   std::path::PathBuf,
    pub ollama_process:  Arc<Mutex<Option<std::process::Child>>>,
}
```

- [ ] **Step 2: Initialise it in `run()` and pass it to `manage()`**

Find the `app.manage(AppState { ... })` call (around line 363). Before it, add:

```rust
            let ollama_process: Arc<Mutex<Option<std::process::Child>>> =
                Arc::new(Mutex::new(None));
```

Then update the `manage` call to include the new field:

```rust
            app.manage(AppState {
                settings: settings.clone(),
                db: db.clone(),
                hotkey_tx: cmd_tx,
                settings_path: settings_file.clone(),
                ollama_process: ollama_process.clone(),
            });
```

- [ ] **Step 3: Kill the process on tray quit**

Find the tray menu handler (the `"quit" => app.exit(0)` line, around line 392). Replace it with:

```rust
                    "quit" => {
                        if let Ok(state) = app.try_state::<AppState>() {
                            if let Ok(mut guard) = state.ollama_process.lock() {
                                if let Some(child) = guard.as_mut() {
                                    child.kill().ok();
                                }
                            }
                        }
                        app.exit(0);
                    }
```

- [ ] **Step 4: Update `check_and_setup` call in `run()` to pass `ollama_process`**

Find the line (around line 374):

```rust
            tauri::async_runtime::spawn(setup::check_and_setup(app_for_setup, db_for_setup));
```

Replace with:

```rust
            let proc_for_setup = ollama_process.clone();
            tauri::async_runtime::spawn(setup::check_and_setup(app_for_setup, db_for_setup, proc_for_setup));
```

- [ ] **Step 5: Verify it compiles (will fail until setup.rs is updated in Task 5)**

```bash
cd src-tauri && cargo check 2>&1 | head -30
```

Expected: errors about `check_and_setup` signature mismatch — that's fine, fixed in Task 5.

---

### Task 5: Refactor setup.rs for cross-platform

**Files:**
- Modify: `src-tauri/src/setup.rs`

This is the main platform divergence. The Windows path is unchanged (winget → ollama install → model pull). The Linux path locates the bundled Ollama binary, spawns `ollama serve`, waits for it, then pulls the model.

- [ ] **Step 1: Update `check_and_setup` signature to accept `ollama_process`**

Replace the function signature (line 22):

```rust
pub async fn check_and_setup(app: AppHandle, db: Arc<Mutex<Connection>>) {
```

With:

```rust
pub async fn check_and_setup(
    app: AppHandle,
    db: Arc<Mutex<Connection>>,
    ollama_process: std::sync::Arc<std::sync::Mutex<Option<std::process::Child>>>,
) {
```

- [ ] **Step 2: Replace the `install_ollama()` call inside `check_and_setup`**

The current flow calls `install_ollama().await`. Replace the entire block that calls `install_ollama` (lines 51–71 in setup.rs — the `if !ollama_running` block) with this platform-split version:

```rust
    if !ollama_running {
        emit(&app, "installing_ollama", 20, "Starting Ollama...");
        match start_ollama(&app, &ollama_process).await {
            Ok(()) => {}
            Err(e) => {
                emit(&app, "error", 0, &format!("Could not start Ollama: {e}"));
                return;
            }
        }
        let mut started = false;
        for _ in 0..30 {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let (running, _) = check_ollama().await;
            if running {
                started = true;
                break;
            }
        }
        if !started {
            emit(&app, "error", 0, "Ollama did not start in time. Please restart the app.");
            return;
        }
    }
```

- [ ] **Step 3: Also remove the winget block on Linux**

The winget check at the top of `check_and_setup` (lines 32–41) must only run on Windows. Wrap it:

```rust
    #[cfg(target_os = "windows")]
    {
        let winget_ok = tokio::task::spawn_blocking(winget_available).await.unwrap_or(false);
        if !winget_ok {
            emit(&app, "installing_winget", 5, "Installing Windows Package Manager...");
            if let Err(e) = install_winget().await {
                eprintln!("install_winget error: {e}");
                emit(&app, "error", 0,
                    "Could not install Package Manager. Install Ollama manually at ollama.com");
                return;
            }
        }
    }
```

- [ ] **Step 4: Add `start_ollama()` — the cross-platform dispatcher**

Add this function after `check_and_setup`:

```rust
async fn start_ollama(
    app: &AppHandle,
    ollama_process: &std::sync::Arc<std::sync::Mutex<Option<std::process::Child>>>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = (app, ollama_process);
        install_ollama_winget().await
    }
    #[cfg(target_os = "linux")]
    {
        start_ollama_bundled(app, ollama_process).await
    }
}
```

- [ ] **Step 5: Rename the existing `install_ollama()` to `install_ollama_winget()` and add `#[cfg(windows)]`**

Find `async fn install_ollama() -> Result<(), String>` (line 140) and replace with:

```rust
#[cfg(target_os = "windows")]
async fn install_ollama_winget() -> Result<(), String> {
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
```

- [ ] **Step 6: Add `start_ollama_bundled()` for Linux**

Add after `install_ollama_winget`:

```rust
#[cfg(target_os = "linux")]
async fn start_ollama_bundled(
    app: &AppHandle,
    ollama_process: &std::sync::Arc<std::sync::Mutex<Option<std::process::Child>>>,
) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let bin = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("ollama");

    // Ensure the binary is executable (AppImage may not preserve perms)
    tokio::task::spawn_blocking({
        let bin = bin.clone();
        move || {
            std::fs::set_permissions(&bin, std::fs::Permissions::from_mode(0o755))
                .map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    let child = std::process::Command::new(&bin)
        .arg("serve")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("failed to spawn bundled ollama: {e}"))?;

    *ollama_process.lock().expect("ollama_process mutex poisoned") = Some(child);
    Ok(())
}
```

- [ ] **Step 7: Update `pull_model()` to use the bundled binary on Linux**

Find `pull_model(app: &AppHandle)` and replace the `std::process::Command::new("ollama")` call with a helper:

```rust
async fn pull_model(app: &AppHandle) -> Result<(), String> {
    let app = app.clone();
    tokio::task::spawn_blocking(move || {
        let ollama = ollama_bin(&app);
        let mut child = std::process::Command::new(&ollama)
            .args(["pull", "gemma4-4b"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        if let Some(stdout) = child.stdout.take() {
            use std::io::BufRead;
            for line in std::io::BufReader::new(stdout).lines() {
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

        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("ollama pull gemma4-4b failed".to_string());
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn ollama_bin(app: &AppHandle) -> std::path::PathBuf {
    #[cfg(target_os = "linux")]
    {
        app.path()
            .resource_dir()
            .unwrap_or_default()
            .join("ollama")
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        std::path::PathBuf::from("ollama")
    }
}
```

- [ ] **Step 8: Remove the old `use std::io::{BufRead, BufReader};` import at the top of setup.rs (it's now inline)**

The `use std::io::{BufRead, BufReader};` at line 1 can be removed since we now use fully-qualified paths inside the closure.

- [ ] **Step 9: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src-tauri/src/setup.rs src-tauri/src/lib.rs
git commit -m "feat: cross-platform setup.rs — winget on Windows, bundled binary on Linux"
```

---

### Task 6: Build configuration — platform-specific targets and externalBin

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/tauri.linux.conf.json`
- Create: `src-tauri/tauri.windows.conf.json`
- Create: `scripts/fetch-ollama.js`
- Modify: `package.json`

Tauri v2 merges `tauri.<platform>.conf.json` over the base `tauri.conf.json` at build time. This lets us set `externalBin` only on Linux.

- [ ] **Step 1: Update `src-tauri/tauri.conf.json` — remove `"targets": "all"`**

Replace the `"bundle"` section:

```json
  "bundle": {
    "active": true,
    "icon": [
      "icons/icon.ico",
      "icons/icon.png"
    ]
  }
```

(Remove `"targets": "all"` — the platform configs will set targets.)

- [ ] **Step 2: Create `src-tauri/tauri.linux.conf.json`**

```json
{
  "bundle": {
    "targets": ["appimage"],
    "externalBin": ["binaries/ollama"]
  }
}
```

- [ ] **Step 3: Create `src-tauri/tauri.windows.conf.json`**

```json
{
  "bundle": {
    "targets": ["msi"]
  }
}
```

- [ ] **Step 4: Create `scripts/fetch-ollama.js`**

```js
#!/usr/bin/env node
// Downloads the correct Ollama binary for the current build platform.
// Only needed on Linux (AppImage bundles it); Windows installs at runtime via winget.
const https = require('https');
const fs    = require('fs');
const path  = require('path');

if (process.platform !== 'linux') {
  console.log('fetch-ollama: skipping (not Linux)');
  process.exit(0);
}

const binDir = path.join(__dirname, '..', 'src-tauri', 'binaries');
const dest   = path.join(binDir, 'ollama-x86_64-unknown-linux-gnu');

if (fs.existsSync(dest)) {
  console.log('fetch-ollama: ollama binary already present, skipping download');
  process.exit(0);
}

fs.mkdirSync(binDir, { recursive: true });

const url = 'https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64';
console.log(`fetch-ollama: downloading ${url}`);
console.log(`fetch-ollama: destination ${dest}`);

function download(url, dest, redirects) {
  if (redirects > 5) { console.error('Too many redirects'); process.exit(1); }
  https.get(url, { headers: { 'User-Agent': 'wisperflow-build' } }, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      return download(res.headers.location, dest, redirects + 1);
    }
    if (res.statusCode !== 200) {
      console.error(`HTTP ${res.statusCode}`);
      process.exit(1);
    }
    const out = fs.createWriteStream(dest);
    res.pipe(out);
    out.on('finish', () => {
      out.close();
      fs.chmodSync(dest, 0o755);
      console.log('fetch-ollama: done');
    });
  }).on('error', (e) => { console.error(e); process.exit(1); });
}

download(url, dest, 0);
```

- [ ] **Step 5: Add the script to `package.json`**

Open `package.json`. Find the `"scripts"` object and add:

```json
"prebuild": "node scripts/fetch-ollama.js",
```

(This runs automatically before `npm run build`. Since `tauri build` calls `npm run build` via `beforeBuildCommand`, the fetch runs before every Tauri build.)

- [ ] **Step 6: Add `src-tauri/binaries/` to `.gitignore`**

The downloaded binary is ~80 MB and must not be committed. Open `.gitignore` (or create it at root) and add:

```
src-tauri/binaries/
```

- [ ] **Step 7: Verify base config compiles on Windows**

```bash
cd src-tauri && cargo check
npm run tauri build -- --no-bundle 2>&1 | tail -20
```

Expected: build succeeds. (The `--no-bundle` flag skips the installer packaging, so you don't need NSIS/WiX installed for this check.)

- [ ] **Step 8: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/tauri.linux.conf.json src-tauri/tauri.windows.conf.json scripts/fetch-ollama.js package.json .gitignore
git commit -m "feat: platform-specific tauri bundle config and Ollama pre-build fetch script"
```

---

### Task 7: Linux build verification

**Files:** None (verification only)

This task is only run on a Linux machine or in a Linux CI environment.

- [ ] **Step 1: Install Linux build prerequisites**

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libxdo-dev \
  libxtst-dev \
  libx11-dev \
  libudev-dev \
  pkg-config \
  build-essential
```

`libxdo-dev` is required by `enigo` for X11 auto-typing. `libudev-dev` is required by `rdev` for evdev access.

- [ ] **Step 2: Fetch the Ollama binary**

```bash
node scripts/fetch-ollama.js
```

Expected output:
```
fetch-ollama: downloading https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64
fetch-ollama: destination .../src-tauri/binaries/ollama-x86_64-unknown-linux-gnu
fetch-ollama: done
```

- [ ] **Step 3: Check that cargo compiles on Linux**

```bash
cd src-tauri && cargo check
```

Expected: no errors. If `rdev` fails to compile, install `libudev-dev` and retry.

- [ ] **Step 4: Build the AppImage**

```bash
npm run tauri build
```

Expected: `src-tauri/target/release/bundle/appimage/whisprly_0.1.0_amd64.AppImage` is created.

- [ ] **Step 5: Add yourself to the input group and test the hotkey**

```bash
sudo usermod -aG input $USER
# Log out and back in, then:
./src-tauri/target/release/bundle/appimage/whisprly_0.1.0_amd64.AppImage
```

Hold Ctrl+Shift+Space — the overlay pill should appear. Release Space — transcription should begin.

- [ ] **Step 6: Verify setup flow on a clean Linux install**

Delete the DB to force first-launch setup:

```bash
rm -f ~/.local/share/com.whisprly.app/transcripts.db
```

Relaunch the AppImage. Expected: the setup progress bar appears, bundled Ollama starts, `gemma4-4b` is pulled, and the toast "Gemma 4 ready" appears.

- [ ] **Step 7: Commit Linux verification notes**

```bash
git commit --allow-empty -m "chore: Linux AppImage build verified"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Hotkey: Ctrl+Win (Windows) / Ctrl+Shift+Space (Linux) — Tasks 1–2
- ✅ Linux input group check + warning — Task 3
- ✅ Bundled Ollama binary, spawned on Linux setup — Task 5
- ✅ Child process stored in AppState, killed on quit — Task 4
- ✅ AppImage target + externalBin — Task 6
- ✅ Pre-build Ollama download script — Task 6
- ✅ MSI target unchanged — Task 6

**Known limitation (documented in spec):** Auto-typing via `enigo` on Wayland uses XWayland or falls back to xdo. On pure Wayland sessions without XWayland, auto-type may silently fail. Hotkey listening works on both (evdev). This is acceptable for the initial release.
