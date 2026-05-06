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
        let conn = db.lock().unwrap();
        if crate::db::get_setting(&conn, "setup_complete").as_deref() == Some("true") {
            return;
        }
    }

    emit(&app, "checking", 0, "Checking setup...");

    if !winget_available() {
        emit(&app, "installing_winget", 5, "Installing Windows Package Manager...");
        if let Err(_) = install_winget().await {
            emit(&app, "error", 0,
                "Could not install Package Manager. Install Ollama manually at ollama.com");
            return;
        }
    }

    let (ollama_running, model_present) = check_ollama().await;

    if ollama_running && model_present {
        let conn = db.lock().unwrap();
        crate::db::set_setting(&conn, "setup_complete", "true").ok();
        return;
    }

    if !ollama_running {
        emit(&app, "installing_ollama", 20, "Installing Ollama...");
        if let Err(e) = install_ollama().await {
            emit(&app, "error", 0, &format!("Could not install Ollama: {e}"));
            return;
        }
        tokio::time::sleep(std::time::Duration::from_secs(6)).await;
    }

    if let Err(e) = pull_model(&app).await {
        emit(&app, "error", 0, &format!("Model download failed: {e}"));
        return;
    }

    {
        let conn = db.lock().unwrap();
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
        .await.map_err(|e| e.to_string())?;

    let tmp = std::env::temp_dir().join("AppInstaller.msixbundle");
    std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;

    tokio::task::spawn_blocking(move || {
        let status = std::process::Command::new("powershell")
            .args([
                "-NoProfile", "-NonInteractive", "-Command",
                &format!("Add-AppxPackage -Path '{}'", tmp.display()),
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() { Ok(()) } else { Err("Add-AppxPackage failed".to_string()) }
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn check_ollama() -> (bool, bool) {
    let resp = reqwest::get("http://localhost:11434/api/tags").await;
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
            .stderr(std::process::Stdio::null())
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

        child.wait().map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
