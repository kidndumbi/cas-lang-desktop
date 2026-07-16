// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use warp::Filter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start the warp HTTP server in a background task for the test CRUD endpoint
    tauri::async_runtime::spawn(async {
        let test_route = warp::path!("api" / "test")
            .and(warp::get())
            .map(|| warp::reply::with_status("test success", warp::http::StatusCode::OK));

        println!("Test CRUD server running on http://0.0.0.0:3030");
        warp::serve(test_route).run(([0, 0, 0, 0], 3030)).await;
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
