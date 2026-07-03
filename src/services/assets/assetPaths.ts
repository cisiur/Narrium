const BACKGROUND_ASSET_PREFIX = 'assets/backgrounds/';
const ALLOWED_BACKGROUND_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export function getFileExtension(fileName: string): string {
  const finalSegment = fileName.split(/[\\/]/).pop() ?? fileName;
  const extensionSeparatorIndex = finalSegment.lastIndexOf('.');

  return extensionSeparatorIndex >= 0 ? finalSegment.slice(extensionSeparatorIndex + 1).toLowerCase() : '';
}

export function isAllowedBackgroundImageExtension(fileName: string): boolean {
  return ALLOWED_BACKGROUND_IMAGE_EXTENSIONS.has(getFileExtension(fileName));
}

export function createSafeAssetFileName(fileName: string): string {
  const finalSegment = fileName.split(/[\\/]/).pop() ?? fileName;
  const extension = getFileExtension(finalSegment);
  const rawStem = extension ? finalSegment.slice(0, -(extension.length + 1)) : finalSegment;
  const safeStem = rawStem
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeStem || 'background'}${extension ? `.${extension}` : ''}`;
}

export function createUniqueAssetFileName(fileName: string, existingFileNames: Iterable<string>): string {
  const safeName = createSafeAssetFileName(fileName);
  const existing = new Set(Array.from(existingFileNames, (name) => name.toLowerCase()));

  if (!existing.has(safeName.toLowerCase())) {
    return safeName;
  }

  const extension = getFileExtension(safeName);
  const stem = extension ? safeName.slice(0, -(extension.length + 1)) : safeName;
  let suffix = 2;
  let candidate = extension ? `${stem}-${suffix}.${extension}` : `${stem}-${suffix}`;

  while (existing.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = extension ? `${stem}-${suffix}.${extension}` : `${stem}-${suffix}`;
  }

  return candidate;
}

export function createRelativeBackgroundAssetPath(fileName: string): string {
  return `${BACKGROUND_ASSET_PREFIX}${createSafeAssetFileName(fileName)}`;
}

export function isProjectRelativeAssetPath(url: string): boolean {
  return url.startsWith(BACKGROUND_ASSET_PREFIX);
}
