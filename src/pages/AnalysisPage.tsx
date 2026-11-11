import { useState } from 'react';
import { dataset, nodesById, regionName, scenariosById } from '../data';
import type { NodeKind, Service } from '../data/types';
import { primaryPath, type ImpactResult, type NodeImpact } from '../engine/impact';
import { useI18n, type I18n } from '../i18n';
import { href, mapHref, navigate } from '../router';
import { useDemo } from '../state/demo';
import { CauseList, PathTrail } from '../components/Explain';
import { MapExplorer } from '../components/MapExplorer';
import { FlowSteps } from '../components/FlowSteps';
import { gapQuestion, gapTaskId, gapToTask } from '../components/gaps';
import { impactLabel, PageHeader, SyntheticTag } from '../components/ui';

type Group = 'outage' | 'degraded' | 'uncertain';
const GROUPS: Group[] = ['outage', 'degraded', 'uncertain'];
const groupOf = (i: NodeImpact): Group => (i.uncertain ? 'uncertain' : i.level);
const CRIT_RANK = { critical: 0, high: 1, medium: 2 } as const;

/**
 * Én setning som forklarer hvorfor et objekt er berørt, ut fra den viktigste påvirkningsstien.
 * Merknader (myk avhengighet, flere land) og usikkerhet langs stien legges til som egne setninger.
 */
function explain(result: ImpactResult, nodeId: string, i: I18n): { sentence: string; notes: string[] } {
  const { m, f, lt } = i;
  const imp = result.impacts[nodeId];
  const path = primaryPath(result, nodeId);
  const name = (id: string) => lt(nodesById[id].name);
  const status = imp.uncertain
    ? imp.level === 'outage'
      ? m.analysis.explain.possibleOutage
      : m.analysis.explain.possibleDegraded
    : m.analysis.explain[imp.level];
  let sentence = f(m.analysis.explain.lead, { name: name(nodeId), status, first: name(path[1]) });
  for (const next of path.slice(2)) sentence += f(m.analysis.explain.chain, { next: name(next) });
  sentence += '.';

  const notes = new Set<string>();
  for (let n = 0; n < path.length - 1; n++) {
    const cause = result.impacts[path[n]]?.causes.find((c) => c.viaNodeId === path[n + 1]);
    cause?.notes.forEach((x) => notes.add(m.impact.notes[x]));
    cause?.reasons.forEach((x) => notes.add(m.impact.reasons[x]));
  }
  return { sentence, notes: [...notes] };
}

