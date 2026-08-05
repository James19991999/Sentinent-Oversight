import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-margin-mobile py-12">
      <header className="mb-8 flex w-full max-w-sm items-center justify-between">
        <Link href="/" className="font-display text-headline-md text-on-surface">
          SENTINEL OVERSIGHT
        </Link>
        <LocaleSwitcher />
      </header>
      <main id="main-content" className="glass-panel w-full max-w-sm rounded-xl p-8">
        {children}
      </main>
    </div>
  );
}
