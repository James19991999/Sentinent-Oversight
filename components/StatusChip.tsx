import clsx from "clsx";

type Tone = "critical" | "high" | "medium" | "low" | "success" | "neutral";

const TONE_STYLES: Record<Tone, string> = {
  critical: "bg-error-container/20 text-error border-error/40",
  high: "bg-tertiary-container/20 text-secondary border-secondary/40",
  medium: "bg-secondary-container/20 text-secondary-fixed border-secondary/30",
  low: "bg-surface-container-high text-on-surface-variant border-outline-variant",
  success: "bg-tertiary-container/20 text-tertiary border-tertiary/40",
  neutral: "bg-surface-container-high text-on-surface-variant border-outline-variant",
};

export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-label text-label-caps uppercase",
        TONE_STYLES[tone]
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", tone === "critical" ? "animate-pulse-critical bg-error" : "bg-current")} aria-hidden="true" />
      {label}
    </span>
  );
}
