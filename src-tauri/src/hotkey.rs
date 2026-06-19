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
