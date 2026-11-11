import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dataset, nodesById, scenariosById } from '../data';
import type { ChangeOutcome, FindingStatus, LocalizedText, ScenarioParams } from '../data/types';
import { computeImpact, type ImpactResult } from '../engine/impact';

/**
 * Demo-tilstand. Lagres bare i sessionStorage i denne fanen, slik at oppfrisking
 * beholder valgene, men ingenting sendes noe sted (SPEC P-15).
 */
export type IncidentStatus = 'investigating' | 'mitigating' | 'monitoring' | 'closed';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface CustomTask {
  id: string;
  title: LocalizedText;
  role: LocalizedText;
  fromGap: string;
}

export interface LogEntry {
  id: string;
  /** Faktisk tidspunkt brukeren gjorde endringen (ISO). */
  at: string;
  kind: 'decision' | 'status';
  text: string;
  role?: string;
  /** Oppgaven en beslutning gjelder; mangler den, gjelder den hele hendelsen. */
  taskId?: string;
}

/** 2.0: beslutning om en planlagt endring, registrert i demoen. */
export interface ChangeLogEntry {
  id: string;
  changeId: string;
  at: string;
  outcome: ChangeOutcome;
  reason: string;
  role: string;
}

/** 2.0: et scenario kan kjøres som reell hendelse eller som øvelse. */
export type RunMode = 'incident' | 'exercise';

/** 2.0: øvelse startet i demoen (i tillegg til øvelsene i datasettet). */
export interface UserExercise {
  id: string;
  scenarioId: string;
  startedAt: string;
}

/** 2.0: funn registrert i demoen. Status ligger i `findingStatus`, som for funnene i datasettet. */
export interface UserFinding {
  id: string;
  title: string;
  exerciseId: string;
  role: string;
  due: string;
}

export interface DemoState {
  scenarioId: string | null;
  params: ScenarioParams | null;
  /** Når scenarioet ble startet (ISO). Tidslinje og frister regnes fra dette. */
  startedAt: string | null;
  incidentStatus: IncidentStatus;
  taskStatus: Record<string, TaskStatus>;
  customTasks: CustomTask[];
  log: LogEntry[];
  /** 2.0: avkryssede sjekkpunkter per planlagt endring (indeks i sjekklisten). */
  changeChecks: Record<string, number[]>;
  /** 2.0: beslutninger om planlagte endringer. Uavhengig av scenarioet. */
  changeLog: ChangeLogEntry[];
  /** 2.0: om aktivt scenario kjøres som hendelse eller øvelse. */
  mode: RunMode;
  /** 2.0: øvelser startet i demoen. */
  userExercises: UserExercise[];
  /** 2.0: funn registrert i demoen. */
  userFindings: UserFinding[];
  /** 2.0: status for funn (datasettets og egne), når den er endret i demoen. */
  findingStatus: Record<string, FindingStatus>;
}

const initial: DemoState = {
  scenarioId: null,
  params: null,
  startedAt: null,
  incidentStatus: 'investigating',
  taskStatus: {},
  customTasks: [],
  log: [],
  changeChecks: {},
  changeLog: [],
  mode: 'incident',
  userExercises: [],
  userFindings: [],
  findingStatus: {},
};

const KEY = 'morild-demo-v3';

const STATUSES: IncidentStatus[] = ['investigating', 'mitigating', 'monitoring', 'closed'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown, max = 500): string | undefined => (typeof x === 'string' ? x.slice(0, max) : undefined);

/**
 * Leser lagret tilstand og godtar bare felter med riktig form. Gammel, ødelagt eller manipulert
 * lagring gir aldri krasj: ugyldige felter faller tilbake til startverdiene.
 */
