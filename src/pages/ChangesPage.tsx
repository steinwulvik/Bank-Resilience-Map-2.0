import { useMemo, useState, type FormEvent } from 'react';
import { dataset, nodesById } from '../data';
import type { ChangeOutcome, ChangeRisk, FindingStatus, NodeKind, PlannedChange } from '../data/types';
import { computeImpact, type ImpactResult, type NodeImpact } from '../engine/impact';
import { useI18n } from '../i18n';
import { cleanDecision, DECISION_MAX, DECISION_MIN, visibleLength } from '../lib/text';
import { navigate } from '../router';
import { useDemo } from '../state/demo';
import { FindingStatusBadge, PageHeader } from '../components/ui';
import { MapExplorer } from '../components/MapExplorer';

type Status = 'pending' | ChangeOutcome;

const RISK_CLASS: Record<ChangeRisk, string> = { low: 'crit-medium', medium: 'status-degraded', high: 'crit-critical' };
const STATUS_CLASS: Record<Status, string> = { pending: 'status-degraded', approved: 'status-operational', rejected: 'crit-critical' };

/** Forventet påvirkning hvis endringen feiler: bortfall i systemet gjennom hele vedlikeholdsvinduet. */
function impactOf(c: PlannedChange): ImpactResult {
  return computeImpact(dataset, { targetId: c.systemId, regions: [], severity: 'outage', durationMinutes: c.windowMinutes });
}

/**
 * Siden «Endringer» (2.0, SPEC P-19, F-13). Vurderer planlagte endringer mot avhengighetskartet med samme
 * beregning som scenarioene. Sjekkliste og beslutninger lagres bare i nettleserfanen (D-17).
 */
