import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { fetchTenantRows } from "@/lib/fetch-tenant-rows";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip } from "@/components/StatusChip";
import type { ComplianceFramework } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Compliance" });
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function CompliancePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Compliance");
  const tCommon = await getTranslations("Common");
  const session = await requireServerSession();
  const { rows, error } = await fetchTenantRows<ComplianceFramework>("compliance", session.orgId);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {error ? (
        <ErrorState description={tCommon("dataStoreError")} />
      ) : rows.length === 0 ? (
        <EmptyState icon="verified_user" title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((framework) => (
            <div key={framework.id} className="glass-panel rounded-xl p-5">
              <div className="flex items-start justify-between">
                <h2 className="font-headline text-headline-sm text-on-surface">{framework.name}</h2>
                <StatusChip
                  label={framework.status.replace("-", " ")}
                  tone={framework.status === "compliant" ? "success" : framework.status === "at-risk" ? "critical" : "medium"}
                />
              </div>
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${framework.completion}%` }}
                    role="progressbar"
                    aria-valuenow={framework.completion}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${framework.name} completion`}
                  />
                </div>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  {t("completionLabel", {
                    percent: framework.completion,
                    date: dateFormatter.format(new Date(framework.lastAuditedAt)),
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
