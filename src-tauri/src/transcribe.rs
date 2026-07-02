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
    "transcribe with correct punctuation",
    "voice dictation",
    "vocabulary 2",
    "vocabulary 1",
    "vocabulary:",
];

fn is_hallucination(text: &str) -> bool {
    let lower = text.to_lowercase();
    let clean = lower.trim();
    if clean.is_empty() || clean.chars().all(|c| !c.is_alphanumeric()) {
        return true;
    }

    // Split clean text into whitespace-delimited words for phrase matching.
    let text_words: Vec<&str> = clean.split_whitespace().collect();

    let matched = HALLUCINATIONS.iter().any(|h| {
        if h.chars().any(|c| !c.is_alphanumeric() && !c.is_whitespace()) {
            // Bracket/symbol patterns (e.g. "[music]") — substring check is safe
            // because they won't appear as part of ordinary speech words.
            clean.contains(h)
        } else {
            // Text-only phrases: require whole-word sequence match to avoid
            // false positives when the phrase is a substring of real speech.
            let ph: Vec<&str> = h.split_whitespace().collect();
            !ph.is_empty()
                && text_words.windows(ph.len()).any(|w| w == ph.as_slice())
        }
    });
    if matched {
        return true;
    }

    // Repeated-word hallucination: any alphabetic word (>1 char) appearing 4+ times in a row
    let alpha_words: Vec<&str> = clean
        .split(|c: char| !c.is_alphabetic())
        .filter(|w| w.len() > 1)
        .collect();
    if alpha_words.len() >= 4 {
        for window in alpha_words.windows(4) {
            if window[0] == window[1] && window[1] == window[2] && window[2] == window[3] {
                return true;
            }
        }
    }
    false
}

pub fn language_param(language: &str) -> Option<String> {
    let t = language.trim();
    if t.is_empty() || t == "auto" { None } else { Some(t.to_string()) }
}

fn filter_segments(json: &serde_json::Value) -> Option<String> {
    let segments = json["segments"].as_array()?;
    let text: String = segments
        .iter()
        .filter(|seg| seg["no_speech_prob"].as_f64().unwrap_or(1.0) <= 0.2)
        .filter_map(|seg| seg["text"].as_str())
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    if text.is_empty() { None } else { Some(text) }
}

pub async fn groq(
    wav_bytes: &[u8],
    api_key: &str,
    language: Option<String>,
    prompt: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let file_part = reqwest::multipart::Part::bytes(wav_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;

    let prompt_str = prompt.unwrap_or_else(|| "Hello. Whisprly dictation app.".to_string());

    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "verbose_json")
        .text("temperature", "0")
        .text("prompt", prompt_str)
        .part("file", file_part);

    let form = match language {
        Some(lang) => form.text("language", lang),
        None => form,
    };

    let response = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {api_key}"))
        .multipart(form)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Groq {status}: {body}"));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    // Primary path: filter segments by no_speech_prob
    // Fallback: use top-level "text" if "segments" key is absent (unexpected response shape)
    let text = filter_segments(&json)
        .or_else(|| json["text"].as_str().map(|t| t.trim().to_string()))
        .ok_or_else(|| "no_speech".to_string())?;

    if is_hallucination(&text) {
        return Err("hallucination".into());
    }

    Ok(text)
}

pub async fn local(
    wav_bytes: &[u8],
    _python_cmd: &str,
    _sidecar_path: &str,
    language: Option<String>,
    prompt: Option<String>,
) -> Result<String, String> {
    use base64::Engine;
    let audio_b64 = base64::engine::general_purpose::STANDARD.encode(wav_bytes);

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "audio_b64": audio_b64,
        "language": language,
        "prompt": prompt
    });

    let response = client
        .post("http://127.0.0.1:11435/transcribe")
        .json(&body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Sidecar unreachable: {e}. Is Docker running?"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("Sidecar error {status}: {body_text}"));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let text = filter_segments(&json)
        .ok_or_else(|| "no_speech".to_string())?;

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

    #[test]
    fn filter_segments_keeps_low_no_speech_prob() {
        let json = serde_json::json!({
            "segments": [
                {"text": "Hello world.", "no_speech_prob": 0.02},
                {"text": "How are you?", "no_speech_prob": 0.04}
            ]
        });
        assert_eq!(
            filter_segments(&json),
            Some("Hello world. How are you?".to_string())
        );
    }

    #[test]
    fn filter_segments_rejects_high_no_speech_prob() {
        let json = serde_json::json!({
            "segments": [
                {"text": "Thank you for watching.", "no_speech_prob": 0.85},
                {"text": "Please subscribe.", "no_speech_prob": 0.92}
            ]
        });
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_rejects_ambiguous_no_speech_prob() {
        // 0.3–0.6 range was previously accepted; tightened threshold to 0.2 rejects these
        let json = serde_json::json!({
            "segments": [
                {"text": "Hmm.", "no_speech_prob": 0.35},
                {"text": "Uh.", "no_speech_prob": 0.55}
            ]
        });
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_partial_filter() {
        let json = serde_json::json!({
            "segments": [
                {"text": "Good segment.", "no_speech_prob": 0.1},
                {"text": "Bad segment.", "no_speech_prob": 0.75}
            ]
        });
        assert_eq!(
            filter_segments(&json),
            Some("Good segment.".to_string())
        );
    }

    #[test]
    fn filter_segments_returns_none_on_missing_key() {
        // Groq fallback: no "segments" key → None → caller uses top-level "text"
        let json = serde_json::json!({"text": "Hello world."});
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_returns_none_on_empty_array() {
        let json = serde_json::json!({"segments": []});
        assert_eq!(filter_segments(&json), None);
    }

    #[test]
    fn filter_segments_strips_whitespace_from_segment_text() {
        let json = serde_json::json!({
            "segments": [
                {"text": "  Hello.  ", "no_speech_prob": 0.01}
            ]
        });
        assert_eq!(filter_segments(&json), Some("Hello.".to_string()));
    }
}
