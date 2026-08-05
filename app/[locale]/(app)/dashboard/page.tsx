import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { fetchTenantRows } from "@/lib/fetch-tenant-rows";
import { PageHeader } from "@/components/PageHeader";
import { FeatureCard } from "@/components/FeatureCard";
import { ErrorState } from "@/components/ErrorState";
import { StatusChip } from "@/components/StatusChip";
import type { ThreatEvent, ComplianceFramework, ResponsePlaybook } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Dashboard" });
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Dashboard");
  const session = await requireServerSession();

  const [threats, compliance, playbooks] = await Promise.all([
    fetchTenantRows<ThreatEvent>("threats", session.orgId),
    fetchTenantRows<ComplianceFramework>("compliance", session.orgId),
    fetchTenantRows<ResponsePlaybook>("playbooks", session.orgId),
  ]);

  const anyError = threats.error ?? compliance.error ?? playbooks.error;
  const activeThreats = threats.rows.filter((t) => t.status === "active" || t.status === "investigating");
  const criticalThreats = activeThreats.filter((t) => t.severity === "critical");
  const avgCompliance =
    compliance.rows.length > 0
      ? Math.round(compliance.rows.reduce((sum, c) => sum + c.completion, 0) / compliance.rows.length)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {anyError ? (
        <ErrorState description={t("loadError")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon="radar" label={t("activeThreats")} value={String(activeThreats.length)} />
            <FeatureCard
              icon="warning"
              label={t("criticalSeverity")}
              value={String(criticalThreats.length)}
              trend={criticalThreats.length > 0 ? { direction: "up", value: t("needsAttention"), positive: false } : undefined}
            />
            <FeatureCard icon="verified_user" label={t("avgCompliance")} value={`${avgCompliance}%`} />
            <FeatureCard icon="emergency_home" label={t("responsePlaybooks")} value={String(playbooks.rows.length)} />
          </div>

          <section aria-labelledby="recent-threats-heading" className="glass-panel rounded-xl p-6">
            <h2 id="recent-threats-heading" className="font-headline text-headline-sm text-on-surface">
              {t("recentActivity")}
            </h2>
            {activeThreats.length === 0 ? (
              <p className="mt-3 text-body-sm text-on-surface-variant">{t("noActiveThreats")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-outline-variant">
                {activeThreats.slice(0, 5).map((threat) => (
                  <li key={threat.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-body-sm text-on-surface">{threat.title}</p>
                      <p className="text-body-sm text-on-surface-variant">{threat.vector}</p>
                    </div>
                    <StatusChip label={threat.severity} tone={threat.severity} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
