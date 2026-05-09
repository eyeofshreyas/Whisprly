use rdev::{listen, EventType};
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
