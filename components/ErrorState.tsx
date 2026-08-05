interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Try again, and if it keeps happening, contact your workspace admin.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-error/40 bg-error-container/10 px-6 py-16 text-center"
    >
      <span className="material-symbols-outlined text-4xl text-error" aria-hidden="true">
        error
      </span>
      <h2 className="font-headline text-headline-sm text-on-surface">{title}</h2>
      <p className="max-w-sm text-body-sm text-on-surface-variant">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-secondary-container px-4 py-2 text-body-sm font-medium text-on-secondary-container focus-visible:outline-2"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
