import type { Dataset, Provider } from '../data/types';
import { computeImpact } from './impact';

/**
 * Ledd i leverandørkjeden (2.0), som «rank» i DORA-registerets mal for tjenestekjeden:
 * 1 = leverandør med direkte avtale med banken, 2 = underleverandør til en slik, osv.
 * En leverandør kan stå i flere ledd (f.eks. både direkte og som underleverandør).
 */
export interface ChainPosition {
  rank: number;
  /** Leverandøren i leddet over (mottakeren). `null` for ledd 1. */
  via: string | null;
}

export function supplierChains(data: Dataset): Record<string, ChainPosition[]> {
  const providers = data.nodes.filter((n): n is Provider => n.kind === 'provider');
  const out: Record<string, ChainPosition[]> = {};
  for (const p of providers) out[p.id] = [];
  const subs = data.dependencies.filter((d) => d.type === 'subcontractor');

  const queue: { id: string; rank: number }[] = [];
  for (const p of providers) {
    if (p.directContract) {
      out[p.id].push({ rank: 1, via: null });
      queue.push({ id: p.id, rank: 1 });
    }
  }
  const seen = new Set<string>();
  while (queue.length) {
    const { id, rank } = queue.shift()!;
    for (const d of subs.filter((x) => x.from === id)) {
      const key = `${id}>${d.to}`;
      if (seen.has(key)) continue; // vern mot sykler
      seen.add(key);
      out[d.to].push({ rank: rank + 1, via: id });
      queue.push({ id: d.to, rank: rank + 1 });
    }
  }
  return out;
}

/** Laveste ledd en leverandør står i, eller `null` hvis den ikke er knyttet til banken. */
export function closestRank(chain: ChainPosition[]): number | null {
  return chain.length ? Math.min(...chain.map((c) => c.rank)) : null;
}

/**
 * Tjenester som rammes (bortfall eller redusert) hvis leverandøren faller ut i alle land den driver i.
 * Bruker samme beregning som scenarioene, så registeret og kartet alltid stemmer.
 */
export function dependentServices(data: Dataset, providerId: string): string[] {
  const p = data.nodes.find((n) => n.id === providerId) as Provider | undefined;
  if (!p) return [];
  const r = computeImpact(data, { targetId: providerId, regions: [...p.regions], severity: 'outage', durationMinutes: 60 });
  return data.nodes.filter((n) => n.kind === 'service' && r.impacts[n.id]).map((n) => n.id);
}

/** Om en dato er eldre enn grensen for «utdatert» i datasettet. */
export function isOutdated(data: Dataset, iso: string | null | undefined): boolean {
  if (!iso) return false;
  const age = (Date.parse(data.asOf) - Date.parse(iso)) / 86_400_000;
  return age > data.staleAfterDays;
}
