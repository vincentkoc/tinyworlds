import { describe, expect, it, vi } from "vitest";
import { localeScript, RELOCALIZE_TIMEOUT_MS, RELOCALIZING } from "../early";
import type { Locale } from "../locale";

/** Runs the script against a pretend browser, and says what it left on <html>. */
function run(options: {
  home?: Locale;
  languages?: readonly string[];
  language?: string;
  stored?: string | null;
  storage?: "blocked";
}) {
  const classes = new Set<string>();
  const html = {
    lang: options.home ?? "en-US",
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
  };
  const timers: (() => void)[] = [];
  const localStorage = {
    getItem(key: string) {
      if (options.storage === "blocked") throw new Error("SecurityError");
      return key === "tinysz.prefs" ? (options.stored ?? null) : null;
    },
  };
  const navigator = { languages: options.languages ?? [], language: options.language ?? "" };
  const document = { documentElement: html };
  const setTimeout = vi.fn((fn: () => void) => timers.push(fn));
  new Function(
    "document",
    "localStorage",
    "navigator",
    "setTimeout",
    localeScript("tinysz.prefs", options.home ?? "en-US"),
  )(document, localStorage, navigator, setTimeout);
  return {
    lang: html.lang,
    hidden: classes.has(RELOCALIZING),
    setTimeout,
    /** lets the safety timer go off, and says whether the page is still hidden */
    afterTimeout: () => {
      for (const fn of timers) fn();
      return classes.has(RELOCALIZING);
    },
  };
}

describe("the language script", () => {
  it("takes the first of the browser's languages that we speak", () => {
    expect(run({ languages: ["pt-BR", "en-US"] }).lang).toBe("pt-BR");
    expect(run({ languages: ["fr-FR", "es-AR", "en"] }).lang).toBe("es-ES");
    expect(run({ languages: ["de", "pt"] }).lang).toBe("pt-BR");
    expect(run({ languages: ["en-GB", "pt"] }).lang).toBe("en-US");
  });

  it("matches on the language, whatever the region or the spelling of the tag", () => {
    for (const tag of ["pt", "pt-PT", "pt_BR", " PT-br "])
      expect(run({ languages: [tag] }).lang, tag).toBe("pt-BR");
    for (const tag of ["es", "es-419", "es_MX"])
      expect(run({ languages: [tag] }).lang, tag).toBe("es-ES");
    // Estonian is not Spanish
    expect(run({ languages: ["est"] }).lang).toBe("en-US");
  });

  it("uses navigator.language where there is no list", () => {
    expect(run({ languages: [], language: "es-AR" }).lang).toBe("es-ES");
  });

  it("keeps the home language when it speaks none of the browser's", () => {
    expect(run({ languages: ["fr", "de"] }).lang).toBe("en-US");
    expect(run({ home: "pt-BR", languages: ["fr", "de"] }).lang).toBe("pt-BR");
    expect(run({ home: "pt-BR", languages: ["fr"] }).hidden).toBe(false);
  });

  it("lets a language chosen in the settings win over the browser's", () => {
    expect(run({ languages: ["pt-BR"], stored: '{"lang":"en-US"}' }).lang).toBe("en-US");
    expect(run({ languages: ["en-US"], stored: '{"lang":"es-ES"}' }).lang).toBe("es-ES");
    expect(run({ languages: ["pt-BR"], stored: '{"lang":"auto"}' }).lang).toBe("pt-BR");
  });

  it("ignores a stored value it does not understand, or storage it cannot read", () => {
    expect(run({ languages: ["pt-BR"], stored: '{"lang":"fr-FR"}' }).lang).toBe("pt-BR");
    expect(run({ languages: ["pt-BR"], stored: "not json" }).lang).toBe("pt-BR");
    expect(run({ languages: ["pt-BR"], stored: "null" }).lang).toBe("pt-BR");
    expect(run({ languages: ["es"], storage: "blocked" }).lang).toBe("es-ES");
  });

  it("hides the page only when it will change language, and never for long", () => {
    const same = run({ languages: ["en-US"] });
    expect(same.hidden).toBe(false);
    expect(same.setTimeout).not.toHaveBeenCalled();

    const other = run({ languages: ["pt-BR"] });
    expect(other.hidden).toBe(true);
    expect(other.setTimeout).toHaveBeenCalledWith(expect.any(Function), RELOCALIZE_TIMEOUT_MS);
    expect(other.afterTimeout()).toBe(false);
  });
});
