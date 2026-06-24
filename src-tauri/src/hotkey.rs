#[cfg(target_os = "linux")]
pub fn start_listener(tx: tokio::sync::mpsc::UnboundedSender<crate::HotkeyEvent>) {
    use evdev::{EventType, InputEventKind, Key};
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };

    // Hotkey: Ctrl + Win (Super)
    // Both keys sit adjacent at the bottom-left of the keyboard — easy one-handed use.
    // Hold both = start recording, release either = stop recording.

    let devices: Vec<_> = evdev::enumerate()
        .filter_map(|(_, dev)| {
            let keys = dev.supported_keys()?;
            if keys.contains(Key::KEY_LEFTCTRL)
                && keys.contains(Key::KEY_LEFTMETA)
            {
                Some(dev)
            } else {
                None
            }
        })
        .collect();

    if devices.is_empty() {
        eprintln!("[hotkey] no keyboard devices found — is the user in the input group?");
        return;
    }

    eprintln!("[hotkey] listening for Ctrl + Win (Super) on {} device(s)", devices.len());

    let ctrl   = Arc::new(AtomicBool::new(false));
    let win    = Arc::new(AtomicBool::new(false));
    let active = Arc::new(AtomicBool::new(false));

    for mut device in devices {
        let tx     = tx.clone();
        let ctrl   = ctrl.clone();
        let win    = win.clone();
        let active = active.clone();

        std::thread::spawn(move || loop {
            let events = match device.fetch_events() {
                Ok(e)  => e,
                Err(_) => continue,
            };
            for event in events {
                if event.event_type() != EventType::KEY { continue; }
                let InputEventKind::Key(key) = event.kind() else { continue; };
                let val = event.value();

                match key {
                    // Track Ctrl
                    Key::KEY_LEFTCTRL | Key::KEY_RIGHTCTRL => {
                        ctrl.store(val != 0, Ordering::SeqCst);
                    }
                    // Track Win / Super key
                    Key::KEY_LEFTMETA | Key::KEY_RIGHTMETA => {
                        win.store(val != 0, Ordering::SeqCst);

                        // Start when both Ctrl + Win are held
                        if val == 1
                            && ctrl.load(Ordering::SeqCst)
                            && !active.swap(true, Ordering::SeqCst)
                        {
                            let _ = tx.send(crate::HotkeyEvent::Start);
                        }

                        // Stop when Win is released while recording
                        if val == 0 && active.swap(false, Ordering::SeqCst) {
                            let _ = tx.send(crate::HotkeyEvent::Stop);
                        }
                    }
                    // Also stop if Ctrl is released while recording
                    _ if key == Key::KEY_LEFTCTRL || key == Key::KEY_RIGHTCTRL => {}
                    _ => {}
                }

                // Stop if Ctrl released while both were held
                if (key == Key::KEY_LEFTCTRL || key == Key::KEY_RIGHTCTRL)
                    && val == 0
                    && active.swap(false, Ordering::SeqCst)
                {
                    let _ = tx.send(crate::HotkeyEvent::Stop);
                }
            }
        });
    }
}

#[cfg(target_os = "windows")]
pub fn start_listener(tx: tokio::sync::mpsc::UnboundedSender<crate::HotkeyEvent>) {
    use std::sync::atomic::{AtomicBool, Ordering};
    use crate::HotkeyEvent;

    type HookProc = unsafe extern "system" fn(code: i32, w_param: usize, l_param: *const KBDLLHOOKSTRUCT) -> isize;

    #[repr(C)]
    struct KBDLLHOOKSTRUCT {
        vk_code: u32,
        scan_code: u32,
        flags: u32,
        time: u32,
        dw_extra_info: usize,
    }

    #[repr(C)]
    struct POINT {
        x: i32,
        y: i32,
    }

    #[repr(C)]
    struct MSG {
        hwnd: usize,
        message: u32,
        w_param: usize,
        l_param: isize,
        time: u32,
        pt: POINT,
        l_private: u32,
    }

    #[link(name = "user32")]
    extern "system" {
        fn SetWindowsHookExW(id_hook: i32, lpfn: HookProc, hmod: usize, dw_thread_id: u32) -> isize;
        fn UnhookWindowsHookEx(hhk: isize) -> i32;
        fn CallNextHookEx(hhk: isize, n_code: i32, w_param: usize, l_param: *const KBDLLHOOKSTRUCT) -> isize;
        fn GetMessageW(lp_msg: *mut MSG, hwnd: usize, w_msg_filter_min: u32, w_msg_filter_max: u32) -> i32;
    }

    const VK_LCONTROL: u32 = 0xA2;
    const VK_RCONTROL: u32 = 0xA3;
    const VK_LWIN: u32 = 0x5B;
    const VK_RWIN: u32 = 0x5C;

    const WH_KEYBOARD_LL: i32 = 13;
    const WM_KEYDOWN: usize = 0x0100;
    const WM_KEYUP: usize = 0x0101;
    const WM_SYSKEYDOWN: usize = 0x0104;
    const WM_SYSKEYUP: usize = 0x0105;

    static mut HHOOK: isize = 0;
    static mut TX: Option<tokio::sync::mpsc::UnboundedSender<HotkeyEvent>> = None;
    static CTRL_HELD: AtomicBool = AtomicBool::new(false);
    static WIN_HELD: AtomicBool = AtomicBool::new(false);
    static RECORDING: AtomicBool = AtomicBool::new(false);

    unsafe extern "system" fn hook_callback(code: i32, w_param: usize, l_param: *const KBDLLHOOKSTRUCT) -> isize {
        if code >= 0 && !l_param.is_null() {
            let vk = (*l_param).vk_code;
            let is_down = w_param == WM_KEYDOWN || w_param == WM_SYSKEYDOWN;
            let is_up = w_param == WM_KEYUP || w_param == WM_SYSKEYUP;

            if vk == VK_LCONTROL || vk == VK_RCONTROL {
                CTRL_HELD.store(is_down, Ordering::SeqCst);
            } else if vk == VK_LWIN || vk == VK_RWIN {
                WIN_HELD.store(is_down, Ordering::SeqCst);
            }

            let ctrl = CTRL_HELD.load(Ordering::SeqCst);
            let win = WIN_HELD.load(Ordering::SeqCst);

            if ctrl && win {
                if !RECORDING.swap(true, Ordering::SeqCst) {
                    if let Some(ref tx) = TX {
                        let _ = tx.send(HotkeyEvent::Start);
                    }
                }
            } else if is_up && (vk == VK_LCONTROL || vk == VK_RCONTROL || vk == VK_LWIN || vk == VK_RWIN) {
                if RECORDING.swap(false, Ordering::SeqCst) {
                    if let Some(ref tx) = TX {
                        let _ = tx.send(HotkeyEvent::Stop);
                    }
                }
            }

            // Consume Win key events while recording so Windows doesn't open the Start menu.
            if RECORDING.load(Ordering::SeqCst) && (vk == VK_LWIN || vk == VK_RWIN) {
                return 1;
            }
        }
        CallNextHookEx(HHOOK, code, w_param, l_param)
    }

    unsafe {
        TX = Some(tx);
        HHOOK = SetWindowsHookExW(WH_KEYBOARD_LL, hook_callback, 0, 0);
        if HHOOK == 0 {
            eprintln!("[windows_hotkey] failed to install low-level keyboard hook.");
            return;
        }
        eprintln!("[windows_hotkey] low-level keyboard hook installed for Ctrl+Win.");
        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, 0, 0, 0) > 0 {}
        UnhookWindowsHookEx(HHOOK);
    }
}
