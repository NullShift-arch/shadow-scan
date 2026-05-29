// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            shadow_scan_lib::commands::system::get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
