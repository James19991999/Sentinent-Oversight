import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/config";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Marketing" });
  return {
    title: "Sentinel Oversight | Enterprise Cyber Defense",
    description: t("heroBody"),
    alternates: {
      canonical: `/${params.locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function LandingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale as Locale);
  const t = await getTranslations("Marketing");

  const pillars = [
    { icon: "radar", title: t("pillarThreatTitle"), body: t("pillarThreatBody") },
    { icon: "verified_user", title: t("pillarComplianceTitle"), body: t("pillarComplianceBody") },
    { icon: "emergency_home", title: t("pillarResponseTitle"), body: t("pillarResponseBody") },
    { icon: "school", title: t("pillarTrainingTitle"), body: t("pillarTrainingBody") },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Sentinel Oversight",
            applicationCategory: "SecurityApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", priceCurrency: "USD", price: "0" },
          }),
        }}
      />
      <header className="border-b border-outline-variant">
        <div className="mx-auto flex max-w-container-max items-center justify-between px-margin-mobile py-5 md:px-margin-desktop">
          <span className="font-display text-headline-sm text-on-surface">SENTINEL OVERSIGHT</span>
          <nav className="flex items-center gap-4">
            <LocaleSwitcher />
            <Link href="/sign-in" className="text-body-sm text-on-surface-variant hover:text-on-surface">
              {t("signIn")}
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-secondary-container px-4 py-2 text-body-sm font-medium text-on-secondary-container"
            >
              {t("startTrial")}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden">
          {/*
            Restrained ambient glow, not a gimmick — two soft radial blobs
            using the design system's own secondary/tertiary colors,
            aria-hidden and pointer-events-none since they're purely
            decorative. This is the same "quiet depth" treatment used by
            Linear/Vercel-tier marketing pages: barely noticeable at a
            glance, but the page reads as flat without it.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-secondary/10 blur-[120px]" />
            <div className="absolute end-0 top-40 h-[360px] w-[360px] rounded-full bg-tertiary/10 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-container-max px-margin-mobile py-20 text-center md:px-margin-desktop md:py-32">
            <p className="font-label text-label-caps uppercase tracking-widest text-secondary">{t("eyebrow")}</p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-display-lg-mobile text-on-surface md:text-display-lg">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-body-lg text-on-surface-variant">{t("heroBody")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up" className="rounded-md bg-secondary-container px-6 py-3 text-body-lg font-medium text-on-secondary-container shadow-glow-cyan hover:brightness-110">
                {t("startTrial")}
              </Link>
              <Link href="/sign-in" className="rounded-md border border-outline-variant px-6 py-3 text-body-lg text-on-surface hover:bg-surface-container-low">
                {t("signIn")}
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="pillars-heading" className="border-t border-outline-variant py-20">
          <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
            <h2 id="pillars-heading" className="sr-only">
              Platform capabilities
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="glass-panel rounded-xl p-6">
                  <span className="material-symbols-outlined text-secondary" aria-hidden="true">
                    {pillar.icon}
                  </span>
                  <h3 className="mt-3 font-headline text-headline-sm text-on-surface">{pillar.title}</h3>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant py-8">
        <div className="mx-auto max-w-container-max px-margin-mobile text-body-sm text-on-surface-variant md:px-margin-desktop">
          {t("footer", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
