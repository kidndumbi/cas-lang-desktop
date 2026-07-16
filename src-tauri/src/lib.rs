// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod models;
mod routes;

use db::AppDb;
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
    // Open the database with self-healing recovery (handles stale locks from crashes)
    let db = AppDb::open(db_path).expect("Failed to open database after recovery attempts");
    let db = std::sync::Arc::new(db);

    // Start the warp HTTP server with all routes
    let api_routes = routes::all_routes(db.clone())
        .or(warp::path!("api" / "test")
            .and(warp::get())
            .map(|| warp::reply::with_status("test success", warp::http::StatusCode::OK)));

    tauri::async_runtime::spawn(async move {
        println!("Cas-Lang API server running on http://0.0.0.0:3030");
        warp::serve(api_routes).run(([0, 0, 0, 0], 3030)).await;
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

