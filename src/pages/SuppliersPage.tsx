import { useMemo, useState } from 'react';
import { dataset, nodesById, regionName } from '../data';
import type { Criticality, Provider } from '../data/types';
import { dependentServices, isOutdated, supplierChains } from '../engine/suppliers';
import { useI18n } from '../i18n';
import { useDemo } from '../state/demo';
import { CriticalityBadge, ExitPlanBadge, PageHeader, SubstitutabilityBadge, ValidityBadge } from '../components/ui';
import { NodeDetail } from '../components/NodeDetail';
import { DetailDialog } from '../components/DetailDialog';

const CRIT_ORDER: Record<Criticality, number> = { critical: 0, high: 1, medium: 2 };

/** Én rad i registeret: en leverandør i ett ledd. Underleverandører vises rett under leddet over. */
interface Row {
  provider: Provider;
  rank: number;
  via: string | null;
  depth: number;
}

/**
 * Leverandørregisteret (2.0, SPEC P-17, P-18, P-21). Bygger på samme datasett og beregning som kartet:
 * ledd beregnes fra underleverandørkoblingene, og «tjenester som avhenger» fra påvirkningsmotoren.
 */
export default function SuppliersPage() {
  const i = useI18n();
  const { m, f, lt, date } = i;
  const { result } = useDemo();
  const [detailId, setDetailId] = useState<string | null>(null);

  const providers = dataset.nodes.filter((n): n is Provider => n.kind === 'provider');
  const chains = useMemo(() => supplierChains(dataset), []);
  const services = useMemo(() => Object.fromEntries(providers.map((p) => [p.id, dependentServices(dataset, p.id)])), [providers]);

  // Leverandører med avtale sorteres etter kritikalitet og navn. Underleverandørene følger leddet over.
  const sortKey = (p: Provider) => `${CRIT_ORDER[p.criticality]}${lt(p.name)}`;
  const rows: Row[] = [];
  const addChildren = (parent: Provider, rank: number, depth: number, seen: Set<string>) => {
    const children = providers
      .filter((p) => chains[p.id].some((c) => c.via === parent.id && c.rank === rank + 1))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b), m.meta.locale));
    for (const c of children) {
      if (seen.has(c.id)) continue;
      rows.push({ provider: c, rank: rank + 1, via: parent.id, depth });
      addChildren(c, rank + 1, depth + 1, new Set([...seen, c.id]));
    }
  };
  providers
    .filter((p) => p.directContract)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b), m.meta.locale))
    .forEach((p) => {
      rows.push({ provider: p, rank: 1, via: null, depth: 0 });
      addChildren(p, 1, 1, new Set([p.id]));
    });

  const direct = providers.filter((p) => p.directContract);
  const noExit = direct.filter((p) => p.exitPlan === 'missing').length;
  const neverTested = direct.filter((p) => !p.exitTested).length;
  const subOnly = providers.filter((p) => !p.directContract).length;

  const exportCsv = () => {
    const c = m.suppliers.csv;
    const header = [c.supplier, c.level, c.parent, c.criticality, c.serviceType, c.countries, c.services, c.contractOwner, c.exitPlan, c.substitutability, c.assessed, c.tested, c.synthetic];
    // Exit-feltene hører til avtalen i ledd 1. Rader i ledd 2 eller lavere har dem ikke (samme som tabellen).
    const lines = rows.map(({ provider: p, rank, via }) => {
      const own = rank === 1;
      return [
      lt(p.name),
      String(rank),
      via ? lt(nodesById[via].name) : '',
      m.criticality[p.criticality],
      lt(p.serviceType),
      p.regions.map((r) => lt(regionName(r))).join(', '),
      services[p.id].map((s) => lt(nodesById[s].name)).join(', '),
      own && p.contractOwner ? lt(p.contractOwner) : own ? '' : p.directContract ? m.suppliers.seeLevel1 : m.suppliers.noContract,
      own && p.exitPlan ? m.exitPlan[p.exitPlan] : '',
      own && p.substitutability ? m.substitutability[p.substitutability] : '',
      own ? (p.lastAssessed ? date(p.lastAssessed) : m.suppliers.never) : '',
      own ? (p.exitTested ? date(p.exitTested) : m.suppliers.never) : '',
      m.common.yes,
    ];
    });
    // Semikolon og BOM gjør at fila åpnes riktig i regneark med norske innstillinger.
    const cell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const text = '﻿' + [header, ...lines].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = m.suppliers.csvFile;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const dateCell = (iso: string | null | undefined, isDirect: boolean, markStale: boolean) => {
    if (!isDirect) return <span className="muted">–</span>;
    if (!iso) return <>{m.suppliers.never}</>;
    return (
      <>
        {date(iso)}
        {markStale && isOutdated(dataset, iso) && <> <ValidityBadge value="stale" /></>}
      </>
    );
  };

  return (
    <div className="page">
      <PageHeader title={m.suppliers.title} lead={m.suppliers.lead}>
        <button type="button" className="btn btn-primary" onClick={exportCsv}>
          {m.suppliers.export}
        </button>
      </PageHeader>

      <section className="kpis" aria-label={m.suppliers.title}>
        <div className="kpi">
          <span className="kpi-value">{direct.length}</span>
          <span className="kpi-label">{m.suppliers.kpiDirect}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{subOnly}</span>
          <span className="kpi-label">{m.suppliers.kpiSub}</span>
        </div>
        <div className={`kpi kpi-accent kpi-dev${noExit === 0 ? ' kpi-zero' : ''}`}>
          <span className="kpi-value">{noExit}</span>
          <span className="kpi-label">{m.suppliers.kpiNoExit}</span>
        </div>
        <div className={`kpi kpi-accent kpi-dev${neverTested === 0 ? ' kpi-zero' : ''}`}>
          <span className="kpi-value">{neverTested}</span>
          <span className="kpi-label">{m.suppliers.kpiNeverTested}</span>
        </div>
      </section>

      <section className="card">
        <h2>{m.suppliers.registerTitle}</h2>
        <div className="table-scroll">
          <table className="table responsive-table supplier-table">
            <thead>
              <tr>
                <th scope="col">{m.suppliers.colSupplier}</th>
                <th scope="col">{m.suppliers.colLevel}</th>
                <th scope="col">{m.criticality.label}</th>
                <th scope="col">{m.suppliers.colServices}</th>
                <th scope="col">{m.exitPlan.label}</th>
                <th scope="col">{m.substitutability.label}</th>
                <th scope="col">{m.suppliers.colAssessed}</th>
                <th scope="col">{m.suppliers.colTested}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ provider: p, rank, via, depth }) => {
                // Exit-data vises bare i ledd 1, der avtalen er. En leverandør som også står lavere i en kjede, henviser dit.
                const isDirect = rank === 1;
                return (
                  <tr key={`${p.id}-${via ?? 'bank'}`} className={depth ? 'sub-row' : undefined}>
                    <th scope="row" data-label={m.suppliers.colSupplier}>
                      <span className="supplier-cell" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                        {depth > 0 && <span className="sub-arrow" aria-hidden="true">↳</span>}
                        <span>
                          <button type="button" className="svc-name-btn" onClick={() => setDetailId(p.id)}>
                            {lt(p.name)}
                          </button>
                          {via && <span className="supplier-under">{f(m.suppliers.under, { name: lt(nodesById[via].name) })}</span>}
                        </span>
                      </span>
                    </th>
                    <td data-label={m.suppliers.colLevel}>{rank}</td>
                    <td data-label={m.criticality.label}>
                      <CriticalityBadge value={p.criticality} />
                    </td>
                    <td data-label={m.suppliers.colServices}>{services[p.id].length}</td>
                    <td data-label={m.exitPlan.label}>
                      {isDirect && p.exitPlan ? (
                        <ExitPlanBadge value={p.exitPlan} />
                      ) : (
                        <span className="muted">{p.directContract ? m.suppliers.seeLevel1 : m.suppliers.noContract}</span>
                      )}
                    </td>
                    <td data-label={m.substitutability.label}>
                      {isDirect && p.substitutability ? <SubstitutabilityBadge value={p.substitutability} /> : <span className="muted">–</span>}
                    </td>
                    <td data-label={m.suppliers.colAssessed}>{dateCell(p.lastAssessed, isDirect, true)}</td>
                    <td data-label={m.suppliers.colTested}>{dateCell(p.exitTested, isDirect, false)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {detailId && (
        <DetailDialog onClose={() => setDetailId(null)} label={m.detail.close}>
          <NodeDetail nodeId={detailId} result={result} onSelect={setDetailId} onClose={() => setDetailId(null)} />
        </DetailDialog>
      )}
    </div>
  );
}
