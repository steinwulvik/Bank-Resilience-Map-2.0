import type { CSSProperties, ReactNode } from 'react';
import { dataset, nodesById } from '../data';
import type { ChangeRisk, NodeKind, Provider } from '../data/types';
import { computeImpact, type ImpactResult, type NodeImpact } from '../engine/impact';
import { useI18n, type I18n } from '../i18n';
import { CriticalityBadge, ExitPlanBadge } from '../components/ui';
import { MapExplorer } from '../components/MapExplorer';
import logo from '../assets/morild-bank-logo.png';

/*
 * Skjermbildene i hjelpesidens animasjon. De er forenklede utgaver av sidene i appen, bygget av de samme
 * byggeklossene, og bruker datasettets egne navn og tall (beregnet med påvirkningsmotoren), så de stemmer
 * med resten av appen. Animasjonene er CSS: grunnstilen er sluttbildet, og «from»-rammen er startbildet.
 * Uten animasjon (pause, redusert bevegelse) vises derfor sluttbildet.
 */

export type StoryId = 'incident' | 'change' | 'suppliers' | 'exercise';

/** Forsinkelse i sekunder for en animasjon. */
const d = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

// Beregningene er de samme for begge språk og gjøres én gang.
const incidentScenario = dataset.scenarios[0];
const exerciseScenario = dataset.scenarios[0];
const incidentResult = computeImpact(dataset, incidentScenario.defaults);
const change = dataset.plannedChanges.find((c) => c.risk === 'high' && !c.rollbackTested) ?? dataset.plannedChanges[0];
const changeResult = computeImpact(dataset, { targetId: change.systemId, regions: [], severity: 'outage', durationMinutes: change.windowMinutes });

const RISK_CLASS: Record<ChangeRisk, string> = { low: 'crit-medium', medium: 'status-degraded', high: 'crit-critical' };
const providers = dataset.nodes.filter((n): n is Provider => n.kind === 'provider');

function hit(r: ImpactResult, kind: NodeKind): NodeImpact[] {
  return dataset.nodes.filter((n) => n.kind === kind && r.impacts[n.id]).map((n) => r.impacts[n.id]);
}
const swatch = (x: NodeImpact) => (x.uncertain ? 'swatch-possible' : x.level === 'outage' ? 'swatch-outage' : 'swatch-degraded');

const rtoService = hit(incidentResult, 'service').find((x) => x.rtoExceeded) ?? hit(incidentResult, 'service')[0];
const unsureChannel = hit(incidentResult, 'channel').find((x) => x.uncertain) ?? hit(incidentResult, 'channel')[0];
const subPairs = dataset.dependencies
  .filter((x) => x.type === 'subcontractor' && !(nodesById[x.to] as Provider).directContract)
  .slice(0, 2);

