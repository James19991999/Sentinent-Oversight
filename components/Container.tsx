import type { ReactNode } from "react";
import clsx from "clsx";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop", className)}>
      {children}
    </div>
  );
}
