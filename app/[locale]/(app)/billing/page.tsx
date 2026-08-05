import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { StatusChip } from "@/components/StatusChip";
import { BillingActions } from "@/components/BillingActions";
import type { Organization } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Billing" });
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function BillingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Billing");
  const tSettings = await getTranslations("Settings");
  const tCommon = await getTranslations("Common");
  const session = await requireServerSession();

  try {
    assertPermission(session.role, "billing:read");
  } catch (err) {
    if (err instanceof RbacError) {
      return <ErrorState title={tSettings("restricted")} description={tSettings("restrictedBilling")} />;
    }
    throw err;
  }

  let org: Organization | null = null;
  let loadFailed = false;
  try {
    const snap = await adminDb().collection("organizations").doc(session.orgId).get();
    org = snap.exists ? ({ id: snap.id, ...snap.data() } as Organization) : null;
  } catch {
    loadFailed = true;
  }

  if (loadFailed || !org) {
    return <ErrorState description={tCommon("dataStoreError")} />;
  }

  const isActive = org.subscriptionStatus === "active";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="glass-panel max-w-xl rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-headline text-headline-sm text-on-surface capitalize">{t("planLabel", { plan: org.plan })}</p>
            <p className="text-body-sm text-on-surface-variant">{t("statusLabel", { status: org.subscriptionStatus ?? "trialing" })}</p>
          </div>
          <StatusChip
            label={org.subscriptionStatus ?? "trialing"}
            tone={isActive ? "success" : org.subscriptionStatus === "past_due" ? "critical" : "neutral"}
          />
        </div>
        <div className="mt-6">
          <BillingActions hasSubscription={Boolean(org.stripeSubscriptionId)} />
        </div>
      </div>
    </div>
  );
}
