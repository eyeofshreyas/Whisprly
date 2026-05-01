use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use serde::{Deserialize, Serialize};
use tauri::Manager;

mod audio;
mod auto_type;
mod hotkey;
mod transcribe;

pub enum HotkeyEvent {
    Start,
    Stop,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranscriptEntry {
    pub text: String,
    pub engine: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StatusPayload {
    status: String,
    message: Option<String>,
}

#[derive(Clone)]
pub struct AppSettings {
    pub groq_api_key: String,
    pub python_cmd: String,
    pub sidecar_path: String,
}

pub struct AppState {
    pub settings: Arc<Mutex<AppSettings>>,
    pub transcript_log: Arc<Mutex<Vec<TranscriptEntry>>>,
}

struct RecordingHandle {
    stop_flag: Arc<AtomicBool>,
    thread: std::thread::JoinHandle<audio::RecordingResult>,
}

fn start_recording() -> RecordingHandle {
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_clone = stop_flag.clone();
    let thread = std::thread::spawn(move || audio::record(stop_clone));
    RecordingHandle { stop_flag, thread }
}

fn emit_status(app: &tauri::AppHandle, status: &str, message: Option<String>) {
    app.emit(
        "status",
        StatusPayload { status: status.to_string(), message },
    )
    .ok();
}

async fn coordinator(
    mut rx: tokio::sync::mpsc::UnboundedReceiver<HotkeyEvent>,
    app: tauri::AppHandle,
    settings: Arc<Mutex<AppSettings>>,
    log: Arc<Mutex<Vec<TranscriptEntry>>>,
) {
    let mut recording: Option<RecordingHandle> = None;

    while let Some(event) = rx.recv().await {
        match event {
            HotkeyEvent::Start => {
                if recording.is_none() {
                    emit_status(&app, "recording", None);
                    recording = Some(start_recording());
                }
            }
            HotkeyEvent::Stop => {
                if let Some(handle) = recording.take() {
                    handle.stop_flag.store(true, Ordering::SeqCst);
                    emit_status(&app, "transcribing", None);

                    let result = tokio::task::spawn_blocking(move || {
                        handle.thread.join().unwrap()
                    })
                    .await
                    .unwrap();

                    if result.samples.is_empty() {
                        emit_status(&app, "idle", Some("No audio captured".into()));
                        continue;
                    }

                    let wav = audio::to_wav(result);
                    let s = settings.lock().unwrap().clone();

                    // Try Groq first
                    let transcript = if !s.groq_api_key.is_empty() {
                        match transcribe::groq(&wav, &s.groq_api_key).await {
                            Ok(t) => Some(("groq", t)),
                            Err(e) => {
                                eprintln!("Groq error: {e}");
                                None
                            }
                        }
                    } else {
                        None
                    };

                    // Fall back to local faster-whisper
                    let transcript = if transcript.is_none() {
                        match transcribe::local(&wav, &s.python_cmd, &s.sidecar_path).await {
                            Ok(t) => Some(("local", t)),
                            Err(e) => {
                                eprintln!("Local error: {e}");
                                None
                            }
                        }
                    } else {
                        transcript
                    };

                    match transcript {
                        Some((engine, text)) if !text.is_empty() => {
                            // Auto-type into focused window
                            let t = text.clone();
                            tokio::task::spawn_blocking(move || auto_type::type_text(&t))
                                .await
                                .ok();

                            let entry = TranscriptEntry {
                                text,
                                engine: engine.to_string(),
                                timestamp: std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs(),
                            };
                            log.lock().unwrap().push(entry.clone());
                            app.emit("transcript", entry).ok();
                            emit_status(&app, "idle", None);
                        }
                        _ => {
                            emit_status(&app, "idle", Some("Nothing transcribed".into()));
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
async fn save_settings(
    state: tauri::State<'_, AppState>,
    groq_api_key: String,
    python_cmd: String,
) -> Result<(), String> {
    let mut s = state.settings.lock().unwrap();
    s.groq_api_key = groq_api_key;
    s.python_cmd = python_cmd;
    Ok(())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let s = state.settings.lock().unwrap();
    Ok(serde_json::json!({
        "groqApiKey": s.groq_api_key,
        "pythonCmd": s.python_cmd,
    }))
}

#[tauri::command]
async fn get_transcript_log(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TranscriptEntry>, String> {
    Ok(state.transcript_log.lock().unwrap().clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    let groq_api_key = std::env::var("GROQ_API").unwrap_or_default();
    let python_cmd = if cfg!(windows) { "python".to_string() } else { "python3".to_string() };

    // Sidecar path: look next to the binary, then fall back to project-relative
    let sidecar_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("sidecar").join("whisper_sidecar.py")))
        .unwrap_or_else(|| std::path::PathBuf::from("sidecar/whisper_sidecar.py"))
        .to_string_lossy()
        .to_string();

    let settings = Arc::new(Mutex::new(AppSettings { groq_api_key, python_cmd, sidecar_path }));
    let transcript_log = Arc::new(Mutex::new(Vec::<TranscriptEntry>::new()));

    tauri::Builder::default()
        .manage(AppState {
            settings: settings.clone(),
            transcript_log: transcript_log.clone(),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<HotkeyEvent>();

            // Keyboard listener (blocking — needs its own OS thread)
            std::thread::spawn(move || hotkey::start_listener(tx));

            // Coordinator (async task)
            tauri::async_runtime::spawn(coordinator(rx, app_handle, settings, transcript_log));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_settings,
            get_settings,
            get_transcript_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
