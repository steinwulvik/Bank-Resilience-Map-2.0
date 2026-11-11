import { href } from '../router';
import { useI18n } from '../i18n';
import { useDemo } from '../state/demo';

const STEPS = ['scenario', 'analysis', 'incident', 'report'] as const;
type Step = (typeof STEPS)[number];

/** Stegindikator for hovedflyten (scenario → påvirkning → hendelsesrom → rapport) (SPEC P-12, D-10). */
export function FlowSteps({ current }: { current: Step }) {
  const { m } = useI18n();
  const { state } = useDemo();
  const idx = STEPS.indexOf(current);
  const locked = (s: Step) => s !== 'scenario' && !state.params;

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

    </section>
  );
}
