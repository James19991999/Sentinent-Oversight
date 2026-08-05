import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-outline-variant pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="font-label text-label-caps uppercase tracking-widest text-secondary">{eyebrow}</p>
        ) : null}
        <h1 className="font-headline text-headline-md text-on-surface">{title}</h1>
        {description ? <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  );
}
