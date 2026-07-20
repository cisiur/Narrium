use base64::{
    alphabet,
    engine::{
        general_purpose::{GeneralPurpose, GeneralPurposeConfig},
        DecodePaddingMode,
    },
    Engine as _,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectFileSessionTrust::default())
        .invoke_handler(tauri::generate_handler![
            confirm_unsaved_changes,
            read_app_preferences_file,
            write_app_preferences_file,
            select_project_file_to_open,
            select_project_file_path_for_save_as,
            trust_existing_project_file,
            read_project_file,
            write_project_file,
            write_json_export_file,
            import_background_asset_file,
            materialize_embedded_background_assets,
            resolve_local_asset_file,
            copy_local_asset_for_project_save_as,
            list_local_background_files,
            fingerprint_local_background_files,
            delete_local_background_files,
            write_playable_folder_export
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct PhysicalBackgroundFile {
    relative_path: String,
    file_name: String,
    file_size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct FingerprintedBackgroundFile {
    relative_path: String,
    file_name: String,
    file_size: u64,
    content_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeletedBackgroundFile {
    relative_path: String,
    file_size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct SkippedBackgroundFileDeletion {
    relative_path: String,
    reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct FailedBackgroundFileDeletion {
    relative_path: String,
    error: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeleteLocalBackgroundFilesResult {
    deleted: Vec<DeletedBackgroundFile>,
    skipped: Vec<SkippedBackgroundFileDeletion>,
    failed: Vec<FailedBackgroundFileDeletion>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlayableFolderLocalAssetCopyRequest {
    source_relative_path: String,
    destination_relative_path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayableFolderExportResult {
    output_directory: String,
    index_html_path: String,
    copied_asset_count: usize,
}

#[derive(Debug, Default)]
struct ProjectFileSessionTrust {
    trusted_project_files: Mutex<HashSet<PathBuf>>,
    pending_save_destinations: Mutex<HashSet<PathBuf>>,
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
async fn select_project_file_to_open(
    app: tauri::AppHandle,
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    title: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let selected_path = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title(title)
            .add_filter("Narrium Project", &["narrium"])
            .add_filter("Legacy JSON", &["json"])
            .blocking_pick_file()
    })
    .await
    .map_err(|error| format!("Could not open project file dialog: {}", error))?;

    selected_path
        .map(|path| {
            path.into_path()
                .map_err(|error| format!("Selected project path is invalid: {}", error))
                .and_then(|path| trust.register_existing_project_file(&path))
        })
        .transpose()
}

#[tauri::command]
async fn select_project_file_path_for_save_as(
    app: tauri::AppHandle,
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    title: String,
    default_file_name: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let selected_path = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title(title)
            .set_file_name(default_file_name)
            .add_filter("Narrium Project", &["narrium"])
            .blocking_save_file()
    })
    .await
    .map_err(|error| format!("Could not open Save As dialog: {}", error))?;

    selected_path
        .map(|path| {
            path.into_path()
                .map_err(|error| format!("Selected Save As path is invalid: {}", error))
                .map(ensure_narrium_extension)
                .and_then(|path| trust.register_pending_save_destination(&path))
        })
        .transpose()
}

#[tauri::command]
fn trust_existing_project_file(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    file_path: String,
) -> Result<String, String> {
    trust_existing_project_file_impl(&trust, &file_path)
}

fn trust_existing_project_file_impl(
    trust: &ProjectFileSessionTrust,
    file_path: &str,
) -> Result<String, String> {
    trust.register_existing_project_file(Path::new(file_path))
}

#[tauri::command]
fn read_project_file(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    file_path: String,
) -> Result<(String, String), String> {
    read_project_file_impl(&trust, file_path)
}

fn read_project_file_impl(
    trust: &ProjectFileSessionTrust,
    file_path: String,
) -> Result<(String, String), String> {
    let project_file_path =
        trust.require_trusted_existing_project_file(std::path::Path::new(&file_path))?;

    let metadata = std::fs::metadata(&project_file_path).map_err(|error| {
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

    Ok((display_filesystem_path(&project_file_path), contents))
}

#[tauri::command]
fn write_project_file(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    file_path: String,
    contents: String,
) -> Result<String, String> {
    write_project_file_impl(&trust, file_path, contents)
}

fn write_project_file_impl(
    trust: &ProjectFileSessionTrust,
    file_path: String,
    contents: String,
) -> Result<String, String> {
    let project_file_path =
        trust.require_trusted_or_pending_save_destination(std::path::Path::new(&file_path))?;
    let parent_path = validate_project_file_path_for_write(&project_file_path)?;

    std::fs::create_dir_all(parent_path)
        .map_err(|error| format!("Failed to create {}: {}", parent_path.display(), error))?;

    std::fs::write(&project_file_path, contents)
        .map_err(|error| format!("Failed to write {}: {}", project_file_path.display(), error))?;

    trust.register_written_project_file(&project_file_path)
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

impl ProjectFileSessionTrust {
    fn register_existing_project_file(&self, file_path: &Path) -> Result<String, String> {
        let canonical_path = canonical_existing_project_file_path(file_path)?;
        self.trusted_project_files
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?
            .insert(canonical_path.clone());

        Ok(display_filesystem_path(&canonical_path))
    }

    fn register_pending_save_destination(&self, file_path: &Path) -> Result<String, String> {
        let normalized_path = normalize_project_file_path_for_write_candidate(file_path)?;
        self.pending_save_destinations
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?
            .insert(normalized_path.clone());

        Ok(display_filesystem_path(&normalized_path))
    }

    fn require_trusted_existing_project_file(&self, file_path: &Path) -> Result<PathBuf, String> {
        let canonical_path = canonical_existing_project_file_path(file_path)?;

        if self
            .trusted_project_files
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?
            .contains(&canonical_path)
        {
            Ok(canonical_path)
        } else {
            Err(project_not_trusted_error())
        }
    }

    fn require_trusted_existing_narrium_project_file(
        &self,
        file_path: &Path,
    ) -> Result<PathBuf, String> {
        validate_project_file_path_for_write(file_path)?;
        self.require_trusted_existing_project_file(file_path)
    }

    fn require_trusted_or_pending_save_destination(
        &self,
        file_path: &Path,
    ) -> Result<PathBuf, String> {
        let normalized_path = normalize_project_file_path_for_write_candidate(file_path)?;
        let canonical_existing_path = if normalized_path.is_file() {
            normalized_path.canonicalize().ok()
        } else {
            None
        };
        let trusted = self
            .trusted_project_files
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?;
        let pending = self
            .pending_save_destinations
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?;

        if trusted.contains(&normalized_path)
            || canonical_existing_path
                .as_ref()
                .is_some_and(|path| trusted.contains(path))
            || pending.contains(&normalized_path)
        {
            Ok(normalized_path)
        } else {
            Err(project_not_trusted_error())
        }
    }

    fn register_written_project_file(&self, file_path: &Path) -> Result<String, String> {
        let canonical_path = canonical_existing_project_file_path(file_path)?;
        let pending_path = normalize_project_file_path_for_write_candidate(file_path).ok();

        self.trusted_project_files
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?
            .insert(canonical_path.clone());

        let mut pending = self
            .pending_save_destinations
            .lock()
            .map_err(|_| "Project session trust state is unavailable.".to_string())?;
        pending.remove(&canonical_path);
        if let Some(path) = pending_path {
            pending.remove(&path);
        }

        Ok(display_filesystem_path(&canonical_path))
    }
}

fn project_not_trusted_error() -> String {
    "Project file is not trusted for this session. Open it or use Save As before accessing project files.".to_string()
}

fn display_filesystem_path(path: &Path) -> String {
    let raw_path = path.to_string_lossy();

    raw_path
        .strip_prefix(r"\\?\")
        .unwrap_or(&raw_path)
        .to_string()
}

fn canonical_existing_project_file_path(path: &Path) -> Result<PathBuf, String> {
    validate_project_file_path_for_read(path)?;

    let metadata = std::fs::metadata(path).map_err(|error| {
        format!(
            "Failed to inspect project file {}: {}",
            path.display(),
            error
        )
    })?;

    if !metadata.is_file() {
        return Err("Selected project path is not a file.".to_string());
    }

    path.canonicalize()
        .map_err(|error| format!("Failed to resolve project file path: {}", error))
}

fn normalize_project_file_path_for_write_candidate(path: &Path) -> Result<PathBuf, String> {
    let parent_path = validate_project_file_path_for_write(path)?;
    let canonical_parent = parent_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve project directory: {}", error))?;
    let file_name = path
        .file_name()
        .ok_or_else(|| "Project file must have a file name.".to_string())?;

    Ok(canonical_parent.join(file_name))
}

fn ensure_narrium_extension(path: PathBuf) -> PathBuf {
    if extension_lowercase(&path).as_deref() == Some("narrium") {
        path
    } else {
        let next = format!("{}.narrium", path.to_string_lossy());
        PathBuf::from(next)
    }
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

fn project_dir_from_narrium_file_path(file_path: &str) -> Result<std::path::PathBuf, String> {
    let project_file_path = std::path::Path::new(file_path);
    validate_project_file_path_for_write(project_file_path)?;

    if !project_file_path.is_file() {
        return Err("Selected project path is not a .narrium file.".to_string());
    }

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

fn ensure_direct_background_relative_path(
    relative_path: &str,
) -> Result<std::path::PathBuf, String> {
    let normalized = ensure_relative_asset_path(relative_path)?;
    let components = normalized
        .components()
        .filter_map(|component| match component {
            std::path::Component::Normal(value) => Some(value.to_string_lossy().to_string()),
            _ => None,
        })
        .collect::<Vec<_>>();

    if components.len() != 3 || components[0] != "assets" || components[1] != "backgrounds" {
        return Err(
            "Local background cleanup paths must be directly under assets/backgrounds/."
                .to_string(),
        );
    }

    safe_background_extension(&normalized)?;

    Ok(normalized)
}

fn background_relative_path_comparison_key(relative_path: &std::path::Path) -> String {
    relative_path_with_forward_slashes(relative_path).to_ascii_lowercase()
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

fn remove_staging_dir(staging_dir: &std::path::Path) -> std::io::Result<()> {
    std::fs::remove_dir_all(staging_dir)
}

fn materialize_embedded_background_assets_impl<F>(
    project_file_path: &str,
    assets: Vec<EmbeddedBackgroundAssetMaterializationRequest>,
    limits: MaterializationLimits,
    move_file: F,
) -> Result<Vec<MaterializedBackgroundAsset>, String>
where
    F: FnMut(&std::path::Path, &std::path::Path) -> std::io::Result<()>,
{
    materialize_embedded_background_assets_impl_with_cleanup(
        project_file_path,
        assets,
        limits,
        move_file,
        remove_staging_dir,
    )
}

fn materialize_embedded_background_assets_impl_with_cleanup<F, R>(
    project_file_path: &str,
    assets: Vec<EmbeddedBackgroundAssetMaterializationRequest>,
    limits: MaterializationLimits,
    mut move_file: F,
    mut remove_staging_dir: R,
) -> Result<Vec<MaterializedBackgroundAsset>, String>
where
    F: FnMut(&std::path::Path, &std::path::Path) -> std::io::Result<()>,
    R: FnMut(&std::path::Path) -> std::io::Result<()>,
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

    if let Err(error) = remove_staging_dir(&staging_dir) {
        cleanup_created_files(&created_final_paths);
        cleanup_staging_dir(&staging_dir);

        return Err(format!(
            "Failed to remove embedded background staging directory {}: {}",
            staging_dir.display(),
            error
        ));
    }

    Ok(results)
}

#[tauri::command]
fn materialize_embedded_background_assets(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    project_file_path: String,
    assets: Vec<EmbeddedBackgroundAssetMaterializationRequest>,
) -> Result<Vec<MaterializedBackgroundAsset>, String> {
    materialize_embedded_background_assets_for_session_impl(&trust, &project_file_path, assets)
}

fn materialize_embedded_background_assets_for_session_impl(
    trust: &ProjectFileSessionTrust,
    project_file_path: &str,
    assets: Vec<EmbeddedBackgroundAssetMaterializationRequest>,
) -> Result<Vec<MaterializedBackgroundAsset>, String> {
    trust.require_trusted_or_pending_save_destination(Path::new(project_file_path))?;
    materialize_embedded_background_assets_impl(
        project_file_path,
        assets,
        MATERIALIZATION_LIMITS,
        rename_file,
    )
}

#[tauri::command]
fn import_background_asset_file(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    project_file_path: String,
    source_file_path: String,
) -> Result<(String, String, String, u64), String> {
    import_background_asset_file_impl(&trust, &project_file_path, &source_file_path)
}

fn import_background_asset_file_impl(
    trust: &ProjectFileSessionTrust,
    project_file_path: &str,
    source_file_path: &str,
) -> Result<(String, String, String, u64), String> {
    let trusted_project_path =
        trust.require_trusted_existing_narrium_project_file(Path::new(&project_file_path))?;
    let project_dir = project_dir_from_file_path(&trusted_project_path.to_string_lossy())?;
    let source_path = std::path::Path::new(source_file_path)
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
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    project_file_path: String,
    relative_path: String,
) -> Result<String, String> {
    resolve_local_asset_file_impl(&trust, &project_file_path, &relative_path)
}

fn resolve_local_asset_file_impl(
    trust: &ProjectFileSessionTrust,
    project_file_path: &str,
    relative_path: &str,
) -> Result<String, String> {
    let trusted_project_path =
        trust.require_trusted_existing_project_file(Path::new(project_file_path))?;
    let project_dir = project_dir_from_file_path(&trusted_project_path.to_string_lossy())?;
    let asset_relative_path = ensure_relative_asset_path(relative_path)?;
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
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    source_project_file_path: String,
    destination_project_file_path: String,
    relative_path: String,
) -> Result<(), String> {
    copy_local_asset_for_project_save_as_impl(
        &trust,
        &source_project_file_path,
        &destination_project_file_path,
        &relative_path,
    )
}

fn copy_local_asset_for_project_save_as_impl(
    trust: &ProjectFileSessionTrust,
    source_project_file_path: &str,
    destination_project_file_path: &str,
    relative_path: &str,
) -> Result<(), String> {
    let trusted_source_path =
        trust.require_trusted_existing_narrium_project_file(Path::new(source_project_file_path))?;
    let destination_project_file = trust
        .require_trusted_or_pending_save_destination(Path::new(destination_project_file_path))?;
    let source_project_dir = project_dir_from_file_path(&trusted_source_path.to_string_lossy())?;
    let destination_project_dir = validate_project_file_path_for_write(&destination_project_file)?;

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
    let asset_relative_path = ensure_relative_asset_path(relative_path)?;
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

#[tauri::command]
fn list_local_background_files(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    project_file_path: String,
) -> Result<Vec<PhysicalBackgroundFile>, String> {
    list_local_background_files_impl(&trust, &project_file_path)
}

fn list_local_background_files_impl(
    trust: &ProjectFileSessionTrust,
    project_file_path: &str,
) -> Result<Vec<PhysicalBackgroundFile>, String> {
    let trusted_project_path =
        trust.require_trusted_existing_narrium_project_file(Path::new(project_file_path))?;
    let project_dir = project_dir_from_narrium_file_path(&trusted_project_path.to_string_lossy())?;
    let backgrounds_dir = project_dir.join("assets").join("backgrounds");

    if !backgrounds_dir.exists() {
        return Ok(Vec::new());
    }

    if !backgrounds_dir.is_dir() {
        return Err("Project background asset path is not a directory.".to_string());
    }

    let mut files = Vec::new();

    for entry in std::fs::read_dir(&backgrounds_dir).map_err(|error| {
        format!(
            "Failed to read background asset directory {}: {}",
            backgrounds_dir.display(),
            error
        )
    })? {
        let entry =
            entry.map_err(|error| format!("Failed to read background asset entry: {}", error))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Failed to inspect background asset entry: {}", error))?;

        if !file_type.is_file() || safe_background_extension(&entry.path()).is_err() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        let metadata = entry.metadata().map_err(|error| {
            format!(
                "Failed to inspect background asset {}: {}",
                file_name, error
            )
        })?;
        let relative_path = std::path::Path::new("assets")
            .join("backgrounds")
            .join(&file_name);

        files.push(PhysicalBackgroundFile {
            relative_path: relative_path_with_forward_slashes(&relative_path),
            file_name,
            file_size: metadata.len(),
        });
    }

    files.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(files)
}

#[tauri::command]
fn fingerprint_local_background_files(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    project_file_path: String,
) -> Result<Vec<FingerprintedBackgroundFile>, String> {
    fingerprint_local_background_files_impl(&trust, &project_file_path, |_| {})
}

fn fingerprint_local_background_files_impl<F>(
    trust: &ProjectFileSessionTrust,
    project_file_path: &str,
    mut before_open: F,
) -> Result<Vec<FingerprintedBackgroundFile>, String>
where
    F: FnMut(&std::path::Path),
{
    let trusted_project_path =
        trust.require_trusted_existing_narrium_project_file(Path::new(project_file_path))?;
    let project_dir = project_dir_from_narrium_file_path(&trusted_project_path.to_string_lossy())?;
    let backgrounds_dir = project_dir.join("assets").join("backgrounds");

    if !backgrounds_dir.exists() {
        return Ok(Vec::new());
    }

    if !backgrounds_dir.is_dir() {
        return Err("Project background asset path is not a directory.".to_string());
    }

    let canonical_backgrounds_dir = backgrounds_dir.canonicalize().map_err(|error| {
        format!(
            "Failed to resolve background asset directory {}: {}",
            backgrounds_dir.display(),
            error
        )
    })?;

    if !canonical_backgrounds_dir.starts_with(&project_dir) {
        return Err(
            "Project background asset directory escapes the project directory.".to_string(),
        );
    }

    let mut files = Vec::new();

    for entry in std::fs::read_dir(&backgrounds_dir).map_err(|error| {
        format!(
            "Failed to read background asset directory {}: {}",
            backgrounds_dir.display(),
            error
        )
    })? {
        let entry =
            entry.map_err(|error| format!("Failed to read background asset entry: {}", error))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Failed to inspect background asset entry: {}", error))?;

        if !file_type.is_file() || safe_background_extension(&entry.path()).is_err() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path();
        let canonical_entry_path = entry_path.canonicalize().map_err(|error| {
            format!(
                "Failed to resolve background asset {}: {}",
                file_name, error
            )
        })?;

        if !canonical_entry_path.starts_with(&canonical_backgrounds_dir)
            || canonical_entry_path.parent() != Some(canonical_backgrounds_dir.as_path())
        {
            return Err(
                "Background asset path escapes the project background directory.".to_string(),
            );
        }

        let metadata = std::fs::metadata(&canonical_entry_path).map_err(|error| {
            format!(
                "Failed to inspect background asset {}: {}",
                file_name, error
            )
        })?;

        if !metadata.is_file() {
            continue;
        }

        before_open(&canonical_entry_path);

        let content_hash = sha256_file_hex(&canonical_entry_path, &file_name)?;
        let relative_path = std::path::Path::new("assets")
            .join("backgrounds")
            .join(&file_name);

        files.push(FingerprintedBackgroundFile {
            relative_path: relative_path_with_forward_slashes(&relative_path),
            file_name,
            file_size: metadata.len(),
            content_hash,
        });
    }

    files.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(files)
}

fn sha256_file_hex(path: &std::path::Path, file_name: &str) -> Result<String, String> {
    let mut file = std::fs::File::open(path)
        .map_err(|error| format!("Failed to open background file {}: {}", file_name, error))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 8192];

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|error| format!("Failed to read background file {}: {}", file_name, error))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

#[tauri::command]
fn delete_local_background_files(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    project_file_path: String,
    relative_paths: Vec<String>,
    protected_relative_paths: Vec<String>,
) -> Result<DeleteLocalBackgroundFilesResult, String> {
    delete_local_background_files_impl(
        &trust,
        &project_file_path,
        relative_paths,
        protected_relative_paths,
    )
}

fn delete_local_background_files_impl(
    trust: &ProjectFileSessionTrust,
    project_file_path: &str,
    relative_paths: Vec<String>,
    protected_relative_paths: Vec<String>,
) -> Result<DeleteLocalBackgroundFilesResult, String> {
    let trusted_project_path =
        trust.require_trusted_existing_narrium_project_file(Path::new(project_file_path))?;
    let project_dir = project_dir_from_narrium_file_path(&trusted_project_path.to_string_lossy())?;
    let backgrounds_dir = project_dir.join("assets").join("backgrounds");
    let protected_paths: HashSet<String> = protected_relative_paths
        .iter()
        .filter_map(|path| ensure_direct_background_relative_path(path).ok())
        .map(|path| background_relative_path_comparison_key(&path))
        .collect();

    let mut deleted = Vec::new();
    let mut skipped = Vec::new();
    let mut failed = Vec::new();
    let mut seen = HashSet::new();

    for relative_path in relative_paths {
        let normalized = match ensure_direct_background_relative_path(&relative_path) {
            Ok(path) => relative_path_with_forward_slashes(&path),
            Err(error) => {
                failed.push(FailedBackgroundFileDeletion {
                    relative_path,
                    error,
                });
                continue;
            }
        };
        let comparison_key =
            background_relative_path_comparison_key(std::path::Path::new(&normalized));

        if !seen.insert(comparison_key.clone()) {
            skipped.push(SkippedBackgroundFileDeletion {
                relative_path: normalized,
                reason: "Duplicate cleanup candidate skipped.".to_string(),
            });
            continue;
        }

        if protected_paths.contains(&comparison_key) {
            skipped.push(SkippedBackgroundFileDeletion {
                relative_path: normalized,
                reason: "Protected background file is still referenced by the Asset Library."
                    .to_string(),
            });
            continue;
        }

        let target_path = project_dir.join(std::path::Path::new(&normalized));

        if !target_path.starts_with(&project_dir) {
            failed.push(FailedBackgroundFileDeletion {
                relative_path: normalized,
                error: "Local background path escapes the project directory.".to_string(),
            });
            continue;
        }

        let canonical_target = match target_path.canonicalize() {
            Ok(path) => path,
            Err(_) => {
                failed.push(FailedBackgroundFileDeletion {
                    relative_path: normalized,
                    error: "Local background file is missing.".to_string(),
                });
                continue;
            }
        };

        if !canonical_target.starts_with(&backgrounds_dir)
            || canonical_target.parent() != Some(backgrounds_dir.as_path())
        {
            failed.push(FailedBackgroundFileDeletion {
                relative_path: normalized,
                error: "Local background path escapes the allowed background directory."
                    .to_string(),
            });
            continue;
        }

        if !canonical_target.is_file() {
            failed.push(FailedBackgroundFileDeletion {
                relative_path: normalized,
                error: "Local background path is not a file.".to_string(),
            });
            continue;
        }

        let file_size = match std::fs::metadata(&canonical_target) {
            Ok(metadata) => metadata.len(),
            Err(error) => {
                failed.push(FailedBackgroundFileDeletion {
                    relative_path: normalized,
                    error: format!("Failed to inspect local background file: {}", error),
                });
                continue;
            }
        };

        match std::fs::remove_file(&canonical_target) {
            Ok(()) => deleted.push(DeletedBackgroundFile {
                relative_path: normalized,
                file_size,
            }),
            Err(error) => failed.push(FailedBackgroundFileDeletion {
                relative_path: normalized,
                error: format!("Failed to delete local background file: {}", error),
            }),
        }
    }

    Ok(DeleteLocalBackgroundFilesResult {
        deleted,
        skipped,
        failed,
    })
}

#[tauri::command]
fn write_playable_folder_export(
    trust: tauri::State<'_, ProjectFileSessionTrust>,
    source_project_file_path: String,
    destination_parent_directory: String,
    folder_name: String,
    index_html: String,
    local_asset_copies: Vec<PlayableFolderLocalAssetCopyRequest>,
) -> Result<PlayableFolderExportResult, String> {
    write_playable_folder_export_impl(
        &trust,
        &source_project_file_path,
        &destination_parent_directory,
        &folder_name,
        &index_html,
        local_asset_copies,
        rename_file,
    )
}

fn write_playable_folder_export_impl<F>(
    trust: &ProjectFileSessionTrust,
    source_project_file_path: &str,
    destination_parent_directory: &str,
    folder_name: &str,
    index_html: &str,
    local_asset_copies: Vec<PlayableFolderLocalAssetCopyRequest>,
    finalize_directory: F,
) -> Result<PlayableFolderExportResult, String>
where
    F: FnOnce(&Path, &Path) -> std::io::Result<()>,
{
    let trusted_source_path =
        trust.require_trusted_existing_narrium_project_file(Path::new(source_project_file_path))?;
    let source_project_dir =
        project_dir_from_narrium_file_path(&trusted_source_path.to_string_lossy())?;
    let source_backgrounds_dir = source_project_dir.join("assets").join("backgrounds");
    let destination_parent = canonical_export_parent_directory(destination_parent_directory)?;
    let safe_folder_name = validate_playable_export_folder_name(folder_name)?;
    let output_directory = destination_parent.join(safe_folder_name);

    if output_directory.exists() {
        return Err(
            "Playable folder export destination already exists. Choose a destination without an existing export folder."
                .to_string(),
        );
    }

    let staging_directory = playable_export_staging_directory(&destination_parent, folder_name);

    if staging_directory.exists() {
        return Err("Playable folder export staging directory already exists.".to_string());
    }

    validate_playable_folder_copy_plan(
        &source_project_dir,
        &source_backgrounds_dir,
        &local_asset_copies,
    )?;

    if let Err(error) = std::fs::create_dir(&staging_directory) {
        return Err(format!(
            "Failed to create playable export staging directory {}: {}",
            staging_directory.display(),
            error
        ));
    }

    let export_result = (|| {
        let index_html_path = staging_directory.join("index.html");

        std::fs::write(&index_html_path, index_html).map_err(|error| {
            format!(
                "Failed to write playable export index.html at {}: {}",
                index_html_path.display(),
                error
            )
        })?;

        for copy in &local_asset_copies {
            let source_relative_path =
                ensure_direct_background_relative_path(&copy.source_relative_path)?;
            let destination_relative_path =
                ensure_direct_background_relative_path(&copy.destination_relative_path)?;
            let source_path = source_project_dir.join(&source_relative_path);
            let canonical_source = source_path
                .canonicalize()
                .map_err(|error| format!("Failed to resolve export background asset: {}", error))?;

            if !canonical_source.starts_with(&source_backgrounds_dir)
                || canonical_source.parent() != Some(source_backgrounds_dir.as_path())
            {
                return Err(
                    "Playable export background source escapes assets/backgrounds/.".to_string(),
                );
            }

            let destination_path = staging_directory.join(destination_relative_path);

            if !destination_path.starts_with(&staging_directory) {
                return Err(
                    "Playable export destination path escapes the staging directory.".to_string(),
                );
            }

            if let Some(parent_path) = destination_path.parent() {
                std::fs::create_dir_all(parent_path).map_err(|error| {
                    format!(
                        "Failed to create playable export asset directory {}: {}",
                        parent_path.display(),
                        error
                    )
                })?;
            }

            std::fs::copy(&canonical_source, &destination_path).map_err(|error| {
                format!(
                    "Failed to copy playable export background {} to {}: {}",
                    canonical_source.display(),
                    destination_path.display(),
                    error
                )
            })?;
        }

        finalize_directory(&staging_directory, &output_directory).map_err(|error| {
            format!(
                "Failed to finalize playable export folder {}: {}",
                output_directory.display(),
                error
            )
        })?;

        Ok(PlayableFolderExportResult {
            output_directory: display_filesystem_path(&output_directory),
            index_html_path: display_filesystem_path(&output_directory.join("index.html")),
            copied_asset_count: local_asset_copies.len(),
        })
    })();

    if export_result.is_err() {
        cleanup_staging_dir(&staging_directory);
    }

    export_result
}

fn canonical_export_parent_directory(path: &str) -> Result<PathBuf, String> {
    let parent_path = Path::new(path);
    let canonical_parent = parent_path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve playable export destination: {}", error))?;

    if !canonical_parent.is_dir() {
        return Err("Playable export destination must be an existing directory.".to_string());
    }

    Ok(canonical_parent)
}

fn validate_playable_export_folder_name(folder_name: &str) -> Result<String, String> {
    let trimmed = folder_name.trim();

    if trimmed.is_empty() {
        return Err("Playable export folder name cannot be empty.".to_string());
    }

    let folder_path = Path::new(trimmed);

    if folder_path.is_absolute()
        || folder_path.components().count() != 1
        || folder_path
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return Err("Playable export folder name must be a single safe folder name.".to_string());
    }

    if trimmed == "." || trimmed == ".." {
        return Err("Playable export folder name is not valid.".to_string());
    }

    Ok(trimmed.to_string())
}

fn playable_export_staging_directory(destination_parent: &Path, folder_name: &str) -> PathBuf {
    destination_parent.join(format!(
        ".narrium-playable-export-{}-{}",
        sanitize_file_stem(Path::new(folder_name)),
        std::process::id()
    ))
}

fn validate_playable_folder_copy_plan(
    source_project_dir: &Path,
    source_backgrounds_dir: &Path,
    local_asset_copies: &[PlayableFolderLocalAssetCopyRequest],
) -> Result<(), String> {
    let mut seen_destinations = HashSet::new();
    let mut seen_sources = HashSet::new();

    for copy in local_asset_copies {
        let source_relative_path =
            ensure_direct_background_relative_path(&copy.source_relative_path)?;
        let destination_relative_path =
            ensure_direct_background_relative_path(&copy.destination_relative_path)?;
        let destination_key = background_relative_path_comparison_key(&destination_relative_path);
        let source_key = background_relative_path_comparison_key(&source_relative_path);

        if !seen_destinations.insert(destination_key) {
            return Err(
                "Playable export copy plan contains duplicate destination filenames.".to_string(),
            );
        }

        if !seen_sources.insert(source_key) {
            return Err("Playable export copy plan contains duplicate source files.".to_string());
        }

        let source_path = source_project_dir.join(&source_relative_path);
        let canonical_source = source_path
            .canonicalize()
            .map_err(|error| format!("Failed to resolve export background asset: {}", error))?;

        if !canonical_source.starts_with(source_backgrounds_dir)
            || canonical_source.parent() != Some(source_backgrounds_dir)
        {
            return Err(
                "Playable export background source escapes assets/backgrounds/.".to_string(),
            );
        }

        if !canonical_source.is_file() {
            return Err("Playable export background source is not a file.".to_string());
        }
    }

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
    fn rolls_back_final_files_when_staging_cleanup_fails_after_successful_moves() {
        let root = temp_root("rolls-back-staging-cleanup-failure");
        let project_path = materialization_project(&root);
        let existing_path = root.join("assets").join("backgrounds").join("forest.png");
        write_file(&existing_path, b"existing");

        let error = materialize_embedded_background_assets_impl_with_cleanup(
            &project_path.to_string_lossy(),
            vec![
                materialization_request("asset-1", "Forest", "image/png", PNG_BYTES),
                materialization_request("asset-2", "Lake", "image/png", PNG_BYTES),
            ],
            default_test_limits(),
            rename_file,
            |_staging_dir| {
                Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "simulated staging cleanup failure",
                ))
            },
        )
        .unwrap_err();

        assert!(error.contains("simulated staging cleanup failure"));
        assert!(staging_dirs(&root).is_empty());
        assert_eq!(
            fs::read(&existing_path).expect("existing file should remain"),
            b"existing"
        );
        assert!(!root
            .join("assets")
            .join("backgrounds")
            .join("forest-2.png")
            .exists());
        assert!(!root
            .join("assets")
            .join("backgrounds")
            .join("lake.png")
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
        let trust = trusted_session(&project_path);

        let result = read_project_file_impl(&trust, project_path.to_string_lossy().to_string())
            .expect("read should succeed");

        assert_eq!(result.0, project_path.to_string_lossy());
        assert!(result.1.contains("narrium.project"));
    }

    #[test]
    fn reads_valid_legacy_json_project_files() {
        let root = temp_root("reads-valid-json");
        let project_path = root.join("Legacy.json");
        write_file(&project_path, br#"{"id":"legacy"}"#);
        let trust = trusted_session(&project_path);

        let result = read_project_file_impl(&trust, project_path.to_string_lossy().to_string())
            .expect("read should succeed");

        assert_eq!(result.0, project_path.to_string_lossy());
        assert!(result.1.contains("legacy"));
    }

    #[test]
    fn rejects_unsupported_project_read_extensions() {
        let root = temp_root("rejects-read-extension");
        let project_path = root.join("Story.txt");
        write_file(&project_path, b"not a project");
        let trust = ProjectFileSessionTrust::default();

        let error =
            read_project_file_impl(&trust, project_path.to_string_lossy().to_string()).unwrap_err();

        assert!(error.contains("Open .narrium files or legacy .json files"));
    }

    #[test]
    fn rejects_unsupported_project_write_extensions() {
        let root = temp_root("rejects-write-extension");
        let project_path = root.join("Story.json");
        let trust = ProjectFileSessionTrust::default();

        let error = write_project_file_impl(
            &trust,
            project_path.to_string_lossy().to_string(),
            "{}".to_string(),
        )
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
        let trust = trusted_session(&project_path);

        let error =
            read_project_file_impl(&trust, project_path.to_string_lossy().to_string()).unwrap_err();

        assert!(error.contains("Project file is too large"));
    }

    #[test]
    fn imports_valid_background_assets_into_project_folder() {
        let root = temp_root("imports-valid-background");
        let project_path = root.join("Story.narrium");
        write_file(&project_path, b"{}");
        let source_path = root.join("Source Art").join("Forest Hall.PNG");
        write_file(&source_path, b"png bytes");
        let trust = trusted_session(&project_path);

        let result = import_background_asset_file_impl(
            &trust,
            &project_path.to_string_lossy(),
            &source_path.to_string_lossy(),
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
        let trust = trusted_session(&project_path);

        let error = import_background_asset_file_impl(
            &trust,
            &project_path.to_string_lossy(),
            &source_path.to_string_lossy(),
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
        fs::create_dir_all(
            destination_project
                .parent()
                .expect("destination should have parent"),
        )
        .expect("destination parent should exist");
        let trust = trusted_session(&source_project);
        trust
            .register_pending_save_destination(&destination_project)
            .expect("destination should be pending");

        copy_local_asset_for_project_save_as_impl(
            &trust,
            &source_project.to_string_lossy(),
            &destination_project.to_string_lossy(),
            "assets/backgrounds/forest.png",
        )
        .expect("copy should succeed");

        assert!(root
            .join("Copied")
            .join("assets")
            .join("backgrounds")
            .join("forest.png")
            .is_file());
    }

    fn cleanup_project(root: &Path) -> PathBuf {
        let project_path = root.join("Story.narrium");
        write_file(&project_path, b"{}");
        project_path
    }

    fn background_path(root: &Path, file_name: &str) -> PathBuf {
        root.join("assets").join("backgrounds").join(file_name)
    }

    fn trusted_session(project_path: &Path) -> ProjectFileSessionTrust {
        let trust = ProjectFileSessionTrust::default();
        trust
            .register_existing_project_file(project_path)
            .expect("project should be trusted for test");
        trust
    }

    fn pending_save_session(project_path: &Path) -> ProjectFileSessionTrust {
        let trust = ProjectFileSessionTrust::default();
        trust
            .register_pending_save_destination(project_path)
            .expect("save destination should be pending for test");
        trust
    }

    #[test]
    fn newly_opened_project_becomes_trusted() {
        let root = temp_root("allowlist-open-registers");
        let project_path = cleanup_project(&root);
        let trust = ProjectFileSessionTrust::default();

        trust
            .register_existing_project_file(&project_path)
            .expect("registration should succeed");

        assert!(trust
            .require_trusted_existing_project_file(&project_path)
            .is_ok());
    }

    #[test]
    fn trust_existing_project_file_registers_an_existing_project() {
        let root = temp_root("trust-command-registers");
        let project_path = cleanup_project(&root);
        let trust = ProjectFileSessionTrust::default();

        let trusted_path =
            trust_existing_project_file_impl(&trust, &project_path.to_string_lossy())
                .expect("trust registration should succeed");

        assert_eq!(trusted_path, project_path.to_string_lossy());
        assert!(read_project_file_impl(&trust, project_path.to_string_lossy().to_string()).is_ok());
    }

    #[test]
    fn trust_existing_project_file_rejects_nonexistent_projects() {
        let root = temp_root("trust-command-rejects-missing");
        let project_path = root.join("Missing.narrium");
        let trust = ProjectFileSessionTrust::default();

        let error =
            trust_existing_project_file_impl(&trust, &project_path.to_string_lossy()).unwrap_err();

        assert!(error.contains("Failed to inspect project file"));
        assert!(
            read_project_file_impl(&trust, project_path.to_string_lossy().to_string()).is_err()
        );
    }

    #[test]
    fn trust_existing_project_file_rejects_invalid_extensions() {
        let root = temp_root("trust-command-rejects-extension");
        let project_path = root.join("Story.txt");
        write_file(&project_path, b"{}");
        let trust = ProjectFileSessionTrust::default();

        let error =
            trust_existing_project_file_impl(&trust, &project_path.to_string_lossy()).unwrap_err();

        assert!(error.contains("Open .narrium files or legacy .json files"));
    }

    #[test]
    fn trust_existing_project_file_returns_the_canonical_display_path() {
        let root = temp_root("trust-command-canonical-path");
        let project_path = cleanup_project(&root);
        let equivalent_path = root.join(".").join("Story.narrium");
        let trust = ProjectFileSessionTrust::default();

        let trusted_path =
            trust_existing_project_file_impl(&trust, &equivalent_path.to_string_lossy())
                .expect("trust registration should succeed");

        assert_eq!(trusted_path, project_path.to_string_lossy());
    }

    #[test]
    fn successful_save_as_registers_destination() {
        let root = temp_root("allowlist-save-as-registers");
        let project_path = root.join("Story.narrium");
        let trust = pending_save_session(&project_path);

        write_project_file_impl(
            &trust,
            project_path.to_string_lossy().to_string(),
            "{}".to_string(),
        )
        .expect("write should succeed");

        assert!(trust
            .require_trusted_existing_narrium_project_file(&project_path)
            .is_ok());
    }

    #[test]
    fn fresh_allowlist_starts_empty() {
        let root = temp_root("allowlist-fresh-empty");
        let project_path = cleanup_project(&root);
        let trust = ProjectFileSessionTrust::default();

        let error = trust
            .require_trusted_existing_project_file(&project_path)
            .unwrap_err();

        assert!(error.contains("not trusted for this session"));
    }

    #[test]
    fn trusted_project_passes_validation() {
        let root = temp_root("allowlist-trusted-passes");
        let project_path = cleanup_project(&root);
        let trust = trusted_session(&project_path);

        assert!(trust
            .require_trusted_existing_narrium_project_file(&project_path)
            .is_ok());
    }

    #[test]
    fn untrusted_project_is_rejected() {
        let root = temp_root("allowlist-untrusted-rejected");
        let project_path = cleanup_project(&root);
        let trust = ProjectFileSessionTrust::default();

        let error =
            read_project_file_impl(&trust, project_path.to_string_lossy().to_string()).unwrap_err();

        assert!(error.contains("not trusted for this session"));
    }

    #[test]
    fn canonically_equivalent_paths_map_to_one_trusted_entry() {
        let root = temp_root("allowlist-canonical-equivalent");
        let project_path = cleanup_project(&root);
        let equivalent_path = root.join(".").join("Story.narrium");
        let trust = ProjectFileSessionTrust::default();

        trust
            .register_existing_project_file(&equivalent_path)
            .expect("registration should succeed");

        assert!(trust
            .require_trusted_existing_project_file(&project_path)
            .is_ok());
        assert_eq!(
            trust
                .trusted_project_files
                .lock()
                .expect("trust lock should be available")
                .len(),
            1,
        );
    }

    #[test]
    fn invalid_allowlist_paths_are_rejected() {
        let root = temp_root("allowlist-invalid-paths");
        let invalid_existing = root.join("Story.txt");
        write_file(&invalid_existing, b"not a project");
        let invalid_save = root.join("Story.json");
        let trust = ProjectFileSessionTrust::default();

        assert!(trust
            .register_existing_project_file(&invalid_existing)
            .is_err());
        assert!(trust
            .register_pending_save_destination(&invalid_save)
            .is_err());
    }

    #[test]
    fn every_project_filesystem_command_rejects_untrusted_projects() {
        let root = temp_root("allowlist-every-command-rejects");
        let source_project = cleanup_project(&root);
        let destination_project = root.join("Copy.narrium");
        write_file(&background_path(&root, "forest.png"), b"png");
        let source_image = root.join("source.png");
        write_file(&source_image, b"png");
        let trust = ProjectFileSessionTrust::default();

        assert!(
            read_project_file_impl(&trust, source_project.to_string_lossy().to_string()).is_err()
        );
        assert!(write_project_file_impl(
            &trust,
            source_project.to_string_lossy().to_string(),
            "{}".to_string()
        )
        .is_err());
        assert!(import_background_asset_file_impl(
            &trust,
            &source_project.to_string_lossy(),
            &source_image.to_string_lossy()
        )
        .is_err());
        assert!(resolve_local_asset_file_impl(
            &trust,
            &source_project.to_string_lossy(),
            "assets/backgrounds/forest.png"
        )
        .is_err());
        assert!(copy_local_asset_for_project_save_as_impl(
            &trust,
            &source_project.to_string_lossy(),
            &destination_project.to_string_lossy(),
            "assets/backgrounds/forest.png",
        )
        .is_err());
        assert!(materialize_embedded_background_assets_for_session_impl(
            &trust,
            &source_project.to_string_lossy(),
            vec![]
        )
        .is_err());
        assert!(
            list_local_background_files_impl(&trust, &source_project.to_string_lossy()).is_err()
        );
        assert!(fingerprint_local_background_files_impl(
            &trust,
            &source_project.to_string_lossy(),
            |_| {}
        )
        .is_err());
        assert!(delete_local_background_files_impl(
            &trust,
            &source_project.to_string_lossy(),
            vec![],
            vec![]
        )
        .is_err());
        assert!(write_playable_folder_export_impl(
            &trust,
            &source_project.to_string_lossy(),
            &root.to_string_lossy(),
            "story",
            "<!doctype html>",
            vec![],
            rename_file
        )
        .is_err());
    }

    #[test]
    fn every_project_filesystem_command_accepts_trusted_projects() {
        let root = temp_root("allowlist-every-command-accepts");
        let source_project = cleanup_project(&root);
        let destination_project = root.join("Copied").join("Copy.narrium");
        fs::create_dir_all(
            destination_project
                .parent()
                .expect("destination should have parent"),
        )
        .expect("destination parent should exist");
        write_file(&background_path(&root, "forest.png"), b"png");
        let source_image = root.join("source.png");
        write_file(&source_image, b"png");
        let trust = trusted_session(&source_project);
        trust
            .register_pending_save_destination(&destination_project)
            .expect("destination should be pending");

        assert!(
            read_project_file_impl(&trust, source_project.to_string_lossy().to_string()).is_ok()
        );
        assert!(write_project_file_impl(
            &trust,
            destination_project.to_string_lossy().to_string(),
            "{}".to_string()
        )
        .is_ok());
        assert!(import_background_asset_file_impl(
            &trust,
            &source_project.to_string_lossy(),
            &source_image.to_string_lossy()
        )
        .is_ok());
        assert!(resolve_local_asset_file_impl(
            &trust,
            &source_project.to_string_lossy(),
            "assets/backgrounds/forest.png"
        )
        .is_ok());
        assert!(copy_local_asset_for_project_save_as_impl(
            &trust,
            &source_project.to_string_lossy(),
            &destination_project.to_string_lossy(),
            "assets/backgrounds/forest.png",
        )
        .is_ok());
        assert!(materialize_embedded_background_assets_for_session_impl(
            &trust,
            &source_project.to_string_lossy(),
            vec![]
        )
        .is_ok());
        assert!(
            list_local_background_files_impl(&trust, &source_project.to_string_lossy()).is_ok()
        );
        assert!(fingerprint_local_background_files_impl(
            &trust,
            &source_project.to_string_lossy(),
            |_| {}
        )
        .is_ok());
        assert!(delete_local_background_files_impl(
            &trust,
            &source_project.to_string_lossy(),
            vec![],
            vec![]
        )
        .is_ok());
        assert!(write_playable_folder_export_impl(
            &trust,
            &source_project.to_string_lossy(),
            &root.to_string_lossy(),
            "story",
            "<!doctype html>",
            vec![],
            rename_file
        )
        .is_ok());
    }

    #[test]
    fn concurrent_allowlist_validation_is_safe() {
        let root = temp_root("allowlist-concurrent-validation");
        let project_path = cleanup_project(&root);
        let trust = std::sync::Arc::new(trusted_session(&project_path));
        let handles = (0..16)
            .map(|_| {
                let trust = std::sync::Arc::clone(&trust);
                let project_path = project_path.clone();

                std::thread::spawn(move || {
                    for _ in 0..64 {
                        trust
                            .require_trusted_existing_project_file(&project_path)
                            .expect("trusted project should validate");
                    }
                })
            })
            .collect::<Vec<_>>();

        for handle in handles {
            handle.join().expect("validation thread should finish");
        }
    }

    fn playable_copy(source: &str, destination: &str) -> PlayableFolderLocalAssetCopyRequest {
        PlayableFolderLocalAssetCopyRequest {
            source_relative_path: source.to_string(),
            destination_relative_path: destination.to_string(),
        }
    }

    #[test]
    fn writes_playable_folder_export_with_index_and_required_backgrounds() {
        let root = temp_root("playable-export-success");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"png");
        let export_parent = root.join("Exports");
        fs::create_dir_all(&export_parent).expect("export parent should exist");
        let trust = trusted_session(&project_path);

        let result = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![playable_copy(
                "assets/backgrounds/forest.png",
                "assets/backgrounds/forest.png",
            )],
            rename_file,
        )
        .expect("playable export should succeed");

        assert_eq!(result.copied_asset_count, 1);
        assert_eq!(
            fs::read_to_string(export_parent.join("my-story").join("index.html"))
                .expect("index should be readable"),
            "<!doctype html>"
        );
        assert_eq!(
            fs::read(
                export_parent
                    .join("my-story")
                    .join("assets")
                    .join("backgrounds")
                    .join("forest.png")
            )
            .expect("background should be readable"),
            b"png"
        );
    }

    #[test]
    fn rejects_existing_playable_export_output_without_merging() {
        let root = temp_root("playable-export-existing-output");
        let project_path = cleanup_project(&root);
        let export_parent = root.join("Exports");
        let output = export_parent.join("my-story");
        fs::create_dir_all(&output).expect("output should exist");
        write_file(&output.join("keep.txt"), b"keep");
        let trust = trusted_session(&project_path);

        let error = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![],
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("destination already exists"));
        assert_eq!(
            fs::read(output.join("keep.txt")).expect("existing file should remain"),
            b"keep"
        );
    }

    #[test]
    fn rejects_missing_playable_export_source_assets_before_staging() {
        let root = temp_root("playable-export-missing-source");
        let project_path = cleanup_project(&root);
        let export_parent = root.join("Exports");
        fs::create_dir_all(&export_parent).expect("export parent should exist");
        let trust = trusted_session(&project_path);

        let error = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![playable_copy(
                "assets/backgrounds/missing.png",
                "assets/backgrounds/missing.png",
            )],
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("Failed to resolve export background asset"));
        assert!(!export_parent.join("my-story").exists());
        assert!(fs::read_dir(&export_parent)
            .expect("export parent should be readable")
            .next()
            .is_none());
    }

    #[test]
    fn rejects_invalid_playable_export_paths() {
        let root = temp_root("playable-export-invalid-paths");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"png");
        let export_parent = root.join("Exports");
        fs::create_dir_all(&export_parent).expect("export parent should exist");
        let trust = trusted_session(&project_path);

        let source_error = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![playable_copy(
                "../forest.png",
                "assets/backgrounds/forest.png",
            )],
            rename_file,
        )
        .unwrap_err();
        let destination_error = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![playable_copy(
                "assets/backgrounds/forest.png",
                "assets/other/forest.png",
            )],
            rename_file,
        )
        .unwrap_err();

        assert!(source_error.contains("cannot escape"));
        assert!(destination_error.contains("assets/backgrounds"));
        assert!(!export_parent.join("my-story").exists());
    }

    #[test]
    fn rejects_duplicate_playable_export_destinations() {
        let root = temp_root("playable-export-duplicate-destinations");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"png");
        write_file(&background_path(&root, "lake.png"), b"png");
        let export_parent = root.join("Exports");
        fs::create_dir_all(&export_parent).expect("export parent should exist");
        let trust = trusted_session(&project_path);

        let error = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![
                playable_copy(
                    "assets/backgrounds/forest.png",
                    "assets/backgrounds/same.png",
                ),
                playable_copy("assets/backgrounds/lake.png", "assets/backgrounds/SAME.png"),
            ],
            rename_file,
        )
        .unwrap_err();

        assert!(error.contains("duplicate destination"));
        assert!(!export_parent.join("my-story").exists());
    }

    #[test]
    fn cleans_up_playable_export_staging_after_finalization_failure() {
        let root = temp_root("playable-export-finalize-failure");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"png");
        let export_parent = root.join("Exports");
        fs::create_dir_all(&export_parent).expect("export parent should exist");
        let trust = trusted_session(&project_path);

        let error = write_playable_folder_export_impl(
            &trust,
            &project_path.to_string_lossy(),
            &export_parent.to_string_lossy(),
            "my-story",
            "<!doctype html>",
            vec![playable_copy(
                "assets/backgrounds/forest.png",
                "assets/backgrounds/forest.png",
            )],
            |_from, _to| {
                Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "simulated finalize failure",
                ))
            },
        )
        .unwrap_err();

        assert!(error.contains("simulated finalize failure"));
        assert!(!export_parent.join("my-story").exists());
        assert!(fs::read_dir(&export_parent)
            .expect("export parent should be readable")
            .next()
            .is_none());
    }

    #[test]
    fn lists_supported_background_files_directly_under_backgrounds() {
        let root = temp_root("lists-supported-backgrounds");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"png");
        write_file(&background_path(&root, "lake.JPG"), b"jpg");
        write_file(&background_path(&root, "notes.txt"), b"text");
        write_file(
            &root
                .join("assets")
                .join("backgrounds")
                .join("nested")
                .join("deep.png"),
            b"png",
        );
        let trust = trusted_session(&project_path);

        let files = list_local_background_files_impl(&trust, &project_path.to_string_lossy())
            .expect("list should succeed");

        assert_eq!(
            files
                .iter()
                .map(|file| file.relative_path.as_str())
                .collect::<Vec<_>>(),
            vec![
                "assets/backgrounds/forest.png",
                "assets/backgrounds/lake.JPG"
            ]
        );
        assert_eq!(files[0].file_size, 3);
    }

    #[test]
    fn missing_background_directory_lists_as_empty() {
        let root = temp_root("missing-background-directory");
        let project_path = cleanup_project(&root);
        let trust = trusted_session(&project_path);

        let files = list_local_background_files_impl(&trust, &project_path.to_string_lossy())
            .expect("list should succeed");

        assert!(files.is_empty());
    }

    #[test]
    fn unsupported_background_extensions_are_ignored_by_listing_and_rejected_for_delete() {
        let root = temp_root("unsupported-background-extension");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "notes.txt"), b"text");
        let trust = trusted_session(&project_path);

        let files = list_local_background_files_impl(&trust, &project_path.to_string_lossy())
            .expect("list should succeed");
        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/notes.txt".to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(files.is_empty());
        assert!(result.deleted.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(background_path(&root, "notes.txt").is_file());
    }

    #[test]
    fn rejects_absolute_deletion_paths() {
        let root = temp_root("rejects-absolute-delete");
        let project_path = cleanup_project(&root);
        let absolute_path = background_path(&root, "forest.png");
        write_file(&absolute_path, b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec![absolute_path.to_string_lossy().to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(absolute_path.is_file());
    }

    #[test]
    fn rejects_parent_traversal_deletion_paths() {
        let root = temp_root("rejects-traversal-delete");
        let project_path = cleanup_project(&root);
        let outside_path = root.join("outside.png");
        write_file(&outside_path, b"outside");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/../../outside.png".to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(outside_path.is_file());
    }

    #[test]
    fn rejects_deletion_paths_outside_backgrounds() {
        let root = temp_root("rejects-outside-backgrounds");
        let project_path = cleanup_project(&root);
        let asset_path = root.join("assets").join("portrait.png");
        write_file(&asset_path, b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/portrait.png".to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(asset_path.is_file());
    }

    #[test]
    fn rejects_nested_background_deletion_paths() {
        let root = temp_root("rejects-nested-backgrounds");
        let project_path = cleanup_project(&root);
        let nested_path = root
            .join("assets")
            .join("backgrounds")
            .join("nested")
            .join("deep.png");
        write_file(&nested_path, b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/nested/deep.png".to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(nested_path.is_file());
    }

    #[test]
    fn deletes_supported_valid_background_files() {
        let root = temp_root("deletes-valid-background");
        let project_path = cleanup_project(&root);
        let asset_path = background_path(&root, "forest.png");
        write_file(&asset_path, b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/forest.png".to_string()],
            vec![],
        )
        .expect("delete command should succeed");

        assert_eq!(
            result.deleted,
            vec![DeletedBackgroundFile {
                relative_path: "assets/backgrounds/forest.png".to_string(),
                file_size: 3,
            }]
        );
        assert!(!asset_path.exists());
    }

    #[test]
    fn deletes_multiple_valid_background_files_in_one_batch() {
        let root = temp_root("deletes-multiple-backgrounds");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "one.png"), b"one");
        write_file(&background_path(&root, "two.webp"), b"two");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec![
                "assets/backgrounds/one.png".to_string(),
                "assets/backgrounds/two.webp".to_string(),
            ],
            vec![],
        )
        .expect("delete command should succeed");

        assert_eq!(result.deleted.len(), 2);
        assert!(!background_path(&root, "one.png").exists());
        assert!(!background_path(&root, "two.webp").exists());
    }

    #[test]
    fn invalid_candidates_do_not_delete_outside_project_directory() {
        let root = temp_root("invalid-candidate-does-not-delete-outside");
        let project_path = cleanup_project(&root);
        let outside_path = root.join("outside.png");
        write_file(&outside_path, b"outside");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["../outside.png".to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(outside_path.is_file());
    }

    #[test]
    fn missing_candidate_files_are_reported_safely() {
        let root = temp_root("missing-candidate-safe");
        let project_path = cleanup_project(&root);
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/missing.png".to_string()],
            vec![],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(
            result.failed,
            vec![FailedBackgroundFileDeletion {
                relative_path: "assets/backgrounds/missing.png".to_string(),
                error: "Local background file is missing.".to_string(),
            }]
        );
    }

    #[test]
    fn partial_batch_failure_returns_structured_partial_result() {
        let root = temp_root("partial-batch-failure");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "valid.png"), b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec![
                "assets/backgrounds/valid.png".to_string(),
                "assets/backgrounds/missing.png".to_string(),
            ],
            vec![],
        )
        .expect("delete command should return structured result");

        assert_eq!(result.deleted.len(), 1);
        assert_eq!(result.failed.len(), 1);
        assert!(!background_path(&root, "valid.png").exists());
    }

    #[test]
    fn protected_paths_passed_to_rust_are_not_deleted() {
        let root = temp_root("protected-paths-not-deleted");
        let project_path = cleanup_project(&root);
        let asset_path = background_path(&root, "forest.png");
        write_file(&asset_path, b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/forest.png".to_string()],
            vec!["assets/backgrounds/forest.png".to_string()],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.skipped.len(), 1);
        assert!(asset_path.is_file());
    }

    #[test]
    fn protected_paths_are_checked_case_insensitively() {
        let root = temp_root("protected-paths-case-insensitive");
        let project_path = cleanup_project(&root);
        let asset_path = background_path(&root, "forest.png");
        write_file(&asset_path, b"png");
        let trust = trusted_session(&project_path);

        let result = delete_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            vec!["assets/backgrounds/forest.png".to_string()],
            vec!["assets/backgrounds/Forest.png".to_string()],
        )
        .expect("delete command should return structured result");

        assert!(result.deleted.is_empty());
        assert_eq!(result.skipped.len(), 1);
        assert!(asset_path.is_file());
    }

    #[test]
    fn missing_background_directory_fingerprints_as_empty() {
        let root = temp_root("fingerprint-missing-background-directory");
        let project_path = cleanup_project(&root);
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert!(files.is_empty());
    }

    #[test]
    fn supported_direct_background_files_are_fingerprinted() {
        let root = temp_root("fingerprint-supported-backgrounds");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"abc");
        write_file(&background_path(&root, "lake.JPG"), b"xyz");
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert_eq!(
            files
                .iter()
                .map(|file| file.relative_path.as_str())
                .collect::<Vec<_>>(),
            vec![
                "assets/backgrounds/forest.png",
                "assets/backgrounds/lake.JPG"
            ]
        );
        assert_eq!(files[0].file_name, "forest.png");
        assert_eq!(files[0].file_size, 3);
        assert_eq!(
            files[0].content_hash,
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn unsupported_extensions_are_ignored_by_fingerprinting() {
        let root = temp_root("fingerprint-ignores-unsupported");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "notes.txt"), b"text");
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert!(files.is_empty());
    }

    #[test]
    fn nested_background_files_are_ignored_by_fingerprinting() {
        let root = temp_root("fingerprint-ignores-nested");
        let project_path = cleanup_project(&root);
        write_file(
            &root
                .join("assets")
                .join("backgrounds")
                .join("nested")
                .join("deep.png"),
            b"deep",
        );
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert!(files.is_empty());
    }

    #[test]
    fn identical_file_bytes_produce_identical_hashes() {
        let root = temp_root("fingerprint-identical-hashes");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "one.png"), b"same");
        write_file(&background_path(&root, "two.webp"), b"same");
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert_eq!(files[0].content_hash, files[1].content_hash);
    }

    #[test]
    fn different_file_bytes_produce_different_hashes() {
        let root = temp_root("fingerprint-different-hashes");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "one.png"), b"one");
        write_file(&background_path(&root, "two.webp"), b"two");
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert_ne!(files[0].content_hash, files[1].content_hash);
    }

    #[test]
    fn file_hashes_are_deterministic() {
        let root = temp_root("fingerprint-deterministic");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"stable");
        let trust = trusted_session(&project_path);

        let first = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("first fingerprint should succeed");
        let second = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("second fingerprint should succeed");

        assert_eq!(first, second);
    }

    #[test]
    fn fingerprint_relative_paths_use_forward_slashes() {
        let root = temp_root("fingerprint-forward-slashes");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "forest.png"), b"abc");
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert_eq!(files[0].relative_path, "assets/backgrounds/forest.png");
    }

    #[test]
    fn nonexistent_project_paths_are_rejected_for_fingerprinting() {
        let root = temp_root("fingerprint-rejects-missing-project");
        let project_path = root.join("Missing.narrium");
        let trust = ProjectFileSessionTrust::default();

        let error = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .unwrap_err();

        assert!(error.contains("Failed to inspect project file"));
    }

    #[test]
    fn non_narrium_project_paths_are_rejected_for_fingerprinting() {
        let root = temp_root("fingerprint-rejects-non-narrium");
        let project_path = root.join("Story.json");
        write_file(&project_path, b"{}");
        let trust = trusted_session(&project_path);

        let error = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .unwrap_err();

        assert!(error.contains("Save projects as .narrium files"));
    }

    #[test]
    fn fingerprinting_does_not_scan_outside_backgrounds() {
        let root = temp_root("fingerprint-does-not-scan-outside");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "inside.png"), b"inside");
        write_file(&root.join("assets").join("outside.png"), b"outside");
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].relative_path, "assets/backgrounds/inside.png");
    }

    #[test]
    fn symlink_escape_does_not_expose_outside_files_when_supported() {
        let root = temp_root("fingerprint-symlink-escape");
        let project_path = cleanup_project(&root);
        let outside_path = root.join("outside.png");
        let symlink_path = background_path(&root, "linked.png");
        write_file(&outside_path, b"outside");

        #[cfg(unix)]
        {
            if std::os::unix::fs::symlink(&outside_path, &symlink_path).is_err() {
                return;
            }
        }

        #[cfg(windows)]
        {
            if std::os::windows::fs::symlink_file(&outside_path, &symlink_path).is_err() {
                return;
            }
        }

        #[cfg(not(any(unix, windows)))]
        {
            return;
        }
        let trust = trusted_session(&project_path);

        let files = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |_| {},
        )
        .expect("fingerprint should succeed");

        assert!(files.is_empty());
    }

    #[test]
    fn fingerprint_read_failures_return_useful_errors() {
        let root = temp_root("fingerprint-read-failure");
        let project_path = cleanup_project(&root);
        write_file(&background_path(&root, "vanish.png"), b"vanish");
        let trust = trusted_session(&project_path);

        let error = fingerprint_local_background_files_impl(
            &trust,
            &project_path.to_string_lossy(),
            |path| {
                let _ = fs::remove_file(path);
            },
        )
        .unwrap_err();

        assert!(error.contains("Failed to open background file vanish.png"));
    }

    #[test]
    fn writes_valid_narrium_project_files() {
        let root = temp_root("writes-valid-narrium");
        let project_path = root.join("Nested").join("Story.narrium");
        fs::create_dir_all(project_path.parent().expect("project should have parent")).unwrap();
        let trust = pending_save_session(&project_path);

        let saved_path = write_project_file_impl(
            &trust,
            project_path.to_string_lossy().to_string(),
            "{}".to_string(),
        )
        .expect("write should succeed");

        assert_eq!(saved_path, project_path.to_string_lossy());
        assert_eq!(
            fs::read_to_string(project_path).expect("file should be readable"),
            "{}"
        );
    }
}
