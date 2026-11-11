import { dataset, nodesById, regionName } from '../data';
import type { Dependency, Provider } from '../data/types';
import { effectiveValidity, primaryPath, type ImpactResult } from '../engine/impact';
import { useI18n } from '../i18n';
import { CauseList, PathTrail } from './Explain';
import { CriticalityBadge, ExitPlanBadge, ImpactBadge, KindTag, StatusBadge, SubstitutabilityBadge, ValidityBadge } from './ui';
import { isOutdated, supplierChains } from '../engine/suppliers';

interface Props {
  nodeId: string;
  result: ImpactResult | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Detaljer om et objekt med relasjoner begge veier og metadata (SPEC P-01, P-02). */
export function NodeDetail({ nodeId, result, onSelect, onClose }: Props) {
  const { m, f, lt, date, duration } = useI18n();
  const node = nodesById[nodeId];
  if (!node) return null;
  const out = dataset.dependencies.filter((d) => d.from === nodeId);
  const inc = dataset.dependencies.filter((d) => d.to === nodeId);
  const imp = result?.impacts[nodeId];

  const depItem = (dep: Dependency, other: string) => {
    const o = nodesById[other];
    const validity = effectiveValidity(dep, dataset.asOf, dataset.staleAfterDays);
    const toRegional = nodesById[dep.to].kind === 'provider' && (nodesById[dep.to] as Provider).regions.length > 0;
    return (
      <li key={dep.id} className={`dep-item validity-${validity}`}>
        <button type="button" className="dep-link" onClick={() => onSelect(other)}>
          <KindTag kind={o.kind} />
          <span className="dep-name">{lt(o.name)}</span>
          {result && <ImpactBadge impact={result.impacts[other]} />}
        </button>
        <dl className="dep-meta">
          <div>
            <dt className="sr-only">{m.strength.hard}</dt>
            <dd>
              {m.depType[dep.type]} · {m.strength[dep.strength]}
            </dd>
          </div>
          {toRegional && (
            <div>
              <dt>{m.detail.regionsUsed}</dt>
              <dd className={dep.regions ? '' : 'gap-text'}>
                {dep.regions ? dep.regions.map((r) => lt(regionName(r))).join(', ') : m.detail.regionUnknown}
              </dd>
            </div>
          )}
          <div>
            <dt>{m.detail.source}</dt>
            <dd>{lt(dep.source)}</dd>
          </div>
          <div>
            <dt className="sr-only">{m.validity.confirmed}</dt>
            <dd>
              <ValidityBadge value={validity} />{' '}
              {dep.lastConfirmed ? f(m.validity.confirmedOn, { date: date(dep.lastConfirmed) }) : m.validity.neverConfirmed}
            </dd>
          </div>
        </dl>
        {dep.note && <p className="dep-note">{lt(dep.note)}</p>}
      </li>
    );
  };

  return (
    <article className="detail" aria-labelledby="detail-title">
      <header className="detail-header">
        <div>
          <KindTag kind={node.kind} />
          <h2 id="detail-title">{lt(node.name)}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={m.detail.close}>
          ×
        </button>
      </header>
      <p>{lt(node.description)}</p>
      <dl className="facts">
        <div>
          <dt>{m.criticality.label}</dt>
          <dd><CriticalityBadge value={node.criticality} /></dd>
        </div>
        <div>
          <dt>{m.status.label}</dt>
          <dd><StatusBadge value={node.status} /></dd>
        </div>
        <div>
          <dt>{m.detail.owner}</dt>
          <dd>{lt(node.owner)}</dd>
        </div>
        {node.kind === 'service' && (
          <>
            <div>
              <dt>{m.detail.rto}</dt>
              <dd>{duration(node.rtoMinutes)}</dd>
            </div>
            <div>
              <dt>{m.detail.rpo}</dt>
              <dd>{node.rpoMinutes === 0 ? '0' : duration(node.rpoMinutes)}</dd>
            </div>
          </>
        )}
        {node.kind === 'system' && (
          <div>
            <dt>{m.environment.label}</dt>
            <dd>{m.environment[node.environment]}</dd>
          </div>
        )}
        {node.kind === 'provider' && (
          <>
            <div>
              <dt>{m.detail.serviceType}</dt>
              <dd>{lt(node.serviceType)}</dd>
            </div>
            {node.regions.length > 0 && (
              <div>
                <dt>{m.detail.regions}</dt>
                <dd>{node.regions.map((r) => lt(regionName(r))).join(', ')}</dd>
              </div>
            )}
            <div className="span-2">
              <dt>{m.detail.alternatives}</dt>
              <dd>{lt(node.alternatives)}</dd>
            </div>
            <div>
              <dt>{m.detail.chainLevel}</dt>
              <dd>
                {supplierChains(dataset)[node.id]
                  .map((c) => (c.via ? `${f(m.suppliers.level, { n: c.rank })} (${f(m.suppliers.under, { name: lt(nodesById[c.via].name) })})` : f(m.suppliers.level, { n: c.rank })))
                  .join(' · ') || '–'}
              </dd>
            </div>
            {node.directContract ? (
              <>
                {node.contractOwner && (
                  <div>
                    <dt>{m.detail.contractOwner}</dt>
                    <dd>{lt(node.contractOwner)}</dd>
                  </div>
                )}
                {node.exitPlan && (
                  <div>
                    <dt>{m.exitPlan.label}</dt>
                    <dd><ExitPlanBadge value={node.exitPlan} /></dd>
                  </div>
                )}
                {node.substitutability && (
                  <div>
                    <dt>{m.substitutability.label}</dt>
                    <dd><SubstitutabilityBadge value={node.substitutability} /></dd>
                  </div>
                )}
                <div>
                  <dt>{m.detail.lastAssessed}</dt>
                  <dd>
                    {node.lastAssessed ? date(node.lastAssessed) : m.suppliers.never}
                    {isOutdated(dataset, node.lastAssessed) && <> <ValidityBadge value="stale" /></>}
                  </dd>
                </div>
                <div>
                  <dt>{m.detail.exitTested}</dt>
                  <dd>{node.exitTested ? date(node.exitTested) : m.suppliers.never}</dd>
                </div>
              </>
            ) : (
              <div>
                <dt>{m.detail.contractOwner}</dt>
                <dd>{m.suppliers.noContract}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {node.dataGaps && node.dataGaps.length > 0 && (
        <section className="callout callout-gap">
          <h3>{m.detail.dataGaps}</h3>
          <ul>
            {node.dataGaps.map((g, n) => (
              <li key={n}>{lt(g)}</li>
            ))}
          </ul>
        </section>
      )}

      {result && (
        <section className="detail-impact">
          <h3>{m.detail.impactTitle}</h3>
          {imp ? (
            <>
              <p>
                <ImpactBadge impact={imp} />{' '}
                {imp.isTarget ? m.impact.target : imp.direct ? m.impact.direct : m.impact.indirect}
                {imp.rtoExceeded && <span className="badge rto-badge">{m.impact.rtoExceeded}</span>}
              </p>
              {!imp.isTarget && (
                <>
                  <h4>{m.detail.path}</h4>
                  <PathTrail path={primaryPath(result, nodeId)} result={result} onSelect={onSelect} />
                  <h4>{m.detail.causes}</h4>
                  <CauseList impact={imp} />
                </>
              )}
            </>
          ) : (
            <p>{m.detail.notImpacted}</p>
          )}
        </section>
      )}

      <section>
        <h3>{m.detail.dependsOn}</h3>
        {out.length ? (
          <ul className="dep-list">
            {out.map((d) => depItem(d, d.to))}
          </ul>
        ) : (
          <p className="muted">{m.detail.none}</p>
        )}
      </section>
      <section>
        <h3>{m.detail.usedBy}</h3>
        {inc.length ? (
          <ul className="dep-list">
            {inc.map((d) => depItem(d, d.from))}
          </ul>
        ) : (
          <p className="muted">{m.detail.none}</p>
        )}
      </section>
    </article>
  );
}
