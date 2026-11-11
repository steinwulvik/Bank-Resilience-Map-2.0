import { dataset, nodesById, regionName, scenariosById } from '../data';
import { primaryPath } from '../engine/impact';
import { useI18n } from '../i18n';
import { href } from '../router';
import { scenarioStart, useDemo } from '../state/demo';
import { FlowSteps } from '../components/FlowSteps';
import { gapQuestion } from '../components/gaps';
import { impactLabel, PageHeader, SyntheticTag } from '../components/ui';
import logo from '../assets/morild-bank-logo.png';

/** Utskrivbar oppsummering (SPEC D-07, P-08). */
export default function ReportPage() {
  const i18n = useI18n();
  const { m, f, lt, duration, dateTime, list } = i18n;
  const { state, result } = useDemo();

  if (!result || !state.scenarioId) {
    return (
      <div className="page">
        <PageHeader title={m.meta.appName} />
        <FlowSteps current="report" />
        <div className="card empty">
          <p>{m.report.none}</p>
          <a className="btn btn-primary" href={href('scenario')}>{m.analysis.goScenario}</a>
        </div>
      </div>
    );
  }

  const sc = scenariosById[state.scenarioId];
  const p = result.params;
  const start = scenarioStart(state);
  const rows = Object.values(result.impacts)
    .filter((x) => !x.isTarget && ['service', 'channel'].includes(nodesById[x.nodeId].kind))
    .sort((a, b) => nodesById[a.nodeId].kind.localeCompare(nodesById[b.nodeId].kind) || (a.level === b.level ? 0 : a.level === 'outage' ? -1 : 1));
  const partialRegion = Object.values(result.impacts)
    .filter((x) => x.causes.some((c) => c.notes.includes('partialRegion')))
    .map((x) => lt(nodesById[x.nodeId].name));
  const tasks = [
    ...sc.tasks.map((t) => ({ id: t.id, title: lt(t.title), role: lt(t.role) })),
    ...state.customTasks.map((t) => ({ id: t.id, title: lt(t.title), role: lt(t.role) })),
  ];
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title;

  return (
    <div className="page">
      <div className="no-print">
        <PageHeader title={m.meta.appName}>
          <SyntheticTag />
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            {m.report.print}
          </button>
        </PageHeader>
        <FlowSteps current="report" />
      </div>

      <article className="report card">
        <header className="report-header">
          <img src={logo} alt="Morild Bank" width={200} height={28} />
          <div>
            <h2>
              {state.mode === 'exercise' ? m.report.exerciseTitle : m.report.title}
            </h2>
            <p className="muted">
              {f(m.report.subtitle, { bank: dataset.bank.name, scenario: lt(sc.title) })} ·{' '}
              {f(m.report.generated, { date: dateTime(new Date()) })}
            </p>
          </div>
        </header>
        <section>
          <h3>{m.report.sectionScenario}</h3>
          <p>{lt(sc.summary)}</p>
          <dl className="facts">
            <div><dt>{m.report.params.type}</dt><dd>{lt(sc.title)}</dd></div>
            <div><dt>{m.report.params.mode}</dt><dd>{state.mode === 'exercise' ? m.scenario.modeExercise : m.scenario.modeIncident}</dd></div>
            <div><dt>{m.report.params.target}</dt><dd>{lt(nodesById[p.targetId].name)}</dd></div>
            {p.regions.length > 0 && (
              <div><dt>{m.report.params.regions}</dt><dd>{p.regions.map((r) => lt(regionName(r))).join(', ')}</dd></div>
            )}
            <div><dt>{m.report.params.severity}</dt><dd>{p.severity === 'outage' ? m.scenario.severityOutage : m.scenario.severityDegraded}</dd></div>
            <div><dt>{m.report.params.duration}</dt><dd>{duration(p.durationMinutes)}</dd></div>
            <div><dt>{m.report.params.start}</dt><dd>{dateTime(start)}</dd></div>
            <div><dt>{m.report.params.status}</dt><dd>{m.incident.statuses[state.incidentStatus]}</dd></div>
          </dl>
        </section>

        <section>
          <h3>{m.report.sectionImpact}</h3>
          <table className="table report-table" tabIndex={0}>
            <thead>
              <tr>
                <th scope="col">{m.report.colName}</th>
                <th scope="col">{m.report.colType}</th>
                <th scope="col">{m.report.colImpact}</th>
                <th scope="col">{m.report.colCertainty}</th>
                <th scope="col">{m.report.colPath}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const n = nodesById[x.nodeId];
                return (
                  <tr key={x.nodeId}>
                    <th scope="row">{lt(n.name)}</th>
                    <td>{m.kinds[n.kind]}</td>
                    <td>
                      {impactLabel(x, i18n)}
                      {x.rtoExceeded && ` · ${m.impact.rtoExceeded}`}
                    </td>
                    <td>{x.uncertain ? m.impact.uncertain : m.report.certain}</td>
                    <td className="small">{primaryPath(result, x.nodeId).map((id) => lt(nodesById[id].name)).join(' → ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section>
          <h3>{m.report.sectionAssumptions}</h3>
          <ul>
            {sc.assumptions.map((a, n) => <li key={n}>{lt(a)}</li>)}
            {partialRegion.length > 0 && <li>{f(m.report.partialRegion, { names: list(partialRegion) })}</li>}
          </ul>
        </section>

        <section>
          <h3>{m.report.sectionGaps}</h3>
          {result.gaps.length ? (
            <ul>
              {result.gaps.map((g) => (
                <li key={`${g.reason}-${g.dependencyId}`}>
                  {m.impact.reasons[g.reason]} {gapQuestion(g, i18n)}
                </li>
              ))}
            </ul>
          ) : (
            <p>{m.report.noGaps}</p>
          )}
        </section>

        <section>
          <h3>{m.report.sectionResponse}</h3>
          <table className="table report-table" tabIndex={0}>
            <thead>
              <tr>
                <th scope="col">{m.incident.tasks}</th>
                <th scope="col">{m.incident.taskRole}</th>
                <th scope="col">{m.incident.taskStatus}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.role}</td>
                  <td>{m.incident.taskStatuses[state.taskStatus[t.id] ?? 'todo']}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>{m.incident.decisions}</h4>
          <ul>
            {sc.decisions.map((d, n) => (
              <li key={n}>
                {dateTime(new Date(start.getTime() + d.offsetMinutes * 60000))} – {lt(d.role)}: {lt(d.text)}
                {d.taskId && taskTitle(d.taskId) && ` (${f(m.incident.decisionFor, { task: taskTitle(d.taskId)! })})`}
              </li>
            ))}
            {state.log.map((l) => (
              <li key={l.id}>
                {dateTime(new Date(l.at))} – {l.role ? `${l.role}: ` : ''}{l.text} ({m.incident.byYou})
                {l.taskId && taskTitle(l.taskId) && ` (${f(m.incident.decisionFor, { task: taskTitle(l.taskId)! })})`}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>{m.report.sectionMethod}</h3>
          <ol>
            {m.scenario.rules.map((r) => <li key={r}>{r}</li>)}
          </ol>
          <p className="muted small">{m.concept.noAdvice}</p>
          <p className="muted small">{m.concept.disclaimer}</p>
        </section>
      </article>
    </div>
  );
}
