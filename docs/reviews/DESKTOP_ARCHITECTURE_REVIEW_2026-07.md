# Executive Summary

Narrium is now substantially desktop-first in its project-file workflow, but a few important browser-era assumptions and transitional seams still need to be retired before the architecture fully matches the intended desktop design.

Overall architecture score: 7/10

Strengths:
- `.narrium` project files are the persistent source of truth for file-backed desktop projects.
- File-backed projects no longer mirror full `Project` payloads into `localStorage`.
- The main dependency direction is mostly respected: UI/features -> stores -> services -> platform/domain -> Tauri/browser.
- Tauri API imports are contained in the platform service and tests.
- The asset catalog is now canonical for new background assignments, with desktop local background imports stored as project-relative paths.
- Runtime, validation, project normalization, and standalone export have useful boundaries and focused tests.

Weaknesses:
- Native window close still bypasses dirty-state protection.
- Security configuration is broader than the current feature set needs, especially the asset protocol scope.
- Standalone HTML export and JSON export are still browser-style download flows and do not package local desktop assets.
- `localStorage` remains necessary for browser compatibility and drafts, but app preferences and workspace metadata still use the browser adapter even in desktop builds.
- Some UI components still contain browser file APIs directly for JSON import, thumbnails, and browser uploads.
- Documentation has drifted in a few places and mixes completed desktop asset work with older planned language.

Risk assessment: Medium. There are no signs of a failed desktop pivot, but unsaved-close behavior, asset protocol scope, and local-asset export gaps are high-leverage risks for real desktop use.

Desktop readiness assessment: Good for early desktop authoring with explicit Open, Save, Save As, recent files, and local background assets. Not yet production-ready for data-loss protection, hardened security, or fully portable desktop exports.

Validation results:
- `npm.cmd test`: Passed. 27 test files, 221 tests.
- `npm.cmd run build`: Passed. Vite production build completed; main JS bundle was 455.56 kB before gzip.
- `npm.cmd run desktop:build`: Failed after the frontend build passed. Tauri/Rust failed to remove `src-tauri/target/release/narrium.exe` with Windows access denied (`os error 5`). A running `narrium.exe` process was holding that release binary, so this looks like a local file lock rather than a compile failure.

# Findings

## P1 High

### Native Window Close Can Lose Unsaved File-Backed Work

Category: F. UX issue

Priority: P1 High

Files involved:
- `src/services/platform/DesktopPlatformService.ts`
- `src/store/workspaceStore.ts`
- `docs/DESKTOP_ARCHITECTURE.md`
- `docs/CHANGELOG.md`

Explanation:
Desktop dirty-state checks exist for Open Project File and Create Project, but native close handling currently returns a no-op because the earlier async close guard could trap the app. Closing the desktop window can therefore bypass the same Save, Don't Save, Cancel flow used elsewhere.

Why it matters:
A desktop-first editor must protect authors from accidental data loss on the most common desktop exit path.

Recommended solution:
Add a dedicated native-close design that uses Tauri close events safely, blocks only while the decision is pending, and routes through the same platform unsaved-changes service. Keep the existing explicit Open/Create guards unchanged.

Estimated implementation size: M

Blocks future work: Yes

### Tauri Asset Protocol Scope Is Broader Than Needed

Category: H. Security concern

Priority: P1 High

Files involved:
- `src-tauri/tauri.conf.json`
- `src/services/platform/DesktopPlatformService.ts`
- `src-tauri/src/lib.rs`
- `src/services/platform/assetProtocolConfig.test.ts`

Explanation:
The Tauri asset protocol is enabled with `scope: ["**"]`. The Rust resolver validates project-relative local asset paths before converting them to asset URLs, which is good, but the protocol configuration itself allows a very broad asset surface.

Why it matters:
Desktop apps should grant the renderer only the filesystem visibility it needs. A broad asset protocol scope increases the impact of any future renderer injection or path-handling mistake.

Recommended solution:
Constrain the asset protocol scope to the smallest workable set, ideally project asset directories or paths returned by the Rust resolver. If dynamic scope is required, keep all resolution in Rust and document why any remaining wildcard is unavoidable.

Estimated implementation size: S

Blocks future work: Yes

### Custom Tauri File Commands Accept Arbitrary Frontend Paths

Category: H. Security concern

Priority: P1 High

Files involved:
- `src-tauri/src/lib.rs`
- `src/services/platform/DesktopPlatformService.ts`
- `src/services/project-file/ProjectFileService.ts`

