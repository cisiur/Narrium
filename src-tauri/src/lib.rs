use base64::{
    alphabet,
    engine::{
        general_purpose::{GeneralPurpose, GeneralPurposeConfig},
        DecodePaddingMode,
    },
    Engine as _,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
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
            materialize_embedded_background_assets,
            resolve_local_asset_file,
            copy_local_asset_for_project_save_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running Narrium desktop shell");
}

const MAX_PROJECT_FILE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_BACKGROUND_IMAGE_BYTES: u64 = 15 * 1024 * 1024;
const MAX_EMBEDDED_BACKGROUND_MATERIALIZATION_ASSETS: usize = 100;
const MAX_EMBEDDED_BACKGROUND_MATERIALIZATION_DECODED_BYTES: u64 = 100 * 1024 * 1024;
const APP_PREFERENCES_FILE_NAME: &str = "preferences.json";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmbeddedBackgroundAssetMaterializationRequest {
    asset_id: String,
    suggested_name: String,
    mime_type: String,
    base64_data: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct MaterializedBackgroundAsset {
    asset_id: String,
    relative_path: String,
    mime_type: String,
    file_size: u64,
}

#[derive(Debug, Clone, Copy)]
struct MaterializationLimits {
    max_assets: usize,
    max_asset_bytes: u64,
    max_batch_bytes: u64,
}

#[derive(Debug)]
struct StagedMaterializedBackgroundAsset {
    result: MaterializedBackgroundAsset,
    staging_path: std::path::PathBuf,
    final_path: std::path::PathBuf,
}

const MATERIALIZATION_LIMITS: MaterializationLimits = MaterializationLimits {
    max_assets: MAX_EMBEDDED_BACKGROUND_MATERIALIZATION_ASSETS,
    max_asset_bytes: MAX_BACKGROUND_IMAGE_BYTES,
    max_batch_bytes: MAX_EMBEDDED_BACKGROUND_MATERIALIZATION_DECODED_BYTES,
};

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

fn project_dir_from_materialization_project_path(
    file_path: &str,
) -> Result<std::path::PathBuf, String> {
    let project_file_path = std::path::Path::new(file_path);
    let parent_path = validate_project_file_path_for_write(project_file_path)?;

    if !parent_path.is_dir() {
        return Err("Project directory does not exist.".to_string());
    }

    parent_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve project directory: {}", error))
}

fn extension_for_embedded_background_mime(mime_type: &str) -> Result<&'static str, String> {
    match mime_type {
        "image/png" => Ok("png"),
        "image/jpeg" => Ok("jpg"),
        "image/webp" => Ok("webp"),
        _ => Err(format!(
            "Unsupported embedded background MIME type: {}.",
            mime_type
        )),
    }
}

fn validate_background_magic_bytes(mime_type: &str, bytes: &[u8]) -> Result<(), String> {
    let is_valid = match mime_type {
        "image/png" => bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/jpeg" => bytes.starts_with(&[0xff, 0xd8, 0xff]),
        "image/webp" => bytes.len() >= 12 && bytes.starts_with(b"RIFF") && bytes[8..12] == *b"WEBP",
        _ => false,
    };

    if is_valid {
        Ok(())
    } else {
        Err(format!(
            "Decoded embedded background data does not match MIME type {}.",
            mime_type
        ))
    }
}

fn decode_embedded_background_base64(payload: &str) -> Result<Vec<u8>, base64::DecodeError> {
    let engine = GeneralPurpose::new(
        &alphabet::STANDARD,
        GeneralPurposeConfig::new().with_decode_padding_mode(DecodePaddingMode::Indifferent),
    );

    engine.decode(payload.as_bytes())
}

fn unique_background_destination_for_batch(
    backgrounds_dir: &std::path::Path,
    stem: &str,
    extension: &str,
    reserved_paths: &HashSet<std::path::PathBuf>,
) -> std::path::PathBuf {
    let candidate = unique_background_destination(backgrounds_dir, stem, extension);

    if !reserved_paths.contains(&candidate) {
        return candidate;
    }

    let mut suffix = 2;

    loop {
        let candidate = backgrounds_dir.join(format!("{}-{}.{}", stem, suffix, extension));

        if !candidate.exists() && !reserved_paths.contains(&candidate) {
            return candidate;
        }

        suffix += 1;
    }
}

