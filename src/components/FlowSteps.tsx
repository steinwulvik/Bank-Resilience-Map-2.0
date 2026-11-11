import { href, navigate, type RouteName } from '../router';
import { useI18n } from '../i18n';
import { useDemo } from '../state/demo';

const STEPS = ['scenario', 'analysis', 'incident', 'report'] as const;
type Step = (typeof STEPS)[number];

/**
 * Stegindikator for hovedflyten (scenario → påvirkning → respons → rapport) med
 * veiledning som kan skjules (SPEC P-12, D-10).
 */
/** Viser «**Fet start:** resten» med fet skrift på den første delen. */
function boldLead(text: string) {
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text);
  return m ? (
    <>
      <strong>{m[1]}</strong> {m[2]}
    </>
  ) : (
    text
  );
}

export function FlowSteps({ current }: { current: Step }) {
  const { m, f } = useI18n();
  const { state, setGuide } = useDemo();
  const idx = STEPS.indexOf(current);
  const locked = (s: Step) => s !== 'scenario' && !state.params;
  const next = STEPS[idx + 1] as RouteName | undefined;
  // Noen steg har en punktliste og en avsluttende tekst i tillegg til hovedteksten.
  const step = m.guide.steps[current] as { title: string; text: string; items?: readonly string[]; after?: string };

  return (
    <section className="flow" aria-label={m.guide.label}>
      <ol className="flow-steps">
        {STEPS.map((s, n) => (
          <li key={s} className={n === idx ? 'current' : n < idx ? 'done' : ''}>
            {locked(s) ? (
              <span className="flow-step disabled">
                <span className="flow-num">{n + 1}</span>
                {m.nav[s]}
              </span>
            ) : (
              <a className="flow-step" href={href(s)} aria-current={n === idx ? 'step' : undefined}>
                <span className="flow-num">{n + 1}</span>
                {m.nav[s]}
              </a>
            )}
          </li>
        ))}
      </ol>

      {state.guide ? (
        <div className="guide-callout" role="note">
          <p className="guide-step">{f(m.guide.stepOf, { n: idx + 1, total: STEPS.length })}</p>
          <p>
            <strong>{step.title}.</strong> {step.text}
          </p>
          {step.items && (
            <ul className="guide-list">
              {step.items.map((item) => (
                <li key={item}>{boldLead(item)}</li>
              ))}
            </ul>
          )}
          {step.after && <p>{step.after}</p>}
          {!next && <p>{m.guide.done}</p>}
          <div className="guide-actions">
            {next && state.params && (
              <button type="button" className="btn btn-small" onClick={() => navigate(next)}>
                {m.guide.next}: {m.nav[next as Step]}
              </button>
            )}
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setGuide(false)}>
              {m.guide.hide}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
