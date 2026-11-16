import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n";
import { API_LOCALES, apiLocale } from "../api-locale";
import { stepRequest } from "../funnel";
import { answerRequest } from "../quiz-api";
import { presenceRequest } from "../visits";

describe("apiLocale", () => {
  it("sends the API each language it speaks as it is", () => {
    for (const locale of API_LOCALES) expect(apiLocale(locale)).toBe(locale);
  });

  it("sends English for a language the API does not speak yet", () => {
    expect(apiLocale("zh-CN")).toBe("en-US");
    for (const locale of LOCALES) expect(API_LOCALES).toContain(apiLocale(locale));
  });

  it("is what the visits, the funnel and the quiz send", () => {
    expect(presenceRequest("v", "tinynyc", "zh-CN").variables.input.locale).toBe("en-US");
    expect(stepRequest("v", "DONATE_OPENED", "tinynyc", "zh-CN").variables.input.locale).toBe(
      "en-US",
    );
    const answer = answerRequest({
      world: "tinynyc",
      sightId: "b1",
      choice: "a",
      choices: ["a", "b", "c", "d"],
      level: "easy",
      locale: "zh-CN",
      visitId: null,
    });
    expect(answer.variables.input.locale).toBe("en-US");
  });
});