export default function AnalysisPage({ query }: { query: URLSearchParams }) {
  const i18n = useI18n();
  const { m, f, lt, duration } = i18n;
  const { state, result, addCustomTask } = useDemo();
  const [open, setOpen] = useState<string | null>(null);
  // Liste eller kart, og valgt objekt i kartet, ligger i adressen (#/pavirkning?visning=kart&node=…).
  const view: 'list' | 'map' = query.get('visning') === 'liste' ? 'list' : 'map'; // kart er standard
  const mapNode = query.get('node');
  const setView = (v: 'list' | 'map') =>
    navigate('analysis', { visning: v === 'list' ? 'liste' : undefined, node: v === 'map' ? mapNode ?? undefined : undefined }, true);
  const selectMapNode = (id: string | null) => navigate('analysis', { node: id ?? undefined }, true);

  if (!result || !state.scenarioId) {
    return (
      <div className="page">
        <PageHeader title={m.meta.appName} />
        <FlowSteps current="analysis" />
        <div className="card empty">
          <p>{m.analysis.none}</p>
          <a className="btn btn-primary" href={href('scenario')}>{m.analysis.goScenario}</a>
        </div>
      </div>
    );
  }

  const template = scenariosById[state.scenarioId];
  const p = result.params;
  const impacts = Object.values(result.impacts).filter((x) => !x.isTarget);
  const ofKind = (kinds: NodeKind[]) => impacts.filter((x) => kinds.includes(nodesById[x.nodeId].kind));
  const services = ofKind(['service']);
  const unaffectedServices = dataset.nodes.filter((n) => n.kind === 'service' && !result.impacts[n.id]);

  // Sammendraget teller de samme objektene som kartet viser (alle berørte, inkludert utgangspunktet),
  // og fordeler dem på type, så tallene kan stemmes av mot kartet og listene under.
  const all = Object.values(result.impacts);
  const outageAll = all.filter((x) => x.level === 'outage' && !x.uncertain);
  const degradedAll = all.filter((x) => x.level === 'degraded' && !x.uncertain);
  const uncertainAll = all.filter((x) => x.uncertain);
  const rtoAll = services.filter((x) => x.rtoExceeded);
  const breakdown = (list: NodeImpact[]) =>
    (['provider', 'system', 'service', 'channel'] as NodeKind[])
      .map((k) => {
        const n = list.filter((x) => nodesById[x.nodeId].kind === k).length;
        if (!n) return null;
        return `${n} ${(n === 1 ? m.kinds[k] : m.kindsPlural[k]).toLowerCase()}`;
      })
      .filter(Boolean)
      .join(' · ');

  const serviceRow = (imp: NodeImpact) => {
    const s = nodesById[imp.nodeId] as Service;
    const isOpen = open === imp.nodeId;
    const detailId = `explain-${imp.nodeId}`;
    const { sentence, notes } = explain(result, imp.nodeId, i18n);
    return [
      <tr key={imp.nodeId} className={`svc-row${isOpen ? ' is-open' : ''}`}>
        <th scope="row">
          <button
            type="button"
            className="row-toggle"
            aria-expanded={isOpen}
            aria-controls={detailId}
            onClick={() => setOpen(isOpen ? null : imp.nodeId)}
          >
            <span className="row-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            {lt(s.name)}
          </button>
          {imp.uncertain && <span className="row-status gap-text">{impactLabel(imp, i18n)}</span>}
        </th>
        <td className={imp.rtoExceeded ? 'rto-over' : ''}>
          {imp.level === 'outage'
            ? f(m.analysis.downtimeVsGoal, { duration: duration(p.durationMinutes), rto: duration(s.rtoMinutes) })
            : f(m.analysis.goalOnly, { rto: duration(s.rtoMinutes) })}
        </td>
        <td>{lt(s.owner)}</td>
        <td>{m.criticality[s.criticality]}</td>
      </tr>,
      isOpen && (
        <tr key={`${imp.nodeId}-x`} className="explain-row" id={detailId}>
          <td colSpan={4}>
            <p className="explain-sentence">{sentence}</p>
            {notes.map((n) => (
              <p key={n} className="explain-note">{n}</p>
            ))}
            <PathTrail path={primaryPath(result, imp.nodeId)} result={result} />
            <div className="explain-actions">
              {imp.causes.length > 1 && (
                <details className="more-causes">
                  <summary>{f(m.analysis.allCauses, { n: imp.causes.length })}</summary>
                  <CauseList impact={imp} />
                </details>
              )}
              <a href={mapHref(imp.nodeId)}>{m.detail.openInMap} →</a>
            </div>
          </td>
        </tr>
      ),
    ];
  };

  return (
    <div className="page analysis">
      <PageHeader title={m.meta.appName}>
        <SyntheticTag />
      </PageHeader>
      <FlowSteps current="analysis" />

      <section className="card summary-card">
        <h2>{m.analysis.summaryTitle}</h2>
        <p className="summary-scenario">
          <strong>{lt(template.title)}</strong> · {lt(nodesById[p.targetId].name)}
          {p.regions.length > 0 && ` (${p.regions.map((r) => lt(regionName(r))).join(', ')})`} ·{' '}
          {p.severity === 'outage' ? m.scenario.severityOutage : m.scenario.severityDegraded} · {duration(p.durationMinutes)}
        </p>
        <div className="kpis kpis-compact">
          <div className="kpi kpi-outage">
            <span className="kpi-value">{outageAll.length}</span>
            <span className="kpi-label">{m.impact.outage}</span>
            <span className="kpi-sub">{breakdown(outageAll)}</span>
          </div>
          <div className="kpi kpi-degraded">
            <span className="kpi-value">{degradedAll.length}</span>
            <span className="kpi-label">{m.impact.degraded}</span>
            <span className="kpi-sub">{breakdown(degradedAll)}</span>
          </div>
          <div className="kpi kpi-uncertain">
            <span className="kpi-value">{uncertainAll.length}</span>
            <span className="kpi-label">{m.impact.possibleOutage}</span>
            <span className="kpi-sub">{breakdown(uncertainAll)}</span>
          </div>
          <div className="kpi kpi-rto">
            <span className="kpi-value">{rtoAll.length}</span>
            <span className="kpi-label">{m.impact.rtoExceeded}</span>
            <span className="kpi-sub">
              {rtoAll.length
                ? rtoAll.map((x) => lt(nodesById[x.nodeId].name)).join(', ')
                : f(m.analysis.rtoNone, { duration: duration(p.durationMinutes) })}
            </span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{m.analysis.services} ({services.length})</h2>
          <div className="segmented" role="group" aria-label={m.map.viewLabel}>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              {m.map.viewList}
            </button>
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
              {m.map.viewMap}
            </button>
          </div>
        </div>
        {view === 'map' ? (
          <MapExplorer selected={mapNode} select={selectMapNode} />
        ) : (
          <>
        {GROUPS.map((g) => {
          const rows = services
            .filter((x) => groupOf(x) === g)
            .sort(
              (a, b) =>
                Number(b.rtoExceeded) - Number(a.rtoExceeded) ||
                CRIT_RANK[nodesById[a.nodeId].criticality] - CRIT_RANK[nodesById[b.nodeId].criticality],
            );
          if (!rows.length) return null;
          return (
            <div key={g} className={`svc-group group-${g}`}>
              <h3 className="group-title">
                <span className="group-dot" aria-hidden="true" />
                {m.analysis.groups[g]} ({rows.length})
              </h3>
              <table className="table svc-table">
                <thead>
                  <tr>
                    <th scope="col">{m.overview.colService}</th>
                    <th scope="col">{m.analysis.colDowntime}</th>
                    <th scope="col">{m.overview.colOwner}</th>
                    <th scope="col">{m.criticality.label}</th>
                  </tr>
                </thead>
                <tbody>{rows.flatMap(serviceRow)}</tbody>
              </table>
            </div>
          );
        })}
        {unaffectedServices.length > 0 && (
          <p className="muted small">
            {f(m.analysis.unaffected, { names: i18n.list(unaffectedServices.map((s) => lt(s.name))) })}
          </p>
        )}
          </>
        )}
      </section>

      <div className="fold-list">
        <details className="card fold fold-gaps">
          <summary>{f(m.analysis.gapsFold, { n: result.gaps.length })}</summary>
          <p className="muted small">{m.analysis.gapsLead}</p>
          <ul className="gap-list">
            {result.gaps.map((g) => {
              const added = state.customTasks.some((t) => t.id === gapTaskId(g));
              return (
                <li key={gapTaskId(g)}>
                  <span className={`badge validity-${g.reason === 'regionUnknown' ? 'missing' : g.reason}`}>
                    {g.reason === 'regionUnknown' ? m.validity.missing : m.validity[g.reason]}
                  </span>
                  <span className="gap-text-main">{gapQuestion(g, i18n)}</span>
                  {added ? (
                    <span className="muted small">✓ {m.analysis.addedAsTask}</span>
                  ) : (
                    <button type="button" className="link-button small" onClick={() => addCustomTask(gapToTask(g))}>
                      + {m.analysis.addAsTask}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </div>
  );
}
