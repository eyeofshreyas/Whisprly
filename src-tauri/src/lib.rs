use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::WindowEvent;
use rusqlite::Connection;

mod audio;
mod auto_type;
mod db;
mod hotkey;
mod oauth;
mod transcribe;
mod postprocess;
mod setup;

pub enum HotkeyEvent {
    Start,
    Stop,
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
    pub postprocess_model: String,
    pub output_mode: String,
    pub language: String,
}

pub struct AppState {
    pub settings:      Arc<Mutex<AppSettings>>,
    pub db:            Arc<Mutex<Connection>>,
    pub hotkey_tx:     tokio::sync::mpsc::UnboundedSender<HotkeyEvent>,
    pub settings_path: std::path::PathBuf,
}

struct RecordingHandle {
    stop_flag: Arc<AtomicBool>,
    thread: std::thread::JoinHandle<()>,
    chunk_rx: std::sync::mpsc::Receiver<Vec<f32>>,
}

fn start_recording() -> RecordingHandle {
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_clone = stop_flag.clone();
    let (chunk_tx, chunk_rx) = std::sync::mpsc::channel();
    let thread = std::thread::spawn(move || audio::record(stop_clone, chunk_tx));
    RecordingHandle { stop_flag, thread, chunk_rx }
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
            let oh = (25.0 * scale) as i32;
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
    db: Arc<Mutex<Connection>>,
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

                    // Extract chunk_rx before moving handle.thread into spawn_blocking
                    let chunk_rx = handle.chunk_rx;
                    let join_result = tokio::task::spawn_blocking(move || handle.thread.join())
                        .await;
                    match join_result {
                        Ok(Ok(())) => {}
                        Ok(Err(_)) | Err(_) => {
                            eprintln!("audio thread panicked");
                            emit_status(&app, "idle", Some("Recording error".into()));
                            hide_overlay(&app);
                            continue;
                        }
                    }

                    // Drain all chunks from the channel
                    let chunks: Vec<Vec<f32>> = chunk_rx.try_iter().collect();

                    if chunks.is_empty() {
                        emit_status(&app, "idle", Some("No audio captured".into()));
                        hide_overlay(&app);
                        continue;
                    }

                    let s = settings.lock().unwrap().clone();
                    let language = transcribe::language_param(&s.language);
                    let mut used_engine = "local".to_string();
                    let mut session_texts: Vec<String> = Vec::new();

                    for chunk in chunks {
                        if audio::is_silent(&chunk) { continue; }
                        let wav = audio::to_wav_from_samples(chunk);

                        let mut chunk_engine = "local";
                        let text = if !s.groq_api_key.is_empty() {
                            transcribe::groq(&wav, &s.groq_api_key, language.clone()).await.ok()
                        } else {
                            None
                        };

                        let text = match text {
                            Some(t) if !t.is_empty() => {
                                chunk_engine = "groq";
                                Some(t)
                            }
                            _ => transcribe::local(&wav, &s.python_cmd, &s.sidecar_path, language.clone()).await.ok(),
                        };

                        if let Some(t) = text {
                            if !t.is_empty() {
                                used_engine = chunk_engine.to_string();
                                session_texts.push(t);
                            }
                        }
                    }

                    if session_texts.is_empty() {
                        emit_status(&app, "idle", Some("Nothing transcribed".into()));
                        hide_overlay(&app);
                        continue;
                    }

                    let raw_text = session_texts.join(" ");

                    let polished = postprocess::polish(
                        &raw_text,
                        &s.output_mode,
                        &s.postprocess_model,
                        &s.groq_api_key,
                        &s.python_cmd,
                    )
                    .await
                    .unwrap_or_else(|_| raw_text.clone());

                    let p = polished.clone();
                    if let Err(e) = tokio::task::spawn_blocking(move || auto_type::type_text(&p)).await {
                        eprintln!("auto_type failed: {e:?}");
                    }

                    let db_entry = db::TranscriptEntry {
                        id: 0,
                        text: polished,
                        raw_text: Some(raw_text),
                        engine: used_engine.clone(),
                        mode: s.output_mode.clone(),
                        language: language.clone(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    };
                    {
                        let conn = db.lock().unwrap();
                        if let Err(e) = db::insert_transcript(&conn, &db_entry) {
                            eprintln!("Failed to save transcript to DB: {e}");
                        }
                    }
                    app.emit("transcript", &db_entry).ok();
                    emit_status(&app, "idle", None);
                    hide_overlay(&app);
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
    language: String,
) -> Result<(), String> {
    let path = {
        let mut s = state.settings.lock().unwrap();
        s.groq_api_key = groq_api_key.clone();
        s.python_cmd   = python_cmd.clone();
        s.language     = language.clone();
        state.settings_path.clone()
    };
    let json = serde_json::json!({
        "groqApiKey": groq_api_key,
        "pythonCmd":  python_cmd,
        "language":   language,
        "outputMode": state.settings.lock().unwrap().output_mode,
    });
    std::fs::write(&path, json.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let s = state.settings.lock().unwrap();
    Ok(serde_json::json!({
        "groqApiKey": s.groq_api_key,
        "pythonCmd": s.python_cmd,
        "language": s.language,
    }))
}

#[tauri::command]
fn get_transcript_log(state: tauri::State<'_, AppState>) -> Vec<db::TranscriptEntry> {
    let conn = state.db.lock().unwrap();
    db::get_transcripts(&conn, 200).unwrap_or_default()
}

#[tauri::command]
fn search_transcripts(query: String, state: tauri::State<'_, AppState>) -> Vec<db::TranscriptEntry> {
    let conn = state.db.lock().unwrap();
    db::search_transcripts(&conn, &query).unwrap_or_default()
}

#[tauri::command]
fn clear_all_db_transcripts(state: tauri::State<'_, AppState>) {
    let conn = state.db.lock().unwrap();
    if let Err(e) = db::clear_all_transcripts(&conn) {
        eprintln!("Failed to clear DB transcripts: {e}");
    }
}

#[tauri::command]
fn get_output_mode(state: tauri::State<'_, AppState>) -> String {
    state.settings.lock().unwrap().output_mode.clone()
}

#[tauri::command]
fn set_output_mode(state: tauri::State<'_, AppState>, mode: String) -> Result<(), String> {
    if ["prose", "email", "code"].contains(&mode.as_str()) {
        state.settings.lock().unwrap().output_mode = mode.clone();
        // Persist
        let s = state.settings.lock().unwrap().clone();
        let json = serde_json::json!({
            "groqApiKey": s.groq_api_key,
            "pythonCmd":  s.python_cmd,
            "language":   s.language,
            "outputMode": s.output_mode,
        });
        std::fs::write(&state.settings_path, json.to_string()).ok();
        Ok(())
    } else {
        Err(format!("invalid mode: {mode}"))
    }
}

#[tauri::command]
fn delete_transcript(id: i64, state: tauri::State<'_, AppState>) {
    let conn = state.db.lock().unwrap();
    if let Err(e) = db::delete_transcript(&conn, id) {
        eprintln!("Failed to delete transcript {id}: {e}");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    let groq_api_key = option_env!("GROQ_API")
        .map(str::to_string)
        .or_else(|| std::env::var("GROQ_API").ok())
        .unwrap_or_default();
    let python_cmd = if cfg!(windows) { "python".to_string() } else { "python3".to_string() };

    let sidecar_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("sidecar").join("whisper_sidecar.py")))
        .unwrap_or_else(|| std::path::PathBuf::from("sidecar/whisper_sidecar.py"))
        .to_string_lossy()
        .to_string();

    let settings = Arc::new(Mutex::new(AppSettings {
        groq_api_key,
        python_cmd,
        sidecar_path,
        postprocess_model: "llama-3.1-8b-instant".to_string(),
        output_mode: "prose".to_string(),
        language: "auto".to_string(),
    }));

    tauri::Builder::default()
        .setup(|app| {
            let db_path = app.path().app_data_dir()
                .expect("no app data dir")
                .join("transcripts.db");
            std::fs::create_dir_all(db_path.parent().unwrap()).ok();
            let conn = Connection::open(&db_path).expect("open SQLite db");
            db::init_db(&conn).expect("init db schema");
            let db = Arc::new(Mutex::new(conn));

            // Load persisted settings if they exist
            let settings_file = app.path().app_data_dir()
                .expect("no app data dir")
                .join("settings.json");
            if let Ok(data) = std::fs::read_to_string(&settings_file) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&data) {
                    let mut s = settings.lock().unwrap();
                    if let Some(v) = json["groqApiKey"].as_str() { s.groq_api_key = v.to_string(); }
                    if let Some(v) = json["pythonCmd"].as_str()  { s.python_cmd   = v.to_string(); }
                    if let Some(v) = json["language"].as_str()   { s.language     = v.to_string(); }
                    if let Some(v) = json["outputMode"].as_str() { s.output_mode  = v.to_string(); }
                }
            }

            let app_handle = app.handle().clone();
            let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<HotkeyEvent>();
            let cmd_tx = tx.clone();

            app.manage(AppState {
                settings: settings.clone(),
                db: db.clone(),
                hotkey_tx: cmd_tx,
                settings_path: settings_file.clone(),
            });

            std::thread::spawn(move || hotkey::start_listener(tx));
            tauri::async_runtime::spawn(coordinator(rx, app_handle.clone(), settings, db.clone()));
            let db_for_setup = db.clone();
            let app_for_setup = app_handle.clone();
            tauri::async_runtime::spawn(setup::check_and_setup(app_for_setup, db_for_setup));

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
            search_transcripts,
            clear_all_db_transcripts,
            delete_transcript,
            stop_recording,
            oauth::start_google_oauth,
            get_output_mode,
            set_output_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
