// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod db;
mod models;
mod routes;

use commands::DbState;
use db::AppDb;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};
use warp::Filter;

const DEFAULT_API_PORT: u16 = 3030;

pub struct PortState {
    pub port: Mutex<u16>,
    pub port_file: PathBuf,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_api_port(port_state: State<PortState>) -> u16 {
    *port_state.port.lock().unwrap()
}

#[tauri::command]
fn save_api_port(new_port: u16, port_state: State<PortState>) -> Result<String, String> {
    // Validate range
    if new_port < 1024 || new_port > 65535 {
        return Err("Port must be between 1024 and 65535".to_string());
    }

    // Check if port is available
    let listener =
        std::net::TcpListener::bind(("0.0.0.0", new_port))
            .map_err(|_| format!("Port {} is already in use or unavailable.", new_port))?;
    drop(listener); // Release immediately

    // Save to file
    std::fs::write(&port_state.port_file, new_port.to_string())
        .map_err(|e| format!("Failed to save port: {}", e))?;

    // Update in-memory state
    *port_state.port.lock().unwrap() = new_port;

    Ok(format!("Port {} saved. An app restart is required for the change to take effect.", new_port))
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    std::process::Command::new(&exe).spawn().map_err(|e| e.to_string())?;
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("cas-lang-desktop");
    std::fs::create_dir_all(&data_dir).ok();
    let db_path = data_dir.join("cas_lang_data");
    let port_file = data_dir.join("api_port.txt");

    // Read port from config file, default to 3030
    let port = std::fs::read_to_string(&port_file)
        .ok()
        .and_then(|s| s.trim().parse::<u16>().ok())
        .unwrap_or(DEFAULT_API_PORT);

    println!("DB path: {:?}", db_path);

    let db = AppDb::open(db_path).expect("DB open failed");
    let db = std::sync::Arc::new(db);
    let db_for_state = db.clone();

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
        .allow_headers(vec!["content-type", "authorization", "accept", "origin", "x-requested-with", "cache-control"])
        .max_age(3600)
        .build();

    // Catch-all OPTIONS handler: responds to every preflight immediately with CORS headers.
    // This ensures PATCH/DELETE preflights are never blocked regardless of route matching.
    let cors_preflight = warp::options().map(|| {
        warp::http::Response::builder()
            .status(200)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
            .header("Access-Control-Allow-Headers", "content-type, authorization, accept, origin, x-requested-with, cache-control")
            .header("Access-Control-Max-Age", "3600")
            .body("")
            .unwrap()
    });

    let api_routes = cors_preflight
        .or(routes::all_routes(db))
        .or(warp::path!("api")
            .and(warp::get())
            .map(|| warp::reply::with_status("ok", warp::http::StatusCode::OK)))
        .or(warp::path!("api" / "test")
            .and(warp::get())
            .map(|| warp::reply::with_status("test success", warp::http::StatusCode::OK)))
        .with(cors);

    tauri::async_runtime::spawn(async move {
        println!("Warp API → 0.0.0.0:{}", port);
        warp::serve(api_routes).run(([0, 0, 0, 0], port)).await;
    });

    let port_state = PortState {
        port: Mutex::new(port),
        port_file,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(db_for_state))
        .manage(port_state)
        .setup(|app| {
            let show_item = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).item(&show_item).item(&quit_item).build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
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
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                })
                .build(app)?;

            // Minimize to tray instead of closing
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    window_clone.hide().ok();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_api_port,
            save_api_port,
            restart_app,
            commands::get_vocabulary,
            commands::create_vocabulary,
            commands::update_vocabulary,
            commands::update_vocabulary_stats,
            commands::delete_vocabulary,
            commands::get_exercises,
            commands::create_exercise,
            commands::update_exercise,
            commands::update_exercise_stats,
            commands::delete_exercise,
            commands::get_tags,
            commands::add_tag,
            commands::delete_tag,
            commands::get_tenses,
            commands::save_tenses,
            commands::get_vocabulary_session_logs,
            commands::get_exercise_session_logs,
            commands::get_vocabulary_logs,
            commands::get_exercise_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}