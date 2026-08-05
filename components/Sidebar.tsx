"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { can, type Permission } from "@/lib/rbac";

interface NavItem {
  href: string;
  labelKey: "commandCenter" | "threatDetection" | "complianceAudits" | "responseAutomation" | "trainingHub" | "settings" | "billing";
  icon: string;
  permission: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "commandCenter", icon: "shield_person", permission: "threats:read" },
  { href: "/threats", labelKey: "threatDetection", icon: "radar", permission: "threats:read" },
  { href: "/compliance", labelKey: "complianceAudits", icon: "verified_user", permission: "compliance:read" },
  { href: "/response", labelKey: "responseAutomation", icon: "emergency_home", permission: "response:read" },
  { href: "/training", labelKey: "trainingHub", icon: "school", permission: "training:read" },
  { href: "/settings/security", labelKey: "settings", icon: "settings", permission: "settings:read" },
  { href: "/billing", labelKey: "billing", icon: "credit_card", permission: "billing:read" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const t = useTranslations("Nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !role || can(role, item.permission));

  const navList = (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
      {visibleItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium",
              active
                ? "bg-secondary-container/20 text-secondary border-s-2 border-secondary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top trigger */}
      <div className="flex items-center justify-between border-b border-outline-variant p-4 md:hidden">
        <Link href="/dashboard" className="font-display text-headline-sm text-on-surface">
          SENTINEL
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar"
          aria-label="Toggle navigation menu"
          className="rounded-md p-2 text-on-surface"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {mobileOpen ? "close" : "menu"}
          </span>
        </button>
      </div>
      {mobileOpen ? (
        <div id="mobile-sidebar" className="flex flex-col border-b border-outline-variant bg-surface-container-low py-3 md:hidden">
          {navList}
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-outline-variant bg-surface-container-low py-6 md:flex">
        <Link href="/dashboard" className="px-6 font-display text-headline-sm text-on-surface">
          SENTINEL
        </Link>
        <p className="px-6 pb-6 pt-1 font-label text-label-caps uppercase text-on-surface-variant">Oversight</p>
        {navList}
      </aside>
    </>
  );
}
