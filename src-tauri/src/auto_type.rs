pub fn type_text(text: &str) {
    use enigo::{Enigo, Keyboard, Settings};

    let text = text.trim();
    if text.is_empty() {
        return;
    }

    match Enigo::new(&Settings::default()) {
        Ok(mut enigo) => {
            let _ = enigo.text(text);
            let _ = enigo.text(" ");
        }
        Err(e) => eprintln!("enigo init error: {e}"),
    }
}
