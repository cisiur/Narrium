#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_project_file,
            write_project_file,
            copy_background_image_to_project,
            resolve_project_asset_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Narrium desktop shell");
}

#[tauri::command]
fn read_project_file(folder_path: String, file_name: String) -> Result<(String, String), String> {
    let project_file_path = std::path::Path::new(&folder_path).join(file_name);
    let contents = std::fs::read_to_string(&project_file_path).map_err(|error| {
        format!("Failed to read {}: {}", project_file_path.display(), error)
    })?;

    Ok((project_file_path.to_string_lossy().to_string(), contents))
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

fn is_allowed_background_extension(extension: &str) -> bool {
    matches!(
        extension.to_ascii_lowercase().as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "gif"
    )
}

fn sanitize_file_stem(stem: &str) -> String {
    let sanitized: String = stem
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();

    let collapsed = sanitized
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    if collapsed.is_empty() {
        "background".to_string()
    } else {
        collapsed
    }
}

#[tauri::command]
fn copy_background_image_to_project(
    folder_path: String,
    source_file_path: String,
) -> Result<(String, String, String), String> {
    let source_path = std::path::Path::new(&source_file_path);
    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Selected background image has no file extension.".to_string())?;

    if !is_allowed_background_extension(extension) {
        return Err("Selected file is not a supported background image.".to_string());
    }

    let stem = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("background");
    let safe_stem = sanitize_file_stem(stem);
    let safe_extension = extension.to_ascii_lowercase();
    let asset_folder = std::path::Path::new(&folder_path)
        .join("assets")
        .join("backgrounds");

    std::fs::create_dir_all(&asset_folder).map_err(|error| {
        format!("Failed to create {}: {}", asset_folder.display(), error)
    })?;

    let mut candidate_name = format!("{}.{}", safe_stem, safe_extension);
    let mut destination_path = asset_folder.join(&candidate_name);
    let mut suffix = 2;

    while destination_path.exists() {
        candidate_name = format!("{}-{}.{}", safe_stem, suffix, safe_extension);
        destination_path = asset_folder.join(&candidate_name);
        suffix += 1;
    }

    std::fs::copy(source_path, &destination_path).map_err(|error| {
        format!(
            "Failed to copy {} to {}: {}",
            source_path.display(),
            destination_path.display(),
            error
        )
    })?;

    let relative_path = format!("assets/backgrounds/{}", candidate_name);

    Ok((
        relative_path,
        destination_path.to_string_lossy().to_string(),
        candidate_name,
    ))
}

#[tauri::command]
fn resolve_project_asset_path(folder_path: String, relative_path: String) -> Result<String, String> {
    let normalized_relative_path = relative_path.replace('\\', "/");

    if normalized_relative_path.starts_with('/')
        || normalized_relative_path
            .split('/')
            .any(|segment| segment.is_empty() || segment == "..")
    {
        return Err("Project asset path must be relative to the project folder.".to_string());
    }

    let asset_path = normalized_relative_path
        .split('/')
        .fold(std::path::PathBuf::from(folder_path), |path, segment| path.join(segment));

    Ok(asset_path.to_string_lossy().to_string())
}
