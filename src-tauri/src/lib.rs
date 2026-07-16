// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod models;
mod routes;
mod commands;

use db::AppDb;
use commands::DbState;
use std::path::PathBuf;
use warp::Filter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Store the database outside the project workspace to prevent Git/VS Code
    // from holding file handles that interfere with sled's exclusive file lock.
    let data_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("cas-lang-desktop");
    std::fs::create_dir_all(&data_dir).ok();
    let db_path = data_dir.join("cas_lang_data");

    println!("Database path: {:?}", db_path);
    let db = AppDb::open(db_path).expect("Failed to open database after recovery attempts");
    let db = std::sync::Arc::new(db);
    let db_for_state = db.clone();

    // Start the warp HTTP server on port 3030 (for external/mobile app access)
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type", "Authorization"]);

    let api_routes = routes::all_routes(db)
        .or(warp::path!("api" / "test")
            .and(warp::get())
            .map(|| warp::reply::with_status("test success", warp::http::StatusCode::OK)))
        .with(cors);

    tauri::async_runtime::spawn(async move {
        println!("External API server running on http://0.0.0.0:3030");
        warp::serve(api_routes).run(([0, 0, 0, 0], 3030)).await;
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(db_for_state))
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::get_vocabulary,
            commands::create_vocabulary,
            commands::update_vocabulary,
            commands::update_vocabulary_stats,
            commands::delete_vocabulary,
            commands::get_exercises,
            commands::create_exercise,
            commands::delete_exercise,
            commands::get_tags,
            commands::add_tag,
            commands::delete_tag,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}