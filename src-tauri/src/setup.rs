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
) {
    let already_complete = {
        let conn = db.lock().expect("db mutex poisoned");
        crate::db::get_setting(&conn, "setup_complete").as_deref() == Some("true")
    };

    // Fast path: sidecar already healthy — nothing to start
    if sidecar_healthy().await {
        if already_complete {
            return;
        }
        // Containers running but setup flag not set — fall through to finish setup
    } else {
        // Sidecar not up: check Docker then bring containers up
        if !already_complete {
            emit(&app, "checking", 0, "Checking Docker...");
            if !docker_available().await {
                emit(&app, "error", 0,
                    "Docker not found. Install Docker Desktop and restart the app. https://docs.docker.com/get-docker/");
                return;
            }
        }

        emit(&app, "starting_containers", 20, "Starting WisperFlow containers...");
        if let Err(e) = ensure_containers_running().await {
            emit(&app, "error", 0, &format!("Could not start containers: {e}"));
            return;
        }

        emit(&app, "waiting_sidecar", 40, "Waiting for services to be ready...");
        // ponytail: 30 polls × 2s = 60s max; matches spec
        if !wait_for_sidecar(30).await {
            emit(&app, "error", 0,
                "Services did not start in time. Try restarting the app.");
            return;
        }
    }

    if !already_complete {
        emit(&app, "waiting_ollama", 50, "Waiting for Ollama to be ready...");
        if !wait_for_ollama(30).await {
            emit(&app, "error", 0, "Ollama did not start in time. Try restarting the app.");
            return;
        }

        emit(&app, "pulling_model", 60, "Pulling gemma4:4b model (first run only)...");
        if let Err(e) = ensure_model_pulled("gemma4:4b").await {
            emit(&app, "error", 0, &format!("Model pull failed: {e}"));
            return;
        }

        {
            let conn = db.lock().expect("db mutex poisoned");
            crate::db::set_setting(&conn, "setup_complete", "true").ok();
        }

        emit(&app, "done", 100, "Docker services ready.");
    }
}

async fn sidecar_healthy() -> bool {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default()
        .get("http://127.0.0.1:11435/health")
        .send().await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
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

fn compose_dir() -> Result<std::path::PathBuf, String> {
    // In `tauri dev` current_dir() is the project root — docker-compose.yml lives there.
    // In production the file must sit next to the binary (or be bundled as a resource).
    let candidates = [
        std::env::current_dir().ok(),
        std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.to_path_buf())),
    ];
    for dir in candidates.into_iter().flatten() {
        if dir.join("docker-compose.yml").exists() {
            return Ok(dir);
        }
    }
    Err("docker-compose.yml not found. Place it next to the app binary or run from the project root.".into())
}

async fn ensure_containers_running() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        let dir = compose_dir()?;
        let output = std::process::Command::new("docker")
            .args(["compose", "up", "-d"])
            .current_dir(&dir)
            .output()
            .map_err(|e| format!("docker not found: {e}"))?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!("docker compose up failed: {}", String::from_utf8_lossy(&output.stderr).trim()))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn wait_for_ollama(max_polls: u64) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default();
    for _ in 0..max_polls {
        if client.get("http://localhost:11434/api/tags").send().await
            .map(|r| r.status().is_success()).unwrap_or(false)
        {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    false
}

async fn wait_for_sidecar(max_polls: u64) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default();
    for _ in 0..max_polls {
        if client.get("http://127.0.0.1:11435/health").send().await
            .map(|r| r.status().is_success()).unwrap_or(false)
        {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    false
}

async fn ensure_model_pulled(model: &str) -> Result<(), String> {
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

    let resp = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({"name": model, "stream": false}))
        .timeout(std::time::Duration::from_secs(600))
        .send().await.map_err(|e| e.to_string())?;

    if resp.status().is_success() { Ok(()) } else {
        Err(format!("pull failed: {}", resp.status()))
    }
}
