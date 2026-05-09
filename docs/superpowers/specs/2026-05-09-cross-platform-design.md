# Cross-Platform Support: Windows + Linux

**Date:** 2026-05-09
**Status:** Approved

## Overview

Extend WisperFlow to run on both Windows and Linux. The app currently targets Windows only. This spec covers the three divergence points: hotkey, Ollama setup, and packaging. Everything else (audio via `cpal`, auto-type via `enigo`, WebView via Tauri) already works cross-platform.

---

## Platform Decisions

| Concern | Windows | Linux |
|---|---|---|
| Hotkey | Ctrl + Win (unchanged) | Ctrl + Shift + Space |
| Ollama install | winget (unchanged) | Bundled binary in AppImage |
| Package format | MSI (unchanged) | AppImage |
| Display server | N/A | X11 + Wayland (via evdev) |

---

## Architecture

### Platform Module

New module `src-tauri/src/platform/` holds all OS-specific constants and helpers:

```
src-tauri/src/platform/
  mod.rs      — re-exports, shared types
  windows.rs  — Ctrl+Win key constants
  linux.rs    — Ctrl+Shift+Space key constants, input group check
```

`hotkey.rs` imports `TRIGGER_KEYS` from `platform::` instead of hard-coding the Windows combo. The `rdev::listen` loop is otherwise unchanged — `rdev` uses `evdev` on Linux and works on both X11 and Wayland.

### Hotkey: Linux

`rdev`/`evdev` requires read access to `/dev/input/event*`. On first launch (Linux only), the app checks whether `/dev/input/event0` is readable. If not, it emits a `"setup_progress"` warning event with the fix:

```
sudo usermod -aG input $USER  (then log out and back in)
```

This check runs once; the result is stored in the settings DB (`input_group_ok`).

---

## Setup: Ollama on Linux

On Windows, `setup.rs` uses winget — unchanged.

On Linux, Ollama is bundled as a Tauri **external binary** inside the AppImage. No sudo, no network install.

Linux setup flow:

1. Locate bundled `ollama` binary via `app.path().resource_dir()`
2. Spawn `ollama serve` as a background process
3. Poll `http://localhost:11434` until ready (same 30-retry loop as Windows)
4. Pull `gemma4-4b` (same `pull_model()` as Windows)
5. Set `setup_complete = true` in DB
6. Keep process handle in `AppState`; kill on app exit

`setup.rs` splits only the install step:

```rust
#[cfg(target_os = "windows")]
async fn install_ollama(app: &AppHandle, ...) { /* winget path */ }

#[cfg(target_os = "linux")]
async fn install_ollama(app: &AppHandle, ...) { /* start bundled binary */ }
```

All `emit_progress()` calls, the DB flag, and the model pull are shared code.

---

## Build Pipeline

### `tauri.conf.json`

```json
"bundle": {
  "externalBin": ["binaries/ollama"],
  "linux": { "targets": ["appimage"] },
  "windows": { "targets": ["msi"] }
}
```

### Pre-build Script

`scripts/fetch-ollama.js` — downloads the correct Ollama binary before `tauri build`:

| Platform | Source | Destination |
|---|---|---|
| Windows | `ollama-windows-amd64.exe` | `src-tauri/binaries/ollama-x86_64-pc-windows-msvc.exe` |
| Linux | `ollama-linux-amd64` | `src-tauri/binaries/ollama-x86_64-unknown-linux-gnu` |

Tauri selects the right binary by target triple automatically.

### Building

```bash
# Windows → .msi
npm run tauri build

# Linux → .AppImage
npm run tauri build
```

Same command on each host OS. No cross-compilation required.

### `Cargo.toml`

No new dependencies needed:
- `rdev` already uses `evdev` on Linux
- `enigo` already supports X11/Wayland

---

## Files Changed

| File | Change |
|---|---|
| `src-tauri/src/platform/mod.rs` | New — re-exports, shared types |
| `src-tauri/src/platform/windows.rs` | New — Ctrl+Win constants |
| `src-tauri/src/platform/linux.rs` | New — Ctrl+Shift+Space constants, input group check |
| `src-tauri/src/hotkey.rs` | Import `TRIGGER_KEYS` from platform module |
| `src-tauri/src/setup.rs` | `#[cfg]` branches for install step |
| `src-tauri/src/lib.rs` | Add `mod platform;` |
| `src-tauri/tauri.conf.json` | `externalBin`, Linux/Windows targets |
| `src-tauri/Cargo.toml` | No new deps (confirm rdev/enigo versions support Linux) |
| `scripts/fetch-ollama.js` | New — pre-build binary downloader |

---

## Out of Scope

- macOS support
- ARM Linux
- Wayland-native hotkey portal (`/dev/input` group approach is sufficient for now)
- Cross-compilation (each platform builds natively)
