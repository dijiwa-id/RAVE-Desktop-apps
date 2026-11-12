//! RAVE Desktop — inti native sengaja tipis: UI & logika ada di frontend (React), Rust hanya menyediakan
//! jendela, satu instance, penyimpanan ukuran/posisi jendela, membuka tautan eksternal, dan tombol media global.

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Satu instance: membuka aplikasi lagi memfokuskan jendela yang sudah ada (bukan pemutar kedua yang bersuara ganda).
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("gagal menjalankan RAVE Desktop");
}
