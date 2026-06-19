// Linux platform helpers
use std::process::Command;

#[cfg(target_os = "linux")]
pub fn get_active_window_title() -> Option<String> {
    // Try using xdotool first (works on X11 and XWayland)
    if let Ok(output) = Command::new("xdotool")
        .args(&["getactivewindow", "getwindowclassname"])
        .output()
    {
        if output.status.success() {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !name.is_empty() {
                return Some(name);
            }
        }
    }

    // Try xprop as fallback
    if let Ok(output) = Command::new("sh")
        .arg("-c")
        .arg("xprop -id $(xprop -root 32v _NET_ACTIVE_WINDOW | cut -d ' ' -f 5) WM_CLASS")
        .output()
    {
        if output.status.success() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            // WM_CLASS(STRING) = "cursor", "Cursor"
            if let Some(pos) = out_str.rfind('"') {
                if let Some(start) = out_str[..pos].rfind('"') {
                    let name = out_str[start+1..pos].trim().to_string();
                    if !name.is_empty() {
                        return Some(name);
                    }
                }
            }
        }
    }

    None
}
