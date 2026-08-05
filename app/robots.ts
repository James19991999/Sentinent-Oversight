import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

export default function robots(): MetadataRoute.Robots {
  const disallowedSegments = ["dashboard", "threats", "compliance", "response", "training", "settings", "billing"];
  const disallow = locales.flatMap((locale) => disallowedSegments.map((segment) => `/${locale}/${segment}`));

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...disallow, "/api"] }],
    sitemap: "https://sentineloversight.app/sitemap.xml",
  };
}
