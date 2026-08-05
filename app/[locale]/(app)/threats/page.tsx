import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";import { requireServerSession } from "@/lib/session";
import { fetchTenantRows } from "@/lib/fetch-tenant-rows";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ErrorState } from "@/components/ErrorState";
import { StatusChip } from "@/components/StatusChip";
import type { ThreatEvent } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Threats" });
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function ThreatsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Threats");
  const tCommon = await getTranslations("Common");
  const session = await requireServerSession();
  const { rows, error } = await fetchTenantRows<ThreatEvent>("threats", session.orgId);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const columns: DataTableColumn<ThreatEvent>[] = [
    { key: "title", header: t("colEvent"), render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "sourceIp", header: t("colSourceIp"), render: (row) => <span className="font-mono-data">{row.sourceIp}</span> },
    { key: "vector", header: t("colVector"), render: (row) => row.vector },
    { key: "severity", header: t("colSeverity"), render: (row) => <StatusChip label={row.severity} tone={row.severity} /> },
    {
      key: "status",
      header: t("colStatus"),
      render: (row) => <StatusChip label={row.status} tone={row.status === "resolved" ? "success" : "neutral"} />,
    },
    { key: "detectedAt", header: t("colDetected"), render: (row) => dateFormatter.format(new Date(row.detectedAt)) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {error ? (
        <ErrorState description={tCommon("dataStoreError")} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          caption={t("caption")}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        />
      )}
    </div>
  );
}
