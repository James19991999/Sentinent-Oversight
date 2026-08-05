import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { fetchTenantRows } from "@/lib/fetch-tenant-rows";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import type { TrainingModule } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Training" });
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function TrainingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Training");
  const tCommon = await getTranslations("Common");
  const session = await requireServerSession();
  const { rows, error } = await fetchTenantRows<TrainingModule>("training", session.orgId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {error ? (
        <ErrorState description={tCommon("dataStoreError")} />
      ) : rows.length === 0 ? (
        <EmptyState icon="school" title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((module) => (
            <div key={module.id} className="glass-panel rounded-xl p-5">
              <p className="font-label text-label-caps uppercase text-secondary">{module.category}</p>
              <h2 className="mt-1 font-headline text-headline-sm text-on-surface">{module.title}</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">{t("duration", { minutes: module.durationMinutes })}</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-tertiary"
                  style={{ width: `${module.completionRate}%` }}
                  role="progressbar"
                  aria-valuenow={module.completionRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${module.title} completion rate`}
                />
              </div>
              <p className="mt-1 text-body-sm text-on-surface-variant">{t("completionLabel", { percent: module.completionRate })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