fn staging_directory_path(backgrounds_dir: &std::path::Path) -> std::path::PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);

    backgrounds_dir.join(format!(
        ".narrium-materialize-{}-{}",
        std::process::id(),
        nanos
    ))
}

fn cleanup_staging_dir(staging_dir: &std::path::Path) {
    let _ = std::fs::remove_dir_all(staging_dir);
}

fn cleanup_created_files(paths: &[std::path::PathBuf]) {
    for path in paths {
        let _ = std::fs::remove_file(path);
    }
}

fn rename_file(from: &std::path::Path, to: &std::path::Path) -> std::io::Result<()> {
    std::fs::rename(from, to)
}

fn materialize_embedded_background_assets_impl<F>(
    project_file_path: &str,
    assets: Vec<EmbeddedBackgroundAssetMaterializationRequest>,
    limits: MaterializationLimits,
    mut move_file: F,
) -> Result<Vec<MaterializedBackgroundAsset>, String>
where
    F: FnMut(&std::path::Path, &std::path::Path) -> std::io::Result<()>,
{
    if assets.len() > limits.max_assets {
        return Err(format!(
            "Too many embedded background assets to materialize. Maximum supported batch size is {}.",
            limits.max_assets
        ));
    }

    let project_dir = project_dir_from_materialization_project_path(project_file_path)?;
    let backgrounds_dir = project_dir.join("assets").join("backgrounds");

    std::fs::create_dir_all(&backgrounds_dir).map_err(|error| {
        format!(
            "Failed to create background asset directory {}: {}",
            backgrounds_dir.display(),
            error
        )
    })?;

    let staging_dir = staging_directory_path(&backgrounds_dir);
    std::fs::create_dir(&staging_dir).map_err(|error| {
        format!(
            "Failed to create embedded background staging directory {}: {}",
            staging_dir.display(),
            error
        )
    })?;

    let mut seen_asset_ids = HashSet::new();
    let mut reserved_final_paths = HashSet::new();
    let mut staged_assets = Vec::new();
    let mut batch_decoded_bytes = 0_u64;

    for asset in assets {
        if asset.asset_id.trim().is_empty() {
            cleanup_staging_dir(&staging_dir);
            return Err(
                "Embedded background materialization request has an empty asset id.".to_string(),
            );
        }

        if !seen_asset_ids.insert(asset.asset_id.clone()) {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Duplicate embedded background materialization request for asset {}.",
                asset.asset_id
            ));
        }

        if asset.suggested_name.trim().is_empty() {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Embedded background materialization request for asset {} has an empty suggested name.",
                asset.asset_id
            ));
        }

        if asset.mime_type.trim().is_empty() {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Embedded background materialization request for asset {} has an empty MIME type.",
                asset.asset_id
            ));
        }

        if asset.base64_data.trim().is_empty() {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Embedded background materialization request for asset {} has empty image data.",
                asset.asset_id
            ));
        }

        let extension = match extension_for_embedded_background_mime(&asset.mime_type) {
            Ok(extension) => extension,
            Err(error) => {
                cleanup_staging_dir(&staging_dir);
                return Err(format!("Asset {}: {}", asset.asset_id, error));
            }
        };

        let decoded = match decode_embedded_background_base64(&asset.base64_data) {
            Ok(decoded) => decoded,
            Err(error) => {
                cleanup_staging_dir(&staging_dir);
                return Err(format!(
                    "Asset {} contains invalid Base64 image data: {}.",
                    asset.asset_id, error
                ));
            }
        };
        let decoded_len = decoded.len() as u64;

        if decoded_len > limits.max_asset_bytes {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Embedded background asset {} is too large. Maximum supported size is {} MiB.",
                asset.asset_id,
                limits.max_asset_bytes / 1024 / 1024
            ));
        }

        batch_decoded_bytes = match batch_decoded_bytes.checked_add(decoded_len) {
            Some(total) => total,
            None => {
                cleanup_staging_dir(&staging_dir);
                return Err("Embedded background materialization batch is too large.".to_string());
            }
        };

        if batch_decoded_bytes > limits.max_batch_bytes {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Embedded background materialization batch is too large. Maximum decoded payload is {} MiB.",
                limits.max_batch_bytes / 1024 / 1024
            ));
        }

        if let Err(error) = validate_background_magic_bytes(&asset.mime_type, &decoded) {
            cleanup_staging_dir(&staging_dir);
            return Err(format!("Asset {}: {}", asset.asset_id, error));
        }

        let stem = sanitize_file_stem(std::path::Path::new(&asset.suggested_name));
        let final_path = unique_background_destination_for_batch(
            &backgrounds_dir,
            &stem,
            extension,
            &reserved_final_paths,
        );
        reserved_final_paths.insert(final_path.clone());

        let file_name = final_path
            .file_name()
            .ok_or_else(|| "Failed to determine materialized background file name.".to_string())?;
        let staging_path = staging_dir.join(file_name);

        if let Err(error) = std::fs::write(&staging_path, &decoded) {
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Failed to stage embedded background asset {} at {}: {}",
                asset.asset_id,
                staging_path.display(),
                error
            ));
        }

        let relative_path = std::path::Path::new("assets")
            .join("backgrounds")
            .join(file_name);

        staged_assets.push(StagedMaterializedBackgroundAsset {
            result: MaterializedBackgroundAsset {
                asset_id: asset.asset_id,
                relative_path: relative_path_with_forward_slashes(&relative_path),
                mime_type: asset.mime_type,
                file_size: decoded_len,
            },
            staging_path,
            final_path,
        });
    }

    let mut results = Vec::with_capacity(staged_assets.len());
    let mut created_final_paths = Vec::new();

    for staged_asset in staged_assets {
        if let Err(error) = move_file(&staged_asset.staging_path, &staged_asset.final_path) {
            cleanup_created_files(&created_final_paths);
            cleanup_staging_dir(&staging_dir);
            return Err(format!(
                "Failed to materialize embedded background asset {} at {}: {}",
                staged_asset.result.asset_id,
                staged_asset.final_path.display(),
                error
            ));
        }

        created_final_paths.push(staged_asset.final_path);
        results.push(staged_asset.result);
    }

    std::fs::remove_dir_all(&staging_dir).map_err(|error| {
        format!(
            "Failed to remove embedded background staging directory {}: {}",
            staging_dir.display(),
            error
        )
    })?;

    Ok(results)
}

