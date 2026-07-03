#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_project_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Narrium desktop shell");
}

#[tauri::command]
fn read_text_file(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path).map_err(|error| {
        format!("Failed to read {}: {}", file_path, error)
    })
}

#[tauri::command]
fn write_project_file(folder_path: String, file_name: String, contents: String) -> Result<String, String> {
    let project_file_path = std::path::Path::new(&folder_path).join(file_name);

    std::fs::create_dir_all(&folder_path).map_err(|error| {
        format!("Failed to create {}: {}", folder_path, error)
    })?;

    std::fs::write(&project_file_path, contents).map_err(|error| {
        format!("Failed to write {}: {}", project_file_path.display(), error)
    })?;

    Ok(project_file_path.to_string_lossy().to_string())
}
