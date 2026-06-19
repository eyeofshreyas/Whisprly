// Windows platform helpers
#[cfg(target_os = "windows")]
extern "system" {
    fn GetForegroundWindow() -> *mut std::ffi::c_void;
    fn GetWindowTextW(hwnd: *mut std::ffi::c_void, lpString: *mut u16, nMaxCount: i32) -> i32;
}

#[cfg(target_os = "windows")]
pub fn get_active_window_title() -> Option<String> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }
        let mut buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), 512);
        if len > 0 {
            let title = String::from_utf16_lossy(&buf[..len as usize]);
            Some(title)
        } else {
            None
        }
    }
}
