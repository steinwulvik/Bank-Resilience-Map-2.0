import { useState } from 'react';
import { dataset, nodesById } from '../data';
import type { Service } from '../data/types';
import { coverageFor, effectiveValidity } from '../engine/impact';
import { useI18n } from '../i18n';
import { useDemo } from '../state/demo';
import { CriticalityBadge, ImpactBadge, PageHeader, StatusBadge } from '../components/ui';
import { NodeDetail } from '../components/NodeDetail';
import { DetailDialog } from '../components/DetailDialog';

/**
 * Hva et klikk på tjenestenavnet gjør:
 * 'A' = navnet er vanlig tekst. 'B' = navnet åpner detaljpanelet for tjenesten i et vindu.
 */
const NAME_MODE: 'A' | 'B' = 'B';

export default function OverviewPage() {
  const { m, f, lt, duration } = useI18n();
  const { result } = useDemo();
  const [detailId, setDetailId] = useState<string | null>(null);

  // Tjenestene vises alltid alfabetisk etter navn.
  const services = dataset.nodes
    .filter((n): n is Service => n.kind === 'service')
    .sort((a, b) => lt(a.name).localeCompare(lt(b.name), m.meta.locale));
  const critical = services.filter((s) => s.criticality === 'critical').length;
  const deviations = services.filter((s) => s.status !== 'operational').length;
  const validities = dataset.dependencies.map((d) => effectiveValidity(d, dataset.asOf, dataset.staleAfterDays));
  const confirmed = validities.filter((v) => v === 'confirmed').length;
  const coveragePct = Math.round((confirmed / dataset.dependencies.length) * 100);
  const gaps =
    validities.filter((v) => v !== 'confirmed').length +
    dataset.dependencies.filter((d) => {
      const to = nodesById[d.to];
      return to.kind === 'provider' && to.regions.length > 0 && d.regions === undefined;
    }).length +
    dataset.nodes.reduce((n, x) => n + (x.dataGaps?.length ?? 0), 0);


  return (
    <div className="page">
      <PageHeader title={m.overview.title} lead={m.overview.lead} />

      <section className="kpis" aria-label={m.overview.title}>
        <div className="kpi">
          <span className="kpi-value">{critical}</span>
          <span className="kpi-label">{m.overview.kpiCritical}</span>
        </div>
        <div className={`kpi kpi-accent kpi-dev${deviations === 0 ? ' kpi-zero' : ''}`}>
          <span className="kpi-value">{deviations}</span>
          <span className="kpi-label">{m.overview.kpiDeviations}</span>
        </div>
        <div className="kpi kpi-accent kpi-cov">
          <span className="kpi-value">{coveragePct} %</span>
          <span className="kpi-label">{m.overview.kpiCoverage}</span>
          <span
            className="kpi-bar"
            role="img"
            aria-label={f(m.overview.coverageValue, { confirmed, total: dataset.dependencies.length })}
          >
            <span style={{ width: `${coveragePct}%` }} />
          </span>
        </div>
        <div className="kpi kpi-accent kpi-gap">
          <span className="kpi-value">{gaps}</span>
          <span className="kpi-label">{m.overview.kpiGaps}</span>
        </div>
      </section>

      <section className="card">
        <h2>{m.overview.servicesTitle}</h2>
        <div className="table-scroll">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th scope="col">{m.overview.colService}</th>
              <th scope="col">{m.criticality.label}</th>
              <th scope="col">{m.overview.colOwner}</th>
              <th scope="col">{m.status.label}</th>
              <th scope="col">{m.overview.colRto}</th>
              <th scope="col">{m.overview.colCoverage}</th>
              {result && <th scope="col">{m.nav.analysis}</th>}
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const cov = coverageFor(dataset, s.id);
              const flags = (['assumed', 'stale', 'regionUnknown'] as const)
                .filter((k) => cov[k] > 0)
                .map((k) => f(m.overview.coverageFlags[k], { n: cov[k] }));
              return (
                <tr key={s.id}>
                  <th scope="row" data-label={m.overview.colService}>
                    {NAME_MODE === 'B' ? (
                      <button type="button" className="svc-name-btn" onClick={() => setDetailId(s.id)}>
                        {lt(s.name)}
                      </button>
                    ) : (
                      <span className="svc-name">{lt(s.name)}</span>
                    )}
                  </th>
                  <td data-label={m.criticality.label}>
                    <CriticalityBadge value={s.criticality} />
                  </td>
                  <td data-label={m.overview.colOwner}>{lt(s.owner)}</td>
                  <td data-label={m.status.label}>
                    <StatusBadge value={s.status} />
                  </td>
                  <td data-label={m.overview.colRto}>{duration(s.rtoMinutes)}</td>
                  <td data-label={m.overview.colCoverage}>
                    <span>{f(m.overview.coverageValue, { confirmed: cov.confirmed, total: cov.total })}</span>
                    {flags.length > 0 && <span className="coverage-flags">{flags.join(' · ')}</span>}
                  </td>
                  {result && (
                    <td data-label={m.nav.analysis}>
                      <ImpactBadge impact={result.impacts[s.id]} />
                    </td>
                  )}
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
