import { isRtl, dirFor, isLocale, locales, defaultLocale } from "@/i18n/config";

describe("locale config", () => {
  it("marks Arabic as RTL and English/Spanish as LTR", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
    expect(isRtl("es")).toBe(false);
  });

  it("dirFor returns the correct HTML dir attribute value", () => {
    expect(dirFor("ar")).toBe("rtl");
    expect(dirFor("en")).toBe("ltr");
    expect(dirFor("es")).toBe("ltr");
  });

  it("isLocale validates against the supported locale list only", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("defaultLocale is a member of the supported locales list", () => {
    expect(locales).toContain(defaultLocale);
  });
});
