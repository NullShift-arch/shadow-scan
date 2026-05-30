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
            shadow_scan_lib::commands::network::resolve_hostname,
            shadow_scan_lib::commands::network::start_dns_enrichment,
            shadow_scan_lib::commands::network::re_classify_connection,
            shadow_scan_lib::commands::network::archive_connection,
            shadow_scan_lib::commands::services::get_services,
            shadow_scan_lib::commands::services::stop_service_cmd,
            shadow_scan_lib::commands::services::start_service_cmd,
            shadow_scan_lib::commands::services::disable_service_cmd,
            shadow_scan_lib::commands::services::enable_service_cmd,
            shadow_scan_lib::commands::firewall::block_ip_cmd,
            shadow_scan_lib::commands::firewall::unblock_ip_cmd,
            shadow_scan_lib::commands::firewall::is_ip_blocked_cmd,
            shadow_scan_lib::commands::firewall::list_blocked_ips_cmd,
            shadow_scan_lib::commands::audit::run_audit_cmd,
            shadow_scan_lib::commands::audit::get_audit_history,
            shadow_scan_lib::commands::audit::get_kill_switch_log,
            shadow_scan_lib::commands::audit::restore_all_kills,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
