import { useState, type FormEvent } from 'react';
import { dataset, nodesById, scenariosById } from '../data';
import type { FindingStatus } from '../data/types';
import { useI18n } from '../i18n';
import { cleanDecision, DECISION_MIN, visibleLength } from '../lib/text';
import { navigate } from '../router';
import { useDemo } from '../state/demo';
import { PageHeader } from '../components/ui';

const TITLE_MAX = 120;
const STATUSES: FindingStatus[] = ['open', 'inProgress', 'closed'];
const STATUS_ORDER: Record<FindingStatus, number> = { open: 0, inProgress: 1, closed: 2 };

/** ISO-dato (YYYY-MM-DD) for i dag pluss et antall dager, i lokal tid. */
function isoInDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * «Øvelser og funn» (2.0, SPEC P-20, F-14, F-15). Viser øvelsene i datasettet og øvelser startet i demoen,
 * og alle funn fra øvelser og hendelser med ansvarlig, frist og status. Status og nye funn lagres i fanen (D-17).
 */
export default function ExercisesPage() {
  const { m, f, lt, date } = useI18n();
  const { state, addFinding, setFindingStatus } = useDemo();
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  // Øvelser: datasettets først, deretter de som er startet i demoen.
  const exercises = [
    ...dataset.exercises.map((x) => ({
      id: x.id,
      title: lt(x.title),
      scenario: lt(scenariosById[x.scenarioId].title),
      date: date(x.date),
      participants: x.participants.map(lt),
      suppliers: x.providerIds.map((id) => lt(nodesById[id].name)),
      byYou: false,
    })),
    ...state.userExercises.map((u, n) => ({
      id: u.id,
      title: f(m.exercises.demoExercise, { n: n + 1 }),
      scenario: lt(scenariosById[u.scenarioId].title),
      date: date(u.startedAt),
      // Deltakerne er rollene som har oppgaver i scenarioet.
      participants: [...new Set(scenariosById[u.scenarioId].tasks.map((t) => lt(t.role)))],
      suppliers: [] as string[],
      byYou: true,
    })),
  ];
  const exerciseTitle = (id: string) => exercises.find((x) => x.id === id)?.title ?? id;

  // Alle funn med gjeldende status (endret i demoen eller fra datasettet).
  const findings = [
    ...dataset.findings.map((x) => ({
      id: x.id,
      title: lt(x.title),
      description: lt(x.description),
      source: x.source === 'exercise' && x.exerciseId ? exerciseTitle(x.exerciseId) : f(m.exercises.incident, { name: x.incident ? lt(x.incident) : '' }),
      exerciseId: x.exerciseId,
      role: lt(x.role),
      due: x.due,
      status: state.findingStatus[x.id] ?? x.status,
      byYou: false,
    })),
    ...state.userFindings.map((x) => ({
      id: x.id,
      title: x.title,
      description: '',
      source: exerciseTitle(x.exerciseId),
      exerciseId: x.exerciseId as string | undefined,
      role: x.role,
      due: x.due,
      status: state.findingStatus[x.id] ?? ('open' as FindingStatus),
      byYou: true,
    })),
  ].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.due.localeCompare(b.due));
  const count = (s: FindingStatus) => findings.filter((x) => x.status === s).length;
  const shown = filter === 'open' ? findings.filter((x) => x.status !== 'closed') : findings;

  // Skjema for nytt funn. Standard øvelse er den sist startede i demoen, ellers den nyeste i datasettet.
  const [title, setTitle] = useState('');
  const [exerciseId, setExerciseId] = useState(exercises[exercises.length - 1].id);
  const [role, setRole] = useState<string>(m.exercises.roles[0]);
  const [due, setDue] = useState(isoInDays(30));
  const [announce, setAnnounce] = useState('');
  const canAdd = visibleLength(title) >= DECISION_MIN && /^\d{4}-\d{2}-\d{2}$/.test(due);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    addFinding({ title: title.trim(), exerciseId, role, due });
    setTitle('');
    setFilter('open');
    setAnnounce(m.exercises.added);
  };

  return (
    <div className="page">
      <PageHeader title={m.exercises.title} lead={m.exercises.lead}>
        <button type="button" className="btn btn-primary" onClick={() => navigate('scenario', { mode: 'ovelse' })}>
          {m.exercises.start}
        </button>
      </PageHeader>

      <section className="kpis" aria-label={m.exercises.title}>
        <div className="kpi">
          <span className="kpi-value">{exercises.length}</span>
          <span className="kpi-label">{m.exercises.kpiExercises}</span>
        </div>
        <div className={`kpi kpi-accent kpi-open${count('open') === 0 ? ' kpi-zero' : ''}`}>
          <span className="kpi-value">{count('open')}</span>
          <span className="kpi-label">{m.exercises.kpiOpen}</span>
        </div>
        <div className={`kpi kpi-accent kpi-dev${count('inProgress') === 0 ? ' kpi-zero' : ''}`}>
          <span className="kpi-value">{count('inProgress')}</span>
          <span className="kpi-label">{m.exercises.kpiInProgress}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{count('closed')}</span>
          <span className="kpi-label">{m.exercises.kpiClosed}</span>
        </div>
      </section>

      <section className="card">
        <h2>{m.exercises.listTitle}</h2>
        <div className="table-scroll">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th scope="col">{m.exercises.colExercise}</th>
                <th scope="col">{m.exercises.colScenario}</th>
                <th scope="col">{m.exercises.colDate}</th>
                <th scope="col">{m.exercises.colParticipants}</th>
                <th scope="col">{m.exercises.colSuppliers}</th>
                <th scope="col">{m.exercises.colFindings}</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((x) => (
                <tr key={x.id}>
                  <th scope="row" data-label={m.exercises.colExercise}>
                    {x.title}
                    {x.byYou && <span className="muted small"> ({m.incident.byYou})</span>}
                  </th>
                  <td data-label={m.exercises.colScenario}>{x.scenario}</td>
                  <td data-label={m.exercises.colDate}>{x.date}</td>
                  <td data-label={m.exercises.colParticipants}>{x.participants.join(', ')}</td>
                  <td data-label={m.exercises.colSuppliers}>{x.suppliers.length ? x.suppliers.join(', ') : m.exercises.none}</td>
                  <td data-label={m.exercises.colFindings}>{findings.filter((y) => y.exerciseId === x.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            {m.exercises.findingsTitle} ({shown.length})
          </h2>
          <div className="segmented" role="group" aria-label={m.exercises.filterLabel}>
            <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>
              {m.exercises.filterOpen}
            </button>
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              {m.exercises.filterAll}
            </button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="muted">{m.exercises.noneOpen}</p>
        ) : (
          <div className="table-scroll">
            <table className="table responsive-table finding-table">
              <thead>
                <tr>
                  <th scope="col">{m.exercises.colFinding}</th>
                  <th scope="col">{m.exercises.colSource}</th>
                  <th scope="col">{m.exercises.colRole}</th>
                  <th scope="col">{m.exercises.colDue}</th>
                  <th scope="col">{m.exercises.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((x) => (
                  <tr key={x.id}>
                    <th scope="row" data-label={m.exercises.colFinding}>
                      {x.title}
                      {x.byYou && <span className="muted small"> ({m.incident.byYou})</span>}
                      {x.description && <span className="finding-desc">{x.description}</span>}
                    </th>
                    <td data-label={m.exercises.colSource}>{x.source}</td>
                    <td data-label={m.exercises.colRole}>{x.role}</td>
                    <td data-label={m.exercises.colDue}>{date(x.due)}</td>
                    <td data-label={m.exercises.colStatus}>
                      <div className="finding-status">
                        <select
                          aria-label={`${m.exercises.colStatus}: ${x.title}`}
                          value={x.status}
                          onChange={(e) => setFindingStatus(x.id, e.target.value as FindingStatus)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{m.findingStatus[s]}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>{m.exercises.addTitle}</h2>
        <form className="decision-form" onSubmit={submit}>
          <div className="field field-wide">
            <label htmlFor="fn-title">{m.exercises.fTitle}</label>
            <input
              id="fn-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              aria-describedby="fn-count"
              onChange={(e) => setTitle(cleanDecision(e.target.value).replace(/\n/g, ' ').slice(0, TITLE_MAX))}
            />
            <span id="fn-count" className="field-count">
              {f(m.exercises.fChars, { n: title.length, max: TITLE_MAX })}
              {title.length > 0 && visibleLength(title) < DECISION_MIN && ` · ${f(m.incident.decisionTooShort, { min: DECISION_MIN })}`}
            </span>
          </div>
          <div className="field">
            <label htmlFor="fn-exercise">{m.exercises.fExercise}</label>
            <select id="fn-exercise" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              {exercises.map((x) => (
                <option key={x.id} value={x.id}>{x.title}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fn-role">{m.exercises.fRole}</label>
            <select id="fn-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {m.exercises.roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fn-due">{m.exercises.fDue}</label>
            <input id="fn-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!canAdd}>
            {m.exercises.add}
          </button>
          <span className="sr-only" role="status">{announce}</span>
        </form>
      </section>
    </div>
  );
}