Explanation:
`read_project_file` and `write_project_file` read or write the path string supplied by the frontend. Normal use obtains paths from native dialogs, but the Rust commands themselves do not enforce extension, remembered grants, size limits, or a selected-path allowlist.

Why it matters:
The current command surface is small, but desktop security should not rely only on the happy-path UI. If renderer code is compromised, these commands are broader than the product workflow requires.

Recommended solution:
Move more policy into Rust: validate `.narrium`/legacy `.json` open extensions, limit file size before reading, avoid creating arbitrary parent directories unless Save As selected that destination, and consider a session allowlist of dialog-selected paths.

Estimated implementation size: M

Blocks future work: Yes

### Standalone HTML Export Does Not Support Local Desktop Assets

Category: D. Architecture inconsistency

Priority: P1 High

Files involved:
- `src/services/export/standaloneHtmlExport.ts`
- `src/services/project-file/ProjectFileService.ts`
- `src/features/assets/assetDisplay.ts`
- `docs/DESKTOP_ARCHITECTURE.md`
- `docs/DATA_MODEL.md`

Explanation:
The editor can now store desktop background assets as `storageType: "local"` with project-relative paths. The standalone HTML export still creates a single browser-style HTML file and explicitly returns no background URL for local assets.

Why it matters:
Authors can build a desktop project that previews local backgrounds in the editor but loses those backgrounds in standalone export. That is coherent as a transitional compatibility feature, but it no longer matches the desktop asset model.

Recommended solution:
Keep standalone HTML as legacy/browser compatibility, but add export preflight warnings for local assets and design the future folder/package export to copy project-relative assets beside the player.

Estimated implementation size: M

Blocks future work: Yes

### Desktop Build Can Fail When Existing Release Binary Is Running

Category: E. Technical debt

Priority: P1 High

Files involved:
- `package.json`
- `src-tauri/target/release/narrium.exe`

Explanation:
`npm.cmd run desktop:build` failed because Windows could not remove `src-tauri/target/release/narrium.exe`; a running `narrium.exe` process was using that exact file.

Why it matters:
This is a predictable desktop development footgun. It can hide real build failures and makes validation less reliable.

Recommended solution:
Document the requirement to close the release app before packaging, or add a non-destructive preflight script that detects and reports the running process with a clear message before Tauri starts compiling.

Estimated implementation size: XS

Blocks future work: No

## P2 Medium

### Desktop App Preferences Still Use Browser localStorage

Category: B. Intentional transitional desktop compatibility

Priority: P2 Medium

Files involved:
- `src/services/app-preferences/AppPreferencesService.ts`
- `src/store/workspaceStore.ts`
- `docs/DESKTOP_ARCHITECTURE.md`
- `docs/DATA_MODEL.md`

Explanation:
Recent projects and last-opened project metadata are stored through `BrowserAppPreferencesService`, which uses `window.localStorage`. This does not store full file-backed project payloads, but it is still browser storage inside a desktop app.

Why it matters:
Recent files are desktop app preferences and would be more durable and inspectable in an app-data preference file. Keeping them in localStorage ties desktop UX state to the webview storage lifecycle.

Recommended solution:
Add a desktop app-preferences implementation behind the existing service interface. Store recent file metadata in Tauri app data, while preserving the browser implementation for Vite/browser compatibility.

Estimated implementation size: S

Blocks future work: No

### BrowserProjectStorage Remains the Full Draft and Browser Store

Category: B. Intentional transitional desktop compatibility

Priority: P2 Medium

Files involved:
- `src/services/project-storage/BrowserProjectStorage.ts`
- `src/store/workspaceStore.ts`
- `src/features/workspace/MyProjectsScreen.tsx`
- `docs/DESKTOP_ARCHITECTURE.md`
- `docs/DATA_MODEL.md`

Explanation:
`BrowserProjectStorage` still stores `narrium_workspace` and full `narrium_project_{id}` project payloads. File-backed desktop projects avoid this path after open/edit/save, but Create Project and imported JSON remain localStorage-backed drafts until Save As.

Why it matters:
This is an intentional bridge, but drafts can still contain large embedded images and can hit browser storage quotas. It also keeps My Projects partly shaped like a browser workspace instead of a desktop recent-files launcher.

Recommended solution:
Keep this for browser compatibility, but make the desktop draft lifecycle temporary and visible. Prefer creating a `.narrium` file earlier in desktop flows, or add a desktop draft backend if unsaved drafts remain a first-class feature.

Estimated implementation size: M

Blocks future work: No

### UI Components Still Own Browser File Import Details

Category: D. Architecture inconsistency

Priority: P2 Medium

