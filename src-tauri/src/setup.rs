use std::io::{BufRead, BufReader};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
struct SetupProgress {
    stage:   String,
    percent: u8,
    message: String,
}

fn emit(app: &AppHandle, stage: &str, percent: u8, message: &str) {
    app.emit("setup_progress", SetupProgress {
        stage:   stage.to_string(),
        percent,
        message: message.to_string(),
    }).ok();
}

pub async fn check_and_setup(app: AppHandle, db: Arc<Mutex<Connection>>) {
    {
        let conn = db.lock().expect("db mutex poisoned");
        if crate::db::get_setting(&conn, "setup_complete").as_deref() == Some("true") {
            return;
        }
    }

    emit(&app, "checking", 0, "Checking setup...");

    let winget_ok = tokio::task::spawn_blocking(winget_available).await.unwrap_or(false);
    if !winget_ok {
        emit(&app, "installing_winget", 5, "Installing Windows Package Manager...");
        if let Err(e) = install_winget().await {
            eprintln!("install_winget error: {e}");
            emit(&app, "error", 0,
                "Could not install Package Manager. Install Ollama manually at ollama.com");
            return;
        }
    }

    let (ollama_running, model_present) = check_ollama().await;

    if ollama_running && model_present {
        let conn = db.lock().expect("db mutex poisoned");
        crate::db::set_setting(&conn, "setup_complete", "true").ok();
        return;
    }

    if !ollama_running {
        emit(&app, "installing_ollama", 20, "Installing Ollama...");
        if let Err(e) = install_ollama().await {
            emit(&app, "error", 0, &format!("Could not install Ollama: {e}"));
            return;
        }
        // Wait for Ollama service to start (poll up to 30s)
        let mut started = false;
        for _ in 0..30 {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let (running, _) = check_ollama().await;
            if running {
                started = true;
                break;
            }
        }
        if !started {
            emit(&app, "error", 0, "Ollama installed but did not start. Please restart the app.");
            return;
        }
    }

    if let Err(e) = pull_model(&app).await {
        emit(&app, "error", 0, &format!("Model download failed: {e}"));
        return;
    }

    {
        let conn = db.lock().expect("db mutex poisoned");
        crate::db::set_setting(&conn, "setup_complete", "true").ok();
    }

    emit(&app, "done", 100, "Gemma 4 ready. Local AI postprocessing enabled.");
}

fn winget_available() -> bool {
    std::process::Command::new("winget")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

async fn install_winget() -> Result<(), String> {
    let url = "https://github.com/microsoft/winget-cli/releases/latest/download/\
               Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle";

    let bytes = reqwest::get(url)
        .await.map_err(|e| e.to_string())?
        .bytes()
        .await.map_err(|e| e.to_string())?
        .to_vec();  // convert to Vec<u8> so it's Send

    tokio::task::spawn_blocking(move || {
        let tmp = std::env::temp_dir().join("AppInstaller.msixbundle");
        std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", "Add-AppxPackage"])
            .arg("-Path")
            .arg(&tmp)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() { Ok(()) } else { Err("Add-AppxPackage failed".to_string()) }
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn check_ollama() -> (bool, bool) {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_default();
    let resp = client.get("http://localhost:11434/api/tags").send().await;
    match resp {
        Ok(r) if r.status().is_success() => {
            let json: serde_json::Value = r.json().await.unwrap_or_default();
            let has_model = json["models"]
                .as_array()
                .map(|ms| ms.iter().any(|m| {
                    m["name"].as_str().unwrap_or("").starts_with("gemma4-4b")
                }))
                .unwrap_or(false);
            (true, has_model)
        }
        _ => (false, false),
    }
}

async fn install_ollama() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        let status = std::process::Command::new("winget")
            .args([
                "install", "Ollama.Ollama",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() { Ok(()) } else { Err("winget install Ollama failed".to_string()) }
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn pull_model(app: &AppHandle) -> Result<(), String> {
    let app = app.clone();
    tokio::task::spawn_blocking(move || {
        let mut child = std::process::Command::new("ollama")
            .args(["pull", "gemma4-4b"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        if let Some(stdout) = child.stdout.take() {
            for line in BufReader::new(stdout).lines() {
                let line = match line { Ok(l) => l, Err(_) => continue };
                let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) else { continue };

                let completed = json["completed"].as_u64().unwrap_or(0);
                let total     = json["total"].as_u64().unwrap_or(0);
                let percent   = if total > 0 { (completed * 100 / total).min(99) as u8 } else { 0 };
                let message   = if total > 0 {
                    format!(
                        "Downloading Gemma 4 ({:.1} GB / {:.1} GB)",
                        completed as f64 / 1e9,
                        total as f64 / 1e9,
                    )
                } else {
                    json["status"].as_str().unwrap_or("Downloading...").to_string()
                };

                emit(&app, "pulling_model", percent, &message);
            }
        }

        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("ollama pull gemma4-4b failed".to_string());
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
