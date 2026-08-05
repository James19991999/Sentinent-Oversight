import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/PageHeader";
import type { Locale } from "@/i18n/config";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Settings");

  const tabs = [
    { href: "/settings/security", label: t("tabSecurity") },
    { href: "/settings/notifications", label: t("tabNotifications") },
    { href: "/settings/api-nodes", label: t("tabApiNodes") },
    { href: "/settings/preferences", label: t("tabPreferences") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Workspace" title={t("title")} description={t("description")} />
      <div className="flex gap-1 overflow-x-auto border-b border-outline-variant" role="tablist" aria-label={t("title")}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-body-sm text-on-surface-variant hover:text-on-surface aria-[current=page]:border-secondary aria-[current=page]:text-secondary"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
