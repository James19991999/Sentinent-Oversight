"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import type { NotificationPreferences } from "@/lib/types";

type ChannelKey = "criticalThreatAlerts" | "complianceDriftWarnings" | "playbookRunResults" | "weeklyTrainingReminders";

const CHANNELS: ChannelKey[] = ["criticalThreatAlerts", "complianceDriftWarnings", "playbookRunResults", "weeklyTrainingReminders"];

export function NotificationPreferencesForm() {
  const t = useTranslations("Settings");
  const tChannel = useTranslations("Settings.channel");
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.data) throw new Error(body.error ?? "Failed to load");
        setPrefs(body.data);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criticalThreatAlerts: prefs.criticalThreatAlerts,
          complianceDriftWarnings: prefs.complianceDriftWarnings,
          playbookRunResults: prefs.playbookRunResults,
          weeklyTrainingReminders: prefs.weeklyTrainingReminders,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      setPrefs(body.data);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (loadError || !prefs) return <ErrorState description={t("notificationPrefsBody")} />;

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      {CHANNELS.map((channel) => (
        <label
          key={channel}
          className="flex items-center gap-3 rounded-md border border-outline-variant px-3 py-2.5 text-body-sm text-on-surface"
        >
          <input
            type="checkbox"
            checked={prefs[channel]}
            onChange={(e) => setPrefs({ ...prefs, [channel]: e.target.checked })}
            className="h-4 w-4 rounded border-outline-variant"
          />
          {tChannel(channel)}
        </label>
      ))}
      {saveError ? (
        <p role="alert" className="text-body-sm text-error">
          {saveError}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "…" : t("savePreferences")}
        </Button>
        {saved && !saving ? (
          <span role="status" className="text-body-sm text-tertiary">
            ✓
          </span>
        ) : null}
      </div>
    </form>
  );
}
