import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import enMessages from "./messages/en.json";

expect.extend(toHaveNoViolations);

// Mock next/navigation for components that call usePathname/useRouter/useSearchParams
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock our locale-aware navigation wrapper the same way — components use
// this instead of next/navigation directly for locale-prefixed routing.
jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => {
    const React = require("react");
    return React.createElement("a", { href: `/en${href}`, ...props }, children);
  },
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

/**
 * Real messages, not stubbed keys. Using the actual en.json catalog means
 * component tests assert against real shipped copy — if a translation key
 * is renamed or deleted, tests fail loudly instead of silently rendering
 * a mocked placeholder that could never catch that class of bug.
 */
function getNested(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => (acc as Record<string, unknown> | undefined)?.[key], obj);
}

function interpolate(template: string, values?: Record<string, unknown>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

function makeT(namespace?: string) {
  const t = (key: string, values?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const raw = getNested(enMessages, fullKey);
    if (typeof raw !== "string") return fullKey;
    return interpolate(raw, values);
  };
  return t;
}

jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => makeT(namespace),
  useLocale: () => "en",
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next-intl/server", () => ({
  getTranslations: async (arg?: string | { namespace?: string }) => {
    const namespace = typeof arg === "string" ? arg : arg?.namespace;
    return makeT(namespace);
  },
  setRequestLocale: () => {},
  getMessages: async () => enMessages,
}));
