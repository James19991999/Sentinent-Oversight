import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ar from "@/messages/ar.json";

type MessageTree = { [key: string]: string | MessageTree };

function collectKeyPaths(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return [path];
    return collectKeyPaths(value as MessageTree, path);
  });
}

describe("i18n message catalog parity", () => {
  const enKeys = collectKeyPaths(en as MessageTree).sort();
  const esKeys = collectKeyPaths(es as MessageTree).sort();
  const arKeys = collectKeyPaths(ar as MessageTree).sort();

  it("es.json has every key that en.json has, and no extras", () => {
    expect(esKeys).toEqual(enKeys);
  });

  it("ar.json has every key that en.json has, and no extras", () => {
    expect(arKeys).toEqual(enKeys);
  });

  it("no message value is an empty string in any locale", () => {
    for (const [locale, tree] of Object.entries({ en, es, ar })) {
      for (const path of collectKeyPaths(tree as MessageTree)) {
        const value = path.split(".").reduce((acc: unknown, k) => (acc as MessageTree)[k], tree);
        expect(typeof value === "string" && value.trim().length > 0).toBe(true);
        if (!(typeof value === "string" && value.trim().length > 0)) {
          throw new Error(`${locale}.json has an empty value at "${path}"`);
        }
      }
    }
  });

  it("interpolation placeholders match between en.json and es.json for every key", () => {
    const placeholderPattern = /\{(\w+)\}/g;
    for (const path of enKeys) {
      const enValue = path.split(".").reduce((acc: unknown, k) => (acc as MessageTree)[k], en) as string;
      const esValue = path.split(".").reduce((acc: unknown, k) => (acc as MessageTree)[k], es) as string;
      const enPlaceholders = [...enValue.matchAll(placeholderPattern)].map((m) => m[1]).sort();
      const esPlaceholders = [...esValue.matchAll(placeholderPattern)].map((m) => m[1]).sort();
      expect(esPlaceholders).toEqual(enPlaceholders);
    }
  });

  it("interpolation placeholders match between en.json and ar.json for every key", () => {
    const placeholderPattern = /\{(\w+)\}/g;
    for (const path of enKeys) {
      const enValue = path.split(".").reduce((acc: unknown, k) => (acc as MessageTree)[k], en) as string;
      const arValue = path.split(".").reduce((acc: unknown, k) => (acc as MessageTree)[k], ar) as string;
      const enPlaceholders = [...enValue.matchAll(placeholderPattern)].map((m) => m[1]).sort();
      const arPlaceholders = [...arValue.matchAll(placeholderPattern)].map((m) => m[1]).sort();
      expect(arPlaceholders).toEqual(enPlaceholders);
    }
  });
});