export function sanitize(raw: unknown): DemoState {
  if (!isObj(raw)) return initial;
  // 2.0: endringsvurderingene gjelder uavhengig av om et scenario er valgt.
  const changes = new Map(dataset.plannedChanges.map((c) => [c.id, c.checkpoints.length]));
  const changeChecks: Record<string, number[]> = {};
  if (isObj(raw.changeChecks))
    for (const [k, v] of Object.entries(raw.changeChecks)) {
      const n = changes.get(k);
      if (n === undefined || !Array.isArray(v)) continue;
      changeChecks[k] = [...new Set(v.filter((x): x is number => Number.isInteger(x) && x >= 0 && x < n))];
    }
  const changeLog = Array.isArray(raw.changeLog)
    ? raw.changeLog.flatMap((e): ChangeLogEntry[] => {
        if (!isObj(e) || typeof e.changeId !== 'string' || !changes.has(e.changeId)) return [];
        if (e.outcome !== 'approved' && e.outcome !== 'rejected') return [];
        const reason = str(e.reason);
        const at = str(e.at, 40);
        if (!reason || !at || Number.isNaN(Date.parse(at))) return [];
        return [{ id: str(e.id, 40) ?? Math.random().toString(36).slice(2, 10), changeId: e.changeId, at, outcome: e.outcome, reason, role: str(e.role, 80) ?? '' }];
      })
    : [];
  const userExercises = Array.isArray(raw.userExercises)
    ? raw.userExercises.flatMap((e): UserExercise[] => {
        if (!isObj(e) || typeof e.scenarioId !== 'string' || !scenariosById[e.scenarioId]) return [];
        const id = str(e.id, 40);
        const startedAt = str(e.startedAt, 40);
        return id && startedAt && !Number.isNaN(Date.parse(startedAt)) ? [{ id, scenarioId: e.scenarioId, startedAt }] : [];
      })
    : [];
  const exerciseIds = new Set([...dataset.exercises.map((x) => x.id), ...userExercises.map((x) => x.id)]);
  const userFindings = Array.isArray(raw.userFindings)
    ? raw.userFindings.flatMap((e): UserFinding[] => {
        if (!isObj(e)) return [];
        const id = str(e.id, 40);
        const title = str(e.title, 120);
        const exerciseId = str(e.exerciseId, 40);
        const due = str(e.due, 10);
        if (!id || !title || !exerciseId || !exerciseIds.has(exerciseId) || !due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return [];
        return [{ id, title, exerciseId, role: str(e.role, 80) ?? '', due }];
      })
    : [];
  const findingIds = new Set([...dataset.findings.map((x) => x.id), ...userFindings.map((x) => x.id)]);
  const findingStatus: Record<string, FindingStatus> = {};
  if (isObj(raw.findingStatus))
    for (const [k, v] of Object.entries(raw.findingStatus))
      if (findingIds.has(k) && (v === 'open' || v === 'inProgress' || v === 'closed')) findingStatus[k] = v;
  const kept = { changeChecks, changeLog, userExercises, userFindings, findingStatus };
  const scenarioId = typeof raw.scenarioId === 'string' && scenariosById[raw.scenarioId] ? raw.scenarioId : null;
  if (!scenarioId) return { ...initial, ...kept };
  const p = raw.params;
  const params =
    isObj(p) && typeof p.targetId === 'string' && nodesById[p.targetId] && Array.isArray(p.regions) &&
    (p.severity === 'outage' || p.severity === 'degraded') && typeof p.durationMinutes === 'number' && p.durationMinutes > 0
      ? ({ ...p, regions: p.regions.filter((r) => typeof r === 'string') } as ScenarioParams)
      : null;
  const startedAt = typeof raw.startedAt === 'string' && !Number.isNaN(Date.parse(raw.startedAt)) ? raw.startedAt : null;
  const taskStatus: Record<string, TaskStatus> = {};
  if (isObj(raw.taskStatus))
    for (const [k, v] of Object.entries(raw.taskStatus)) if (TASK_STATUSES.includes(v as TaskStatus)) taskStatus[k] = v as TaskStatus;
  const customTasks = Array.isArray(raw.customTasks)
    ? raw.customTasks.filter((t): t is CustomTask => isObj(t) && typeof t.id === 'string' && isObj(t.title) && isObj(t.role))
    : [];
  const log = Array.isArray(raw.log)
    ? raw.log.flatMap((e): LogEntry[] => {
        if (!isObj(e) || (e.kind !== 'decision' && e.kind !== 'status')) return [];
        const text = str(e.text);
        const at = str(e.at, 40);
        if (!text || !at || Number.isNaN(Date.parse(at))) return [];
        return [{ id: str(e.id, 40) ?? Math.random().toString(36).slice(2, 10), at, kind: e.kind, text, role: str(e.role, 80), taskId: str(e.taskId, 80) }];
      })
    : [];
  return {
    scenarioId,
    params,
    startedAt,
    incidentStatus: STATUSES.includes(raw.incidentStatus as IncidentStatus) ? (raw.incidentStatus as IncidentStatus) : 'investigating',
    taskStatus,
    customTasks,
    log,
    mode: raw.mode === 'exercise' ? 'exercise' : 'incident',
    ...kept,
  };
}

function load(): DemoState {
  try {
    const s = sessionStorage.getItem(KEY);
    return s ? sanitize(JSON.parse(s)) : initial;
  } catch {
    return initial;
  }
}

interface DemoApi {
  state: DemoState;
  result: ImpactResult | null;
  /** Starter eller oppdaterer scenario. Ny scenariotype eller ny modus nullstiller hendelsesrommet. */
  runScenario: (scenarioId: string, params: ScenarioParams, mode?: RunMode) => void;
  setIncidentStatus: (s: IncidentStatus, logText: string) => void;
  setTaskStatus: (id: string, s: TaskStatus) => void;
  addCustomTask: (t: CustomTask) => void;
  addDecision: (text: string, role: string, taskId?: string) => void;
  toggleChangeCheck: (changeId: string, index: number) => void;
  decideChange: (changeId: string, outcome: ChangeOutcome, reason: string, role: string) => void;
  addFinding: (f: Omit<UserFinding, 'id'>) => void;
  setFindingStatus: (id: string, status: FindingStatus) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoApi | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(load);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* lagring er en bekvemmelighet; demoen virker uten */
    }
  }, [state]);

  const result = useMemo(() => {
    if (!state.params) return null;
    try {
      return computeImpact(dataset, state.params);
    } catch {
      return null;
    }
  }, [state.params]);

  const runScenario = useCallback((scenarioId: string, params: ScenarioParams, mode: RunMode = 'incident') => {
    setState((s) => {
      if (s.scenarioId === scenarioId && s.mode === mode) return { ...s, params };
      const startedAt = scenarioStartFromNow(scenarioId).toISOString();
      const userExercises =
        mode === 'exercise'
          ? [...s.userExercises, { id: `EX-DEMO-${s.userExercises.length + 1}`, scenarioId, startedAt }]
          : s.userExercises;
      return {
        ...initial,
        changeChecks: s.changeChecks,
        changeLog: s.changeLog,
        userFindings: s.userFindings,
        findingStatus: s.findingStatus,
        userExercises,
        mode,
        scenarioId,
        params,
        startedAt,
      };
    });
  }, []);

  const api: DemoApi = {
    state,
    result,
    runScenario,
    setIncidentStatus: (incidentStatus, text) =>
      setState((s) => ({
        ...s,
        incidentStatus,
        log: [...s.log, { id: uid(), at: new Date().toISOString(), kind: 'status', text }],
      })),
    setTaskStatus: (id, st) => setState((s) => ({ ...s, taskStatus: { ...s.taskStatus, [id]: st } })),
    addCustomTask: (t) =>
      setState((s) => (s.customTasks.some((c) => c.id === t.id) ? s : { ...s, customTasks: [...s.customTasks, t] })),
    addDecision: (text, role, taskId) =>
      setState((s) => ({
        ...s,
        log: [...s.log, { id: uid(), at: new Date().toISOString(), kind: 'decision', text, role, taskId }],
      })),
    toggleChangeCheck: (changeId, index) =>
      setState((s) => {
        const cur = s.changeChecks[changeId] ?? [];
        const next = cur.includes(index) ? cur.filter((x) => x !== index) : [...cur, index];
        return { ...s, changeChecks: { ...s.changeChecks, [changeId]: next } };
      }),
    addFinding: (f) =>
      setState((s) => ({ ...s, userFindings: [...s.userFindings, { ...f, id: `F-DEMO-${s.userFindings.length + 1}` }] })),
    setFindingStatus: (id, status) => setState((s) => ({ ...s, findingStatus: { ...s.findingStatus, [id]: status } })),
    decideChange: (changeId, outcome, reason, role) =>
      setState((s) => ({
        ...s,
        changeLog: [...s.changeLog, { id: uid(), changeId, at: new Date().toISOString(), outcome, reason, role }],
      })),
    reset: () => setState(initial),
  };

  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>;
}

/**
 * Scenarioets ferdige hendelser og beslutninger skal ligge i fortiden når brukeren åpner det,
 * slik at det brukeren selv legger inn alltid er nyest. Starttiden settes derfor så langt tilbake
 * som den siste forhåndsutfylte hendelsen, pluss noen minutter.
 */
export function historyMinutes(scenarioId: string): number {
  const sc = scenariosById[scenarioId];
  if (!sc) return 0;
  const offsets = [...sc.timeline, ...sc.decisions].map((e) => e.offsetMinutes);
  return Math.max(0, ...offsets) + 5;
}
export const scenarioStartFromNow = (scenarioId: string): Date =>
  new Date(Date.now() - historyMinutes(scenarioId) * 60000);

/** Starttidspunkt for aktivt scenario (nå, hvis det mangler). */
export const scenarioStart = (s: DemoState): Date => (s.startedAt ? new Date(s.startedAt) : new Date());

export function useDemo(): DemoApi {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo må brukes inne i DemoProvider');
  return ctx;
}
