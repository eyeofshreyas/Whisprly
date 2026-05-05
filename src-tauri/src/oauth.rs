use rand::RngCore;
use sha2::{Digest, Sha256};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;

// ── PKCE helpers ─────────────────────────────────────────────────────────────

fn base64url_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::new();
    let mut i = 0;
    while i < bytes.len() {
        let b0 = bytes[i] as usize;
        let b1 = if i + 1 < bytes.len() { bytes[i + 1] as usize } else { 0 };
        let b2 = if i + 2 < bytes.len() { bytes[i + 2] as usize } else { 0 };
        out.push(TABLE[b0 >> 2] as char);
        out.push(TABLE[((b0 & 0x3) << 4) | (b1 >> 4)] as char);
        if i + 1 < bytes.len() {
            out.push(TABLE[((b1 & 0xf) << 2) | (b2 >> 6)] as char);
        }
        if i + 2 < bytes.len() {
            out.push(TABLE[b2 & 0x3f] as char);
        }
        i += 3;
    }
    out
}

fn generate_pkce() -> (String, String) {
    let mut buf = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut buf);
    let verifier = base64url_encode(&buf);
    let challenge = base64url_encode(&Sha256::digest(verifier.as_bytes()));
    (verifier, challenge)
}

// ── URL helpers ───────────────────────────────────────────────────────────────

fn percent_encode(s: &str) -> String {
    let mut out = String::new();
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out: Vec<u8> = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("");
            if let Ok(byte) = u8::from_str_radix(hex, 16) {
                out.push(byte);
                i += 3;
                continue;
            }
        } else if bytes[i] == b'+' {
            out.push(b' ');
            i += 1;
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn extract_code(request_line: &str) -> Option<String> {
    // "GET /?code=4%2F0xxx&scope=... HTTP/1.1"
    let path = request_line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;
    for pair in query.split('&') {
        let mut kv = pair.splitn(2, '=');
        if kv.next()? == "code" {
            return Some(percent_decode(kv.next().unwrap_or("")));
        }
    }
    None
}

// ── Local callback server ─────────────────────────────────────────────────────

async fn wait_for_callback(listener: TcpListener) -> Result<String, String> {
    let (stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);

    let mut request_line = String::new();
    reader.read_line(&mut request_line).await.map_err(|e| e.to_string())?;

    let code = extract_code(&request_line)
        .ok_or_else(|| "No authorization code in callback".to_string())?;

    write_half
        .write_all(
            b"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n\
            <!DOCTYPE html><html><head><title>Whisprly</title></head><body>\
            <p style=\"font-family:sans-serif;font-size:18px;text-align:center;margin-top:60px\">\
            Sign-in complete! You can close this tab and return to Whisprly.\
            </p></body></html>",
        )
        .await
        .ok();

    Ok(code)
}

// ── Open system browser ───────────────────────────────────────────────────────

fn open_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // rundll32 url.dll,FileProtocolHandler is the most reliable way to open
        // a URL in the default browser on Windows without shell-escaping issues.
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", url])
            .spawn()
            .map_err(|e| format!("Failed to open browser: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {e}"))?;
    }
    Ok(())
}

// ── Token response ────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct TokenResponse {
    id_token:          Option<String>,
    access_token:      Option<String>,
    error:             Option<String>,
    error_description: Option<String>,
}

// ── Tauri command ─────────────────────────────────────────────────────────────

/// Opens the system browser for Google OAuth (PKCE), waits for the callback on
/// a random local port, exchanges the code for tokens, and returns them to the
/// frontend for use with Firebase `signInWithCredential`.
///
/// Requires in `.env`:
///   GOOGLE_DESKTOP_CLIENT_ID     – OAuth 2.0 "Desktop app" client ID
///   GOOGLE_DESKTOP_CLIENT_SECRET – corresponding client secret (optional for strict PKCE but
///                                  Google currently requires it for Desktop clients)
#[tauri::command]
pub async fn start_google_oauth() -> Result<serde_json::Value, String> {
    // option_env! bakes the value at compile time when set (production build).
    // Falls back to runtime .env for local dev where the var isn't pre-set.
    let client_id = option_env!("GOOGLE_DESKTOP_CLIENT_ID")
        .map(str::to_string)
        .or_else(|| std::env::var("GOOGLE_DESKTOP_CLIENT_ID").ok())
        .ok_or_else(|| "GOOGLE_DESKTOP_CLIENT_ID not configured".to_string())?;
    let client_secret = option_env!("GOOGLE_DESKTOP_CLIENT_SECRET")
        .map(str::to_string)
        .or_else(|| std::env::var("GOOGLE_DESKTOP_CLIENT_SECRET").ok());

    let (code_verifier, code_challenge) = generate_pkce();

    // Fixed port so the redirect URI is predictable and can be registered in
    // Google Cloud Console for a web application OAuth client.
    const CALLBACK_PORT: u16 = 9004;
    let listener = TcpListener::bind(("127.0.0.1", CALLBACK_PORT))
        .await
        .map_err(|e| format!("Port {CALLBACK_PORT} already in use — close other apps and retry: {e}"))?;
    let redirect_uri = format!("http://localhost:{CALLBACK_PORT}");

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
         ?client_id={}\
         &redirect_uri={}\
         &response_type=code\
         &scope=openid%20email%20profile\
         &code_challenge={}\
         &code_challenge_method=S256\
         &access_type=offline\
         &prompt=select_account",
        percent_encode(&client_id),
        percent_encode(&redirect_uri),
        code_challenge,
    );

    open_browser(&auth_url)?;

    let code = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        wait_for_callback(listener),
    )
    .await
    .map_err(|_| "Auth timed out after 5 minutes".to_string())??;

    // Exchange the auth code for tokens.
    let mut form: Vec<(&str, String)> = vec![
        ("code",          code),
        ("client_id",     client_id),
        ("redirect_uri",  redirect_uri),
        ("grant_type",    "authorization_code".to_string()),
        ("code_verifier", code_verifier),
    ];
    if let Some(secret) = client_secret {
        form.push(("client_secret", secret));
    }

    let http = reqwest::Client::new();
    let resp = http
        .post("https://oauth2.googleapis.com/token")
        .form(&form)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token exchange {status}: {body}"));
    }

    let tokens: TokenResponse = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = tokens.error {
        return Err(format!(
            "{err}: {}",
            tokens.error_description.unwrap_or_default()
        ));
    }

    Ok(serde_json::json!({
        "idToken":     tokens.id_token,
        "accessToken": tokens.access_token,
    }))
}
