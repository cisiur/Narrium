import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import {
  BrowserJsonExportService,
  DesktopJsonExportService,
  getProjectExportFilename,
  serializeProjectForJsonExport,
  type JsonExportFileApi,
} from './JsonExportService';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Opening',
        background: {
          mode: 'none',
          assetId: null,
          sourceSceneId: null,
          url: '',
        },
        position: { x: 10, y: 20 },
        dialoguePages: [
          {
            id: 'page-1',
            speakerId: null,
            text: 'Hello',
          },
        ],
        choices: [],
        groupId: null,
      },
    ],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createJsonExportFileApi(overrides: Partial<JsonExportFileApi> = {}): JsonExportFileApi {
  return {
    selectJsonExportPath: vi.fn(() => Promise.resolve('C:/Stories/narrium-test-project.json')),
    writeJsonExportFile: vi.fn((filePath: string) => Promise.resolve(filePath)),
    ...overrides,
  };
}

describe('JSON export filename and serialization', () => {
  it('generates existing safe JSON export filenames from project names', () => {
    expect(getProjectExportFilename('Test Project')).toBe('narrium-test-project.json');
    expect(getProjectExportFilename('  Chapter One: The Gate!  ')).toBe(
      'narrium-chapter-one-the-gate.json',
    );
  });

  it('uses the project fallback filename for empty or unsanitizable names', () => {
    expect(getProjectExportFilename('')).toBe('narrium-project.json');
    expect(getProjectExportFilename('  ')).toBe('narrium-project.json');
    expect(getProjectExportFilename('!!!')).toBe('narrium-project.json');
  });

  it('serializes the raw full Project object with two-space indentation', () => {
    const project = createProject();
    const json = serializeProjectForJsonExport(project);

    expect(JSON.parse(json)).toEqual(project);
    expect(JSON.parse(json)).not.toHaveProperty('format');
    expect(json).toContain('\n  "id": "project-1"');
  });
});

describe('BrowserJsonExportService', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalUrl = globalThis.URL;

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.URL = originalUrl;
  });

  it('uses the browser Blob download path with the shared filename convention', async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.fn();
    const revokeObjectUrl = vi.fn();
    const link = {
      href: '',
      download: '',
      click,
      remove,
    };

    vi.stubGlobal('document', {
      body: {
        append,
      },
      createElement: vi.fn(() => link),
    });
    vi.stubGlobal('window', {
      setTimeout: (callback: () => void) => {
        callback();
        return 0;
      },
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:narrium-json'),
      revokeObjectURL: revokeObjectUrl,
    });

    await new BrowserJsonExportService().exportProject(createProject({ name: 'Browser Export' }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(link.href).toBe('blob:narrium-json');
    expect(link.download).toBe('narrium-browser-export.json');
    expect(append).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:narrium-json');
  });
});

describe('DesktopJsonExportService', () => {
  it('opens a native JSON Save dialog with the expected default filename', async () => {
    const jsonExportFiles = createJsonExportFileApi();
    const service = new DesktopJsonExportService(jsonExportFiles);

    await service.exportProject(createProject({ name: 'Desktop Export' }));

    expect(jsonExportFiles.selectJsonExportPath).toHaveBeenCalledWith({
      title: 'Export Narrium Project JSON',
      defaultFileName: 'narrium-desktop-export.json',
    });
  });

  it('treats Save dialog cancellation as a clean no-op', async () => {
    const jsonExportFiles = createJsonExportFileApi({
      selectJsonExportPath: vi.fn(() => Promise.resolve(null)),
    });
    const service = new DesktopJsonExportService(jsonExportFiles);

    await expect(service.exportProject(createProject())).resolves.toBeUndefined();

    expect(jsonExportFiles.writeJsonExportFile).not.toHaveBeenCalled();
  });

  it('writes the full raw Project JSON with two-space indentation after a desktop export path is selected', async () => {
    const jsonExportFiles = createJsonExportFileApi();
    const service = new DesktopJsonExportService(jsonExportFiles);
    const project = createProject({
      name: 'Raw Project',
      variables: [{ id: 'variable-1', key: 'visited_forest', defaultValue: 1 }],
    });

    await service.exportProject(project);

    expect(jsonExportFiles.writeJsonExportFile).toHaveBeenCalledWith(
      'C:/Stories/narrium-test-project.json',
      serializeProjectForJsonExport(project),
    );

    const contents = vi.mocked(jsonExportFiles.writeJsonExportFile).mock.calls[0][1];
    expect(JSON.parse(contents)).toEqual(project);
    expect(JSON.parse(contents)).not.toHaveProperty('project');
    expect(contents).toContain('\n  "variables": [');
  });

  it('propagates desktop write failures to the caller', async () => {
    const jsonExportFiles = createJsonExportFileApi({
      writeJsonExportFile: vi.fn(() => Promise.reject(new Error('disk is full'))),
    });
    const service = new DesktopJsonExportService(jsonExportFiles);

    await expect(service.exportProject(createProject())).rejects.toThrow('disk is full');
  });

  it('does not mutate the Project object while exporting JSON', async () => {
    const jsonExportFiles = createJsonExportFileApi();
    const service = new DesktopJsonExportService(jsonExportFiles);
    const project = createProject({ name: 'Dirty File-backed Project' });
    const beforeExport = structuredClone(project);

    await service.exportProject(project);

    expect(project).toEqual(beforeExport);
  });
});

describe('DesktopJsonExportFileApi', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('configures the native Save dialog with a JSON filter', async () => {
    const save = vi.fn(() => Promise.resolve('C:/Stories/export.json'));
    const invoke = vi.fn(() => Promise.resolve('C:/Stories/export.json'));

    vi.doMock('@tauri-apps/plugin-dialog', () => ({ save }));
    vi.doMock('@tauri-apps/api/core', () => ({ invoke }));

    const { DesktopJsonExportFileApi } = await import('./DesktopJsonExportFileApi');
    const api = new DesktopJsonExportFileApi();

    await expect(
      api.selectJsonExportPath({
        title: 'Export Narrium Project JSON',
        defaultFileName: 'narrium-test-project.json',
      }),
    ).resolves.toBe('C:/Stories/export.json');

    expect(save).toHaveBeenCalledWith({
      title: 'Export Narrium Project JSON',
      defaultPath: 'narrium-test-project.json',
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    });
  });
});
