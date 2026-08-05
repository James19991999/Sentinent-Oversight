import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { ErrorState } from "@/components/ErrorState";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });
  return { title: `${t("tabSecurity")} — ${t("title")}` };
}
export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Settings");
  const session = await requireServerSession();

  try {
    assertPermission(session.role, "settings:read");
  } catch (err) {
    if (err instanceof RbacError) {
      return <ErrorState title={t("restricted")} description={t("restrictedSecurity")} />;
    }
    throw err;
  }

  const canWrite = session.role === "owner" || session.role === "admin";

  return (
    <div className="glass-panel max-w-xl rounded-xl p-6">
      <h2 className="font-headline text-headline-sm text-on-surface">{t("accessControl")}</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        {t("signedInAs", { email: session.email, role: session.role })}
      </p>

      <form className="mt-6 flex flex-col gap-4">
        <fieldset disabled={!canWrite} className="flex flex-col gap-4">
          <InputField label={t("sessionTimeout")} type="number" defaultValue={60} min={5} max={480} />
          <label className="flex items-center gap-2 text-body-sm text-on-surface">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-outline-variant" />
            {t("requireMfa")}
          </label>
          <Button type="submit" className="w-fit">
            {t("saveChanges")}
          </Button>
        </fieldset>
        {!canWrite ? <p className="text-body-sm text-on-surface-variant">{t("membersReadOnly")}</p> : null}
      </form>
    </div>
  );
}
