import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  // Locale can't be reliably read from params for the special not-found
  // file, so this falls back to the request's negotiated locale via
  // next-intl's server APIs, which still resolve correctly here.
  const t = await getTranslations("NotFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-margin-mobile text-center">
      <span className="material-symbols-outlined text-5xl text-secondary" aria-hidden="true">
        travel_explore
      </span>
      <h1 className="font-headline text-headline-md text-on-surface">{t("title")}</h1>
      <p className="max-w-sm text-body-sm text-on-surface-variant">{t("description")}</p>
      <Link href="/dashboard" className="rounded-md bg-secondary-container px-4 py-2 text-body-sm font-medium text-on-secondary-container">
        {t("backToDashboard")}
      </Link>
    </main>
  );
}
