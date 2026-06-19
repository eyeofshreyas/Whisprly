/// Inject transcribed text into the currently focused window.
///
/// On Linux/Wayland strategy:
///   - GNOME Wayland: skip enigo (triggers Remote Desktop portal every time)
///                    → ydotool → xdotool → wl-copy clipboard
///   - Other Wayland: enigo → ydotool → xdotool → wl-copy clipboard
///   - X11:           enigo → xdotool
///
/// On Windows and macOS `enigo` is used directly.
pub fn type_text(text: &str) {
    let text = text.trim();
    if text.is_empty() {
        return;
    }

    #[cfg(target_os = "linux")]
    {
        let session = std::env::var("XDG_SESSION_TYPE")
            .unwrap_or_default()
            .to_lowercase();
        if session == "wayland" {
            wayland_type(text);
            return;
        }
    }

    // X11, macOS, Windows
    x11_type(text);
}

// ── Wayland path (Linux only) ─────────────────────────────────────────────────

#[cfg(target_os = "linux")]
fn wayland_type(text: &str) {
    // On GNOME Wayland, enigo uses the Remote Desktop D-Bus portal which
    // shows a permission dialog every session — skip it entirely.
    let desktop = std::env::var("XDG_CURRENT_DESKTOP")
        .unwrap_or_default()
        .to_uppercase();
    let is_gnome = desktop.contains("GNOME");

    if !is_gnome && try_enigo(text) { return; }  // KDE / others: try enigo first
    if try_ydotool(text)            { return; }  // ydotool (uinput, no portal)
    if try_xdotool(text)            { return; }  // XWayland fallback
    eprintln!("[wisperflow] All auto-type methods failed — copying to clipboard.");
    copy_to_clipboard(text);
    eprintln!("[wisperflow] Text in clipboard — press Ctrl+V to paste.");
}

// ── X11 / macOS / Windows path ────────────────────────────────────────────────

fn x11_type(text: &str) {
    if try_enigo(text)   { return; }
    #[cfg(target_os = "linux")]
    { if try_xdotool(text) { return; } }
    eprintln!("[wisperflow] auto-type failed. Text: {text}");
}

// ── Method implementations ────────────────────────────────────────────────────

fn try_enigo(text: &str) -> bool {
    use enigo::{Enigo, Keyboard, Settings};
    match Enigo::new(&Settings::default()) {
        Ok(mut e) => {
            // Type character by character for a typewriter feel
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
fn try_ydotool(text: &str) -> bool {
    use std::io::Write;

    // Clipboard-paste strategy: wl-copy the text, then inject Ctrl+V via ydotool.
    // Direct character injection (ydotool type) is unreliable — ydotoold processes
    // events asynchronously and its queue persists across app restarts, causing
    // garbled output when a previous session's events mix with new ones.
    // One clipboard write + one key combo has no timing dependency on text length.

    // 1. Copy to Wayland clipboard (blocking — wait for wl-copy to finish)
    let mut child = match std::process::Command::new("wl-copy")
        .stdin(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => { eprintln!("[wisperflow] wl-copy not found: {e}"); return false; }
    };
    if let Some(mut stdin) = child.stdin.take() {
        if stdin.write_all(text.as_bytes()).is_err() { return false; }
    }
    if !child.wait().map(|s| s.success()).unwrap_or(false) {
        eprintln!("[wisperflow] wl-copy failed");
        return false;
    }

    // 2. Give the Wayland compositor time to register the new clipboard content
    std::thread::sleep(std::time::Duration::from_millis(80));

    // 3. Paste with Ctrl+V
    let result = std::process::Command::new("ydotool")
        .env("YDOTOOL_SOCKET", "/tmp/.ydotool_socket")
        .args(["key", "ctrl+v"])
        .output();

    match result {
        Ok(o) if o.status.success() => {
            std::thread::sleep(std::time::Duration::from_millis(80));
            true
        }
        Ok(o) => {
            eprintln!("[wisperflow] ydotool key ctrl+v failed: {:?}",
                String::from_utf8_lossy(&o.stderr).trim());
            false
        }
        Err(e) => { eprintln!("[wisperflow] ydotool not found: {e}"); false }
    }
}

#[cfg(target_os = "linux")]
fn try_xdotool(text: &str) -> bool {
    match std::process::Command::new("xdotool")
        .args(["type", "--clearmodifiers", "--", text])
        .output()
    {
        Ok(o) if o.status.success() => true,
        Ok(o)  => { eprintln!("[wisperflow] xdotool: {}", String::from_utf8_lossy(&o.stderr)); false }
        Err(e) => { eprintln!("[wisperflow] xdotool not found: {e}"); false }
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
