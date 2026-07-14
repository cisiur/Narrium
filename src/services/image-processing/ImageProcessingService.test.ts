import { describe, expect, it, vi } from 'vitest';
import {
  MAX_BACKGROUND_UPLOAD_BYTES,
  MAX_THUMBNAIL_INPUT_BYTES,
  THUMBNAIL_IMAGE_QUALITY,
  processBrowserBackgroundUpload,
  processProjectThumbnail,
  type DecodedImage,
  type ImageCanvas,
  type ImageFileLike,
  type ImageProcessingEnvironment,
} from './ImageProcessingService';

function createFile(input: Partial<ImageFileLike> = {}): ImageFileLike {
  return {
    name: 'image.png',
    type: 'image/png',
    size: 1024,
    ...input,
  };
}

function createEnvironment(decodedImage: DecodedImage) {
  const canvases: ImageCanvas[] = [];
  const environment: ImageProcessingEnvironment = {
    readAsDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,input')),
    decodeImage: vi.fn(() => Promise.resolve(decodedImage)),
    createCanvas: vi.fn((width: number, height: number) => {
      const canvas: ImageCanvas = {
        width,
        height,
        drawImage: vi.fn(),
        toDataUrl: vi.fn((type: string, quality?: number) => `data:${type};quality=${quality};${width}x${height}`),
      };
      canvases.push(canvas);
      return canvas;
    }),
  };

  return { environment, canvases };
}

describe('processProjectThumbnail', () => {
  it('resizes landscape images to fit within the thumbnail bounds', async () => {
    const { environment, canvases } = createEnvironment({ width: 1600, height: 900 });

    const result = await processProjectThumbnail(createFile(), environment);

    expect(result).toEqual({
      dataUrl: `data:image/jpeg;quality=${THUMBNAIL_IMAGE_QUALITY};640x360`,
      width: 640,
      height: 360,
    });
    expect(canvases[0].drawImage).toHaveBeenCalledWith({ width: 1600, height: 900 }, 640, 360);
  });

  it('resizes portrait images while preserving aspect ratio', async () => {
    const { environment } = createEnvironment({ width: 800, height: 1600 });

    await expect(processProjectThumbnail(createFile(), environment)).resolves.toMatchObject({
      width: 180,
      height: 360,
    });
  });

  it('does not upscale small thumbnails', async () => {
    const { environment } = createEnvironment({ width: 320, height: 180 });

    await expect(processProjectThumbnail(createFile(), environment)).resolves.toMatchObject({
      width: 320,
      height: 180,
    });
  });

  it('rejects invalid thumbnail MIME types', async () => {
    const { environment } = createEnvironment({ width: 640, height: 360 });

    await expect(processProjectThumbnail(createFile({ type: 'image/gif' }), environment)).rejects.toThrow(
      'Thumbnail must be a PNG, JPEG, or WEBP image.',
    );
  });

  it('rejects thumbnails larger than 10 MiB', async () => {
    const { environment } = createEnvironment({ width: 640, height: 360 });

    await expect(
      processProjectThumbnail(createFile({ size: MAX_THUMBNAIL_INPUT_BYTES + 1 }), environment),
    ).rejects.toThrow('Thumbnail must be 10 MiB or smaller.');
  });
});

describe('processBrowserBackgroundUpload', () => {
  it('rejects browser background uploads larger than 15 MiB without reading the file', async () => {
    const { environment } = createEnvironment({ width: 640, height: 360 });

    await expect(
      processBrowserBackgroundUpload(createFile({ size: MAX_BACKGROUND_UPLOAD_BYTES + 1 }), environment),
    ).rejects.toThrow('Background image must be 15 MiB or smaller.');
    expect(environment.readAsDataUrl).not.toHaveBeenCalled();
  });

  it('reads valid browser background uploads without compressing them', async () => {
    const { environment } = createEnvironment({ width: 640, height: 360 });

    await expect(
      processBrowserBackgroundUpload(createFile({ type: 'image/webp', size: 2048 }), environment),
    ).resolves.toEqual({
      dataUrl: 'data:image/png;base64,input',
      mimeType: 'image/webp',
      fileSize: 2048,
    });
    expect(environment.createCanvas).not.toHaveBeenCalled();
  });
});
