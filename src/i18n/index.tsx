import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, LocalizedText } from '../data/types';
import en from './en';
import no, { type Messages } from './no';

/** Språkfiler. Begge har samme struktur (typesjekket mot den norske). */
const catalogs: Record<Lang, Messages> = { no, en };
export const LANGS: Lang[] = ['no', 'en'];

export interface I18n {
  lang: Lang;
  /** Bytter språk for hele appen. */
  setLang: (lang: Lang) => void;
  /** Alle tekster for valgt språk. */
  m: Messages;
  /** Fyller inn {variabler} i en tekst. */
  f: (template: string, vars?: Record<string, string | number>) => string;
  /** Velger riktig språk fra en tekst i datasettet, med norsk som reserve. */
  lt: (text: LocalizedText | undefined) => string;
  date: (iso: string) => string;
  time: (date: Date) => string;
  dateTime: (date: Date) => string;
  duration: (minutes: number) => string;
  list: (items: string[]) => string;
}

export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Felles dato- og tidsformat for hele appen (se skillen): dd.mm.åååå og tt:mm (24 timer),
 * f.eks. 06.11.2026 14:05. Brukes likt uansett språk.
 */
const pad = (n: number) => String(n).padStart(2, '0');
export const formatDate = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function createI18n(lang: Lang, setLang: (lang: Lang) => void = () => {}): I18n {
  const m = catalogs[lang] ?? no;
  const locale = m.meta.locale;
  const f = format;
  return {
    lang,
    setLang,
    m,
    f,
    lt: (text) => (text ? (text[lang] ?? text.no) : ''),
    date: (iso) => formatDate(new Date(iso)),
    time: (d) => formatTime(d),
    dateTime: (d) => `${formatDate(d)} ${formatTime(d)}`,
    duration: (min) => {
      if (min < 60) return f(m.units.minutes, { n: min });
      if (min < 1440) return min === 60 ? m.units.hour : f(m.units.hours, { n: Math.round((min / 60) * 10) / 10 });
      return min === 1440 ? m.units.day : f(m.units.days, { n: Math.round((min / 1440) * 10) / 10 });
    },
    list: (items) => new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items),
  };
}

const I18nContext = createContext<I18n>(createI18n('no'));

const LANG_KEY = 'morild-lang';

/**
 * Startspråk: det brukeren valgte tidligere i denne fanen, ellers engelsk.
 * Valget lagres bare i fanen (sessionStorage), som resten av demoen.
 */
function initialLang(): Lang {
  try {
    const saved = sessionStorage.getItem(LANG_KEY);
    if (saved === 'no' || saved === 'en') return saved;
  } catch {
    /* lagring er en bekvemmelighet */
  }
  return 'en';
}

export function I18nProvider({ lang: forced, children }: { lang?: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => forced ?? initialLang());
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      sessionStorage.setItem(LANG_KEY, l);
    } catch {
      /* lagring er en bekvemmelighet */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'no' ? 'nb' : 'en';
  }, [lang]);
  const value = useMemo(() => createI18n(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
