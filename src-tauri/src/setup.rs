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

pub async fn check_and_setup(
    app: AppHandle,
    db: Arc<Mutex<Connection>>,
    _ollama_process: Arc<Mutex<Option<std::process::Child>>>,
) {
    let already_complete = {
        let conn = db.lock().expect("db mutex poisoned");
        crate::db::get_setting(&conn, "setup_complete").as_deref() == Some("true")
    };
    if already_complete {
        // Still ensure containers are running (they may have been stopped)
        let _ = ensure_containers_running().await;
        return;
    }

    emit(&app, "checking", 0, "Checking Docker...");

    if !docker_available().await {
        emit(&app, "error", 0,
            "Docker not found. Install Docker Desktop and restart the app. https://docs.docker.com/get-docker/");
        return;
    }

    emit(&app, "starting_containers", 20, "Starting WisperFlow containers...");
    if let Err(e) = ensure_containers_running().await {
        emit(&app, "error", 0, &format!("Could not start containers: {e}"));
        return;
    }

    emit(&app, "waiting_ollama", 40, "Waiting for Ollama to be ready...");
    if !wait_for_ollama(30).await {
        emit(&app, "error", 0, "Ollama did not start in time. Try restarting the app.");
        return;
    }

    emit(&app, "pulling_model", 50, "Pulling gemma4:4b model (first run only)...");
    if let Err(e) = ensure_model_pulled("gemma4:4b").await {
        emit(&app, "error", 0, &format!("Model pull failed: {e}"));
        return;
    }

    emit(&app, "waiting_sidecar", 80, "Waiting for sidecar to be ready...");
    if !wait_for_sidecar(60).await {
        emit(&app, "error", 0, "Whisper sidecar did not start in time (model may still be downloading). Try again in a minute.");
        return;
    }

    {
        let conn = db.lock().expect("db mutex poisoned");
        crate::db::set_setting(&conn, "setup_complete", "true").ok();
    }

    emit(&app, "done", 100, "Docker services ready.");
}

async fn docker_available() -> bool {
    tokio::task::spawn_blocking(|| {
        std::process::Command::new("docker")
            .arg("info")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false)
}

async fn ensure_containers_running() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        // Create shared network (idempotent)
        std::process::Command::new("docker")
            .args(["network", "create", "wisperflow"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status().ok();

        // Start ollama (idempotent: --name fails if already running, that's fine)
        let ollama = std::process::Command::new("docker")
            .args([
                "run", "-d", "--name", "wisperflow-ollama",
                "--network", "wisperflow",
                "-p", "127.0.0.1:11434:11434",
                "-v", "wisperflow-ollama:/root/.ollama",
                "--restart", "unless-stopped",
                "ollama/ollama",
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .output()
            .map_err(|e| e.to_string())?;

        // "already in use" is ok — container already running
        if !ollama.status.success() {
            let err = String::from_utf8_lossy(&ollama.stderr);
            if !err.contains("already in use") {
                return Err(format!("docker run ollama: {err}"));
            }
        }

        // Start sidecar
        let sidecar = std::process::Command::new("docker")
            .args([
                "run", "-d", "--name", "wisperflow-sidecar",
                "--network", "wisperflow",
                "-p", "127.0.0.1:11435:11435",
                "-e", "OLLAMA_URL=http://wisperflow-ollama:11434",
                "-v", "wisperflow-cache:/root/.cache",
                "--restart", "unless-stopped",
                "wisperflow-sidecar:local",
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .output()
            .map_err(|e| e.to_string())?;

        if !sidecar.status.success() {
            let err = String::from_utf8_lossy(&sidecar.stderr);
            if !err.contains("already in use") {
                return Err(format!("docker run sidecar: {err}"));
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn wait_for_ollama(max_secs: u64) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default();
    for _ in 0..max_secs {
        if client.get("http://localhost:11434/api/tags").send().await
            .map(|r| r.status().is_success()).unwrap_or(false)
        {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
    false
}

async fn wait_for_sidecar(max_secs: u64) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default();
    for _ in 0..max_secs {
        if client.get("http://127.0.0.1:11435/health").send().await
            .map(|r| r.status().is_success()).unwrap_or(false)
        {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
    false
}

async fn ensure_model_pulled(model: &str) -> Result<(), String> {
    // Check if already present
    let client = reqwest::Client::new();
    let tags: serde_json::Value = client
        .get("http://localhost:11434/api/tags")
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let already_present = tags["models"].as_array()
        .map(|ms| ms.iter().any(|m| m["name"].as_str().unwrap_or("").starts_with(model)))
        .unwrap_or(false);

    if already_present {
        return Ok(());
    }

    // Pull the model (blocking stream — just wait for completion)
    let resp = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({"name": model, "stream": false}))
        .timeout(std::time::Duration::from_secs(600))
        .send().await.map_err(|e| e.to_string())?;

    if resp.status().is_success() { Ok(()) } else {
        Err(format!("pull failed: {}", resp.status()))
    }
}
