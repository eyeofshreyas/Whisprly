use ashpd::desktop::global_shortcuts::{GlobalShortcuts, NewShortcut};
use futures_util::StreamExt;

pub async fn register(tx: tokio::sync::mpsc::UnboundedSender<crate::HotkeyEvent>) {
    let proxy = match GlobalShortcuts::new().await {
        Ok(p) => p,
        Err(e) => { eprintln!("[wayland shortcuts] portal unavailable: {e}"); return; }
    };
    let session = match proxy.create_session().await {
        Ok(s) => s,
        Err(e) => { eprintln!("[wayland shortcuts] create_session failed: {e}"); return; }
    };
    if let Err(e) = proxy.bind_shortcuts(
        &session,
        &[NewShortcut::new("record", "Toggle Whisprly recording")
            .preferred_trigger("CTRL+SHIFT+Space")],
        None,
    ).await {
        eprintln!("[wayland shortcuts] bind_shortcuts failed: {e}");
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
