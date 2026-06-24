/// Inject transcribed text into the currently focused window.
///
/// On Linux/Wayland:
///   ydotool type (uinput, kernel-level — bypasses GNOME Remote Desktop portal)
///   → clipboard fallback
///   xdotool and enigo are both skipped: they use XTEST/D-Bus which triggers
///   the GNOME Remote Desktop permission dialog on every session.
///
/// On Linux/X11:  xdotool type → enigo
/// On macOS/Windows: enigo directly
pub fn type_text(text: &str) {
    let text = text.trim();
    if text.is_empty() {
        return;
    }

    #[cfg(target_os = "linux")]
    {
        // Detect Wayland via either env var — XDG_SESSION_TYPE may not be
        // inherited by the Tauri process, but WAYLAND_DISPLAY always is.
        let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_default().to_lowercase();
        let wayland_display = std::env::var("WAYLAND_DISPLAY").unwrap_or_default();
        if session == "wayland" || !wayland_display.is_empty() {
            wayland_type(text);
            return;
        }
        // X11 on Linux: xdotool then enigo (no portal on real X11).
        if try_xdotool(text) { return; }
        if try_enigo(text)   { return; }
        eprintln!("[wisperflow] auto-type failed. Text: {text}");
    }

    // macOS, Windows
    #[cfg(not(target_os = "linux"))]
    x11_type(text);
}

// ── Wayland path (Linux only) ─────────────────────────────────────────────────

#[cfg(target_os = "linux")]
fn wayland_type(text: &str) {
    // xdotool (XTEST) and enigo (D-Bus) both trigger the GNOME Remote Desktop
    // portal. Only ydotoold (uinput/kernel) bypasses it entirely.
    if try_ydotool(text) { return; }
    eprintln!("[wisperflow] All auto-type methods failed — copying to clipboard.");
    copy_to_clipboard(text);
    eprintln!("[wisperflow] Text in clipboard — press Ctrl+V to paste.");
}

// ── macOS / Windows path ─────────────────────────────────────────────────────

#[cfg(not(target_os = "linux"))]
fn x11_type(text: &str) {
    if try_enigo(text) { return; }
    // Clipboard fallback: transcript is preserved even if keyboard injection fails.
    #[cfg(target_os = "windows")]
    {
        if let Ok(mut cb) = arboard::Clipboard::new() {
            if cb.set_text(text).is_ok() {
                eprintln!("[wisperflow] enigo failed — transcript copied to clipboard. Press Ctrl+V to paste.");
                return;
            }
        }
    }
    eprintln!("[wisperflow] auto-type failed. Text: {text}");
}

// ── Method implementations ────────────────────────────────────────────────────

fn try_enigo(text: &str) -> bool {
    use enigo::{Enigo, Keyboard, Settings};
    match Enigo::new(&Settings::default()) {
        Ok(mut e) => {
            for ch in text.chars() {
                let _ = e.text(&ch.to_string());
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            let _ = e.text(" ");
            true
        }
        Err(err) => { eprintln!("[wisperflow] enigo failed: {err}"); false }
    }
}

#[cfg(target_os = "linux")]
fn try_xdotool(text: &str) -> bool {
    // xdotool injects directly via X11/XWayland — avoids ydotoold entirely.
    // ydotoold creates two virtual uinput devices; routing keystrokes through it
    // causes the compositor to receive each keystroke twice (double output).
    // xdotool has no such issue and works for any XWayland-based target window.
    match std::process::Command::new("xdotool")
        .args(["type", "--clearmodifiers", "--delay", "20", "--", text])
        .output()
    {
        Ok(o) if o.status.success() => true,
        Ok(o)  => { eprintln!("[wisperflow] xdotool: {}", String::from_utf8_lossy(&o.stderr)); false }
        Err(e) => { eprintln!("[wisperflow] xdotool not found: {e}"); false }
    }
}

#[cfg(target_os = "linux")]
fn try_ydotool(text: &str) -> bool {
    // Fallback for native Wayland windows that are invisible to XWayland/xdotool.
    // Single call avoids inter-call race conditions in ydotoold's async queue.
    let result = std::process::Command::new("ydotool")
        .env("YDOTOOL_SOCKET", "/tmp/.ydotool_socket")
        .args(["type", "--key-delay", "20", "--", text])
        .output();

    match result {
        Ok(o) if o.status.success() => {
            // ydotoold processes events asynchronously after ydotool exits.
            // Wait long enough for the full text to flush before returning.
            let drain_ms = (text.chars().count() as u64) * 30 + 300;
            std::thread::sleep(std::time::Duration::from_millis(drain_ms));
            true
        }
        Ok(o) => {
            eprintln!("[wisperflow] ydotool type failed: {:?}",
                String::from_utf8_lossy(&o.stderr).trim());
            false
        }
        Err(e) => { eprintln!("[wisperflow] ydotool not found: {e}"); false }
    }
}

#[cfg(target_os = "linux")]
fn copy_to_clipboard(text: &str) {
    match arboard::Clipboard::new() {
        Ok(mut cb) => { if let Err(e) = cb.set_text(text) { eprintln!("[wisperflow] clipboard: {e}"); wl_copy(text); } }
        Err(e)     => { eprintln!("[wisperflow] clipboard init: {e}"); wl_copy(text); }
    }
}

#[cfg(target_os = "linux")]
fn wl_copy(text: &str) {
    use std::io::Write;
    if let Ok(mut child) = std::process::Command::new("wl-copy")
        .stdin(std::process::Stdio::piped())
        .spawn()
    {
        if let Some(stdin) = child.stdin.as_mut() {
            let _ = stdin.write_all(text.as_bytes());
        }
    }
}
