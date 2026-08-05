import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-md bg-surface-container-high" />
      <LoadingSkeleton rows={5} />
    </div>
  );
}
