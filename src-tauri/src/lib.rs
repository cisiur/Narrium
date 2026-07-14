use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            confirm_unsaved_changes,
            read_app_preferences_file,
            write_app_preferences_file,
            read_project_file,
            write_project_file,
            write_json_export_file,
            import_background_asset_file,
            resolve_local_asset_file,
            copy_local_asset_for_project_save_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running Narrium desktop shell");
}

const MAX_PROJECT_FILE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_BACKGROUND_IMAGE_BYTES: u64 = 15 * 1024 * 1024;
const APP_PREFERENCES_FILE_NAME: &str = "preferences.json";

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

fn app_preferences_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve application data directory: {}", error))?;

    Ok(app_data_dir.join(APP_PREFERENCES_FILE_NAME))
}

#[tauri::command]
fn read_app_preferences_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let preferences_path = app_preferences_file_path(&app)?;

    if !preferences_path.exists() {
        return Ok(None);
    }

    if !preferences_path.is_file() {
        return Err("Application preferences path is not a file.".to_string());
    }

    std::fs::read_to_string(&preferences_path)
        .map(Some)
        .map_err(|error| {
            format!(
                "Failed to read application preferences {}: {}",
                preferences_path.display(),
                error
            )
        })
}

#[tauri::command]
fn write_app_preferences_file(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let preferences_path = app_preferences_file_path(&app)?;

    if let Some(parent_path) = preferences_path.parent() {
        std::fs::create_dir_all(parent_path).map_err(|error| {
            format!(
                "Failed to create application preferences directory {}: {}",
                parent_path.display(),
                error
            )
        })?;
    }

    std::fs::write(&preferences_path, contents).map_err(|error| {
        format!(
            "Failed to write application preferences {}: {}",
            preferences_path.display(),
            error
        )
    })
}

#[tauri::command]
fn read_project_file(file_path: String) -> Result<(String, String), String> {
    let project_file_path = std::path::Path::new(&file_path);
    validate_project_file_path_for_read(project_file_path)?;

    let metadata = std::fs::metadata(project_file_path).map_err(|error| {
        format!(
            "Failed to inspect project file {}: {}",
            project_file_path.display(),
            error
        )
    })?;

    if !metadata.is_file() {
        return Err("Selected project path is not a file.".to_string());
    }

    if metadata.len() > MAX_PROJECT_FILE_BYTES {
        return Err(format!(
            "Project file is too large to open. Maximum supported size is {} MB.",
            MAX_PROJECT_FILE_BYTES / 1024 / 1024
        ));
    }

    let contents = std::fs::read_to_string(&project_file_path)
        .map_err(|error| format!("Failed to read {}: {}", project_file_path.display(), error))?;

    Ok((project_file_path.to_string_lossy().to_string(), contents))
}