export default function ChangesPage({ query }: { query: URLSearchParams }) {
  const { m, f, lt, date, dateTime, duration } = useI18n();
  const { state, toggleChangeCheck, decideChange } = useDemo();
  const changes = dataset.plannedChanges;
  const impacts = useMemo(() => Object.fromEntries(changes.map((c) => [c.id, impactOf(c)])), [changes]);

  // Beslutningslogg per endring: fast beslutning i datasettet først, deretter det som er lagt inn i demoen.
  const logFor = (c: PlannedChange) => [
    ...(c.decision
      ? [{ key: `${c.id}-data`, at: new Date(c.decision.decidedAt), outcome: c.decision.outcome, reason: lt(c.decision.reason), role: lt(c.decision.role), byYou: false }]
      : []),
    ...state.changeLog
      .filter((e) => e.changeId === c.id)
      .map((e) => ({ key: e.id, at: new Date(e.at), outcome: e.outcome, reason: e.reason, role: e.role, byYou: true })),
  ];
  const statusOf = (c: PlannedChange): Status => logFor(c).at(-1)?.outcome ?? 'pending';
  const counts = { pending: 0, approved: 0, rejected: 0 };
  changes.forEach((c) => counts[statusOf(c)]++);

  // Valgt endring ligger i adressen. Uten valg vises den første som venter på beslutning.
  const selected = changes.find((c) => c.id === query.get('id')) ?? changes.find((c) => statusOf(c) === 'pending') ?? changes[0];
  const select = (id: string) => navigate('changes', { id }, true);

  const servicesHit = (r: ImpactResult) => Object.values(r.impacts).filter((x) => nodesById[x.nodeId].kind === 'service');

  return (
    <div className="page">
      <PageHeader title={m.changes.title} lead={m.changes.lead} />

      <section className="kpis" aria-label={m.changes.title}>
        <div className="kpi">
          <span className="kpi-value">{changes.length}</span>
          <span className="kpi-label">{m.changes.kpiPlanned}</span>
        </div>
        <div className={`kpi kpi-accent kpi-dev${counts.pending === 0 ? ' kpi-zero' : ''}`}>
          <span className="kpi-value">{counts.pending}</span>
          <span className="kpi-label">{m.changes.kpiPending}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{counts.approved}</span>
          <span className="kpi-label">{m.changes.kpiApproved}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{counts.rejected}</span>
          <span className="kpi-label">{m.changes.kpiRejected}</span>
        </div>
      </section>

      <section className="card">
        <h2>{m.changes.listTitle}</h2>
        <div className="table-scroll">
          <table className="table responsive-table change-table">
            <thead>
              <tr>
                <th scope="col">{m.changes.colChange}</th>
                <th scope="col">{m.changes.colSystem}</th>
                <th scope="col">{m.changes.colStart}</th>
                <th scope="col">{m.risk.label}</th>
                <th scope="col">{m.changes.colRollback}</th>
                <th scope="col">{m.changes.colAffects}</th>
                <th scope="col">{m.changes.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => {
                const st = statusOf(c);
                const isSel = c.id === selected.id;
                return (
                  <tr key={c.id} className={isSel ? 'is-selected' : undefined}>
                    <th scope="row" data-label={m.changes.colChange}>
                      <button type="button" className="svc-name-btn" aria-pressed={isSel} onClick={() => select(c.id)}>
                        {c.id}
                      </button>
                      <span className="change-title">{lt(c.title)}</span>
                    </th>
                    <td data-label={m.changes.colSystem}>{lt(nodesById[c.systemId].name)}</td>
                    <td data-label={m.changes.colStart}>{dateTime(new Date(c.plannedStart))}</td>
                    <td data-label={m.risk.label}>
                      <span className={`badge ${RISK_CLASS[c.risk]}`}>{m.risk[c.risk]}</span>
                    </td>
                    <td data-label={m.changes.colRollback}>{c.rollbackTested ? m.common.yes : m.common.no}</td>
                    <td data-label={m.changes.colAffects}>{servicesHit(impacts[c.id]).length}</td>
                    <td data-label={m.changes.colStatus}>
                      <span className={`badge ${STATUS_CLASS[st]}`}>{m.changes.status[st]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Assessment
        key={selected.id}
        change={selected}
        result={impacts[selected.id]}
        log={logFor(selected)}
        status={statusOf(selected)}
        checks={state.changeChecks[selected.id] ?? []}
        onToggle={(i) => toggleChangeCheck(selected.id, i)}
        onDecide={(o, r, role) => decideChange(selected.id, o, r, role)}
        fmt={{ f, lt, date, dateTime, duration }}
      />
    </div>
  );
}

interface AssessmentProps {
  change: PlannedChange;
  result: ImpactResult;
  log: { key: string; at: Date; outcome: ChangeOutcome; reason: string; role: string; byYou: boolean }[];
  status: Status;
  checks: number[];
  onToggle: (index: number) => void;
  onDecide: (outcome: ChangeOutcome, reason: string, role: string) => void;
  fmt: Pick<ReturnType<typeof useI18n>, 'f' | 'lt' | 'date' | 'dateTime' | 'duration'>;
}

function Assessment({ change: c, result, log, status, checks, onToggle, onDecide, fmt }: AssessmentProps) {
  const { m } = useI18n();
  const { f, lt, date, dateTime, duration } = fmt;
  const [mapNode, setMapNode] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ChangeOutcome | null>(null);
  const [text, setText] = useState('');
  const [role, setRole] = useState<string>(m.changes.roles[0]);
  const [announce, setAnnounce] = useState('');
  const system = lt(nodesById[c.systemId].name);
  const allChecked = checks.length === c.checkpoints.length;
  const canSubmit = outcome !== null && visibleLength(text) >= DECISION_MIN && (outcome === 'rejected' || allChecked);

  // Samme sammendrag som på «Påvirkning»: alle berørte objekter, fordelt på type.
  const all = Object.values(result.impacts);
  const outage = all.filter((x) => x.level === 'outage' && !x.uncertain);
  const degraded = all.filter((x) => x.level === 'degraded' && !x.uncertain);
  const uncertain = all.filter((x) => x.uncertain);
  const rto = all.filter((x) => x.rtoExceeded);
  const breakdown = (list: NodeImpact[]) =>
    (['provider', 'system', 'service', 'channel'] as NodeKind[])
      .map((k) => {
        const n = list.filter((x) => nodesById[x.nodeId].kind === k).length;
        return n ? `${n} ${(n === 1 ? m.kinds[k] : m.kindsPlural[k]).toLowerCase()}` : null;
      })
      .filter(Boolean)
      .join(' · ');

  // Status kan være endret på «Øvelser og funn»; siden viser samme status som der.
  const { state } = useDemo();
  const findingStatusOf = (id: string, base: FindingStatus) => state.findingStatus[id] ?? base;
  const findings = dataset.findings.filter((x) => findingStatusOf(x.id, x.status) !== 'closed' && x.nodeIds.includes(c.systemId));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !outcome) return;
    onDecide(outcome, text.trim(), role);
    setText('');
    setOutcome(null);
    setAnnounce(m.changes.decided);
  };

  return (
    <>
      <section className="card change-assess">
        <h2>{f(m.changes.assessTitle, { id: c.id })}</h2>
        <p className="change-lead">
          <strong>{lt(c.title)}.</strong> {lt(c.description)}
        </p>
        <dl className="facts">
          <div>
            <dt>{m.changes.colSystem}</dt>
            <dd>{system}</dd>
          </div>
          <div>
            <dt>{m.changes.window}</dt>
            <dd>{f(m.changes.windowValue, { start: dateTime(new Date(c.plannedStart)), duration: duration(c.windowMinutes) })}</dd>
          </div>
          <div>
            <dt>{m.risk.label}</dt>
            <dd>
              <span className={`badge ${RISK_CLASS[c.risk]}`}>{m.risk[c.risk]}</span>
            </dd>
          </div>
          <div>
            <dt>{m.changes.colRollback}</dt>
            <dd>{c.rollbackTested ? m.common.yes : m.common.no}</dd>
          </div>
          <div>
            <dt>{m.changes.owner}</dt>
            <dd>{lt(c.owner)}</dd>
          </div>
          <div>
            <dt>{m.changes.colStatus}</dt>
            <dd>
              <span className={`badge ${STATUS_CLASS[status]}`}>{m.changes.status[status]}</span>
            </dd>
          </div>
        </dl>

        <h3>{m.changes.ifFails}</h3>
        <p className="muted">{f(m.changes.ifFailsLead, { system, duration: duration(c.windowMinutes) })}</p>
        <div className="kpis kpis-compact">
          <div className="kpi kpi-outage">
            <span className="kpi-value">{outage.length}</span>
            <span className="kpi-label">{m.impact.outage}</span>
            <span className="kpi-sub">{breakdown(outage)}</span>
          </div>
          <div className="kpi kpi-degraded">
            <span className="kpi-value">{degraded.length}</span>
            <span className="kpi-label">{m.impact.degraded}</span>
            <span className="kpi-sub">{breakdown(degraded)}</span>
          </div>
          <div className="kpi kpi-uncertain">
            <span className="kpi-value">{uncertain.length}</span>
            <span className="kpi-label">{m.impact.possibleOutage}</span>
            <span className="kpi-sub">{breakdown(uncertain)}</span>
          </div>
          <div className="kpi kpi-rto">
            <span className="kpi-value">{rto.length}</span>
            <span className="kpi-label">{m.impact.rtoExceeded}</span>
            <span className="kpi-sub">
              {rto.length
                ? rto.map((x) => lt(nodesById[x.nodeId].name)).join(', ')
                : f(m.analysis.rtoNone, { duration: duration(c.windowMinutes) })}
            </span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{m.changes.mapTitle}</h2>
        <MapExplorer selected={mapNode} select={setMapNode} result={result} />
      </section>

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>{m.changes.checklistTitle}</h2>
              <span className="muted small">{f(m.changes.checklistCount, { done: checks.length, total: c.checkpoints.length })}</span>
            </div>
            <ul className="task-list">
              {c.checkpoints.map((cp, i) => {
                const on = checks.includes(i);
                const id = `chk-${c.id}-${i}`;
                return (
                  <li key={i} className={`task check-item${on ? ' task-done' : ''}`}>
                    <input id={id} type="checkbox" checked={on} onChange={() => onToggle(i)} />
                    <label htmlFor={id} className="task-title">{lt(cp)}</label>
                  </li>
                );
              })}
            </ul>
          </section>
          {findings.length > 0 && (
            <section className="card">
              <h2>{f(m.changes.findingsTitle, { system })}</h2>
              <ul className="mini-impact">
                {findings.map((x) => (
                  <li key={x.id}>
                    <span>
                      {lt(x.title)}
                      <span className="muted small"> · {f(m.changes.due, { date: date(x.due) })}</span>
                    </span>
                    <FindingStatusBadge value={findingStatusOf(x.id, x.status)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="card">
          <h2>{m.changes.decisionTitle}</h2>
          <form className="decision-form" onSubmit={submit}>
            <div className="field">
              <span className="field-label" id="chg-outcome">{m.changes.outcome}</span>
              <div className="segmented segmented-fit" role="group" aria-labelledby="chg-outcome">
                <button type="button" aria-pressed={outcome === 'approved'} onClick={() => setOutcome('approved')}>
                  {m.changes.approve}
                </button>
                <button type="button" aria-pressed={outcome === 'rejected'} onClick={() => setOutcome('rejected')}>
                  {m.changes.reject}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="chg-role">{m.changes.role}</label>
              <select id="chg-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {m.changes.roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field field-wide">
              <label htmlFor="chg-text">{m.changes.reason}</label>
              <textarea
                id="chg-text"
                rows={2}
                value={text}
                minLength={DECISION_MIN}
                maxLength={DECISION_MAX}
                aria-describedby="chg-count"
                onChange={(e) => setText(cleanDecision(e.target.value))}
              />
              <span id="chg-count" className="field-count">
                {f(m.incident.decisionChars, { n: text.length, max: DECISION_MAX })}
                {text.length > 0 && visibleLength(text) < DECISION_MIN && ` · ${f(m.incident.decisionTooShort, { min: DECISION_MIN })}`}
              </span>
            </div>
            {outcome === 'approved' && !allChecked && <p className="hint field-wide">{m.changes.approveNeedsChecks}</p>}
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {m.changes.submit}
            </button>
            <span className="sr-only" role="status">{announce}</span>
          </form>
          {log.length === 0 ? (
            <p className="muted">{m.changes.noDecision}</p>
          ) : (
            <ul className="log-list">
              {[...log].reverse().map((d) => (
                <li key={d.key} className={d.byYou ? 'log-user' : ''}>
                  <time dateTime={d.at.toISOString()}>{dateTime(d.at)}</time>
                  <div>
                    <span className={`badge ${STATUS_CLASS[d.outcome]}`}>{m.changes.status[d.outcome]}</span>{' '}
                    <strong>{d.role}:</strong> {d.reason}
                    {d.byYou && <span className="muted small"> ({m.incident.byYou})</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
