import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getServerSession } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import type { Locale } from "@/i18n/config";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(params.locale as Locale);

  const session = await getServerSession();
  if (!session) {
    redirect(`/${params.locale}/sign-in`);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main-content" className="flex-1 px-margin-mobile py-8 md:px-margin-desktop">
          {children}
        </main>
      </div>
    </div>
  );
}
