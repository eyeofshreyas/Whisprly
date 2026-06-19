#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "windows")]
pub use windows::get_active_window_title;

#[cfg(target_os = "linux")]
pub use linux::get_active_window_title;

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
pub fn get_active_window_title() -> Option<String> {
    None
}
