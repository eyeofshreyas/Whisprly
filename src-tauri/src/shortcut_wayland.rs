use ashpd::desktop::global_shortcuts::{GlobalShortcuts, NewShortcut};
use futures_lite::StreamExt;

pub async fn register(tx: tokio::sync::mpsc::UnboundedSender<crate::HotkeyEvent>) {
    let proxy = match GlobalShortcuts::new().await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[wayland shortcuts] portal unavailable: {e}");
            fallback_rdev(tx);
            return;
        }
    };
    let session = match proxy.create_session().await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[wayland shortcuts] create_session failed: {e}");
            fallback_rdev(tx);
            return;
        }
    };
    if let Err(e) = proxy.bind_shortcuts(
        &session,
        &[NewShortcut::new("toggle-recording", "Toggle Whisprly recording")
            .preferred_trigger("CTRL+Super")],
        None,
    ).await {
        eprintln!("[wayland shortcuts] bind_shortcuts failed: {e}");
        fallback_rdev(tx);
        return;
    }

    let mut activated = match proxy.receive_activated().await {
        Ok(s) => s,
        Err(e) => { eprintln!("[wayland shortcuts] receive_activated failed: {e}"); return; }
    };

    let mut recording = false;
    while let Some(_ev) = activated.next().await {
        if recording {
            tx.send(crate::HotkeyEvent::Stop).ok();
        } else {
            tx.send(crate::HotkeyEvent::Start).ok();
        }
        recording = !recording;
    }
}

fn fallback_rdev(tx: tokio::sync::mpsc::UnboundedSender<crate::HotkeyEvent>) {
    eprintln!("[wayland shortcuts] falling back to rdev (Ctrl+Win hold-to-record)");
    std::thread::spawn(move || crate::hotkey::start_listener(tx));
}
