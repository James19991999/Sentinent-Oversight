"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button";

export function BillingActions({ hasSubscription }: { hasSubscription: boolean }) {
  const t = useTranslations("Billing");
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(endpoint: "/api/checkout" | "/api/portal", key: "checkout" | "portal") {
    setLoading(key);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.data?.url) throw new Error(body.error ?? "Could not start Stripe session");
      window.location.href = body.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {hasSubscription ? (
        <Button onClick={() => go("/api/portal", "portal")} disabled={loading !== null}>
          {loading === "portal" ? t("openingPortal") : t("manageSubscription")}
        </Button>
      ) : (
        <Button onClick={() => go("/api/checkout", "checkout")} disabled={loading !== null}>
          {loading === "checkout" ? t("redirecting") : t("upgradeToPro")}
        </Button>
      )}
      {error ? (
        <span role="alert" className="text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
