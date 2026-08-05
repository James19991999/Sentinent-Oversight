"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Common");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value as Locale;
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{t("language")}</span>
      <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
        language
      </span>
      <select
        value={locale}
        onChange={handleChange}
        aria-label={t("language")}
        className="rounded-md border border-outline-variant bg-surface-container-low px-2 py-1.5 text-body-sm text-on-surface focus-visible:border-secondary"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
