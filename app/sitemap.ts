import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sentineloversight.app";
  const paths = ["", "/sign-in", "/sign-up"];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: (path === "" ? "weekly" : "yearly") as "weekly" | "yearly",
      priority: path === "" ? 1 : path === "/sign-up" ? 0.5 : 0.3,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])),
      },
    }))
  );
}