#[tauri::command]
fn materialize_embedded_background_assets(
    project_file_path: String,
    assets: Vec<EmbeddedBackgroundAssetMaterializationRequest>,
) -> Result<Vec<MaterializedBackgroundAsset>, String> {
    materialize_embedded_background_assets_impl(
        &project_file_path,
        assets,
        MATERIALIZATION_LIMITS,
        rename_file,
    )
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
    use base64::engine::general_purpose::STANDARD as TEST_BASE64_STANDARD;
    use std::fs;
    use std::io::Write;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    const PNG_BYTES: &[u8] = &[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a];
    const JPEG_BYTES: &[u8] = &[0xff, 0xd8, 0xff, 0xe0];
    const WEBP_BYTES: &[u8] = b"RIFF\0\0\0\0WEBP";

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

    fn encoded(bytes: &[u8]) -> String {
        TEST_BASE64_STANDARD.encode(bytes)
    }

    fn materialization_request(
        asset_id: &str,
        suggested_name: &str,
        mime_type: &str,
        bytes: &[u8],
    ) -> EmbeddedBackgroundAssetMaterializationRequest {
        EmbeddedBackgroundAssetMaterializationRequest {
            asset_id: asset_id.to_string(),
            suggested_name: suggested_name.to_string(),
            mime_type: mime_type.to_string(),
            base64_data: encoded(bytes),
        }
    }

    fn materialization_request_with_base64(
        asset_id: &str,
        suggested_name: &str,
        mime_type: &str,
        base64_data: &str,
    ) -> EmbeddedBackgroundAssetMaterializationRequest {
        EmbeddedBackgroundAssetMaterializationRequest {
            asset_id: asset_id.to_string(),
            suggested_name: suggested_name.to_string(),
            mime_type: mime_type.to_string(),
            base64_data: base64_data.to_string(),
        }
    }

    fn materialization_limits(
        max_assets: usize,
        max_asset_bytes: u64,
        max_batch_bytes: u64,
    ) -> MaterializationLimits {
        MaterializationLimits {
            max_assets,
            max_asset_bytes,
            max_batch_bytes,
        }
    }

    fn default_test_limits() -> MaterializationLimits {
        materialization_limits(
            100,
            MAX_BACKGROUND_IMAGE_BYTES,
            MAX_EMBEDDED_BACKGROUND_MATERIALIZATION_DECODED_BYTES,
        )
    }

    fn materialization_project(root: &Path) -> PathBuf {
        let project_path = root.join("Story.narrium");
        write_file(&project_path, b"{}");
        project_path
    }

    fn staging_dirs(root: &Path) -> Vec<PathBuf> {
        let backgrounds_dir = root.join("assets").join("backgrounds");

        if !backgrounds_dir.exists() {
            return Vec::new();
        }

        fs::read_dir(backgrounds_dir)
            .expect("backgrounds dir should be readable")
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name.starts_with(".narrium-materialize-"))
                    .unwrap_or(false)
            })
            .collect()
    }

    #[test]
    fn materializes_valid_png_embedded_backgrounds() {
        let root = temp_root("materializes-valid-png");
        let project_path = materialization_project(&root);

        let results = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/png",
                PNG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert_eq!(
            results,
            vec![MaterializedBackgroundAsset {
                asset_id: "asset-1".to_string(),
                relative_path: "assets/backgrounds/forest.png".to_string(),
                mime_type: "image/png".to_string(),
                file_size: PNG_BYTES.len() as u64,
            }]
        );
        assert_eq!(
            fs::read(root.join("assets").join("backgrounds").join("forest.png"))
                .expect("materialized file should be readable"),
            PNG_BYTES
        );
    }

    #[test]
    fn materializes_valid_jpeg_embedded_backgrounds() {
        let root = temp_root("materializes-valid-jpeg");
        let project_path = materialization_project(&root);

        let results = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/jpeg",
                JPEG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert_eq!(results[0].relative_path, "assets/backgrounds/forest.jpg");
        assert_eq!(results[0].mime_type, "image/jpeg");
        assert_eq!(results[0].file_size, JPEG_BYTES.len() as u64);
    }

    #[test]
    fn materializes_valid_webp_embedded_backgrounds() {
        let root = temp_root("materializes-valid-webp");
        let project_path = materialization_project(&root);

        let results = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/webp",
                WEBP_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert_eq!(results[0].relative_path, "assets/backgrounds/forest.webp");
        assert_eq!(results[0].mime_type, "image/webp");
        assert_eq!(results[0].file_size, WEBP_BYTES.len() as u64);
    }

    #[test]
    fn rejects_invalid_embedded_background_mime_types() {
        let root = temp_root("rejects-materialization-mime");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/gif",
                PNG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("Unsupported embedded background MIME type"));
        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn rejects_invalid_embedded_background_base64() {
        let root = temp_root("rejects-materialization-base64");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request_with_base64(
                "asset-1",
                "Forest",
                "image/png",
                "not valid base64!",
            )],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("invalid Base64"));
        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn rejects_magic_bytes_mismatches() {
        let root = temp_root("rejects-materialization-magic");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/png",
                JPEG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("does not match MIME type image/png"));
        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn rejects_embedded_background_payloads_larger_than_the_limit() {
        let root = temp_root("rejects-materialization-asset-size");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/jpeg",
                JPEG_BYTES,
            )],
            materialization_limits(100, 3, 100),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("asset-1 is too large"));
        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn rejects_duplicate_embedded_background_asset_ids() {
        let root = temp_root("rejects-materialization-duplicates");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/png", PNG_BYTES),
                materialization_request("asset-1", "Lake", "image/png", PNG_BYTES),
            ],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("Duplicate embedded background materialization request"));
        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn rejects_empty_materialization_suggested_names() {
        let root = temp_root("rejects-materialization-empty-name");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "  ",
                "image/png",
                PNG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("empty suggested name"));
        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn rejects_invalid_materialization_project_paths() {
        let root = temp_root("rejects-materialization-project-path");
        let project_path = root.join("Story.json");

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/png",
                PNG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("Save projects as .narrium files"));
        assert!(!root.join("assets").exists());
    }

    #[test]
    fn sanitizes_materialized_background_filenames() {
        let root = temp_root("sanitizes-materialization-filenames");
        let project_path = materialization_project(&root);

        let results = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest Hall!!!",
                "image/png",
                PNG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert_eq!(
            results[0].relative_path,
            "assets/backgrounds/forest-hall.png"
        );
    }

    #[test]
    fn handles_materialized_background_filename_collisions() {
        let root = temp_root("handles-materialization-collisions");
        let project_path = materialization_project(&root);

        let results = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/png", PNG_BYTES),
                materialization_request("asset-2", "Forest", "image/png", PNG_BYTES),
            ],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert_eq!(results[0].relative_path, "assets/backgrounds/forest.png");
        assert_eq!(results[1].relative_path, "assets/backgrounds/forest-2.png");
    }

    #[test]
    fn returns_forward_slash_relative_materialized_paths() {
        let root = temp_root("returns-materialization-relative-paths");
        let project_path = materialization_project(&root);

        let results = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/jpeg",
                JPEG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert_eq!(results[0].relative_path, "assets/backgrounds/forest.jpg");
        assert!(!results[0].relative_path.contains('\\'));
    }

    #[test]
    fn removes_staging_after_materialization_failure() {
        let root = temp_root("removes-staging-after-failure");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/png", PNG_BYTES),
                materialization_request_with_base64("asset-2", "Lake", "image/png", "%%%"),
            ],
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("asset-2"));
        assert!(staging_dirs(&root).is_empty());
        assert!(!root
            .join("assets")
            .join("backgrounds")
            .join("forest.png")
            .exists());
    }

    #[test]
    fn removes_staging_after_successful_materialization() {
        let root = temp_root("removes-staging-after-success");
        let project_path = materialization_project(&root);

        materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![materialization_request(
                "asset-1",
                "Forest",
                "image/png",
                PNG_BYTES,
            )],
            default_test_limits(),
            rename_file,
        )
        .expect("materialization should succeed");

        assert!(staging_dirs(&root).is_empty());
    }

    #[test]
    fn cleans_up_files_created_before_a_final_move_failure() {
        let root = temp_root("cleans-up-final-move-failure");
        let project_path = materialization_project(&root);
        let mut move_count = 0;

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/png", PNG_BYTES),
                materialization_request("asset-2", "Lake", "image/png", PNG_BYTES),
            ],
            default_test_limits(),
            |from, to| {
                move_count += 1;
                if move_count == 2 {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::PermissionDenied,
                        "simulated move failure",
                    ));
                }

                fs::rename(from, to)
            },
        )
        .unwrap_err();

        assert!(error.contains("simulated move failure"));
        assert!(staging_dirs(&root).is_empty());
        assert!(!root
            .join("assets")
            .join("backgrounds")
            .join("forest.png")
            .exists());
        assert!(!root
            .join("assets")
            .join("backgrounds")
            .join("lake.png")
            .exists());
    }

    #[test]
    fn never_removes_existing_background_files_during_final_cleanup() {
        let root = temp_root("preserves-existing-files-final-cleanup");
        let project_path = materialization_project(&root);
        let existing_path = root.join("assets").join("backgrounds").join("forest.png");
        write_file(&existing_path, b"existing");
        let mut move_count = 0;

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/png", PNG_BYTES),
                materialization_request("asset-2", "Lake", "image/png", PNG_BYTES),
            ],
            default_test_limits(),
            |from, to| {
                move_count += 1;
                if move_count == 2 {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::PermissionDenied,
                        "simulated move failure",
                    ));
                }

                fs::rename(from, to)
            },
        )
        .unwrap_err();

        assert!(error.contains("simulated move failure"));
        assert_eq!(
            fs::read(&existing_path).expect("existing file should remain"),
            b"existing"
        );
        assert!(!root
            .join("assets")
            .join("backgrounds")
            .join("forest-2.png")
            .exists());
    }

    #[test]
    fn rejects_batches_over_the_asset_count_limit() {
        let root = temp_root("rejects-materialization-asset-count");
        let project_path = materialization_project(&root);
        let assets = (0..=MAX_EMBEDDED_BACKGROUND_MATERIALIZATION_ASSETS)
            .map(|index| {
                materialization_request(
                    &format!("asset-{}", index),
                    &format!("Background {}", index),
                    "image/png",
                    PNG_BYTES,
                )
            })
            .collect();

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            assets,
            default_test_limits(),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("Too many embedded background assets"));
        assert!(!root.join("assets").exists());
    }

    #[test]
    fn rejects_batches_over_the_decoded_size_limit() {
        let root = temp_root("rejects-materialization-batch-size");
        let project_path = materialization_project(&root);

        let error = materialize_embedded_background_assets_impl(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/jpeg", JPEG_BYTES),
                materialization_request("asset-2", "Lake", "image/jpeg", JPEG_BYTES),
            ],
            materialization_limits(100, 100, 5),
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("batch is too large"));
        assert!(staging_dirs(&root).is_empty());
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
