#[cfg(target_os = "linux")]
pub fn start_listener(tx: tokio::sync::mpsc::UnboundedSender<crate::HotkeyEvent>) {
    use evdev::{EventType, InputEventKind, Key};
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };

    let devices: Vec<_> = evdev::enumerate()
        .filter_map(|(_, dev)| {
            let keys = dev.supported_keys()?;
            if keys.contains(Key::KEY_SPACE)
                && keys.contains(Key::KEY_LEFTCTRL)
                && keys.contains(Key::KEY_LEFTSHIFT)
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

    let ctrl   = Arc::new(AtomicBool::new(false));
    let shift  = Arc::new(AtomicBool::new(false));
    let active = Arc::new(AtomicBool::new(false));

    for mut device in devices {
        let tx     = tx.clone();
        let ctrl   = ctrl.clone();
        let shift  = shift.clone();
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
                    Key::KEY_LEFTCTRL | Key::KEY_RIGHTCTRL => {
                        ctrl.store(val != 0, Ordering::SeqCst);
                    }
                    Key::KEY_LEFTSHIFT | Key::KEY_RIGHTSHIFT => {
                        shift.store(val != 0, Ordering::SeqCst);
                    }
                    Key::KEY_SPACE => {
                        if val == 1 {
                            if ctrl.load(Ordering::SeqCst)
                                && shift.load(Ordering::SeqCst)
                                && !active.swap(true, Ordering::SeqCst)
                            {
                                let _ = tx.send(crate::HotkeyEvent::Start);
                            }
                        } else if val == 0 && active.swap(false, Ordering::SeqCst) {
                            let _ = tx.send(crate::HotkeyEvent::Stop);
                        }
                    }
                    _ => {}
                }
            }
        });
    }
}
