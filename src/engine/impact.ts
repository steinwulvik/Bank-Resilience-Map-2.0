/**
 * Forklarbar påvirkningsberegning (SPEC P-03, P-04, F-04, F-05).
 *
 * Regler (vises også i appen):
 * 1. Komponenten som feiler, får nivået brukeren har valgt (bortfall eller redusert).
 * 2. Hard avhengighet: påvirkningen arves uendret oppover.
 * 3. Myk avhengighet: påvirkningen blir høyst «redusert» oppover.
 * 4. Regional leverandør: et system som bare kjører i berørte regioner, får fullt bortfall.
 *    Kjører det også i en region som virker, blir det «redusert» (antatt automatisk flytting).
 *    Er regionen ukjent, antas fullt bortfall, men resultatet merkes som usikkert.
 * 5. Antatte og utdaterte relasjoner gir fortsatt påvirkning, men resultatet merkes som usikkert.
 * 6. Er nedetiden lengre enn tjenestens gjenopprettingsmål (RTO), merkes tjenesten.
 *
 * Motoren er språkuavhengig: den returnerer koder, og grensesnittet oversetter dem.
 */
import type { Dataset, Dependency, GraphNode, ScenarioParams, Validity } from '../data/types';

export type ImpactLevel = 'outage' | 'degraded';

export type UncertaintyReason = 'assumed' | 'stale' | 'regionUnknown';

export type CauseNote = 'soft' | 'partialRegion';

export interface Cause {
  dependencyId: string;
  /** Avhengigheten påvirkningen kom gjennom. */
  viaNodeId: string;
  level: ImpactLevel;
  uncertain: boolean;
  /** Usikkerhet som oppstår i akkurat denne relasjonen. */
  reasons: UncertaintyReason[];
  notes: CauseNote[];
}

export interface NodeImpact {
  nodeId: string;
  level: ImpactLevel;
  uncertain: boolean;
  /** Komponenten som feiler, eller direkte avhengig av den. */
  direct: boolean;
  isTarget: boolean;
  /** Alle relasjoner som bidrar, sortert med den mest alvorlige og sikreste først. */
  causes: Cause[];
  /** Bare tjenester: nedetiden overstiger RTO. */
  rtoExceeded: boolean;
}

export interface DataGap {
  reason: UncertaintyReason;
  dependencyId: string;
}

