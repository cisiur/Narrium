export const ACCEPTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_THUMBNAIL_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_BACKGROUND_UPLOAD_BYTES = 15 * 1024 * 1024;
export const THUMBNAIL_MAX_WIDTH = 640;
export const THUMBNAIL_MAX_HEIGHT = 360;
export const THUMBNAIL_IMAGE_QUALITY = 0.82;
export const THUMBNAIL_BACKGROUND_COLOR = '#ffffff';

export interface ImageFileLike {
  type: string;
  size: number;
  name?: string;
}

export interface DecodedImage {
  width: number;
  height: number;
  source?: CanvasImageSource;
}

export interface ImageCanvas {
  width: number;
  height: number;
  fillBackground(color: string): void;
  drawImage(image: DecodedImage, width: number, height: number): void;
  toDataUrl(type: string, quality?: number): string;
}

export interface ImageProcessingEnvironment {
  readAsDataUrl(file: ImageFileLike): Promise<string>;
  decodeImage(dataUrl: string): Promise<DecodedImage>;
  createCanvas(width: number, height: number): ImageCanvas;
}

export interface ProcessedThumbnail {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ProcessedBackgroundUpload {
  dataUrl: string;
  mimeType: string;
  fileSize: number;
}

function formatMib(bytes: number): string {
  return `${bytes / 1024 / 1024} MiB`;
}

export function isAcceptedImageMimeType(mimeType: string): boolean {
  return ACCEPTED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number]);
}

export function validateImageFile(file: ImageFileLike, maxBytes: number, label: string): void {
  if (!isAcceptedImageMimeType(file.type)) {
    throw new Error(`${label} must be a PNG, JPEG, or WEBP image.`);
  }

  if (file.size > maxBytes) {
    throw new Error(`${label} must be ${formatMib(maxBytes)} or smaller.`);
  }
}

export function calculateContainedImageSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    throw new Error('Image dimensions could not be read.');
  }

  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function processProjectThumbnail(
  file: ImageFileLike,
  environment: ImageProcessingEnvironment = browserImageProcessingEnvironment,
): Promise<ProcessedThumbnail> {
  validateImageFile(file, MAX_THUMBNAIL_INPUT_BYTES, 'Thumbnail');

  const sourceDataUrl = await environment.readAsDataUrl(file);
  const decodedImage = await environment.decodeImage(sourceDataUrl);
  const size = calculateContainedImageSize(
    decodedImage.width,
    decodedImage.height,
    THUMBNAIL_MAX_WIDTH,
    THUMBNAIL_MAX_HEIGHT,
  );
  const canvas = environment.createCanvas(size.width, size.height);

  canvas.fillBackground(THUMBNAIL_BACKGROUND_COLOR);
  canvas.drawImage(decodedImage, size.width, size.height);

  return {
    dataUrl: canvas.toDataUrl('image/jpeg', THUMBNAIL_IMAGE_QUALITY),
    width: size.width,
    height: size.height,
  };
}

export async function processBrowserBackgroundUpload(
  file: ImageFileLike,
  environment: ImageProcessingEnvironment = browserImageProcessingEnvironment,
): Promise<ProcessedBackgroundUpload> {
  validateImageFile(file, MAX_BACKGROUND_UPLOAD_BYTES, 'Background image');

  return {
    dataUrl: await environment.readAsDataUrl(file),
    mimeType: file.type,
    fileSize: file.size,
  };
}

export const browserImageProcessingEnvironment: ImageProcessingEnvironment = {
  readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Could not read selected image file.'));
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Could not read selected image file.'));
          return;
        }

        resolve(reader.result);
      };
      reader.readAsDataURL(file as File);
    });
  },
  decodeImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onerror = () => reject(new Error('Could not decode selected image.'));
      image.onload = () =>
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
          source: image,
        });
      image.src = dataUrl;
    });
  },
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return {
      width,
      height,
      fillBackground(color) {
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not prepare thumbnail canvas.');
        }

        context.fillStyle = color;
        context.fillRect(0, 0, width, height);
      },
      drawImage(image, targetWidth, targetHeight) {
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not prepare thumbnail canvas.');
        }

        context.drawImage(image.source ?? (image as CanvasImageSource), 0, 0, targetWidth, targetHeight);
      },
      toDataUrl(type, quality) {
        return canvas.toDataURL(type, quality);
      },
    };
  },
};
