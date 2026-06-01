use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewWindow,
};

#[tauri::command]
fn apply_window_icon(window: WebviewWindow) -> Result<(), String> {
    let icon = window
        .app_handle()
        .default_window_icon()
        .ok_or("앱 아이콘을 찾을 수 없습니다.")?
        .clone();
    window.set_icon(icon).map_err(|e| e.to_string())
}

fn apply_icon_to_all_windows(app: &tauri::AppHandle) {
    let Some(icon) = app.default_window_icon() else {
        return;
    };
    for (_, window) in app.webview_windows() {
        let _ = window.set_icon(icon.clone());
    }
}
use tauri_plugin_sql::{Migration, MigrationKind};

const DB_URL: &str = "sqlite:bookmark.db";

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

// 스키마 마이그레이션. 버전은 고유해야 하며 순서대로 적용된다.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_notes_and_settings",
        sql: "
            CREATE TABLE IF NOT EXISTS notes (
                id               TEXT PRIMARY KEY,
                title            TEXT NOT NULL DEFAULT '',
                content          TEXT NOT NULL DEFAULT '',
                content_text     TEXT NOT NULL DEFAULT '',
                note_date        TEXT NOT NULL,
                created_at       TEXT NOT NULL,
                updated_at       TEXT NOT NULL,
                importance       TEXT NOT NULL DEFAULT 'normal',
                show_as_bookmark INTEGER NOT NULL DEFAULT 0,
                bookmark_order   INTEGER,
                color            TEXT NOT NULL,
                opacity          REAL NOT NULL DEFAULT 1,
                panel_width      INTEGER NOT NULL DEFAULT 420,
                is_panel_pinned  INTEGER NOT NULL DEFAULT 0,
                is_archived      INTEGER NOT NULL DEFAULT 0,
                deleted_at       TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_notes_note_date ON notes(note_date);
            CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_notes_bookmark ON notes(show_as_bookmark, bookmark_order);

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        ",
        kind: MigrationKind::Up,
    }]
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "열기", true, None::<&str>)?;
    let new_i = MenuItem::with_id(app, "new", "새 메모", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &new_i, &quit_i])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Bookmark")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "new" => {
                show_main(app);
                let _ = app.emit("tray-new-note", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![apply_window_icon])
        .setup(|app| {
            setup_tray(app)?;
            apply_icon_to_all_windows(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