export interface ImpactResult {
  params: ScenarioParams;
  impacts: Record<string, NodeImpact>;
  /** Datamangler i relasjoner som påvirker resultatet. */
  gaps: DataGap[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Gyldighet tatt hensyn til alder på siste bekreftelse. */
export function effectiveValidity(dep: Dependency, asOf: string, staleAfterDays: number): Validity {
  if (dep.validity === 'assumed' || dep.lastConfirmed === null) return 'assumed';
  const age = (Date.parse(asOf) - Date.parse(dep.lastConfirmed)) / DAY_MS;
  return age > staleAfterDays ? 'stale' : 'confirmed';
}

export function indexNodes(data: Dataset): Record<string, GraphNode> {
  return Object.fromEntries(data.nodes.map((n) => [n.id, n]));
}

/** Avhengigheter gruppert etter objektet som er avhengig. */
function dependenciesFrom(data: Dataset): Record<string, Dependency[]> {
  const out: Record<string, Dependency[]> = {};
  for (const d of data.dependencies) (out[d.from] ??= []).push(d);
  return out;
}

const rank = (c: { level: ImpactLevel; uncertain: boolean }) =>
  (c.level === 'outage' ? 2 : 0) + (c.uncertain ? 0 : 1);

export function computeImpact(data: Dataset, params: ScenarioParams): ImpactResult {
  const nodes = indexNodes(data);
  const target = nodes[params.targetId];
  if (!target) throw new Error(`Ukjent komponent: ${params.targetId}`);

  const deps = dependenciesFrom(data);
  const memo = new Map<string, NodeImpact | null>();
  const visiting = new Set<string>();
  const gapKeys = new Set<string>();
  const gaps: DataGap[] = [];

  const targetIsRegional = target.kind === 'provider' && target.regions.length > 0;
  const hitRegions = new Set(params.regions);

  /** Påvirkning gjennom én relasjon, eller null hvis ingen. */
  function through(dep: Dependency): Cause | null {
    const reasons: UncertaintyReason[] = [];
    const notes: CauseNote[] = [];
    let level: ImpactLevel;
    let uncertain: boolean;

    if (dep.to === params.targetId) {
      level = params.severity;
      uncertain = false;
      if (targetIsRegional) {
        if (dep.regions === undefined) {
          reasons.push('regionUnknown');
        } else {
          const hit = dep.regions.filter((r) => hitRegions.has(r));
          if (hit.length === 0) return null;
          if (hit.length < dep.regions.length) {
            level = 'degraded';
            notes.push('partialRegion');
          }
        }
      }
    } else {
      const down = impactOf(dep.to);
      if (!down) return null;
      level = down.level;
      uncertain = down.uncertain;
    }

    if (dep.strength === 'soft' && level === 'outage') {
      level = 'degraded';
      notes.push('soft');
    }
    const validity = effectiveValidity(dep, data.asOf, data.staleAfterDays);
    if (validity !== 'confirmed') reasons.push(validity);
    if (reasons.length) uncertain = true;

    for (const reason of reasons) {
      const key = `${reason}:${dep.id}`;
      if (!gapKeys.has(key)) {
        gapKeys.add(key);
        gaps.push({ reason, dependencyId: dep.id });
      }
    }
    return { dependencyId: dep.id, viaNodeId: dep.to, level, uncertain, reasons, notes };
  }

  function impactOf(id: string): NodeImpact | null {
    if (memo.has(id)) return memo.get(id)!;
    if (id === params.targetId) {
      const self: NodeImpact = {
        nodeId: id, level: params.severity, uncertain: false, direct: true, isTarget: true,
        causes: [], rtoExceeded: false,
      };
      memo.set(id, self);
      return self;
    }
    if (visiting.has(id)) return null; // vern mot sykliske data
    visiting.add(id);
    const causes = (deps[id] ?? []).map(through).filter((c): c is Cause => c !== null);
    visiting.delete(id);

    let result: NodeImpact | null = null;
    if (causes.length) {
      causes.sort((a, b) => rank(b) - rank(a));
      const best = causes[0];
      const node = nodes[id];
      result = {
        nodeId: id,
        level: best.level,
        // Usikker bare hvis alle relasjoner med høyeste nivå er usikre.
        uncertain: causes.filter((c) => c.level === best.level).every((c) => c.uncertain),
        direct: causes.some((c) => c.viaNodeId === params.targetId),
        isTarget: false,
        causes,
        rtoExceeded:
          node.kind === 'service' && best.level === 'outage' && params.durationMinutes > node.rtoMinutes,
      };
    }
    memo.set(id, result);
    return result;
  }

  const impacts: Record<string, NodeImpact> = {};
  for (const n of data.nodes) {
    const imp = impactOf(n.id);
    if (imp) impacts[n.id] = imp;
  }
  return { params, impacts, gaps };
}

/**
 * Den viktigste påvirkningsstien fra et objekt ned til komponenten som feiler,
 * som en liste av node-id-er (start, …, mål).
 */
export function primaryPath(result: ImpactResult, nodeId: string): string[] {
  const path: string[] = [];
  let cur: NodeImpact | undefined = result.impacts[nodeId];
  const seen = new Set<string>();
  while (cur && !seen.has(cur.nodeId)) {
    seen.add(cur.nodeId);
    path.push(cur.nodeId);
    if (cur.isTarget) break;
    cur = result.impacts[cur.causes[0]?.viaNodeId];
  }
  return path;
}

/** Alle relasjoner som ligger på minst én påvirkningssti. */
export function impactedDependencyIds(result: ImpactResult): Set<string> {
  const ids = new Set<string>();
  for (const imp of Object.values(result.impacts)) for (const c of imp.causes) ids.add(c.dependencyId);
  return ids;
}

export interface Coverage {
  total: number;
  confirmed: number;
  assumed: number;
  stale: number;
  regionUnknown: number;
}

/** Datadekning for alt et objekt avhenger av, direkte og indirekte (SPEC skjerm 1). */
export function coverageFor(data: Dataset, nodeId: string): Coverage {
  const nodes = indexNodes(data);
  const deps = dependenciesFrom(data);
  const cov: Coverage = { total: 0, confirmed: 0, assumed: 0, stale: 0, regionUnknown: 0 };
  const seenDeps = new Set<string>();
  const stack = [nodeId];
  const seenNodes = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seenNodes.has(id)) continue;
    seenNodes.add(id);
    for (const d of deps[id] ?? []) {
      if (seenDeps.has(d.id)) continue;
      seenDeps.add(d.id);
      cov.total++;
      cov[effectiveValidity(d, data.asOf, data.staleAfterDays)]++;
      const to = nodes[d.to];
      if (to?.kind === 'provider' && to.regions.length > 0 && d.regions === undefined) cov.regionUnknown++;
      stack.push(d.to);
    }
  }
  return cov;
}
