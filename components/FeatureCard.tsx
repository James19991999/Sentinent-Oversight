import type { ReactNode } from "react";
import clsx from "clsx";

interface FeatureCardProps {
  icon: string;
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; value: string; positive?: boolean };
  footer?: ReactNode;
  className?: string;
}

export function FeatureCard({ icon, label, value, trend, footer, className }: FeatureCardProps) {
  return (
    <div className={clsx("glass-panel rounded-xl p-5", className)}>
      <div className="flex items-start justify-between">
        <span className="material-symbols-outlined text-secondary" aria-hidden="true">
          {icon}
        </span>
        {trend ? (
          <span
            className={clsx(
              "flex items-center gap-1 text-body-sm font-medium",
              trend.positive ? "text-tertiary" : "text-error"
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              {trend.direction === "up" ? "trending_up" : "trending_down"}
            </span>
            {trend.value}
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-headline text-headline-md text-on-surface">{value}</p>
      <p className="font-label text-label-caps uppercase text-on-surface-variant">{label}</p>
      {footer ? <div className="mt-3 border-t border-outline-variant pt-3">{footer}</div> : null}
    </div>
  );
}