Files involved:
- `src/features/workspace/MyProjectsScreen.tsx`
- `src/features/editor/SceneEditorPanel.tsx`
- `src/store/workspaceStore.ts`
- `src/services/platform/PlatformService.ts`

Explanation:
React components directly use file inputs, `File.text()`, and `FileReader` for JSON import, thumbnails, and browser background uploads. The desktop upload branch correctly goes through the platform service, but browser file handling remains in UI code.

Why it matters:
The browser compatibility layer is still leaking into feature components. As desktop import/migration grows, this can duplicate parsing, error handling, size checks, and asset decisions across UI surfaces.

Recommended solution:
Move JSON import, thumbnail import, and browser upload reading behind small services or platform helper methods. Keep components responsible for intent and user feedback, not file decoding.

Estimated implementation size: M

Blocks future work: No

### Platform Service Mixes Platform Identity, Dialogs, Files, Assets, and Close Lifecycle

Category: E. Technical debt

Priority: P2 Medium

Files involved:
- `src/services/platform/PlatformService.ts`
- `src/services/platform/DesktopPlatformService.ts`
- `src/services/project-file/ProjectFileService.ts`
- `src/features/editor/SceneEditorPanel.tsx`

Explanation:
`PlatformService` has grown from platform identity into project file selection, raw file read/write, background import, local asset display resolution, Save As asset copying, unsaved-change dialogs, and lifecycle close hooks.

Why it matters:
The boundary is still useful, but future desktop features will make this interface bulky and harder to test. It also encourages UI code to call the platform service directly for feature behavior.

Recommended solution:
Split only when the next feature needs it: keep platform identity separate, move project-file APIs under project-file infrastructure, and move asset file operations under an asset-file service that still delegates to Tauri through a narrow adapter.

Estimated implementation size: M

Blocks future work: No

### Project Model Still Carries Legacy Direct Background Fields

Category: C. Obsolete web legacy

Priority: P2 Medium

Files involved:
- `src/types/index.ts`
- `src/domain/project/projectMigrations.ts`
- `src/features/editor/SceneEditorPanel.tsx`
- `src/features/assets/assetDisplay.ts`
- `docs/DATA_MODEL.md`

Explanation:
`SceneBackground` still includes `mode: "upload" | "url"` and a `url` string. New UI hides direct URL/upload modes and normalizes legacy backgrounds into `AssetLibraryItem`, but preview/rendering code still supports the legacy fields.

Why it matters:
The extra fields make every background consumer handle both the old direct-source model and the asset model. This increases validation and export complexity.

Recommended solution:
Keep compatibility while imports from old projects are still common, but mark the fields as legacy in code comments/types and plan a future format version that can remove direct scene source fields after migration coverage is complete.

Estimated implementation size: S

Blocks future work: No

### Local Asset Lifecycle Has No Cleanup or Duplicate Control

Category: E. Technical debt

Priority: P2 Medium

Files involved:
- `src-tauri/src/lib.rs`
- `src/store/useCanvasStore.ts`
- `src/services/project-file/ProjectFileService.ts`
- `docs/DESKTOP_ARCHITECTURE.md`
- `docs/DATA_MODEL.md`

Explanation:
Imported background files are copied into `assets/backgrounds/`, but deleting an asset only clears catalog references. There is no physical deletion, orphan detection, hashing, duplicate detection, or embedded-to-local extraction.

Why it matters:
Project folders can grow with unused or duplicate assets. Save As copies referenced assets, but long-lived projects will accumulate stale files.

Recommended solution:
Add asset maintenance incrementally: detect unused files, show cleanup warnings, add hash-based duplicate detection for imports, and only then consider physical deletion with confirmation.

Estimated implementation size: L

Blocks future work: No

### Large Images Can Still Inflate JSON and Browser Storage

Category: G. Performance concern

Priority: P2 Medium

Files involved:
- `src/features/workspace/MyProjectsScreen.tsx`
- `src/features/editor/SceneEditorPanel.tsx`
- `src/services/project-storage/BrowserProjectStorage.ts`
- `src/services/project-file/ProjectFileService.ts`
- `docs/DATA_MODEL.md`

Explanation:
Project thumbnails are stored as Data URLs in `Project.thumbnail` and mirrored to workspace metadata. Browser uploads and legacy imports can still store embedded Data URL assets. `.narrium` normalization preserves those embedded payloads.

Why it matters:
Large images increase JSON size, serialization cost, history snapshot size, localStorage quota pressure, and Save/Load latency.

Recommended solution:
Add image size limits and thumbnail resizing/compression. For desktop file-backed projects, provide migration from embedded background assets to local files.

Estimated implementation size: M

Blocks future work: No

