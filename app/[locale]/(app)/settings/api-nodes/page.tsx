import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });
  return { title: `${t("tabApiNodes")} — ${t("title")}` };
}
export const dynamic = "force-dynamic";

export default async function ApiNodesSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Settings");
  const session = await requireServerSession();

  try {
    assertPermission(session.role, "settings:write");
  } catch (err) {
    if (err instanceof RbacError) {
      return <ErrorState title={t("restricted")} description={t("restrictedApiNodes")} />;
    }
    throw err;
  }

  return (
    <div className="glass-panel max-w-xl rounded-xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-headline-sm text-on-surface">{t("apiNodesTitle")}</h2>
        <Button variant="secondary" type="button">
          {t("addNode")}
        </Button>
      </div>
      <div className="mt-6">
        <EmptyState icon="hub" title={t("apiNodesEmptyTitle")} description={t("apiNodesEmptyDescription")} />
      </div>
    </div>
  );
}
