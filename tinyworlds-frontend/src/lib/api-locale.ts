import type { Locale } from "@/i18n/locale";

/**
 * The languages tinyworlds-api speaks: what it accepts with a visit, a funnel step, a quiz answer,
 * a sign-in or a list, and the languages of its mails and of the checkout's product copy
 * (`tinyworlds-api/src/donations/locales.ts`). The interface may speak more; until the API learns
 * them, a visitor in one of those is recorded, and written to, in English.
 */
export const API_LOCALES = ["en-US", "pt-BR", "es-ES"] as const;
export type ApiLocale = (typeof API_LOCALES)[number];

/** The language to send the API for an interface language: its own if the API has it, else English. */
export const apiLocale = (locale: Locale): ApiLocale =>
  (API_LOCALES as readonly string[]).includes(locale) ? (locale as ApiLocale) : "en-US";
