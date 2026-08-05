import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-16 text-center"
    >
      <span className="material-symbols-outlined text-4xl text-on-surface-variant" aria-hidden="true">
        {icon}
      </span>
      <h2 className="font-headline text-headline-sm text-on-surface">{title}</h2>
      <p className="max-w-sm text-body-sm text-on-surface-variant">{description}</p>
      {action}
    </div>
  );
}
