interface StoryPlayerHeaderProps {
  onRestartPreview: () => void;
  onExitPreview: () => void;
}

export function StoryPlayerHeader({
  onRestartPreview,
  onExitPreview,
}: StoryPlayerHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Preview</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRestartPreview}
          className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onExitPreview}
          className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
        >
          Exit Preview
        </button>
      </div>
    </header>
  );
}
