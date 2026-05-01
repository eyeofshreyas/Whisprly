use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::WindowEvent;

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
    pub hotkey_tx: tokio::sync::mpsc::UnboundedSender<HotkeyEvent>,
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

fn emit_status(app: &AppHandle, status: &str, message: Option<String>) {
    app.emit(
        "status",
        StatusPayload { status: status.to_string(), message },
    )
    .ok();
}

fn show_overlay(app: &AppHandle) {
    if let Some(ov) = app.get_webview_window("overlay") {
        if let Ok(Some(mon)) = ov.primary_monitor() {
            let wa = mon.work_area();
            let scale = mon.scale_factor();
            let ow = (100.0 * scale) as i32;
            let oh = (50.0 * scale) as i32;
            let margin = (48.0 * scale) as i32;
            let x = wa.position.x + (wa.size.width as i32 - ow) / 2;
            let y = wa.position.y + wa.size.height as i32 - oh - margin;
            let _ = ov.set_position(tauri::PhysicalPosition::new(x, y));
        }
        let _ = ov.show();
        let _ = ov.set_always_on_top(true);
    }
}

fn hide_overlay(app: &AppHandle) {
    if let Some(ov) = app.get_webview_window("overlay") {
        let _ = ov.hide();
    }
}

async fn coordinator(
    mut rx: tokio::sync::mpsc::UnboundedReceiver<HotkeyEvent>,
    app: AppHandle,
    settings: Arc<Mutex<AppSettings>>,
    log: Arc<Mutex<Vec<TranscriptEntry>>>,
) {
    let mut recording: Option<RecordingHandle> = None;

    while let Some(event) = rx.recv().await {
        match event {
            HotkeyEvent::Start => {
                if recording.is_none() {
                    show_overlay(&app);
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
                        hide_overlay(&app);
                        continue;
                    }

                    let wav = audio::to_wav(result);
                    let s = settings.lock().unwrap().clone();

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
                            hide_overlay(&app);
                        }
                        _ => {
                            emit_status(&app, "idle", Some("Nothing transcribed".into()));
                            hide_overlay(&app);
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
async fn stop_recording(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.hotkey_tx.send(HotkeyEvent::Stop).map_err(|e| e.to_string())
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

    let sidecar_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("sidecar").join("whisper_sidecar.py")))
        .unwrap_or_else(|| std::path::PathBuf::from("sidecar/whisper_sidecar.py"))
        .to_string_lossy()
        .to_string();

    let settings = Arc::new(Mutex::new(AppSettings { groq_api_key, python_cmd, sidecar_path }));
    let transcript_log = Arc::new(Mutex::new(Vec::<TranscriptEntry>::new()));

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<HotkeyEvent>();
            let cmd_tx = tx.clone();

            app.manage(AppState {
                settings: settings.clone(),
                transcript_log: transcript_log.clone(),
                hotkey_tx: cmd_tx,
            });

            std::thread::spawn(move || hotkey::start_listener(tx));
            tauri::async_runtime::spawn(coordinator(rx, app_handle.clone(), settings, transcript_log));

            // ── System tray ──
            let open_i = MenuItem::with_id(app, "open", "Open Whisprly", true, None::<&str>)?;
            let sep    = PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu   = Menu::with_items(app, &[&open_i, &sep, &quit_i])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.set_focus();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // ── Close-to-tray: intercept CloseRequested on main window ──
            let ah = app_handle.clone();
            app.get_webview_window("main").unwrap().on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    if let Some(w) = ah.get_webview_window("main") {
                        let _ = w.hide();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_settings,
            get_settings,
            get_transcript_log,
            stop_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
