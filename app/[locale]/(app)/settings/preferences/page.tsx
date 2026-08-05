import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });
  return { title: `${t("tabPreferences")} — ${t("title")}` };
}
export const dynamic = "force-dynamic";

export default async function PreferencesSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Settings");
  const session = await requireServerSession();

  return (
    <div className="glass-panel max-w-xl rounded-xl p-6">
      <h2 className="font-headline text-headline-sm text-on-surface">{t("yourPreferences")}</h2>
      <form className="mt-6 flex flex-col gap-4">
        <InputField label={t("displayName")} type="text" defaultValue={session.email.split("@")[0]} />
        <InputField label={t("email")} type="email" defaultValue={session.email} disabled hint={t("emailHint")} />
        <label className="flex items-center gap-2 text-body-sm text-on-surface">
          <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-outline-variant" />
          {t("compactDensity")}
        </label>
        <Button type="submit" className="w-fit">
          {t("savePreferences")}
        </Button>
      </form>
    </div>
  );
}
