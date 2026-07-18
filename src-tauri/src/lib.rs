// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod db;
mod models;
mod routes;

use commands::DbState;
use db::AppDb;
use std::path::PathBuf;
use warp::Filter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("cas-lang-desktop");
    std::fs::create_dir_all(&data_dir).ok();
    let db_path = data_dir.join("cas_lang_data");
    println!("DB path: {:?}", db_path);

    let db = AppDb::open(db_path).expect("DB open failed");
    let db = std::sync::Arc::new(db);
    let db_for_state = db.clone();

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
        .allow_headers(vec!["*"])
        .build();

    let api_routes = routes::all_routes(db)
        .or(warp::path!("api")
            .and(warp::get())
            .map(|| warp::reply::with_status("ok", warp::http::StatusCode::OK)))
        .or(warp::path!("api" / "test")
            .and(warp::get())
            .map(|| warp::reply::with_status("test success", warp::http::StatusCode::OK)))
        .with(cors);

    tauri::async_runtime::spawn(async move {
        println!("Warp API → 0.0.0.0:3030");
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}