import { dependenciesById, nodesById } from '../data';
import type { ImpactResult, NodeImpact } from '../engine/impact';
import { useI18n } from '../i18n';
import { ImpactBadge, KindIcon } from './ui';

/** Påvirkningssti som brødsmuler: objekt → … → komponenten som feiler (SPEC D-05). */
export function PathTrail({
  path,
  result,
  onSelect,
}: {
  path: string[];
  result: ImpactResult;
  onSelect?: (id: string) => void;
}) {
  const { lt, m } = useI18n();
  return (
    <ol className="path-trail" aria-label={m.detail.path}>
      {path.map((id, n) => {
        const node = nodesById[id];
        const imp = result.impacts[id];
        const label = (
          <>
            <KindIcon kind={node.kind} size={14} />
            <span>{lt(node.name)}</span>
          </>
        );
        return (
          <li key={id} className={`path-node ${imp?.uncertain ? 'is-uncertain' : ''}`}>
            {onSelect ? (
              <button type="button" className="path-link" onClick={() => onSelect(id)}>
                {label}
              </button>
            ) : (
              <span className="path-link">{label}</span>
            )}
            {n < path.length - 1 && (
              <span className="path-arrow" aria-hidden="true">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Alle relasjoner som bidrar til påvirkningen, med regler og usikkerhet forklart. */
export function CauseList({ impact }: { impact: NodeImpact }) {
  const { lt, f, m } = useI18n();
  return (
    <ul className="cause-list">
      {impact.causes.map((c) => {
        const dep = dependenciesById[c.dependencyId];
        return (
          <li key={c.dependencyId}>
            <span className="cause-head">
              <ImpactBadge impact={{ ...impact, level: c.level, uncertain: c.uncertain }} />{' '}
              {f(m.impact.via, { name: lt(nodesById[c.viaNodeId].name) })}
              <span className="muted"> · {m.depType[dep.type]} · {m.strength[dep.strength]}</span>
            </span>
            {(c.notes.length > 0 || c.reasons.length > 0) && (
              <ul className="cause-notes">
                {c.notes.map((n) => (
                  <li key={n}>{m.impact.notes[n]}</li>
                ))}
                {c.reasons.map((r) => (
                  <li key={r} className="gap-text">
                    {m.impact.reasons[r]}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
