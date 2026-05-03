use std::io::Write;
use std::time::Duration;

fn system_prompt(mode: &str) -> String {
    let mode_rule = match mode {
        "email" => "Format as a professional email with greeting and sign-off.",
        "code"  => "Strip all punctuation. Preserve camelCase and snake_case.",
        _       => "Standard paragraph formatting.",
    };
    format!(
        "You are a transcript editor. The input is raw speech-to-text output.\n\
         Your job:\n\
         1. Fix punctuation — add commas, periods, question marks where appropriate.\n\
         2. Remove filler words: um, uh, like, you know, so, basically, literally.\n\
         3. Fix capitalization of proper nouns, acronyms, and sentence starts.\n\
         4. Do NOT change the meaning, add content, or rephrase sentences.\n\
         5. Output ONLY the corrected text. No preamble, no explanation, no quotes.\n\
         {mode_rule}"
    )
}

pub async fn polish(
    raw: &str,
    mode: &str,
    model: &str,
    api_key: &str,
    python_cmd: &str,
) -> Result<String, String> {
    if !api_key.is_empty() {
        match groq_polish(raw, mode, model, api_key).await {
            Ok(polished) => return Ok(polished),
            Err(e) => eprintln!("postprocess groq error: {e}"),
        }
    }
    match local_polish(raw, mode, python_cmd).await {
        Ok(polished) => Ok(polished),
        Err(e) => {
            eprintln!("postprocess local error: {e}");
            Ok(raw.to_string())
        }
    }
}

async fn groq_polish(raw: &str, mode: &str, model: &str, api_key: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt(mode)},
            {"role": "user",   "content": raw}
        ],
        "max_tokens": 512,
        "temperature": 0.0
    });

    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&body)
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("Groq {status}: {body_text}"));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let polished = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "no content in response".to_string())?
        .trim()
        .to_string();

    if polished.is_empty() {
        return Ok(raw.to_string());
    }

    Ok(polished)
}

async fn local_polish(raw: &str, mode: &str, python_cmd: &str) -> Result<String, String> {
    let sidecar = sidecar_path();
    let raw_owned = raw.to_string();
    let mode_owned = mode.to_string();
    let python = python_cmd.to_string();

    tokio::task::spawn_blocking(move || {
        let mut child = std::process::Command::new(&python)
            .args([&sidecar, "--mode", &mode_owned])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(raw_owned.as_bytes()).map_err(|e| e.to_string())?;
        }

        let output = child.wait_with_output().map_err(|e| e.to_string())?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("sidecar error: {err}"));
        }

        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if text.is_empty() { raw_owned } else { text })
    })
    .await
    .map_err(|e| e.to_string())?
}

fn sidecar_path() -> String {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("sidecar").join("postprocess_sidecar.py")))
        .unwrap_or_else(|| std::path::PathBuf::from("sidecar/postprocess_sidecar.py"))
        .to_string_lossy()
        .to_string()
}
