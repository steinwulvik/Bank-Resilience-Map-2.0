import type { ReactNode } from 'react';
import type { Criticality, ExitPlanStatus, FindingStatus, NodeKind, OperationalStatus, Substitutability, Validity } from '../data/types';
import type { NodeImpact } from '../engine/impact';
import { useI18n, type I18n } from '../i18n';

export function impactLabel(imp: NodeImpact | undefined, i: I18n): string {
  const m = i.m.impact;
  if (!imp) return m.none;
  if (imp.uncertain) return imp.level === 'outage' ? m.possibleOutage : m.possibleDegraded;
  return imp.level === 'outage' ? m.outage : m.degraded;
}

/** CSS-klasse for påvirkning. Usikkerhet vises både med farge, stiplet ramme og tekst. */
export function impactClass(imp: NodeImpact | undefined): string {
  if (!imp) return 'impact-none';
  return `impact-${imp.level}${imp.uncertain ? ' impact-uncertain' : ''}`;
}

const ICONS: Record<NodeKind, string> = {
  channel: 'M4 5h16v11H4z M9 20h6 M12 16v4',
  service: 'M4 7h16v10H4z M4 11h16',
  system: 'M5 4h14v6H5z M5 14h14v6H5z M8 7h.01 M8 17h.01',
  provider: 'M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.7-1.4A4 4 0 0 1 17 18z',
};

export function KindIcon({ kind, size = 16 }: { kind: NodeKind; size?: number }) {
  return (
    <svg className="kind-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KindTag({ kind }: { kind: NodeKind }) {
  const { m } = useI18n();
  return (
    <span className={`kind-tag kind-${kind}`}>
      <KindIcon kind={kind} size={14} />
      {m.kinds[kind]}
    </span>
  );
}

export function CriticalityBadge({ value }: { value: Criticality }) {
  const { m } = useI18n();
  return (
    <span className={`badge crit-${value}`} title={m.criticality.label}>
      {m.criticality[value]}
    </span>
  );
}

export function StatusBadge({ value }: { value: OperationalStatus }) {
  const { m } = useI18n();
  return <span className={`badge status-${value}`}>{m.status[value]}</span>;
}

export function ValidityBadge({ value }: { value: Validity }) {
  const { m } = useI18n();
  return <span className={`badge validity-${value}`}>{m.validity[value]}</span>;
}

export function ImpactBadge({ impact }: { impact: NodeImpact | undefined }) {
  const i = useI18n();
  return (
    <span className={`badge impact-badge ${impactClass(impact)}`}>
      {impact?.uncertain && <span aria-hidden="true">? </span>}
      {impactLabel(impact, i)}
    </span>
  );
}

const EXIT_CLASS: Record<ExitPlanStatus, string> = { exists: 'status-operational', inProgress: 'status-degraded', missing: 'crit-critical' };
const SUBST_CLASS: Record<Substitutability, string> = { easy: 'crit-medium', hard: 'status-degraded', notPossible: 'crit-critical' };

export function ExitPlanBadge({ value }: { value: ExitPlanStatus }) {
  const { m } = useI18n();
  return <span className={`badge ${EXIT_CLASS[value]}`}>{m.exitPlan[value]}</span>;
}

export function SubstitutabilityBadge({ value }: { value: Substitutability }) {
  const { m } = useI18n();
  return <span className={`badge ${SUBST_CLASS[value]}`}>{m.substitutability[value]}</span>;
}

const FINDING_CLASS: Record<FindingStatus, string> = { open: 'crit-critical', inProgress: 'status-degraded', closed: 'status-operational' };

export function FindingStatusBadge({ value }: { value: FindingStatus }) {
  const { m } = useI18n();
  return <span className={`badge ${FINDING_CLASS[value]}`}>{m.findingStatus[value]}</span>;
}

export function SyntheticTag() {
  const { m } = useI18n();
  return <span className="badge synthetic-tag">{m.concept.synthetic}</span>;
}

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1 id="page-title" tabIndex={-1}>
          {title}
        </h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
}
