"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { signOut } from "firebase/auth";
import { useRouter, Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function TopBar() {
  const { user, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("TopBar");

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    await fetch("/api/session", { method: "DELETE" });
    router.push("/sign-in");
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-outline-variant px-6 py-4">
      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 md:flex">
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          aria-label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-transparent text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
        />
      </div>

      <div className="ms-auto flex items-center gap-3">
        <LocaleSwitcher />

        <button
          type="button"
          aria-label={t("notifications")}
          className="relative rounded-md p-2 text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
          <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-error" aria-hidden="true" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-container-low"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden text-start md:block">
              <span className="block text-body-sm text-on-surface">{user?.email ?? "—"}</span>
              <span className="block font-label text-label-caps uppercase text-on-surface-variant">{role ?? ""}</span>
            </span>
          </button>
          {menuOpen ? (
            <ul
              role="menu"
              className="absolute end-0 z-10 mt-2 w-48 rounded-md border border-outline-variant bg-surface-container py-1 shadow-lg"
            >
              <li role="none">
                <Link role="menuitem" href="/settings/preferences" className="block px-4 py-2 text-body-sm text-on-surface hover:bg-surface-container-high">
                  {t("accountSettings")}
                </Link>
              </li>
              <li role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2 text-start text-body-sm text-error hover:bg-surface-container-high"
                >
                  {t("signOut")}
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </header>
  );
}
