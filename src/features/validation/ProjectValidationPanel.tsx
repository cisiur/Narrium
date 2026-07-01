import { useMemo } from 'react';
import type { Project } from '../../types';
import { validateProject, type ValidationIssue } from './projectValidation';

interface ValidationNavigation {
  openEditor: (sceneId: string) => void;
  selectChoice: (sceneId: string, choiceId: string) => void;
}

interface ProjectValidationPanelProps {
  project: Project;
  onIssueClick: (issue: ValidationIssue) => void;
}

export function orderValidationIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return [
    ...issues.filter((issue) => issue.severity === 'error'),
    ...issues.filter((issue) => issue.severity === 'warning'),
  ];
}

export function navigateToValidationIssue(
  issue: ValidationIssue,
  navigation: ValidationNavigation,
) {
  if (!issue.sceneId) {
    return;
  }

  if (issue.choiceId) {
    navigation.selectChoice(issue.sceneId, issue.choiceId);
    return;
  }

  navigation.openEditor(issue.sceneId);
}

function getSceneName(project: Project, issue: ValidationIssue) {
  if (!issue.sceneId) {
    return null;
  }

  return project.scenes.find((scene) => scene.id === issue.sceneId)?.name ?? null;
}

function formatSeverity(severity: ValidationIssue['severity']) {
  return severity === 'error' ? 'Error' : 'Warning';
}

export function ProjectValidationPanel({ project, onIssueClick }: ProjectValidationPanelProps) {
  const issues = useMemo(() => orderValidationIssues(validateProject(project)), [project]);

  return (
    <section className="max-h-80 overflow-y-auto border-b border-gray-800 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-100">Project Validation</h2>
        <span className="rounded bg-gray-800 px-2 py-1 text-xs font-semibold text-gray-300">
          {issues.length}
        </span>
      </div>

      {issues.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
          No validation issues found.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {issues.map((issue, index) => {
            const sceneName = getSceneName(project, issue);
            const severityLabel = formatSeverity(issue.severity);

            return (
              <button
                key={`${issue.code}:${issue.sceneId ?? 'project'}:${issue.choiceId ?? 'none'}:${index}`}
                type="button"
                onClick={() => onIssueClick(issue)}
                className="w-full rounded-md border border-gray-700 bg-gray-800/70 px-3 py-2 text-left hover:border-gray-600 hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      issue.severity === 'error'
                        ? 'rounded bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-200'
                        : 'rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200'
                    }
                  >
                    {severityLabel}
                  </span>
                  {sceneName ? (
                    <span className="min-w-0 truncate text-xs text-gray-400">{sceneName}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-200">{issue.message}</p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