#[tauri::command]
fn write_project_file(file_path: String, contents: String) -> Result<String, String> {
    let project_file_path = std::path::Path::new(&file_path);
    let parent_path = validate_project_file_path_for_write(project_file_path)?;

    std::fs::create_dir_all(parent_path)
        .map_err(|error| format!("Failed to create {}: {}", parent_path.display(), error))?;

    std::fs::write(&project_file_path, contents)
        .map_err(|error| format!("Failed to write {}: {}", project_file_path.display(), error))?;

    Ok(project_file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn write_json_export_file(file_path: String, contents: String) -> Result<String, String> {
    let export_file_path = std::path::Path::new(&file_path);
    let parent_path = validate_json_export_file_path_for_write(export_file_path)?;

    if !parent_path.is_dir() {
        return Err("JSON export destination directory does not exist.".to_string());
    }

    std::fs::write(&export_file_path, contents).map_err(|error| {
        format!(
            "Failed to write JSON export {}: {}",
            export_file_path.display(),
            error
        )
    })?;

    Ok(export_file_path.to_string_lossy().to_string())
}

fn extension_lowercase(path: &std::path::Path) -> Option<String> {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
}

fn validate_project_file_path_for_read(path: &std::path::Path) -> Result<(), String> {
    match extension_lowercase(path).as_deref() {
        Some("narrium") | Some("json") => Ok(()),
        _ => Err(
            "Unsupported project file type. Open .narrium files or legacy .json files.".to_string(),
        ),
    }
}

fn validate_project_file_path_for_write(
    path: &std::path::Path,
) -> Result<&std::path::Path, String> {
    match extension_lowercase(path).as_deref() {
        Some("narrium") => {}
        _ => {
            return Err(
                "Unsupported project file type. Save projects as .narrium files.".to_string(),
            );
        }
    }

    path.parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .ok_or_else(|| "Project file must have a parent directory.".to_string())
}

fn validate_json_export_file_path_for_write(
    path: &std::path::Path,
) -> Result<&std::path::Path, String> {
    match extension_lowercase(path).as_deref() {
        Some("json") => {}
        _ => {
            return Err(
                "Unsupported JSON export file type. Export JSON files with a .json extension."
                    .to_string(),
            );
        }
    }

    path.parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .ok_or_else(|| "JSON export file must have a parent directory.".to_string())
}

fn project_dir_from_file_path(file_path: &str) -> Result<std::path::PathBuf, String> {
    let project_file_path = std::path::Path::new(file_path);
    validate_project_file_path_for_read(project_file_path)?;
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
    validate_project_file_path_for_write(std::path::Path::new(&project_file_path))?;
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

    if metadata.len() > MAX_BACKGROUND_IMAGE_BYTES {
        return Err(format!(
            "Background image is too large to import. Maximum supported size is {} MiB.",
            MAX_BACKGROUND_IMAGE_BYTES / 1024 / 1024
        ));
    }

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

    let relative_path = std::path::Path::new("assets").join("backgrounds").join(
        destination_path
            .file_name()
            .ok_or_else(|| "Failed to determine copied background file name.".to_string())?,
    );

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
fn resolve_local_asset_file(
    project_file_path: String,
    relative_path: String,
) -> Result<String, String> {
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
    let destination_project_dir = validate_project_file_path_for_write(destination_project_file)?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(test_name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "narrium-fs-policy-{}-{}",
            std::process::id(),
            nanos
        ));
        fs::create_dir_all(root.join(test_name)).expect("temp test directory should be created");
        root.join(test_name)
    }

    fn write_file(path: &Path, contents: &[u8]) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("parent should be created");
        }
        let mut file = fs::File::create(path).expect("test file should be created");
        file.write_all(contents)
            .expect("test file should be written");
    }

    #[test]
    fn reads_valid_narrium_project_files() {
        let root = temp_root("reads-valid-narrium");
        let project_path = root.join("Story.narrium");
        write_file(&project_path, br#"{"format":"narrium.project"}"#);

        let result = read_project_file(project_path.to_string_lossy().to_string())
            .expect("read should succeed");

        assert_eq!(result.0, project_path.to_string_lossy());
        assert!(result.1.contains("narrium.project"));
    }

    #[test]
    fn reads_valid_legacy_json_project_files() {
        let root = temp_root("reads-valid-json");
        let project_path = root.join("Legacy.json");
        write_file(&project_path, br#"{"id":"legacy"}"#);

        let result = read_project_file(project_path.to_string_lossy().to_string())
            .expect("read should succeed");

        assert_eq!(result.0, project_path.to_string_lossy());
        assert!(result.1.contains("legacy"));
    }

    #[test]
    fn rejects_unsupported_project_read_extensions() {
        let root = temp_root("rejects-read-extension");
        let project_path = root.join("Story.txt");
        write_file(&project_path, b"not a project");

        let error = read_project_file(project_path.to_string_lossy().to_string()).unwrap_err();

        assert!(error.contains("Open .narrium files or legacy .json files"));
    }

    #[test]
    fn rejects_unsupported_project_write_extensions() {
        let root = temp_root("rejects-write-extension");
        let project_path = root.join("Story.json");

        let error =
            write_project_file(project_path.to_string_lossy().to_string(), "{}".to_string())
                .unwrap_err();

        assert!(error.contains("Save projects as .narrium files"));
        assert!(!project_path.exists());
    }

    #[test]
    fn writes_valid_json_export_files() {
        let root = temp_root("writes-valid-json-export");
        let export_path = root.join("Story.json");

        let saved_path =
            write_json_export_file(export_path.to_string_lossy().to_string(), "{}".to_string())
                .expect("json export write should succeed");

        assert_eq!(saved_path, export_path.to_string_lossy());
        assert_eq!(
            fs::read_to_string(export_path).expect("export file should be readable"),
            "{}"
        );
    }

    #[test]
    fn rejects_non_json_export_extensions() {
        let root = temp_root("rejects-json-export-extension");
        let export_path = root.join("Story.narrium");

        let error =
            write_json_export_file(export_path.to_string_lossy().to_string(), "{}".to_string())
                .unwrap_err();

        assert!(error.contains("Export JSON files with a .json extension"));
        assert!(!export_path.exists());
    }

    #[test]
    fn rejects_json_exports_without_existing_parent_directory() {
        let root = temp_root("rejects-json-export-missing-parent");
        let export_path = root.join("Missing").join("Story.json");

        let error =
            write_json_export_file(export_path.to_string_lossy().to_string(), "{}".to_string())
                .unwrap_err();

        assert!(error.contains("destination directory does not exist"));
        assert!(!export_path.exists());
    }

    #[test]
    fn rejects_relative_asset_path_traversal() {
        let error = ensure_relative_asset_path("../../outside.png").unwrap_err();

        assert!(error.contains("cannot escape"));
    }

    #[test]
    fn rejects_absolute_asset_paths() {
        let absolute_path = std::env::temp_dir().join("outside.png");
        let error = ensure_relative_asset_path(&absolute_path.to_string_lossy()).unwrap_err();

        assert!(error.contains("project-relative"));
    }

    #[test]
    fn rejects_oversized_project_files_before_reading() {
        let root = temp_root("rejects-oversized-project");
        let project_path = root.join("Huge.narrium");
        let file = fs::File::create(&project_path).expect("project file should be created");
        file.set_len(MAX_PROJECT_FILE_BYTES + 1)
            .expect("project file length should be set");

        let error = read_project_file(project_path.to_string_lossy().to_string()).unwrap_err();

        assert!(error.contains("Project file is too large"));
    }

    #[test]
    fn imports_valid_background_assets_into_project_folder() {
        let root = temp_root("imports-valid-background");
        let project_path = root.join("Story.narrium");
        write_file(&project_path, b"{}");
        let source_path = root.join("Source Art").join("Forest Hall.PNG");
        write_file(&source_path, b"png bytes");

        let result = import_background_asset_file(
            project_path.to_string_lossy().to_string(),
            source_path.to_string_lossy().to_string(),
        )
        .expect("import should succeed");

        assert_eq!(result.0, "Forest Hall");
        assert_eq!(result.1, "assets/backgrounds/forest-hall.png");
        assert_eq!(result.2, "image/png");
        assert_eq!(result.3, 9);
        assert!(root
            .join("assets")
            .join("backgrounds")
            .join("forest-hall.png")
            .is_file());
    }

    #[test]
    fn rejects_oversized_background_assets_before_copying() {
        let root = temp_root("rejects-oversized-background");
        let project_path = root.join("Story.narrium");
        write_file(&project_path, b"{}");
        let source_path = root.join("Huge.png");
        let file = fs::File::create(&source_path).expect("source image should be created");
        file.set_len(MAX_BACKGROUND_IMAGE_BYTES + 1)
            .expect("source image length should be set");

        let error = import_background_asset_file(
            project_path.to_string_lossy().to_string(),
            source_path.to_string_lossy().to_string(),
        )
        .unwrap_err();

        assert!(error.contains("Background image is too large"));
        assert!(!root.join("assets").join("backgrounds").exists());
    }

    #[test]
    fn copies_valid_local_assets_for_project_save_as() {
        let root = temp_root("copies-valid-save-as-assets");
        let source_project = root.join("Original").join("Story.narrium");
        let destination_project = root.join("Copied").join("Story Copy.narrium");
        let source_asset = root
            .join("Original")
            .join("assets")
            .join("backgrounds")
            .join("forest.png");
        write_file(&source_project, b"{}");
        write_file(&source_asset, b"image");

        copy_local_asset_for_project_save_as(
            source_project.to_string_lossy().to_string(),
            destination_project.to_string_lossy().to_string(),
            "assets/backgrounds/forest.png".to_string(),
        )
        .expect("copy should succeed");

        assert!(root
            .join("Copied")
            .join("assets")
            .join("backgrounds")
            .join("forest.png")
            .is_file());
    }

    #[test]
    fn writes_valid_narrium_project_files() {
        let root = temp_root("writes-valid-narrium");
        let project_path = root.join("Nested").join("Story.narrium");

        let saved_path =
            write_project_file(project_path.to_string_lossy().to_string(), "{}".to_string())
                .expect("write should succeed");

        assert_eq!(saved_path, project_path.to_string_lossy());
        assert_eq!(
            fs::read_to_string(project_path).expect("file should be readable"),
            "{}"
        );
    }
}
