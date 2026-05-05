// Whisper hallucinates these phrases on silence or background noise.
const HALLUCINATIONS: &[&str] = &[
    "thank you for watching",
    "thanks for watching",
    "thank you for listening",
    "please subscribe",
    "like and subscribe",
    "subtitles by",
    "transcribed by",
    "brought to you by",
    "[music]",
    "[applause]",
    "[silence]",
    "(silence)",
    "[background noise]",
    "(background noise)",
    "...",
];

fn is_hallucination(text: &str) -> bool {
    let lower = text.to_lowercase();
    let clean = lower.trim();
    if clean.is_empty() || clean.chars().all(|c| !c.is_alphanumeric()) {
        return true;
    }
    HALLUCINATIONS.iter().any(|h| clean.contains(h))
}

pub fn language_param(language: &str) -> Option<String> {
    let t = language.trim();
    if t.is_empty() || t == "auto" { None } else { Some(t.to_string()) }
}

pub async fn groq(wav_bytes: &[u8], api_key: &str, language: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();

    let file_part = reqwest::multipart::Part::bytes(wav_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "text")
        // Biases Whisper toward proper punctuation and capitalisation.
        .text("prompt", "Voice dictation. Transcribe with correct punctuation and capitalisation.")
        .part("file", file_part);

    let form = match language {
        Some(lang) => form.text("language", lang),
        None => form,
    };

    let response = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {api_key}"))
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Groq {status}: {body}"));
    }

    let text = response.text().await.map_err(|e| e.to_string())?;
    let trimmed = text.trim().to_string();

    if is_hallucination(&trimmed) {
        return Err("hallucination".into());
    }

    Ok(trimmed)
}

pub async fn local(wav_bytes: &[u8], python_cmd: &str, sidecar_path: &str, language: Option<String>) -> Result<String, String> {
    use std::io::Write;

    let mut tmp = tempfile::NamedTempFile::new().map_err(|e| e.to_string())?;
    tmp.write_all(wav_bytes).map_err(|e| e.to_string())?;
    let tmp_path = tmp.path().to_string_lossy().to_string();

    let python = python_cmd.to_string();
    let script = sidecar_path.to_string();

    let output = tokio::task::spawn_blocking(move || {
        let mut args = vec![script.clone(), tmp_path.clone()];
        if let Some(lang) = language {
            args.push("--language".to_string());
            args.push(lang);
        }
        std::process::Command::new(&python)
            .args(&args)
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Sidecar error: {err}"));
    }

    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if is_hallucination(&text) {
        return Err("hallucination".into());
    }

    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_language_yields_none() {
        assert_eq!(language_param("auto"), None);
    }

    #[test]
    fn specific_language_yields_some() {
        assert_eq!(language_param("en"), Some("en".to_string()));
        assert_eq!(language_param("ja"), Some("ja".to_string()));
    }

    #[test]
    fn empty_language_yields_none() {
        assert_eq!(language_param(""), None);
        assert_eq!(language_param("  "), None);
    }
}
