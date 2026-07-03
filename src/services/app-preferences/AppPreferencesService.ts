const APP_PREFERENCES_KEY = 'narrium_app_preferences';
const MAX_RECENT_PROJECTS = 10;

export interface RecentProject {
  name: string;
  folderPath: string;
  lastOpenedAt: string;
}

export interface AppPreferences {
  recentProjects: RecentProject[];
  lastOpenedProjectFolderPath: string | null;
}

export interface AppPreferencesService {
  loadPreferences(): AppPreferences;
  savePreferences(preferences: AppPreferences): void;
  recordRecentProject(project: Omit<RecentProject, 'lastOpenedAt'>): AppPreferences;
  clearLastOpenedProject(): AppPreferences;
}

const emptyPreferences: AppPreferences = {
  recentProjects: [],
  lastOpenedProjectFolderPath: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resemblesRecentProject(value: unknown): value is RecentProject {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.folderPath === 'string' &&
    typeof value.lastOpenedAt === 'string'
  );
}

export function normalizeRecentProjects(recentProjects: RecentProject[]): RecentProject[] {
  const uniqueProjects = new Map<string, RecentProject>();

  recentProjects
    .slice()
    .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
    .forEach((project) => {
      if (!uniqueProjects.has(project.folderPath)) {
        uniqueProjects.set(project.folderPath, project);
      }
    });

  return Array.from(uniqueProjects.values()).slice(0, MAX_RECENT_PROJECTS);
}

export function recordRecentProject(
  preferences: AppPreferences,
  project: Omit<RecentProject, 'lastOpenedAt'>,
  openedAt = new Date().toISOString(),
): AppPreferences {
  const recentProjects = normalizeRecentProjects([
    {
      ...project,
      lastOpenedAt: openedAt,
    },
    ...preferences.recentProjects.filter((recentProject) => recentProject.folderPath !== project.folderPath),
  ]);

  return {
    recentProjects,
    lastOpenedProjectFolderPath: project.folderPath,
  };
}

export class BrowserAppPreferencesService implements AppPreferencesService {
  constructor(private readonly storageKey = APP_PREFERENCES_KEY) {}

  loadPreferences(): AppPreferences {
    try {
      const source = window.localStorage.getItem(this.storageKey);

      if (!source) {
        return emptyPreferences;
      }

      const parsed = JSON.parse(source) as unknown;

      if (!isRecord(parsed)) {
        return emptyPreferences;
      }

      return {
        recentProjects: normalizeRecentProjects(
          Array.isArray(parsed.recentProjects) ? parsed.recentProjects.filter(resemblesRecentProject) : [],
        ),
        lastOpenedProjectFolderPath:
          typeof parsed.lastOpenedProjectFolderPath === 'string' ? parsed.lastOpenedProjectFolderPath : null,
      };
    } catch {
      return emptyPreferences;
    }
  }

  savePreferences(preferences: AppPreferences): void {
    window.localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        recentProjects: normalizeRecentProjects(preferences.recentProjects),
        lastOpenedProjectFolderPath: preferences.lastOpenedProjectFolderPath,
      }),
    );
  }

  recordRecentProject(project: Omit<RecentProject, 'lastOpenedAt'>): AppPreferences {
    const nextPreferences = recordRecentProject(this.loadPreferences(), project);

    this.savePreferences(nextPreferences);

    return nextPreferences;
  }

  clearLastOpenedProject(): AppPreferences {
    const nextPreferences = {
      ...this.loadPreferences(),
      lastOpenedProjectFolderPath: null,
    };

    this.savePreferences(nextPreferences);

    return nextPreferences;
  }
}
