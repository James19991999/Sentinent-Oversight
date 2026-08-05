import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });
  return { title: `${t("tabNotifications")} — ${t("title")}` };
}
export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  await requireServerSession();
  const t = await getTranslations("Settings");

  return (
    <div className="glass-panel max-w-xl rounded-xl p-6">
      <h2 className="font-headline text-headline-sm text-on-surface">{t("notificationPrefs")}</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">{t("notificationPrefsBody")}</p>
      <NotificationPreferencesForm />
    </div>
  );
}
