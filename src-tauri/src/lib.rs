#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            confirm_unsaved_changes,
            read_project_file,
            write_project_file,
            import_background_asset_file,
            resolve_local_asset_file,
            copy_local_asset_for_project_save_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running Narrium desktop shell");
}

#[tauri::command]
async fn confirm_unsaved_changes(
    app: tauri::AppHandle,
    project_name: String,
) -> Result<String, String> {
    use tauri_plugin_dialog::{
        DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult,
    };

    tauri::async_runtime::spawn_blocking(move || {
        let save_result = app
            .dialog()
            .message(format!(
                "Save changes to \"{}\" before continuing?",
                project_name
            ))
            .title("Unsaved Changes")
            .kind(MessageDialogKind::Warning)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Save".to_string(),
                "Don't Save".to_string(),
            ))
            .blocking_show_with_result();

        let should_save = match save_result {
            MessageDialogResult::Ok => true,
            MessageDialogResult::Custom(value) => value == "Save",
            _ => false,
        };

        if should_save {
            return "save".to_string();
        }

        let discard_result = app
            .dialog()
            .message(format!("Discard unsaved changes to \"{}\"?", project_name))
            .title("Unsaved Changes")
            .kind(MessageDialogKind::Warning)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Don't Save".to_string(),
                "Cancel".to_string(),
            ))
            .blocking_show_with_result();

        let should_discard = match discard_result {
            MessageDialogResult::Ok => true,
            MessageDialogResult::Custom(value) => value == "Don't Save",
            _ => false,
        };

        if should_discard {
            "discard".to_string()
        } else {
            "cancel".to_string()
        }
    })
    .await
    .map_err(|error| format!("Could not confirm unsaved changes: {}", error))
}

#[tauri::command]
fn read_project_file(file_path: String) -> Result<(String, String), String> {
    let project_file_path = std::path::Path::new(&file_path);
    let contents = std::fs::read_to_string(&project_file_path).map_err(|error| {
        format!("Failed to read {}: {}", project_file_path.display(), error)
    })?;

    Ok((project_file_path.to_string_lossy().to_string(), contents))
}

#[tauri::command]
fn write_project_file(file_path: String, contents: String) -> Result<String, String> {
    let project_file_path = std::path::Path::new(&file_path);

    if let Some(parent_path) = project_file_path.parent() {
        std::fs::create_dir_all(parent_path).map_err(|error| {
            format!("Failed to create {}: {}", parent_path.display(), error)
        })?;
    }

    std::fs::write(&project_file_path, contents).map_err(|error| {
        format!("Failed to write {}: {}", project_file_path.display(), error)
    })?;

    Ok(project_file_path.to_string_lossy().to_string())
}

fn project_dir_from_file_path(file_path: &str) -> Result<std::path::PathBuf, String> {
    let project_file_path = std::path::Path::new(file_path);
    let parent_path = project_file_path
        .parent()
        .ok_or_else(|| "Project file must have a parent directory.".to_string())?;

    parent_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve project directory: {}", error))
}

fn ensure_relative_asset_path(relative_path: &str) -> Result<std::path::PathBuf, String> {
    let path = std::path::Path::new(relative_path);

    if path.is_absolute() {
        return Err("Local asset path must be project-relative.".to_string());
    }

    if path.components().any(|component| {
        matches!(
            component,
            std::path::Component::ParentDir
                | std::path::Component::RootDir
                | std::path::Component::Prefix(_)
        )
    }) {
        return Err("Local asset path cannot escape the project directory.".to_string());
    }

    let normalized = path
        .components()
        .filter_map(|component| match component {
            std::path::Component::Normal(value) => Some(value),
            std::path::Component::CurDir => None,
            _ => None,
        })
        .collect::<std::path::PathBuf>();

    if normalized.as_os_str().is_empty() {
        return Err("Local asset path cannot be empty.".to_string());
    }

    Ok(normalized)
}

fn safe_background_extension(path: &std::path::Path) -> Result<&'static str, String> {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => Ok("png"),
        Some("jpg") => Ok("jpg"),
        Some("jpeg") => Ok("jpeg"),
        Some("webp") => Ok("webp"),
        _ => Err("Unsupported background image format. Use PNG, JPG, JPEG, or WEBP.".to_string()),
    }
}

