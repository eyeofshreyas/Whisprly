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
#[cfg(target_os = "linux")]
mod shortcut_wayland;

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
    pub postprocess_model: String,
    pub output_mode: String,
    pub language: String,
    pub custom_vocabulary: String,
    pub custom_instructions: String,
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

                    let s = match settings.lock() {
                        Ok(guard) => guard.clone(),
                        Err(e) => {
                            eprintln!("[coordinator] settings mutex poisoned: {e}");
                            emit_status(&app, "idle", Some("Internal error".into()));
                            hide_overlay(&app);
                            continue;
                        }
                    };
                    let language = transcribe::language_param(&s.language);
                    let wav = audio::to_wav_from_samples(combined_samples);

                    // Build Whisper initial_prompt: previous transcript context first (so the
                    // model sees what was just said), then a natural-prose Hinglish seed block
                    // (Whisper treats the prompt as preceding speech — word lists perform poorly),
                    // then custom vocabulary terms. Total kept under 850 chars (~224 tokens).
                    let final_prompt = {
                        let mut prompt_content = String::new();
                        let custom_vocab = s.custom_vocabulary.trim();
                        let wants_hinglish = matches!(s.language.as_str(), "hi" | "auto" | "en");

                        // 1. Previous transcript as conversational context (up to 600 chars)
                        let last_tx = {
                            let conn = db.lock().unwrap_or_else(|e| e.into_inner());
                            db::get_transcripts(&conn, 1)
                                .ok()
                                .and_then(|list| list.first().map(|entry| entry.text.clone()))
                        };
                        if let Some(prev) = last_tx {
                            let prev_trimmed: String = prev.chars().take(600).collect();
                            prompt_content.push_str(&prev_trimmed);
                            prompt_content.push('\n');
                        }

                        // 2. Hinglish natural-prose seed with expanded vocabulary
                        if wants_hinglish {
                            prompt_content.push_str("The speaker uses Hinglish, mixing Hindi and English naturally. Common words: aap, mein, hain, karta, nahi, lekin, toh, bhi, tha, raha, kyunki, matlab, theek, haan, yaar, baat, kuch, woh, isko, usse, phir, abhi, agar, sirf, accha, bilkul, zaroor, bahut, kabhi, kaafi, sahi, seedha, seedhi, chalte, chalo, dekho, suno, lagta, lagti, rehna, rehte, karna, pata, samjha, mila, gaya, aaya, liya, diya, kiya, hua, hui, hue, sab, koi, kya, hai, ho.");
                            if !custom_vocab.is_empty() {
                                prompt_content.push(' ');
                                prompt_content.push_str(custom_vocab);
                                prompt_content.push('.');
                            }
                        } else if !custom_vocab.is_empty() {
                            prompt_content.push_str(custom_vocab);
                            prompt_content.push('.');
                        }

                        if prompt_content.trim().is_empty() {
                            None
                        } else {
                            // Enforce Whisper prompt limit (~224 tokens ≈ 850 chars safe margin)
                            let char_limit = 850;
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
                            match transcribe::local(&wav, "", "", language.clone(), final_prompt.clone()).await {
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
                        // Spawn blocking so xdotool/xprop can't hang the coordinator.
                        let win_title = tokio::time::timeout(
                            std::time::Duration::from_secs(2),
                            tokio::task::spawn_blocking(platform::get_active_window_title),
                        )
                        .await
                        .ok()
                        .and_then(|r| r.ok())
                        .flatten();
                        if let Some(win_title) = win_title {
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
                        "",
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

                    let mut db_entry = db::TranscriptEntry {
                        id: 0,
                        text: polished,
                        raw_text: Some(raw_text),
                        engine: used_engine.clone(),
                        mode: resolved_mode.clone(),
                        language: language.clone(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    };
                    {
                        let conn = db.lock().unwrap_or_else(|e| e.into_inner());
                        match db::insert_transcript(&conn, &db_entry) {
                            Ok(inserted_id) => {
                                db_entry.id = inserted_id;
                            }
                            Err(e) => {
                                eprintln!("Failed to save transcript to DB: {e}");
                            }
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
    language: String,
    postprocess_model: String,
    custom_vocabulary: String,
    custom_instructions: String,
) -> Result<(), String> {
    let (path, output_mode) = {
        let mut s = state.settings.lock().map_err(|e| e.to_string())?;
        s.groq_api_key        = groq_api_key.clone();
        s.language            = language.clone();
        s.postprocess_model   = postprocess_model.clone();
        s.custom_vocabulary   = custom_vocabulary.clone();
        s.custom_instructions = custom_instructions.clone();
        (state.settings_path.clone(), s.output_mode.clone())
    };
    let json = serde_json::json!({
        "groqApiKey":         groq_api_key,
        "language":           language,
        "postprocessModel":   postprocess_model,
        "outputMode":         output_mode,
        "customVocabulary":   custom_vocabulary,
        "customInstructions": custom_instructions,
    });
    std::fs::write(&path, json.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let s = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "groqApiKey": s.groq_api_key,
        "language": s.language,
        "postprocessModel": s.postprocess_model,
        "customVocabulary": s.custom_vocabulary,
        "customInstructions": s.custom_instructions,
    }))
}

#[tauri::command]
fn get_transcript_log(state: tauri::State<'_, AppState>) -> Vec<db::TranscriptEntry> {
    let conn = match state.db.lock() {
        Ok(g) => g,
        Err(e) => {
            eprintln!("[get_transcript_log] db mutex poisoned: {e}");
            return vec![];
        }
    };
    db::get_transcripts(&conn, 200).unwrap_or_default()
}

#[tauri::command]
fn search_transcripts(query: String, state: tauri::State<'_, AppState>) -> Vec<db::TranscriptEntry> {
    let conn = match state.db.lock() {
        Ok(g) => g,
        Err(e) => { eprintln!("search_transcripts: db mutex poisoned: {e}"); return vec![]; }
    };
    db::search_transcripts(&conn, &query).unwrap_or_default()
}

#[tauri::command]
fn clear_all_db_transcripts(state: tauri::State<'_, AppState>) {
    let conn = match state.db.lock() {
        Ok(g) => g,
        Err(e) => { eprintln!("clear_all_db_transcripts: db mutex poisoned: {e}"); return; }
    };
    if let Err(e) = db::clear_all_transcripts(&conn) {
        eprintln!("Failed to clear DB transcripts: {e}");
    }
}

#[tauri::command]
fn get_output_mode(state: tauri::State<'_, AppState>) -> String {
    state.settings.lock().map(|s| s.output_mode.clone()).unwrap_or_default()
}

#[tauri::command]
fn set_output_mode(state: tauri::State<'_, AppState>, mode: String) -> Result<(), String> {
    if ["prose", "email", "code", "auto"].contains(&mode.as_str()) {
        let s = {
            let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
            settings.output_mode = mode;
            settings.clone()
        };
        let json = serde_json::json!({
            "groqApiKey":         s.groq_api_key,
            "language":           s.language,
            "outputMode":         s.output_mode,
            "postprocessModel":   s.postprocess_model,
            "customVocabulary":   s.custom_vocabulary,
            "customInstructions": s.custom_instructions,
        });
        std::fs::write(&state.settings_path, json.to_string()).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("invalid mode: {mode}"))
    }
}

#[tauri::command]
fn delete_transcript(id: i64, state: tauri::State<'_, AppState>) {
    let conn = match state.db.lock() {
        Ok(g) => g,
        Err(e) => { eprintln!("delete_transcript: db mutex poisoned: {e}"); return; }
    };
    if let Err(e) = db::delete_transcript(&conn, id) {
        eprintln!("Failed to delete transcript {id}: {e}");
    }
}

#[tauri::command]
fn update_transcript(id: i64, text: String, state: tauri::State<'_, AppState>) {
    let conn = match state.db.lock() {
        Ok(g) => g,
        Err(e) => { eprintln!("update_transcript: db mutex poisoned: {e}"); return; }
    };
    if let Err(e) = db::update_transcript(&conn, id, &text) {
        eprintln!("Failed to update transcript {id}: {e}");
    }
}

#[tauri::command]
async fn trigger_auto_type(text: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        auto_type::type_text(&text)
    })
    .await
    .map_err(|e| e.to_string())
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

    let settings = Arc::new(Mutex::new(AppSettings {
        groq_api_key,
        postprocess_model: "llama-3.1-8b-instant".to_string(),
        output_mode: "prose".to_string(),
        language: "auto".to_string(),
        custom_vocabulary: "".to_string(),
        custom_instructions: "".to_string(),
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
                    let mut s = settings.lock().unwrap_or_else(|e| e.into_inner());
                    if let Some(v) = json["groqApiKey"].as_str() { s.groq_api_key = v.to_string(); }
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

            app.manage(AppState {
                settings: settings.clone(),
                db: db.clone(),
                hotkey_tx: cmd_tx,
                settings_path: settings_file.clone(),
            });

            #[cfg(target_os = "linux")]
            {
                // On native Wayland use the XDG global-shortcuts portal (no `input` group needed).
                // On X11 / XWayland fall back to the evdev listener.
                if !std::env::var("WAYLAND_DISPLAY").unwrap_or_default().is_empty() {
                    tauri::async_runtime::spawn(shortcut_wayland::register(tx));
                } else {
                    std::thread::spawn(move || hotkey::start_listener(tx));
                }
            }
            #[cfg(target_os = "windows")]
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
                    "quit" => {
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

            // Set the window icon explicitly so Linux dock/taskbar picks it up.
            // The tray uses default_window_icon() but the dock reads the window's own icon.
            if let Some(w) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon() {
                    let _ = w.set_icon(icon.clone());
                }
            }

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
            update_transcript,
            trigger_auto_type,
            stop_recording,
            oauth::start_google_oauth,
            get_output_mode,
            set_output_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
