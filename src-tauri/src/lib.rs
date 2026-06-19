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
mod platform;
mod postprocess;
mod setup;
mod transcribe;

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
    pub custom_vocabulary: String,
    pub custom_instructions: String,
}

pub struct AppState {
    pub settings:        Arc<Mutex<AppSettings>>,
    pub db:              Arc<Mutex<Connection>>,
    pub hotkey_tx:       tokio::sync::mpsc::UnboundedSender<HotkeyEvent>,
    pub settings_path:   std::path::PathBuf,
    pub ollama_process:  Arc<Mutex<Option<std::process::Child>>>,
    pub whisper_process: Arc<Mutex<Option<std::process::Child>>>,
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
        let _ = ov.show();
        let _ = ov.set_always_on_top(true);
        let ov_clone = ov.clone();
        let main_win = app.get_webview_window("main");
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(350));
            let ov_gui = ov_clone.clone();
            let _ = ov_clone.run_on_main_thread(move || {
                let mon_opt = main_win.as_ref()
                    .and_then(|w| w.primary_monitor().ok().flatten())
                    .or_else(|| ov_gui.primary_monitor().ok().flatten());
                if let Some(mon) = mon_opt {
                    let wa = mon.work_area();
                    let scale = mon.scale_factor();
                    let ow = (90.0 * scale) as i32;
                    let margin = (8.0 * scale) as i32;
                    let x = wa.position.x + (wa.size.width as i32 - ow) / 2;
                    let y = wa.position.y + margin;
                    let _ = ov_gui.set_position(tauri::PhysicalPosition::new(x, y));
                }
            });
        });
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

                    // Drain and flatten all captured audio samples
                    let chunks: Vec<Vec<f32>> = chunk_rx.try_iter().collect();
                    let combined_samples: Vec<f32> = chunks.into_iter().flatten().collect();

                    if combined_samples.is_empty() {
                        emit_status(&app, "idle", Some("No audio captured".into()));
                        hide_overlay(&app);
                        continue;
                    }

                    let s = settings.lock().unwrap().clone();
                    let language = transcribe::language_param(&s.language);
                    let wav = audio::to_wav_from_samples(combined_samples);

                    // Fetch the last transcription as context for prompt chaining, combining it with custom vocabulary
                    let final_prompt = {
                        let mut prompt_content = String::new();
                        let custom_vocab = s.custom_vocabulary.trim();
                        if !custom_vocab.is_empty() {
                            prompt_content.push_str("Vocabulary: ");
                            prompt_content.push_str(custom_vocab);
                            if s.language == "hi" || s.language == "auto" {
                                prompt_content.push_str(", ki, saath, mein, karta, hai, is, baat, aap, kaise, hain, kar, raha, tha, project, phone, disturbance, o'clock");
                            }
                            prompt_content.push_str(". ");
                        } else if s.language == "hi" || s.language == "auto" {
                            prompt_content.push_str("Vocabulary: ki, saath, mein, karta, hai, is, baat, aap, kaise, hain, kar, raha, tha, project, phone, disturbance, o'clock. ");
                        }

                        let last_tx = {
                            let conn = db.lock().unwrap();
                            db::get_transcripts(&conn, 1)
                                .ok()
                                .and_then(|list| list.first().map(|entry| entry.text.clone()))
                        };

                        if let Some(prev) = last_tx {
                            prompt_content.push_str(&prev);
                        }

                        if prompt_content.is_empty() {
                            None
                        } else {
                            // Enforce Whisper prompt limit (approx 224 tokens)
                            let char_limit = 1000;
                            let char_count = prompt_content.chars().count();
                            if char_count > char_limit {
                                Some(prompt_content.chars().skip(char_count - char_limit).collect::<String>())
                            } else {
                                Some(prompt_content)
                            }
                        }
                    };

                    let mut used_engine = "local".to_string();
                    let mut transcription_result = None;

                    if !s.groq_api_key.is_empty() {
                        eprintln!("[transcribe] calling Groq with prompt context: {:?}", final_prompt);
                        match transcribe::groq(&wav, &s.groq_api_key, language.clone(), final_prompt.clone()).await {
                            Ok(t) => {
                                eprintln!("[transcribe] Groq ok: {:?}", t);
                                used_engine = "groq".to_string();
                                transcription_result = Some(t);
                            }
                            Err(e) => {
                                eprintln!("[transcribe] Groq error: {e}");
                            }
                        }
                    }

                    let transcription_result = match transcription_result {
                        Some(t) => Some(t),
                        None => {
                            eprintln!("[transcribe] falling back to local sidecar with prompt context: {:?}", final_prompt);
                            match transcribe::local(&wav, &s.python_cmd, &s.sidecar_path, language.clone(), final_prompt.clone()).await {
                                Ok(t) => {
                                    eprintln!("[transcribe] local ok: {:?}", t);
                                    used_engine = "local".to_string();
                                    Some(t)
                                }
                                Err(e) => {
                                    eprintln!("[transcribe] local error: {e}");
                                    None
                                }
                            }
                        }
                    };

                    let raw_text = match transcription_result {
                        Some(t) if !t.is_empty() => t,
                        _ => {
                            emit_status(&app, "idle", Some("Nothing transcribed".into()));
                            hide_overlay(&app);
                            continue;
                        }
                    };

                    let mut resolved_mode = s.output_mode.clone();
                    if resolved_mode == "auto" {
                        if let Some(win_title) = platform::get_active_window_title() {
                            let title_lower = win_title.to_lowercase();
                            eprintln!("[coordinator] active window title: {title_lower}");
                            if title_lower.contains("code") || title_lower.contains("cursor") || title_lower.contains("vscode") || title_lower.contains("vim") || title_lower.contains("terminal") || title_lower.contains("bash") || title_lower.contains("sh") || title_lower.contains("zsh") {
                                resolved_mode = "code".to_string();
                            } else if title_lower.contains("mail") || title_lower.contains("outlook") || title_lower.contains("thunderbird") || title_lower.contains("gmail") {
                                resolved_mode = "email".to_string();
                            } else {
                                resolved_mode = "prose".to_string();
                            }
                        } else {
                            resolved_mode = "prose".to_string();
                        }
                        eprintln!("[coordinator] auto-resolved mode to: {resolved_mode}");
                    }

                    let polished = postprocess::polish(
                        &raw_text,
                        &resolved_mode,
                        &s.postprocess_model,
                        &s.groq_api_key,
                        &s.python_cmd,
                        &s.custom_vocabulary,
                        &s.custom_instructions,
                    )
                    .await
                    .unwrap_or_else(|_| raw_text.clone());

                    let p = polished.clone();
                    eprintln!("[auto_type] typing: {:?}", p);

                    // Hide the overlay first so GNOME Wayland returns focus to
                    // the user's target window before ydotool injects keystrokes.
                    hide_overlay(&app);
                    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

                    if let Err(e) = tokio::task::spawn_blocking(move || auto_type::type_text(&p)).await {
                        eprintln!("[auto_type] spawn_blocking failed: {e:?}");
                    }

                    let db_entry = db::TranscriptEntry {
                        id: 0,
                        text: polished,
                        raw_text: Some(raw_text),
                        engine: used_engine.clone(),
                        mode: resolved_mode.clone(),
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
    postprocess_model: String,
    custom_vocabulary: String,
    custom_instructions: String,
) -> Result<(), String> {
    let path = {
        let mut s = state.settings.lock().unwrap();
        s.groq_api_key = groq_api_key.clone();
        s.python_cmd   = python_cmd.clone();
        s.language     = language.clone();
        s.postprocess_model = postprocess_model.clone();
        s.custom_vocabulary = custom_vocabulary.clone();
        s.custom_instructions = custom_instructions.clone();
        state.settings_path.clone()
    };
    let json = serde_json::json!({
        "groqApiKey": groq_api_key,
        "pythonCmd":  python_cmd,
        "language":   language,
        "postprocessModel": postprocess_model,
        "outputMode": state.settings.lock().unwrap().output_mode,
        "customVocabulary": custom_vocabulary,
        "customInstructions": custom_instructions,
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
        "postprocessModel": s.postprocess_model,
        "customVocabulary": s.custom_vocabulary,
        "customInstructions": s.custom_instructions,
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
    if ["prose", "email", "code", "auto"].contains(&mode.as_str()) {
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
    // #[cfg(target_os = "linux")]
    // {
    //     // Force GDK to use X11 so that window positioning and transparency rules work correctly on Wayland sessions
    //     if std::env::var("GDK_BACKEND").is_err() {
    //         std::env::set_var("GDK_BACKEND", "x11");
    //     }
    // }

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
        custom_vocabulary: "".to_string(),
        custom_instructions: "".to_string(),
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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
                    if let Some(v) = json["postprocessModel"].as_str() { s.postprocess_model = v.to_string(); }
                    if let Some(v) = json["outputMode"].as_str() { s.output_mode  = v.to_string(); }
                    if let Some(v) = json["customVocabulary"].as_str() { s.custom_vocabulary = v.to_string(); }
                    if let Some(v) = json["customInstructions"].as_str() { s.custom_instructions = v.to_string(); }
                }
            }

            let app_handle = app.handle().clone();
            let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<HotkeyEvent>();
            let cmd_tx = tx.clone();

            let ollama_process: Arc<Mutex<Option<std::process::Child>>> =
                Arc::new(Mutex::new(None));
            let whisper_process: Arc<Mutex<Option<std::process::Child>>> =
                Arc::new(Mutex::new(None));

            app.manage(AppState {
                settings: settings.clone(),
                db: db.clone(),
                hotkey_tx: cmd_tx,
                settings_path: settings_file.clone(),
                ollama_process: ollama_process.clone(),
                whisper_process: whisper_process.clone(),
            });

            // Start the persistent Whisper transcription server
            let whisper_server_path = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.join("sidecar").join("whisper_server.py")))
                .unwrap_or_else(|| std::path::PathBuf::from("sidecar/whisper_server.py"));

            let python_cmd_clone = settings.lock().unwrap().python_cmd.clone();
            let whisper_process_clone = whisper_process.clone();

            std::thread::spawn(move || {
                eprintln!("[whisper_server] spawning persistent server: {} {}", python_cmd_clone, whisper_server_path.display());
                match std::process::Command::new(&python_cmd_clone)
                    .arg(&whisper_server_path)
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .spawn()
                {
                    Ok(child) => {
                        *whisper_process_clone.lock().unwrap() = Some(child);
                        eprintln!("[whisper_server] server spawned successfully.");
                    }
                    Err(e) => {
                        eprintln!("[whisper_server] failed to spawn server: {e}");
                    }
                }
            });

            #[cfg(target_os = "linux")]
            std::thread::spawn(move || hotkey::start_listener(tx));

            #[cfg(target_os = "windows")]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
                let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
                app.handle().global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                    match event.state() {
                        ShortcutState::Pressed  => { let _ = tx.send(HotkeyEvent::Start); }
                        ShortcutState::Released => { let _ = tx.send(HotkeyEvent::Stop); }
                    }
                })?;
            }
            tauri::async_runtime::spawn(coordinator(rx, app_handle.clone(), settings, db.clone()));
            let db_for_setup = db.clone();
            let app_for_setup = app_handle.clone();
            let proc_for_setup = ollama_process.clone();
            tauri::async_runtime::spawn(setup::check_and_setup(app_for_setup, db_for_setup, proc_for_setup));

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
                    "quit" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            if let Ok(mut guard) = state.ollama_process.lock() {
                                if let Some(child) = guard.as_mut() {
                                    child.kill().ok();
                                }
                            }
                            if let Ok(mut guard) = state.whisper_process.lock() {
                                if let Some(child) = guard.as_mut() {
                                    child.kill().ok();
                                }
                            }
                        }
                        app.exit(0);
                    }
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
