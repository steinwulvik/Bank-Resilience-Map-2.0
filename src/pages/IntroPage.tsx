import { dataset } from '../data';
import { useI18n } from '../i18n';
import { href, navigate, type RouteName } from '../router';
import { useDemo } from '../state/demo';

/** Sidene i kortet «Forebygging», i samme rekkefølge som tekstene. */
const PREVENT_ROUTES: RouteName[] = ['suppliers', 'changes', 'exercises'];

export default function IntroPage() {
  const { m, lt } = useI18n();
  const { runScenario, setGuide } = useDemo();

  const startGuided = () => {
    const sc = dataset.scenarios[0];
    runScenario(sc.id, sc.defaults);
    setGuide(false); // Veiledningen er skjult som standard; brukeren kan vise den selv.
    navigate('scenario');
  };

  return (
    <div className="intro">
      <section className="hero">
        <p className="eyebrow">{m.intro.eyebrow}</p>
        <h1 id="page-title" tabIndex={-1}>
          {m.intro.title}
        </h1>
        <p className="lead">{m.intro.lead}</p>
      </section>

      <section className="intro-grid">
        <div className="stack">
        <div className="card">
          <h2>{m.intro.showsTitle}</h2>
          <ol className="intro-steps">
            {m.intro.steps.map((s, n) => (
              <li key={s.title}>
                <span className="flow-num">{n + 1}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h2>{m.intro.preventTitle}</h2>
          <ul className="intro-prevent">
            {m.intro.prevent.map((s, n) => (
              <li key={s.title}>
                <a href={href(PREVENT_ROUTES[n])}>{s.title}</a>
                <p>{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
        </div>
        <div className="stack">
          <div className="card">
            <h2>{m.intro.forWhoTitle}</h2>
            <p>{m.intro.forWho}</p>
          </div>
          <div className="card">
            <h2>{m.intro.principleTitle}</h2>
            <p>{m.intro.principle}</p>
          </div>
          <div className="card card-notice">
            <p>{lt(dataset.bank.description)}</p>
            <p>{m.concept.disclaimer}</p>
            <p className="muted">{m.concept.noAdvice}</p>
          </div>
        </div>
      </section>

      <section className="intro-start" aria-labelledby="intro-start-title">
        <div>
          <h2 id="intro-start-title">{m.intro.startTitle}</h2>
          <p>{m.intro.ctaGuidedHint}</p>
        </div>
        <div className="intro-start-actions">
          <button type="button" className="btn btn-primary btn-large" onClick={() => navigate('help')}>
            {m.help.introLink}
          </button>
          <button type="button" className="btn btn-primary btn-large" onClick={startGuided}>
            {m.intro.ctaGuided}
          </button>
        </div>
      </section>
    </div>
  );
}