function isoInDays(days: number): string {
  const t = new Date(Date.now() + days * 86_400_000);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Navn og tall som brukes både i skjermbildene og i teksten under. */
export function sceneFacts(i: I18n) {
  const name = (id: string) => i.lt(nodesById[id].name);
  return {
    name,
    words: {
      provider: name(incidentScenario.defaults.targetId),
      duration: i.duration(incidentScenario.defaults.durationMinutes),
      service: name(rtoService.nodeId),
      channel: name(unsureChannel.nodeId),
      change: i.lt(change.title),
    },
  };
}
export type SceneFacts = ReturnType<typeof sceneFacts>;
/** t: tid i skjermbildet i samme enhet som data-hx-at (uendelig når steget vises ferdig). */
type SceneProps = { facts: SceneFacts; t: number };

/* ---------- Små byggeklosser ---------- */

/*
 * Pekeren: elementer med data-hx-at er steder pekeren klikker på (tid i sekunder, flere tider skilles med komma).
 * Selve pekeren tegnes og flyttes av HelpPage, så den glir rolig fra sted til sted.
 */
/** Knapp i skjermbildet som trykkes ned når pekeren klikker. */
function FakeButton({ children, at, primary = true }: { children: ReactNode; at: number; primary?: boolean }) {
  return (
    <span className="hx-target">
      <span className={`btn btn-small ${primary ? 'btn-primary' : ''} hx-press`} style={d(at + 1.4)} data-hx-at={at + 1.4}>
        {children}
      </span>
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="hx-field">
      <span className="hx-label">{label}</span>
      <span className="hx-value">{children}</span>
    </div>
  );
}
/** Valg i et segmentert felt. «at» gjør valget aktivt etter så mange sekunder. */
function Choice({ options, on, at }: { options: string[]; on: number; at?: number }) {
  return (
    <span className="segmented hx-seg">
      {options.map((o, n) => (
        <label
          key={o}
          className={n === on ? `on${at !== undefined ? ' hx-on' : ''}` : ''}
          style={at !== undefined ? d(at) : undefined}
          data-hx-at={n === on && at !== undefined ? at : undefined}
        >
          {o}
        </label>
      ))}
    </span>
  );
}
/** Viser «from» først og bytter til «to» etter «at» sekunder. */
function Swap({ from, to, at }: { from: ReactNode; to: ReactNode; at: number }) {
  return (
    <span className="hx-swap">
      <span className="hx-out" style={d(at)}>{from}</span>
      <span className="hx-in-fast" style={d(at)}>{to}</span>
    </span>
  );
}
function Tick({ at }: { at: number }) {
  return (
    <span className="hx-box" data-hx-at={at}>
      <span className="hx-tick" style={d(at)}>✓</span>
    </span>
  );
}
function Chip({ x, at, name }: { x: NodeImpact; at: number; name: string }) {
  return (
    <span className={`swatch ${swatch(x)} hx-fail`} style={d(at)}>
      {name}
    </span>
  );
}
function Screen({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="hx-screen">
      <p className="hx-title">
        {title}
        {badge}
      </p>
      {children}
    </div>
  );
}

/* ---------- Scenario 1: en leverandør svikter ---------- */

/**
 * Nedtrekksliste i skjermbildet: pekeren klikker i feltet («at»), listen åpnes, pekeren velger et valg
 * litt senere, listen lukkes og verdien står i feltet.
 */
function Dropdown({ options, value, at, placeholder }: { options: string[]; value: string; at: number; placeholder: string }) {
  const pick = at + 0.8;
  return (
    <span className="hx-dropdown">
      <span className="hx-input hx-select-box" data-hx-at={at}>
        <span className="hx-swap">
          <span className="hx-out hx-placeholder" style={d(pick + 0.2)}>{placeholder}</span>
          <span className="hx-in-fast" style={d(pick + 0.2)}>{value}</span>
        </span>
        <span className="hx-caret" aria-hidden="true">▾</span>
      </span>
      <span className="hx-menu" style={d(at + 0.15)}>
        {options.map((o) => (
          <span key={o} className={o === value ? 'hx-option hx-pick' : 'hx-option'} style={o === value ? d(pick) : undefined} data-hx-at={o === value ? pick : undefined}>
            {o}
          </span>
        ))}
      </span>
    </span>
  );
}

function ScenarioForm({ exercise }: { exercise: boolean }) {
  const i = useI18n();
  const { m } = i;
  const sc = exercise ? exerciseScenario : incidentScenario;
  const supplier = i.lt(nodesById[sc.defaults.targetId].name);
  // Leverandørene banken har avtale med, med den som feiler blant de første.
  const suppliers = [
    supplier,
    ...providers.filter((p) => p.directContract && p.id !== sc.defaults.targetId).map((p) => i.lt(p.name)),
  ].slice(0, 5);
  const durations = [60, 120, 240, 480, 1440].map((n) => i.duration(n));
  return (
    <Screen title={m.nav.scenario}>
      <div className="hx-form">
        <Field label={m.scenario.chooseTemplate}>
          <Choice options={dataset.scenarios.map((x) => i.lt(x.title))} on={0} at={0.4} />
        </Field>
        <Field label={m.scenario.targetProvider}>
          <Dropdown options={suppliers} value={supplier} at={1.2} placeholder={m.help.choose} />
        </Field>
        <Field label={m.scenario.severity}>
          <Choice options={[m.scenario.severityOutage, m.scenario.severityDegraded]} on={0} at={3.0} />
        </Field>
        <Field label={m.scenario.duration}>
          <Dropdown options={durations} value={i.duration(sc.defaults.durationMinutes)} at={3.8} placeholder={m.help.choose} />
        </Field>
        <Field label={m.scenario.mode}>
          <Choice options={[m.scenario.modeIncident, m.scenario.modeExercise]} on={exercise ? 1 : 0} at={5.6} />
        </Field>
      </div>
      <div className="hx-actions">
        <FakeButton at={5.2}>{m.scenario.run}</FakeButton>
      </div>
    </Screen>
  );
}

function IncidentStep1() {
  return <ScenarioForm exercise={false} />;
}

const FILTER_CLICK = 1.2;
const MAP_CLICK = 3.0;
const noop = () => {};

/**
 * Steg 2: det samme kartet som i «Påvirkning», med filtre og detaljpanel. Det starter med hele kartet
 * (berørte og ikke berørte objekter). Pekeren klikker på leverandøren som svikter; da fremheves prosessen
 * den inngår i, og detaljene vises under kartet, akkurat som i demoen.
 */
function IncidentStep2({ t }: SceneProps) {
  const { m } = useI18n();
  const target = incidentScenario.defaults.targetId;
  const onlyHit = t >= FILTER_CLICK + 0.1;
  const selected = t >= MAP_CLICK + 0.1 ? target : null;
  return (
    <Screen title={m.analysis.title}>
      {/* data-hx-layout endres når kartet tegnes på nytt, så pekeren måler stedene på nytt. */}
      <div className="hx-map" data-hx-layout={onlyHit ? 'berorte' : 'alle'}>
        <MapExplorer selected={selected} select={noop} result={incidentResult} impactOnly={onlyHit} />
        {/* Stedene pekeren klikker: først «Bare berørte», så boksen for leverandøren. Animasjonen gjør at steget regnes som ferdig etter siste klikk. */}
        <span className="hx-marker" data-hx-at={FILTER_CLICK} data-hx-target=".chip-toggle" />
        <span className="hx-marker hx-in" style={d(MAP_CLICK + 0.3)} data-hx-at={MAP_CLICK} data-hx-target={`[data-node-id="${target}"]`} />
      </div>
    </Screen>
  );
}



function IncidentRoom({ exercise }: { exercise: boolean }) {
  const i = useI18n();
  const { m } = i;
  const sc = exercise ? exerciseScenario : incidentScenario;
  if (exercise) {
    const roles = [...new Set(sc.tasks.map((t) => i.lt(t.role)))];
    return (
      <Screen title={m.incident.title} badge={<span className="badge exercise-tag hx-pop" style={d(0.4)}>{m.incident.exerciseTag}</span>}>
        <p className="hx-sub">{i.lt(sc.title)}</p>
        <div className="hx-roles">
          {roles.map((r, n) => (
            <span key={r} className="chip hx-in" style={d(1 + n * 0.4)}>{r}</span>
          ))}
        </div>
        <div className="hx-actions">
          <span className="hx-target">
            <span className="hx-link hx-press" style={d(4.9)} data-hx-at={4.9}>{m.incident.addFindings} →</span>
          </span>
        </div>
      </Screen>
    );
  }
  const tasks = sc.tasks.slice(0, 3);
  return (
    <Screen title={m.incident.title}>
      <Field label={m.incident.statusLabel}>
        <Swap
          from={<span className="badge status-degraded">{m.incident.statuses.investigating}</span>}
          to={<span className="badge status-degraded">{m.incident.statuses.mitigating}</span>}
          at={0.6}
        />
      </Field>
      <p className="hx-h">{m.incident.tasks}</p>
      <ul className="hx-list">
        {tasks.map((t, n) => (
          <li key={n}>
            <span>
              {i.lt(t.title)}
              <span className="hx-muted"> · {i.lt(t.role)}</span>
            </span>
            <Swap
              from={<span className="badge">{m.incident.taskStatuses.todo}</span>}
              to={<span className="badge status-operational">{m.incident.taskStatuses.done}</span>}
              at={1.4 + n * 0.9}
            />
          </li>
        ))}
      </ul>
      <p className="hx-h">{m.incident.decisions}</p>
      <p className="hx-log hx-in" style={d(4.4)}>
        <span className="hx-muted">{i.dateTime(new Date())} · {m.incident.decisionRoleDefault}</span>
        <span>{m.help.sample.decision}</span>
      </p>
    </Screen>
  );
}

function IncidentStep4() {
  return <IncidentRoom exercise={false} />;
}

function IncidentStep5() {
  const i = useI18n();
  const { m, f } = i;
  const services = hit(incidentResult, 'service');
  const sections: [string, string][] = [
    [m.report.sectionScenario, `${i.lt(incidentScenario.title)} · ${i.lt(nodesById[incidentScenario.defaults.targetId].name)} · ${i.duration(incidentScenario.defaults.durationMinutes)}`],
    [
      m.report.sectionImpact,
      f(m.analysis.summary, {
        outage: services.filter((x) => !x.uncertain && x.level === 'outage').length,
        degraded: services.filter((x) => !x.uncertain && x.level === 'degraded').length,
        uncertain: services.filter((x) => x.uncertain).length,
        rto: services.filter((x) => x.rtoExceeded).length,
      }),
    ],
    [m.report.sectionAssumptions, ''],
    [m.report.sectionGaps, f(m.analysis.gapsFold, { n: incidentResult.gaps.length })],
    [m.report.sectionResponse, ''],
  ];
  return (
    <div className="hx-paper">
      <div className="hx-paper-head">
        <img src={logo} alt="" width={120} height={17} />
        <strong>{m.report.title}</strong>
      </div>
      <ul className="hx-sections">
        {sections.map(([t, v], n) => (
          <li key={t} className="hx-in" style={d(0.4 + n * 0.6)}>
            <strong>{t}</strong>
            {v && <span className="hx-muted">{v}</span>}
          </li>
        ))}
      </ul>
      <div className="hx-actions">
        <FakeButton at={4}>{m.report.print}</FakeButton>
      </div>
    </div>
  );
}

/* ---------- Scenario 2: en planlagt endring ---------- */

function ChangeStep1() {
  const i = useI18n();
  const { m } = i;
  return (
    <Screen title={m.changes.title}>
      <ul className="hx-list hx-rows">
        {dataset.plannedChanges.map((c, n) => (
          <li key={c.id} className={c.id === change.id ? 'hx-target hx-select' : 'hx-in'} style={d(c.id === change.id ? 3.3 : 0.3 + n * 0.3)} data-hx-at={c.id === change.id ? 3.3 : undefined}>
            <span>
              <strong>{c.id}</strong> {i.lt(c.title)}
            </span>
            <span className={`badge ${RISK_CLASS[c.risk]}`}>{m.risk[c.risk]}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function ChangeStep2({ facts }: SceneProps) {
  const i = useI18n();
  const { m, f } = i;
  const kinds: NodeKind[] = ['service', 'channel'];
  return (
    <Screen title={f(m.changes.assessTitle, { id: change.id })}>
      <div className="hx-form">
        <Field label={m.kinds.system}>{facts.name(change.systemId)}</Field>
        <Field label={m.changes.window}>
          {f(m.changes.windowValue, { start: i.dateTime(new Date(change.plannedStart)), duration: i.duration(change.windowMinutes) })}
        </Field>
        <Field label={m.changes.colRollback}>
          <span className="badge crit-critical">{change.rollbackTested ? m.common.yes : m.common.no}</span>
        </Field>
      </div>
      <p className="hx-h">{m.changes.ifFails}</p>
      {kinds.map((k, n) => (
        <div key={k} className="hx-band">
          <span className="hx-band-label">{m.kindsPlural[k]}</span>
          <span className="hx-band-items">
            {hit(changeResult, k).map((x, j) => (
              <Chip key={x.nodeId} x={x} at={1 + n * 1.2 + j * 0.25} name={facts.name(x.nodeId)} />
            ))}
          </span>
        </div>
      ))}
    </Screen>
  );
}

function ChangeStep3() {
  const i = useI18n();
  const { m, f } = i;
  const done = change.checkpoints.length - 1;
  return (
    <Screen title={m.changes.checklistTitle}>
      <ul className="hx-list hx-checks">
        {change.checkpoints.map((c, n) => (
          <li key={n} className={n === done ? 'hx-missing hx-in' : ''} style={n === done ? d(4) : undefined}>
            {n < done ? <Tick at={0.8 + n * 1} /> : <span className="hx-box" />}
            <span>{i.lt(c)}</span>
          </li>
        ))}
      </ul>
      <p className="hx-note hx-in" style={d(4.4)}>
        <strong>{f(m.changes.checklistCount, { done, total: change.checkpoints.length })}.</strong> {m.changes.approveNeedsChecks}
      </p>
    </Screen>
  );
}

function ChangeStep4() {
  const i = useI18n();
  const { m } = i;
  return (
    <Screen title={m.changes.decisionTitle}>
      <div className="hx-form">
        <Field label={m.changes.outcome}>
          <span className="hx-target">
            <Choice options={[m.changes.approve, m.changes.reject]} on={1} at={1.4} />
          </span>
        </Field>
        <Field label={m.changes.reason}>
          <span className="hx-input" data-hx-at={2.6}><span className="hx-type hx-type-long" style={d(2.6)}>{m.help.sample.reject}</span></span>
        </Field>
      </div>
      <div className="hx-actions">
        <FakeButton at={3.4}>{m.changes.submit}</FakeButton>
      </div>
      <p className="hx-log hx-in" style={d(5.2)}>
        <span>
          <span className="badge crit-critical">{m.changes.status.rejected}</span>{' '}
          <span className="hx-muted">{i.dateTime(new Date())} · {m.changes.roles[1]}</span>
        </span>
        <span>{m.help.sample.reject}</span>
      </p>
    </Screen>
  );
}

/* ---------- Scenario 3: leverandørkontroll ---------- */

function SuppliersStep1() {
  const i = useI18n();
  const { m } = i;
  const critical = dataset.nodes.filter((n) => n.kind === 'service' && n.criticality === 'critical');
  return (
    <Screen title={m.overview.title}>
      <div className="kpis kpis-compact hx-kpis hx-in" style={d(0.3)}>
        <div className="kpi">
          <span className="kpi-value">{critical.length}</span>
          <span className="kpi-label">{m.overview.kpiCritical}</span>
        </div>
      </div>
      <ul className="hx-list hx-rows">
        {critical.map((n, j) => (
          <li key={n.id} className="hx-in hx-flash" style={d(1 + j * 0.6)}>
            <span>
              <strong>{i.lt(n.name)}</strong>
              <span className="hx-muted"> · {'owner' in n ? i.lt(n.owner) : ''}</span>
            </span>
            <span className="hx-right">
              <CriticalityBadge value="critical" />
              <span className="hx-muted">{'rtoMinutes' in n ? i.duration(n.rtoMinutes) : ''}</span>
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function SuppliersStep2({ facts }: SceneProps) {
  const { m, f } = useI18n();
  return (
    <Screen title={m.suppliers.title}>
      <ul className="hx-list hx-rows">
        {subPairs.map((dep, n) => (
          <li key={dep.id} className="hx-chain">
            <span className="hx-in" style={d(0.4 + n * 1.6)}>
              <strong>{facts.name(dep.from)}</strong> <span className="badge crit-medium">{f(m.suppliers.level, { n: 1 })}</span>
            </span>
            <span className="hx-child hx-slide" style={d(1.2 + n * 1.6)}>
              <span aria-hidden="true">↳ </span>
              <strong>{facts.name(dep.to)}</strong> <span className="badge">{f(m.suppliers.level, { n: 2 })}</span>
              <span className="hx-muted"> {m.suppliers.noContract}</span>
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function SuppliersStep3({ facts }: SceneProps) {
  const i = useI18n();
  const { m } = i;
  const direct = providers.filter((p) => p.directContract);
  const gaps = direct.filter((p) => p.exitPlan !== 'exists');
  return (
    <Screen title={m.suppliers.title}>
      <div className="kpis kpis-compact hx-kpis hx-in" style={d(0.3)}>
        <div className="kpi kpi-accent kpi-open">
          <span className="kpi-value">{direct.filter((p) => p.exitPlan === 'missing').length}</span>
          <span className="kpi-label">{m.suppliers.kpiNoExit}</span>
        </div>
        <div className="kpi kpi-accent kpi-dev">
          <span className="kpi-value">{direct.filter((p) => !p.exitTested).length}</span>
          <span className="kpi-label">{m.suppliers.kpiNeverTested}</span>
        </div>
      </div>
      <ul className="hx-list hx-rows">
        {gaps.map((p, n) => (
          <li key={p.id} className="hx-in hx-flash" style={d(1.2 + n * 0.6)}>
            <strong>{facts.name(p.id)}</strong>
            <span className="hx-right">
              {p.exitPlan && <ExitPlanBadge value={p.exitPlan} />}
              <span className="hx-muted">
                {m.suppliers.colTested}: {p.exitTested ? i.date(p.exitTested) : m.suppliers.never}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function SuppliersStep4() {
  const i = useI18n();
  const { m } = i;
  return (
    <Screen title={m.suppliers.title}>
      <div className="hx-actions hx-actions-start">
        <FakeButton at={0.6}>{m.suppliers.export}</FakeButton>
      </div>
      <p className="hx-file hx-pop" style={d(2.3)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 2h8l4 4v16H6z M14 2v4h4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span>
          <strong>{m.suppliers.csvFile}</strong>
          <span className="hx-muted"> · {m.help.sample.downloaded}</span>
        </span>
      </p>
      <table className="hx-sheet hx-in" style={d(3.3)}>
        <tbody>
          <tr>
            <th>{m.suppliers.csv.supplier}</th>
            <th>{m.suppliers.csv.level}</th>
            <th>{m.suppliers.csv.exitPlan}</th>
          </tr>
          {providers.slice(0, 4).map((p) => (
            <tr key={p.id}>
              <td>{i.lt(p.name)}</td>
              <td>{p.directContract ? 1 : 2}</td>
              <td>{p.exitPlan ? m.exitPlan[p.exitPlan] : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

/* ---------- Scenario 4: øvelse og funn ---------- */

function ExerciseStep1() {
  return <ScenarioForm exercise />;
}
function ExerciseStep2() {
  return <IncidentRoom exercise />;
}

function ExerciseStep3() {
  const i = useI18n();
  const { m, f } = i;
  return (
    <Screen title={m.exercises.addTitle}>
      <div className="hx-form">
        <Field label={m.exercises.fTitle}>
          <span className="hx-input" data-hx-at={0.4}><span className="hx-type hx-type-long" style={d(0.4)}>{m.help.sample.finding}</span></span>
        </Field>
        <Field label={m.exercises.fExercise}>
          <span className="hx-input">{f(m.exercises.demoExercise, { n: 1 })}</span>
        </Field>
        <Field label={m.exercises.fRole}>
          <span className="hx-input" data-hx-at={2.2}><span className="hx-type" style={d(2.2)}>{m.exercises.roles[0]}</span></span>
        </Field>
        <Field label={m.exercises.fDue}>
          <span className="hx-input" data-hx-at={2.9}><span className="hx-type" style={d(2.9)}>{i.date(isoInDays(30))}</span></span>
        </Field>
      </div>
      <div className="hx-actions">
        <FakeButton at={3.6}>{m.exercises.add}</FakeButton>
      </div>
    </Screen>
  );
}

function ExerciseStep4() {
  const i = useI18n();
  const { m } = i;
  // Funnet fra øvelsen øverst, deretter to funn fra datasettet som ikke er lukket.
  const others = dataset.findings.filter((x) => x.status !== 'closed').slice(0, 2);
  return (
    <Screen title={m.exercises.findingsTitle}>
      <ul className="hx-list hx-rows">
        <li className="hx-target hx-select" style={d(0.2)}>
          <span>
            <strong>{m.help.sample.finding}</strong>
            <span className="hx-muted"> · {m.exercises.roles[0]} · {i.date(isoInDays(30))}</span>
          </span>
          <span className="hx-swap3" data-hx-at="1.9,4.3">
            <span className="hx-out badge crit-critical" style={d(1.9)}>{m.findingStatus.open}</span>
            <span className="hx-blink badge status-degraded" style={d(1.9)}>{m.findingStatus.inProgress}</span>
            <span className="hx-in-fast badge status-operational" style={d(4.3)}>{m.findingStatus.closed}</span>
          </span>
        </li>
        {others.map((x, n) => (
          <li key={x.id} className="hx-in" style={d(0.3 + n * 0.3)}>
            <span>
              <strong>{i.lt(x.title)}</strong>
              <span className="hx-muted"> · {i.lt(x.role)} · {i.date(x.due)}</span>
            </span>
            <span className={`badge ${x.status === 'open' ? 'crit-critical' : 'status-degraded'}`}>{m.findingStatus[x.status]}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

export const SCENES: Record<StoryId, ((p: SceneProps) => ReactNode)[]> = {
  incident: [IncidentStep1, IncidentStep2, IncidentStep4, IncidentStep5],
  change: [ChangeStep1, ChangeStep2, ChangeStep3, ChangeStep4],
  suppliers: [SuppliersStep1, SuppliersStep2, SuppliersStep3, SuppliersStep4],
  exercise: [ExerciseStep1, ExerciseStep2, ExerciseStep3, ExerciseStep4],
};
