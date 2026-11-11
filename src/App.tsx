import { useEffect, useRef, useState } from 'react';
import logo from './assets/morild-bank-logo.png';
import { LANGS, useI18n } from './i18n';
import { href, navigate, useRoute, type RouteName } from './router';
import { useDemo } from './state/demo';
import { SyntheticTag } from './components/ui';
import IntroPage from './pages/IntroPage';
import OverviewPage from './pages/OverviewPage';
import SuppliersPage from './pages/SuppliersPage';
import ChangesPage from './pages/ChangesPage';
import ExercisesPage from './pages/ExercisesPage';
import MapPage from './pages/MapPage';
import ScenarioPage from './pages/ScenarioPage';
import AnalysisPage from './pages/AnalysisPage';
import IncidentPage from './pages/IncidentPage';
import ReportPage from './pages/ReportPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';

// Hovedflyten navigeres med trinnene 1–4 (FlowSteps). Oppslagssidene ligger øverst til høyre.
const LOOKUP: RouteName[] = ['overview', 'suppliers', 'changes', 'exercises', 'help', 'about'];
// Sider utenfor trinnene får en lenke tilbake til flyten.
const OFF_FLOW: RouteName[] = ['overview', 'suppliers', 'changes', 'exercises', 'help', 'about'];

export default function App() {
  const route = useRoute();
  const { m, f, lang, setLang } = useI18n();
  // Siden brukeren kom fra. «Veiledning» lenker tilbake dit i stedet for til flyten.
  const [cameFrom, setCameFrom] = useState<{ name: RouteName; hash: string } | null>(null);
  const current = useRef<{ name: RouteName; hash: string } | null>(null);
  useEffect(() => {
    const here = { name: route.name, hash: window.location.hash };
    const prev = current.current;
    if (prev && prev.name !== route.name) setCameFrom(prev);
    current.current = here;
  }, [route.name, route.query]);
  const { reset, state } = useDemo();
  const [announce, setAnnounce] = useState('');
  const first = useRef(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  // Menyen lukkes ved navigasjon, med Esc og ved klikk utenfor.
  useEffect(() => setMenuOpen(false), [route.name, route.query]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onClick = (e: MouseEvent) => !navRef.current?.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  // Flytt fokus til sidetittelen ved navigasjon, slik at tastatur- og skjermleserbrukere følger med.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('page-title')?.focus();
  }, [route.name]);

  useEffect(() => {
    const page = route.name === 'intro' ? '' : `${m.nav[route.name]} · `;
    document.title = `${page}${m.meta.pageTitle}`;
  }, [route.name, m]);

  const onReset = () => {
    reset();
    setAnnounce(m.nav.resetConfirm);
    navigate('intro');
    window.setTimeout(() => setAnnounce(''), 4000);
  };

  const page = {
    intro: <IntroPage />,
    overview: <OverviewPage />,
    suppliers: <SuppliersPage />,
    changes: <ChangesPage query={route.query} />,
    exercises: <ExercisesPage />,
    map: <MapPage query={route.query} />,
    scenario: <ScenarioPage query={route.query} />,
    analysis: <AnalysisPage query={route.query} />,
    incident: <IncidentPage />,
    report: <ReportPage />,
    help: <HelpPage />,
    about: <AboutPage />,
  }[route.name];

  return (
    <div className={`app route-${route.name}`}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {m.nav.skipToContent}
      </a>
      <section className="concept-banner" aria-label={m.concept.bannerLabel}>
        {m.concept.banner}
      </section>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={href('intro')}>
            <img src={logo} alt="Morild Bank" width={180} height={25} />
          </a>
          {route.name !== 'intro' && (
            <nav ref={navRef} className={`topnav${menuOpen ? ' open' : ''}`} aria-label={m.nav.label}>
              {/* På smale skjermer samles lenkene bak en menyknapp. */}
              <button
                type="button"
                className="topnav-button menu-toggle"
                aria-expanded={menuOpen}
                aria-controls="topnav-list"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {m.nav.menu} <span aria-hidden="true">{menuOpen ? '▴' : '▾'}</span>
              </button>
              <ul id="topnav-list">
                {LOOKUP.map((r) => (
                  <li key={r}>
                    <a href={href(r)} aria-current={route.name === r ? 'page' : undefined}>
                      {m.nav[r]}
                    </a>
                  </li>
                ))}
                <li>
                  <button type="button" className="topnav-button" onClick={onReset}>
                    {m.nav.reset}
                  </button>
                </li>
              </ul>
            </nav>
          )}
          <div className="lang-switch" role="group" aria-label={m.lang.label}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                lang={l === 'no' ? 'nb' : 'en'}
                aria-pressed={lang === l}
                title={m.lang[l]}
                onClick={() => setLang(l)}
              >
                <span aria-hidden="true">{m.lang.short[l]}</span>
                <span className="sr-only">{m.lang[l]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {/* Oppslagssidene: tilbakelenke til venstre og «Syntetiske data» til høyre, på samme høyde som merket i flyten. */}
        {OFF_FLOW.includes(route.name) && (
          <div className="page-meta">
            <p className="back-link">
              {/* Hjelpesiden lenker tilbake til siden brukeren kom fra. */}
              {route.name === 'help' && cameFrom ? (
                <a href={cameFrom.hash || href(cameFrom.name)}>
                  ←{' '}
                  {cameFrom.name === 'intro'
                    ? m.nav.backToStart
                    : cameFrom.name === 'analysis'
                      ? m.nav.backToAnalysis
                      : cameFrom.name === 'scenario'
                        ? m.nav.backToScenario
                        : f(m.nav.backTo, { page: m.nav[cameFrom.name] })}
                </a>
              ) : (
                <a href={href(state.params ? 'analysis' : 'scenario')}>
                  ← {state.params ? m.nav.backToAnalysis : m.nav.backToScenario}
                </a>
              )}
            </p>
            <SyntheticTag />
          </div>
        )}
        {page}
      </main>
      {/* Bunnteksten (forfatter) vises bare på «Om demoen». Banneret øverst merker konseptet på alle sider. */}
      {route.name === 'about' && (
        <footer className="footer">
          <p>{m.concept.author}</p>
        </footer>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
