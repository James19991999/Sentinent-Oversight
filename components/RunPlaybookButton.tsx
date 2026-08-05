"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button";
import { can } from "@/lib/rbac";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

export function RunPlaybookButton({ playbookId }: { playbookId: string }) {
  const { role } = useAuth();
  const router = useRouter();
  const t = useTranslations("Response");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = role ? can(role as Role, "response:write") : false;

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/run`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Run failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={handleRun} disabled={!allowed || running}>
        {running ? t("running") : t("runNow")}
      </Button>
      {error ? (
        <span role="alert" className="text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