### Snapshot Undo/Redo Copies Whole Project Objects

Category: G. Performance concern

Priority: P2 Medium

Files involved:
- `src/store/projectHistory.ts`
- `src/store/workspaceStore.ts`
- `src/store/useCanvasStore.ts`
- `src/types/index.ts`

Explanation:
Undo/redo stores full project snapshots, capped at 50. This is simple and well-tested, but embedded thumbnails/assets and larger scene graphs can make each edit expensive.

Why it matters:
Desktop projects are likely to become larger as local assets, scene groups, and richer authoring features expand. Full snapshots can cause memory pressure and slow edits.

Recommended solution:
Keep the current MVP behavior for now, but add project-size instrumentation and later move high-volume edit paths toward patches or scoped snapshots.

Estimated implementation size: L

Blocks future work: No

### Save As Copies Local Assets With Unbounded Parallelism

Category: G. Performance concern

Priority: P2 Medium

Files involved:
- `src/services/project-file/ProjectFileService.ts`
- `src-tauri/src/lib.rs`

Explanation:
Save As copies all referenced local background assets through `Promise.all`. For small projects this is fine, but many large assets could launch too many simultaneous filesystem operations.

Why it matters:
Large projects may produce slow or fragile Save As behavior, especially on network drives or slower disks.

Recommended solution:
Copy assets with a small concurrency limit and surface progress/failure context in the desktop workflow.

Estimated implementation size: S

Blocks future work: No

### Project Serialization Is Duplicated Across Save, Export, History, and Storage

Category: G. Performance concern

Priority: P2 Medium

Files involved:
- `src/services/project-file/ProjectFileService.ts`
- `src/utils/projectExport.ts`
- `src/services/export/standaloneHtmlExport.ts`
- `src/services/project-storage/BrowserProjectStorage.ts`
- `src/store/projectHistory.ts`

Explanation:
Full `Project` JSON is serialized for `.narrium` saves, JSON export, standalone HTML embedding, browser storage, and snapshot history. These paths are currently independent.

Why it matters:
As projects grow, duplicate serialization work will make Save, Export, and frequent edits less predictable.

Recommended solution:
Do not centralize prematurely, but add size metrics and preflight warnings. Later introduce shared serialization utilities for normalized project output and user-facing size diagnostics.

Estimated implementation size: M

Blocks future work: No

## P3 Low

### JSON and HTML Export Use Browser Download APIs

Category: A. Intentional browser compatibility

Priority: P3 Low

Files involved:
- `src/utils/projectExport.ts`
- `src/services/export/standaloneHtmlExport.ts`
- `src/app/App.tsx`

Explanation:
Export JSON and Export HTML create `Blob` URLs, click temporary anchor elements, and revoke URLs with `window.setTimeout`. This is still appropriate for browser compatibility and the legacy standalone export.

Why it matters:
In desktop builds, these exports behave like browser downloads rather than native Save dialogs, which is less coherent than the `.narrium` Save/Save As workflow.

Recommended solution:
Keep the current browser exports, but add desktop-native export services when export formats are revisited. Reuse native Save dialogs for desktop JSON export and future playable packages.

Estimated implementation size: S

Blocks future work: No

### BrowserPlatformService Uses Native Browser confirm

Category: A. Intentional browser compatibility

Priority: P3 Low

Files involved:
- `src/services/platform/BrowserPlatformService.ts`
- `src/store/workspaceStore.ts`

Explanation:
The browser platform implementation uses `window.confirm` for unsaved changes. In normal UI delete flows, Narrium uses the custom confirmation dialog, while this platform path is a browser fallback.

Why it matters:
It is acceptable as browser compatibility, but the UX differs from the desktop Tauri dialog and from custom in-app confirmations.

Recommended solution:
Leave it unless browser UX becomes a product target again. If needed, route browser unsaved-change prompts through the same reusable in-app confirmation UI.

Estimated implementation size: S

Blocks future work: No

### Recent-Project Card Association Can Fall Back to Unique Name Matching

Category: B. Intentional transitional desktop compatibility

Priority: P3 Low

Files involved:
- `src/features/workspace/MyProjectsScreen.tsx`
- `src/services/app-preferences/AppPreferencesService.ts`

Explanation:
Recent project associations prefer `projectId`, but older metadata can associate by unique project name. Duplicate names intentionally avoid auto-association.

Why it matters:
This keeps older recent metadata useful, but name-based matching is inherently transitional and can confuse users if files are renamed outside Narrium.

Recommended solution:
Keep it for a limited compatibility window. Eventually require `projectId` or a stronger file identity and remove unique-name fallback.

