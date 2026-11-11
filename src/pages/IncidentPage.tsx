import { useState } from 'react';
import { nodesById, scenariosById } from '../data';
import { useI18n } from '../i18n';
import { href } from '../router';
import { useDemo, scenarioStart, type IncidentStatus, type TaskStatus } from '../state/demo';
import { FlowSteps } from '../components/FlowSteps';
import { ImpactBadge, PageHeader, SyntheticTag } from '../components/ui';
import { cleanDecision, DECISION_MAX, DECISION_MIN, visibleLength } from '../lib/text';

const STATUSES: IncidentStatus[] = ['investigating', 'mitigating', 'monitoring', 'closed'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];

export default function IncidentPage() {
  const { m, f, lt, dateTime } = useI18n();
  const { state, result, setIncidentStatus, setTaskStatus, addDecision } = useDemo();
  const [text, setText] = useState('');
  const [role, setRole] = useState(m.incident.decisionRoleDefault);
  const [scope, setScope] = useState('');
  const [announce, setAnnounce] = useState('');

  if (!result || !state.scenarioId) {
    return (
      <div className="page">
        <PageHeader title={m.meta.appName} />
        <FlowSteps current="incident" />
        <div className="card empty">
          <p>{m.incident.none}</p>
          <a className="btn btn-primary" href={href('scenario')}>{m.analysis.goScenario}</a>
        </div>
      </div>
    );
  }

  const sc = scenariosById[state.scenarioId];
  const start = scenarioStart(state);
  const at = (min: number) => new Date(start.getTime() + min * 60000);

  const tasks = [
    ...sc.tasks.map((t) => ({ id: t.id, title: lt(t.title), role: lt(t.role), due: at(t.dueMinutes), fromGap: false })),
    ...state.customTasks.map((t) => ({ id: t.id, title: lt(t.title), role: lt(t.role), due: null as Date | null, fromGap: true })),
  ];
  const done = tasks.filter((t) => state.taskStatus[t.id] === 'done').length;
  // Rollene som har ansvar for oppgavene i hendelsen, uten duplikater.
  const roles = [...new Set(tasks.map((t) => t.role))];
  const currentRole = roles.includes(role) ? role : roles[0] ?? m.incident.decisionRoleDefault;

  const topServices = Object.values(result.impacts)
    .filter((x) => nodesById[x.nodeId].kind === 'service')
    .sort((a, b) => (a.level === b.level ? Number(a.uncertain) - Number(b.uncertain) : a.level === 'outage' ? -1 : 1));

  const submitDecision = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanDecision(text).trim();
    if (visibleLength(clean) < DECISION_MIN) return;
    addDecision(clean, currentRole, scope || undefined);
    setText('');
    setAnnounce(m.incident.decisionAdded);
  };

  // Tidslinjen: scenarioets hendelser og brukerens statusendringer, nyeste øverst.
  const timeline = [
    ...sc.timeline.map((e, n) => ({ key: `t${n}`, when: at(e.offsetMinutes), text: lt(e.text), byYou: false })),
    ...state.log
      .filter((l) => l.kind === 'status')
      .map((l) => ({ key: l.id, when: new Date(l.at), text: l.text, byYou: true })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title;

  // Én samlet beslutningslogg i tidsrekkefølge. En beslutning kan gjelde én oppgave eller hele hendelsen.
  const decisions = [
    ...sc.decisions.map((d, n) => ({
      key: `t${n}`,
      when: at(d.offsetMinutes),
      role: lt(d.role),
      text: lt(d.text),
      taskId: d.taskId,
      byYou: false,
    })),
    ...state.log
      .filter((l) => l.kind === 'decision')
      .map((l) => ({ key: l.id, when: new Date(l.at), role: l.role ?? '', text: l.text, taskId: l.taskId, byYou: true })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime()); // nyeste øverst
  const decisionsFor = (taskId: string) => decisions.filter((d) => d.taskId === taskId);

  return (
    <div className="page">
      <PageHeader title={m.meta.appName}>
        <SyntheticTag />
      </PageHeader>
      <FlowSteps current="incident" />

      <section className="card incident-head">
        <div>
          <h2>
            {lt(sc.title)}
            {state.mode === 'exercise' && <span className="badge exercise-tag">{m.incident.exerciseTag}</span>}
          </h2>
          <p className="muted">{dateTime(start)} · {lt(nodesById[result.params.targetId].name)}</p>
          {state.mode === 'exercise' && (
            <p className="exercise-note">
              <a href={href('exercises')}>{m.incident.addFindings} →</a>
            </p>
          )}
        </div>
        <fieldset className="field">
          <legend>
            {m.incident.statusLabel} <span className="legend-hint">– {m.incident.statusHint}</span>
          </legend>
          <div className="segmented status-segmented">
            {STATUSES.map((s) => (
              <label key={s} className={state.incidentStatus === s ? 'on' : ''}>
                <input
                  type="radio"
                  name="incident-status"
                  checked={state.incidentStatus === s}
                  onChange={() => setIncidentStatus(s, f(m.incident.statusChanged, { status: m.incident.statuses[s] }))}
                />
                {m.incident.statuses[s]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>{m.incident.tasks} <span className="muted small">{f(m.incident.tasksDone, { done, total: tasks.length })}</span></h2>
              <span className="col-caption" aria-hidden="true">{m.incident.taskStatus}</span>
            </div>
            <ul className="task-list">
              {tasks.map((t) => {
                const st = state.taskStatus[t.id] ?? 'todo';
                const linked = decisionsFor(t.id);
                return (
                  <li key={t.id} className={`task task-${st}`}>
                    <div className="task-main">
                      <span className="task-title">{t.title}</span>
                      <span className="muted small">
                        {m.incident.taskRole}: {t.role}
                        {t.due && <> · {m.incident.taskDue}: {dateTime(t.due)}</>}
                        {t.fromGap && <> · <span className="gap-text">{m.incident.taskFromGap}</span></>}
                      </span>
                    </div>
                    <label className="sr-only" htmlFor={`task-${t.id}`}>
                      {m.incident.taskStatus}: {t.title}
                    </label>
                    <select id={`task-${t.id}`} value={st} onChange={(e) => setTaskStatus(t.id, e.target.value as TaskStatus)}>
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>{m.incident.taskStatuses[s]}</option>
                      ))}
                    </select>
                    {linked.length > 0 && (
                      <details className="task-decisions">
                        <summary>
                          {f(linked.length === 1 ? m.incident.decisionCount : m.incident.decisionCountPlural, { n: linked.length })}
                        </summary>
                        <ul>
                          {linked.map((d) => (
                            <li key={d.key}>
                              <span className="muted small">{dateTime(d.when)}</span> <strong>{d.role}:</strong> {d.text}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h2>{m.incident.decisions}</h2>
            <form className="decision-form" onSubmit={submitDecision}>
              <div className="field">
                <label htmlFor="dec-scope">{m.incident.decisionScope}</label>
                <select id="dec-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="">{m.incident.wholeIncident}</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="dec-role">{m.incident.decisionRole}</label>
                <select id="dec-role" value={currentRole} onChange={(e) => setRole(e.target.value)}>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="field field-wide">
                <label htmlFor="dec-text">{m.incident.decisionText}</label>
                <textarea
                  id="dec-text"
                  rows={2}
                  value={text}
                  minLength={DECISION_MIN}
                  maxLength={DECISION_MAX}
                  aria-describedby="dec-count"
                  onChange={(e) => setText(cleanDecision(e.target.value))}
                />
                <span id="dec-count" className="field-count">
                  {f(m.incident.decisionChars, { n: text.length, max: DECISION_MAX })}
                  {text.length > 0 && visibleLength(text) < DECISION_MIN && ` · ${f(m.incident.decisionTooShort, { min: DECISION_MIN })}`}
                </span>
              </div>
              <button type="submit" className="btn" disabled={visibleLength(text) < DECISION_MIN}>{m.incident.addDecision}</button>
              <span className="sr-only" role="status">{announce}</span>
            </form>
            <ul className="log-list">
              {decisions.map((d) => (
                <li key={d.key} className={d.byYou ? 'log-user' : ''}>
                  <time dateTime={d.when.toISOString()}>{dateTime(d.when)}</time>
                  <div>
                    <strong>{d.role}:</strong> {d.text}
                    {d.byYou && <span className="muted small"> ({m.incident.byYou})</span>}
                    {d.taskId && taskTitle(d.taskId) && (
                      <div>
                        <span className="decision-tag">{f(m.incident.decisionFor, { task: taskTitle(d.taskId)! })}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h2>{m.incident.impactShort}</h2>
            <ul className="mini-impact">
              {topServices.map((x) => (
                <li key={x.nodeId}>
                  <span>{lt(nodesById[x.nodeId].name)}</span>
                  <ImpactBadge impact={x} />
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>{f(m.analysis.controlFold, { n: sc.controlQuestions.length })}</h2>
            <ul className="control-list">
              {sc.controlQuestions.map((q, n) => (
                <li key={n}>{lt(q)}</li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>{m.incident.timeline}</h2>
            <ol className="timeline">
              {timeline.map((e) => (
                <li key={e.key} className={e.byYou ? 'log-user' : ''}>
                  <time dateTime={e.when.toISOString()}>{dateTime(e.when)}</time>
                  <span>
                    {e.text}
                    {e.byYou && <span className="muted small"> ({m.incident.byYou})</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
