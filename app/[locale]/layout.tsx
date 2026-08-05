import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/lib/auth-context";
import { locales, isLocale, dirFor, type Locale } from "@/i18n/config";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Marketing" });
  return {
    metadataBase: new URL("https://sentineloversight.app"),
    title: {
      default: "Sentinel Oversight | Enterprise Cyber Defense",
      template: "%s | Sentinel Oversight",
    },
    description: t("heroBody"),
    openGraph: {
      title: "Sentinel Oversight | Enterprise Cyber Defense",
      description: t("heroBody"),
      url: "https://sentineloversight.app",
      siteName: "Sentinel Oversight",
      type: "website",
      locale: params.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Sentinel Oversight | Enterprise Cyber Defense",
      description: t("heroBody"),
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${params.locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }
  const locale = params.locale as Locale;

  // Required by next-intl so static rendering works per-locale instead of
  // falling back to a single dynamically-resolved locale for every request.
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = dirFor(locale);

  return (
    <html lang={locale} dir={dir} className="dark">
      <head>
        {/* Self-hosted-via-link font loading — see app/globals.css comment for why not next/font/google */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this rule targets the pages/ dir; App Router's root layout is the documented location for a <link> font tag */}
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/*
          Icons are hidden by default (see .material-symbols-outlined in
          globals.css) until this confirms the icon font actually loaded,
          so a failed font request shows nothing rather than literal
          ligature text ("radar", "verified_user", etc) on screen.
          Fails silently and simply never adds the class if the Font
          Loading API is unavailable or the font never resolves — icons
          just stay hidden rather than the request hanging or throwing.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.fonts.load('24px "Material Symbols Outlined"').then(function(){document.documentElement.classList.add('icons-ready')}).catch(function(){})}catch(e){}`,
          }}
        />
        {/*
          Known-pitfall rule for this build: content must not be hidden if
          JS fails to load. The script above never runs without JS, so
          this forces icons visible again for a no-JS visitor instead of
          leaving them permanently hidden.
        */}
        <noscript>
          <style>{`.material-symbols-outlined{visibility:visible}`}</style>
        </noscript>
      </head>
      <body className="min-h-screen bg-background font-body text-on-background antialiased">
        <SkipLink locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function SkipLink({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Common" });
  return (
    <nav aria-label="Skip links">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-secondary-container focus:px-4 focus:py-2 focus:text-on-secondary-container"
      >
        {t("skipToContent")}
      </a>
    </nav>
  );
}