fn mime_type_for_extension(extension: &str) -> &'static str {
    match extension {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn sanitize_file_stem(path: &std::path::Path) -> String {
    let raw_stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("background");
    let mut output = String::new();
    let mut last_was_dash = false;

    for character in raw_stem.chars() {
        let next_character = if character.is_ascii_alphanumeric() {
            Some(character.to_ascii_lowercase())
        } else if character == '-' || character == '_' {
            Some(character)
        } else if character.is_ascii_whitespace() || character == '.' {
            Some('-')
        } else {
            None
        };

        if let Some(next_character) = next_character {
            if next_character == '-' {
                if last_was_dash {
                    continue;
                }
                last_was_dash = true;
            } else {
                last_was_dash = false;
            }
            output.push(next_character);
        }
    }

    let trimmed = output.trim_matches('-').to_string();

    if trimmed.is_empty() {
        "background".to_string()
    } else {
        trimmed
    }
}

fn unique_background_destination(
    backgrounds_dir: &std::path::Path,
    stem: &str,
    extension: &str,
) -> std::path::PathBuf {
    let mut candidate = backgrounds_dir.join(format!("{}.{}", stem, extension));

    if !candidate.exists() {
        return candidate;
    }

    let mut suffix = 2;

    loop {
        candidate = backgrounds_dir.join(format!("{}-{}.{}", stem, suffix, extension));

        if !candidate.exists() {
            return candidate;
        }

        suffix += 1;
    }
}

fn relative_path_with_forward_slashes(path: &std::path::Path) -> String {
    path.components()
        .filter_map(|component| match component {
            std::path::Component::Normal(value) => value.to_str(),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/")
}

#[tauri::command]
fn import_background_asset_file(
    project_file_path: String,
    source_file_path: String,
) -> Result<(String, String, String, u64), String> {
    let project_dir = project_dir_from_file_path(&project_file_path)?;
    let source_path = std::path::Path::new(&source_file_path)
        .canonicalize()
        .map_err(|error| format!("Failed to read selected image: {}", error))?;

    if !source_path.is_file() {
        return Err("Selected background image is not a file.".to_string());
    }

    let extension = safe_background_extension(&source_path)?;
    let metadata = std::fs::metadata(&source_path)
        .map_err(|error| format!("Failed to read selected image metadata: {}", error))?;
    let backgrounds_dir = project_dir.join("assets").join("backgrounds");

    std::fs::create_dir_all(&backgrounds_dir).map_err(|error| {
        format!(
            "Failed to create background asset directory {}: {}",
            backgrounds_dir.display(),
            error
        )
    })?;

    let stem = sanitize_file_stem(&source_path);
    let destination_path = unique_background_destination(&backgrounds_dir, &stem, extension);

    std::fs::copy(&source_path, &destination_path).map_err(|error| {
        format!(
            "Failed to copy background image to {}: {}",
            destination_path.display(),
            error
        )
    })?;

    let relative_path = std::path::Path::new("assets")
        .join("backgrounds")
        .join(destination_path.file_name().ok_or_else(|| {
            "Failed to determine copied background file name.".to_string()
        })?);

    Ok((
        source_path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("Background")
            .to_string(),
        relative_path_with_forward_slashes(&relative_path),
        mime_type_for_extension(extension).to_string(),
        metadata.len(),
    ))
}

#[tauri::command]
fn resolve_local_asset_file(project_file_path: String, relative_path: String) -> Result<String, String> {
    let project_dir = project_dir_from_file_path(&project_file_path)?;
    let asset_relative_path = ensure_relative_asset_path(&relative_path)?;
    let asset_path = project_dir.join(asset_relative_path);
    let asset_path = asset_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve local asset: {}", error))?;

    if !asset_path.starts_with(&project_dir) {
        return Err("Local asset path escapes the project directory.".to_string());
    }

    if !asset_path.is_file() {
        return Err("Local asset file is missing.".to_string());
    }

    Ok(asset_path.to_string_lossy().to_string())
}

#[tauri::command]
fn copy_local_asset_for_project_save_as(
    source_project_file_path: String,
    destination_project_file_path: String,
    relative_path: String,
) -> Result<(), String> {
    let source_project_dir = project_dir_from_file_path(&source_project_file_path)?;
    let destination_project_file = std::path::Path::new(&destination_project_file_path);
    let destination_project_dir = destination_project_file
        .parent()
        .ok_or_else(|| "Destination project file must have a parent directory.".to_string())?;

    std::fs::create_dir_all(destination_project_dir).map_err(|error| {
        format!(
            "Failed to create destination project directory {}: {}",
            destination_project_dir.display(),
            error
        )
    })?;

    let destination_project_dir = destination_project_dir
        .canonicalize()
        .map_err(|error| format!("Failed to resolve destination project directory: {}", error))?;
    let asset_relative_path = ensure_relative_asset_path(&relative_path)?;
    let source_asset_path = source_project_dir.join(&asset_relative_path);
    let source_asset_path = source_asset_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve local asset for Save As: {}", error))?;

    if !source_asset_path.starts_with(&source_project_dir) {
        return Err("Local asset path escapes the source project directory.".to_string());
    }

    if !source_asset_path.is_file() {
        return Err("Local asset file is missing and cannot be copied for Save As.".to_string());
    }

    let destination_asset_path = destination_project_dir.join(asset_relative_path);

    if !destination_asset_path.starts_with(&destination_project_dir) {
        return Err("Local asset path escapes the destination project directory.".to_string());
    }

    if let Some(parent_path) = destination_asset_path.parent() {
        std::fs::create_dir_all(parent_path).map_err(|error| {
            format!(
                "Failed to create destination asset directory {}: {}",
                parent_path.display(),
                error
            )
        })?;
    }

    std::fs::copy(&source_asset_path, &destination_asset_path).map_err(|error| {
        format!(
            "Failed to copy local asset to {}: {}",
            destination_asset_path.display(),
            error
        )
    })?;

    Ok(())
}
