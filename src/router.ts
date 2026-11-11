import { useEffect, useState } from 'react';

/**
 * Enkel hash-ruting (#/kart?node=sys-api). Fungerer ved direkte lenke og oppfrisking
 * på statisk hosting som Cloudflare Pages (SPEC P-14).
 */
export type RouteName = 'intro' | 'overview' | 'suppliers' | 'changes' | 'exercises' | 'map' | 'scenario' | 'analysis' | 'incident' | 'report' | 'help' | 'about';

export const routePaths: Record<RouteName, string> = {
  intro: '/',
  overview: '/oversikt',
  suppliers: '/leverandorer',
  changes: '/endringer',
  exercises: '/ovelser',
  map: '/kart',
  scenario: '/scenario',
  analysis: '/pavirkning',
  incident: '/hendelse',
  report: '/rapport',
  help: '/veiledning',
  about: '/om',
};

export interface Route {
  name: RouteName;
  query: URLSearchParams;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const name = (Object.keys(routePaths) as RouteName[]).find((k) => routePaths[k] === path) ?? 'intro';
  return { name, query: new URLSearchParams(qs) };
}

export function href(name: RouteName, query?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v) params.set(k, v);
  const qs = params.toString();
  return `#${routePaths[name]}${qs ? `?${qs}` : ''}`;
}

export function navigate(name: RouteName, query?: Record<string, string | undefined>, replace = false) {
  const next = href(name, query);
  if (replace) history.replaceState(null, '', next);
  else history.pushState(null, '', next);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

const OPENED_KEY = 'morild-opened';

/**
 * Appen starter alltid på introsiden når den åpnes, også fra en lenke til en annen side.
 * Oppfrisking i samme fane beholder siden man er på (fanen husker at appen alt er åpnet).
 */
function startHash(): string {
  try {
    if (sessionStorage.getItem(OPENED_KEY)) return window.location.hash;
    sessionStorage.setItem(OPENED_KEY, '1');
  } catch {
    /* uten lagring: start alltid på introsiden */
  }
  if (window.location.hash && window.location.hash !== '#/') history.replaceState(null, '', '#/');
  return '#/';
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(startHash()));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return route;
}

/** Lenke til kartet i påvirkningsanalysen, eventuelt med et objekt valgt. */
export const mapHref = (node?: string) => href('analysis', { node });