Estimated implementation size: XS

Blocks future work: No

### Documentation Has Desktop Status Drift

Category: E. Technical debt

Priority: P3 Low

Files involved:
- `CONTEXT.md`
- `docs/ROADMAP.md`
- `docs/DESKTOP_ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/CHANGELOG.md`

Explanation:
The docs are mostly accurate, but there is drift. For example, `docs/ROADMAP.md` says the next immediate step is E11-05B even though E11-05B is already documented as done, and some summary text still says local asset file storage has not been implemented while later sections describe it as implemented for backgrounds.

Why it matters:
Architecture docs are part of the handoff system for this project. Drift can cause future tasks to re-open completed work or miss the actual next dependency.

Recommended solution:
Do a documentation-only reconciliation pass after this review: update current status, next immediate step, and distinguish "background local assets implemented" from "general asset storage still future."

Estimated implementation size: S

Blocks future work: No

### Compatibility Wrappers Preserve Old Import Paths

Category: B. Intentional transitional desktop compatibility

Priority: P3 Low

Files involved:
- `src/utils/projectImport.ts`
- `src/utils/standaloneHtmlExport.ts`
- `src/services/export/standaloneHtmlExport.ts`
- `src/domain/project/index.ts`

Explanation:
Wrappers keep older import paths working after logic moved into domain/services. This avoids churn, but it means both old and new paths remain visible.

Why it matters:
The wrappers are low risk, but future contributors may import from the legacy paths and keep the old structure alive longer than intended.

Recommended solution:
Keep wrappers until the desktop pivot stabilizes, then update imports gradually and mark wrappers as compatibility-only.

Estimated implementation size: XS

Blocks future work: No

### Every Remaining localStorage Usage

Category: A. Intentional browser compatibility

Priority: P3 Low

Files involved:
- `src/services/project-storage/BrowserProjectStorage.ts`
- `src/services/app-preferences/AppPreferencesService.ts`
- `src/services/export/standaloneHtmlExport.ts`
- `docs/DATA_MODEL.md`
- `docs/DESKTOP_ARCHITECTURE.md`

Explanation:
Remaining runtime `localStorage` usage is:
- `BrowserProjectStorage`: intentional for browser projects and transitional desktop drafts; obsolete as long-term desktop project persistence.
- `AppPreferencesService`: transitional desktop compatibility for recent projects and last-opened project metadata.
- `standaloneHtmlExport`: intentional browser compatibility inside exported standalone players; it stores runtime snapshots only, not full project payloads.

Tests also mock or assert these uses, and docs mention them as compatibility behavior.

Why it matters:
This confirms the key desktop invariant: file-backed desktop projects no longer store full `Project` payloads in localStorage after open/edit/save. The remaining concern is not hidden project mirroring, but the need to retire localStorage for desktop preferences and reduce draft reliance.

Recommended solution:
Preserve browser compatibility. Add a desktop app-preferences backend and keep drafts clearly transitional. Do not remove standalone player localStorage unless the exported-player save design changes.

Estimated implementation size: S

Blocks future work: No

# Recommended Implementation Order

1. Restore safe native-close dirty protection for desktop.
2. Tighten Tauri asset protocol scope and add Rust-side policy checks for project file commands.
3. Add a desktop app-preferences backend for recent projects and last-opened file.
4. Add export preflight warnings for local assets and validation issues.
5. Add desktop-native JSON export Save dialog support.
6. Add image size limits plus thumbnail compression/resizing.
7. Add embedded-background-to-local-asset migration for file-backed desktop projects.
8. Add local asset cleanup/orphan detection and duplicate detection.
9. Split the platform service only where new asset/file services need clearer ownership.
10. Add project size/performance diagnostics for serialization and undo history.
11. Reconcile `CONTEXT.md`, `ROADMAP.md`, `DATA_MODEL.md`, `DESKTOP_ARCHITECTURE.md`, and `CHANGELOG.md`.
12. Eventually remove legacy direct scene background fields after migration and format-version planning.

# Final Verdict

MOSTLY YES

Narrium is now architecturally desktop-first for the central project workflow: `.narrium` files are the persistent source of truth, local desktop background assets are stored beside the project with relative paths, Tauri APIs are mostly behind service boundaries, and full file-backed project payloads are no longer mirrored into `localStorage`.

It is not a complete "YES" yet because several important desktop expectations remain transitional: native close can discard unsaved changes, security permissions are broader than necessary, app preferences still use webview storage, standalone export does not package local assets, and some UI surfaces still own browser file APIs. These are fixable incremental issues, not reasons to rewrite the application.
