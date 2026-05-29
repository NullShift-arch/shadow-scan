// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            use tauri::Manager;
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");
            tauri::async_runtime::block_on(async {
                shadow_scan_lib::db::schema::init_database(&app_dir)
                    .await
                    .expect("DB init failed");
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            shadow_scan_lib::commands::system::get_system_info,
            shadow_scan_lib::commands::network::get_connections,
            shadow_scan_lib::commands::network::start_connection_monitor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
