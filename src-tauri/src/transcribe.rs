pub async fn groq(wav_bytes: &[u8], api_key: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    let file_part = reqwest::multipart::Part::bytes(wav_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "text")
        .part("file", file_part);

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
    Ok(text.trim().to_string())
}

pub async fn local(wav_bytes: &[u8], python_cmd: &str, sidecar_path: &str) -> Result<String, String> {
    use std::io::Write;

    let mut tmp = tempfile::NamedTempFile::new().map_err(|e| e.to_string())?;
    tmp.write_all(wav_bytes).map_err(|e| e.to_string())?;
    let tmp_path = tmp.path().to_string_lossy().to_string();

    let python = python_cmd.to_string();
    let script = sidecar_path.to_string();

    let output = tokio::task::spawn_blocking(move || {
        std::process::Command::new(&python)
            .args([&script, &tmp_path])
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
    Ok(text)
}
