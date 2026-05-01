use rdev::{listen, EventType, Key};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tokio::sync::mpsc::UnboundedSender;

use crate::HotkeyEvent;

pub fn start_listener(tx: UnboundedSender<HotkeyEvent>) {
    let ctrl = Arc::new(AtomicBool::new(false));
    let win = Arc::new(AtomicBool::new(false));
    let was_both = Arc::new(AtomicBool::new(false));

    if let Err(e) = listen(move |event| {
        match event.event_type {
            EventType::KeyPress(Key::ControlLeft) | EventType::KeyPress(Key::ControlRight) => {
                ctrl.store(true, Ordering::SeqCst);
            }
            EventType::KeyRelease(Key::ControlLeft) | EventType::KeyRelease(Key::ControlRight) => {
                ctrl.store(false, Ordering::SeqCst);
            }
            EventType::KeyPress(Key::MetaLeft) | EventType::KeyPress(Key::MetaRight) => {
                win.store(true, Ordering::SeqCst);
            }
            EventType::KeyRelease(Key::MetaLeft) | EventType::KeyRelease(Key::MetaRight) => {
                win.store(false, Ordering::SeqCst);
            }
            _ => return,
        }

        let both = ctrl.load(Ordering::SeqCst) && win.load(Ordering::SeqCst);
        let was = was_both.load(Ordering::SeqCst);

        if both && !was {
            was_both.store(true, Ordering::SeqCst);
            let _ = tx.send(HotkeyEvent::Start);
        } else if !both && was {
            was_both.store(false, Ordering::SeqCst);
            let _ = tx.send(HotkeyEvent::Stop);
        }
    }) {
        eprintln!("rdev listen error: {e:?}");
    }
}
