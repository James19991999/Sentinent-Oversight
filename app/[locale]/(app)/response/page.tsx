import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { fetchTenantRows } from "@/lib/fetch-tenant-rows";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip } from "@/components/StatusChip";
import { RunPlaybookButton } from "@/components/RunPlaybookButton";
import type { ResponsePlaybook } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Response" });
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function ResponsePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Response");
  const tCommon = await getTranslations("Common");
  const session = await requireServerSession();
  const { rows, error } = await fetchTenantRows<ResponsePlaybook>("playbooks", session.orgId);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {error ? (
        <ErrorState description={tCommon("dataStoreError")} />
      ) : rows.length === 0 ? (
        <EmptyState icon="emergency_home" title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((playbook) => (
            <li key={playbook.id} className="glass-panel flex flex-col gap-3 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-headline text-headline-sm text-on-surface">{playbook.name}</h2>
                  <StatusChip
                    label={playbook.status}
                    tone={playbook.status === "failed" ? "critical" : playbook.status === "success" ? "success" : "neutral"}
                  />
                </div>
                <p className="mt-1 text-body-sm text-on-surface-variant">{t("trigger", { trigger: playbook.trigger })}</p>
                <p className="text-body-sm text-on-surface-variant">
                  {t("mttr", { minutes: playbook.meanTimeToRespondMinutes })}
                  {playbook.lastRunAt ? t("lastRun", { date: dateFormatter.format(new Date(playbook.lastRunAt)) }) : ""}
                </p>
              </div>
              <RunPlaybookButton playbookId={playbook.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
