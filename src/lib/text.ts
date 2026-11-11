/**
 * Regler for fritekst som brukeren skriver inn. Teksten vises alltid som ren tekst (React escaper den),
 * men vi begrenser lengde og tegn slik at innholdet ikke kan sprenge oppsettet eller inneholde
 * kontrolltegn, emoji eller markup.
 */
export const SEARCH_MAX = 60;
export const DECISION_MIN = 3;
export const DECISION_MAX = 500;

// Bokstaver (alle språk, inkl. æøå), tall, mellomrom og vanlig tegnsetting.
const PUNCT = ".,:;!?()'\"«»‘’“”\\-–—/&%+@#*_=§€$";
const DECISION_OK = new RegExp(`[^\\p{L}\\p{M}\\p{N} \\n${PUNCT}]`, 'gu');
const SEARCH_OK = new RegExp(`[^\\p{L}\\p{M}\\p{N} .()&/'\\-]`, 'gu');

/** Beslutningstekst: tillatte tegn, maks to linjeskift på rad, kuttet til maks lengde. */
export function cleanDecision(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(DECISION_OK, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, DECISION_MAX);
}

/** Søketekst: én linje, tillatte tegn, kuttet til maks lengde. */
export function cleanSearch(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(SEARCH_OK, '').slice(0, SEARCH_MAX);
}

/** Antall «meningsfulle» tegn (uten mellomrom), brukt for minimumslengde. */
export const visibleLength = (s: string) => s.replace(/\s/g, '').length;
