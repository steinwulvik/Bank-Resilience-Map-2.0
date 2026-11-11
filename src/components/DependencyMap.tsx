import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { dataset, kindOrder } from '../data';
import type { GraphNode, NodeKind } from '../data/types';
import { effectiveValidity, type ImpactResult, type NodeImpact } from '../engine/impact';
import { useI18n } from '../i18n';
import { impactClass, impactLabel, KindIcon } from './ui';

const W = 200;
const FOCUS_COLORS: Record<string, string> = {
  outage: '#b42318',
  degraded: '#e07b00',
  uncertain: '#b42318',
  ok: '#16794a',
};
const H = 62;

/** Rekkefølgen på feltene i kartet, fra venstre mot høyre (samme vei som pilene). */
export const BAND_ORDER: NodeKind[] = ['provider', 'system', 'service', 'channel'];
const COL_GAP = 80; // vannrett luft mellom kolonner
const ROW_GAP = 18; // minste loddrette luft mellom bokser
const MAX_GAP = 160; // største loddrette luft mellom bokser
const BAND_PAD = COL_GAP / 2; // luft fra feltkant til boks
const HEADER = 44; // plass til feltoverskrift

/**
 * Lagdelt oppsett: hver objekttype får sitt eget felt (leverandører → systemer → tjenester → kanaler).
 * Innenfor et felt får objekter som avhenger av et annet objekt av samme type, en egen kolonne til
 * høyre (f.eks. Mobilbank-backend etter Integrasjonsplattform). Rekkefølgen ovenfra og ned velges
 * slik at pilene krysser hverandre minst mulig. Beregnes på nytt når filtrene endrer hva som vises,
 * så kartet alltid er kompakt.
 */
function computeLayout(ids: Set<string>, aspect: number) {
  const nodesIn = dataset.nodes.filter((n) => ids.has(n.id));
  const depsIn = dataset.dependencies.filter((d) => ids.has(d.from) && ids.has(d.to));
  const byId = Object.fromEntries(nodesIn.map((n) => [n.id, n]));
  // Kolonne innenfor feltet: lengste kjede av avhengigheter til objekter av samme type.
  const depth: Record<string, number> = {};
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depth[id] !== undefined) return depth[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const same = depsIn.filter((d) => d.from === id && byId[d.to].kind === byId[id].kind);
    depth[id] = same.length ? Math.max(...same.map((d) => depthOf(d.to, seen) + 1)) : 0;
    return depth[id];
  };
  nodesIn.forEach((n) => depthOf(n.id));

  // Globale kolonnenumre per felt.
  const bandCols: Record<string, number[]> = {};
  let col = 0;
  for (const k of BAND_ORDER) {
    const members = nodesIn.filter((n) => n.kind === k);
    const n = members.length ? Math.max(...members.map((x) => depth[x.id])) + 1 : 0;
    bandCols[k] = Array.from({ length: n }, (_, i) => col + i);
    col += n;
  }
  const colOf = (id: string) => bandCols[byId[id].kind][depth[id]];
  const columns: string[][] = Array.from({ length: col }, () => []);
  for (const k of BAND_ORDER) for (const n of nodesIn) if (n.kind === k) columns[colOf(n.id)].push(n.id);

  // Naboer (begge retninger) for å redusere kryssende piler.
  const neighbours: Record<string, string[]> = {};
  for (const d of depsIn) {
    (neighbours[d.from] ??= []).push(d.to);
    (neighbours[d.to] ??= []).push(d.from);
  }
  const order: Record<string, number> = {};
  const reindex = () => columns.forEach((c) => c.forEach((id, i) => (order[id] = i - (c.length - 1) / 2)));
  reindex();
  const sweep = (cols: number[]) => {
    for (const c of cols) {
      const bary = (id: string) => {
        const ns = (neighbours[id] ?? []).filter((x) => colOf(x) !== c);
        return ns.length ? ns.reduce((a, x) => a + order[x], 0) / ns.length : order[id];
      };
      columns[c].sort((a, b) => bary(a) - bary(b));
      reindex();
    }
  };
  const all = columns.map((_, i) => i);
  for (let n = 0; n < 8; n++) sweep(n % 2 ? [...all].reverse() : all);

  const tallest = Math.max(1, ...columns.map((c) => c.length));
  // Bruk høyden i kartrammen: strekk oppsettet loddrett til samme høyde/bredde-forhold som rammen,
  // så boksene får mer luft og pilene ikke går over andre bokser.
  const totalW = col * (W + COL_GAP);
  const minH = tallest * H + (tallest - 1) * ROW_GAP;
  const wantH = totalW * aspect - HEADER - BAND_PAD / 2;
  const fullH = Math.max(minH, Math.min(wantH, tallest * H + (tallest - 1) * MAX_GAP));
  const pos: Record<string, { x: number; y: number }> = {};
  columns.forEach((c, ci) => {
    // Hver kolonne fordeles jevnt over høyden (med et tak på luften), og sentreres.
    const gap = c.length > 1 ? Math.min(MAX_GAP, Math.max(ROW_GAP, (fullH - c.length * H) / (c.length - 1))) : 0;
    const colH = c.length * H + (c.length - 1) * gap;
    const top = HEADER + (fullH - colH) / 2;
    c.forEach((id, i) => (pos[id] = { x: BAND_PAD + ci * (W + COL_GAP), y: top + i * (H + gap) }));
  });

  // Bruk den ledige plassen i hver kolonne: flytt hver boks loddrett dit færrest mulig piler går
  // gjennom bokser – både andre piler gjennom denne boksen og dens egne piler gjennom andre bokser.
  // Pilene tegnes som bezierkurver, så de samples langs kurven. Rekkefølgen i kolonnen beholdes.
  const curve = (d: { from: string; to: string }) => {
    const s = pos[d.to];
    const t = pos[d.from];
    const sx = s.x + W, sy = s.y + H / 2, tx = t.x, ty = t.y + H / 2;
    const off = Math.abs(tx - sx) / 2;
    return Array.from({ length: 25 }, (_, k) => {
      const u = k / 24, v = 1 - u;
      return {
        x: v * v * v * sx + 3 * v * v * u * (sx + off) + 3 * v * u * u * (tx - off) + u * u * u * tx,
        y: v * v * v * sy + 3 * v * v * u * sy + 3 * v * u * u * ty + u * u * u * ty,
      };
    });
  };
  const inBox = (p: { x: number; y: number }, b: { x: number; y: number }) =>
    p.x > b.x - 4 && p.x < b.x + W + 4 && p.y > b.y - 6 && p.y < b.y + H + 6;
  const placed = Object.keys(pos);
  // Kurvene til piler som ikke berøres av flyttingen, mellomlagres.
  const cache = depsIn.map(curve);
  const touching = (id: string) => depsIn.map((_, k) => k).filter((k) => depsIn[k].from === id || depsIn[k].to === id);
  const localCost = (id: string, mine: number[]) => {
    let n = 0;
    depsIn.forEach((d, k) => {
      if (mine.includes(k)) {
        const pts = curve(d);
        for (const o of placed) if (o !== d.from && o !== d.to && pts.some((p) => inBox(p, pos[o]))) n++;
      } else if (cache[k].some((p) => inBox(p, pos[id]))) n++;
    });
    return n;
  };
  for (let pass = 0; pass < 2; pass++)
    columns.forEach((c, ci) => {
      const x0 = BAND_PAD + ci * (W + COL_GAP);
      c.forEach((id, i) => {
        const minY = i ? pos[c[i - 1]].y + H + ROW_GAP : HEADER;
        const maxY = i < c.length - 1 ? pos[c[i + 1]].y - H - ROW_GAP : HEADER + fullH - H;
        const want = pos[id].y;
        const mine = touching(id);
        let best = want;
        let bestCost = localCost(id, mine) * 1000;
        for (let y = minY; y <= maxY; y += 8) {
          pos[id] = { x: x0, y };
          const cost = localCost(id, mine) * 1000 + Math.abs(y - want);
          if (cost < bestCost) [best, bestCost] = [y, cost];
        }
        pos[id] = { x: x0, y: best };
        for (const k of mine) cache[k] = curve(depsIn[k]);
      });
    });
  const bandBoxes = BAND_ORDER.filter((k) => bandCols[k].length).map((k) => {
    const first = bandCols[k][0];
    const last = bandCols[k][bandCols[k].length - 1];
    return { kind: k, x: first * (W + COL_GAP), width: (last - first + 1) * (W + COL_GAP) };
  });
  return { layout: pos, bands: bandBoxes, height: HEADER + fullH + BAND_PAD / 2 };
}

type EntityData = {
  node: GraphNode;
  impact?: NodeImpact;
  scenario: boolean;
  selected: boolean;
  highlighted: boolean;
  onSelect: (id: string) => void;
};

type EntityNode = Node<EntityData, 'entity'>;

const EntityNodeView = memo(function EntityNodeView({ data }: NodeProps<EntityNode>) {
  const i = useI18n();
  const { node, impact, scenario, selected, highlighted, onSelect } = data;
  const cls = [
    'entity',
    `kind-${node.kind}`,
    scenario ? impactClass(impact) : '',
    selected ? 'is-selected' : '',
    highlighted ? 'is-highlighted' : '',
  ].join(' ');
  const status = scenario ? impactLabel(impact, i) : '';
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button
        type="button"
        className={cls}
        onClick={() => onSelect(node.id)}
        aria-pressed={selected}
        data-node-id={node.id}
        aria-label={`${i.m.kinds[node.kind]}: ${i.lt(node.name)}. ${i.m.criticality[node.criticality]}.${status ? ` ${status}.` : ''}`}
      >
        <span className="entity-kind">
          <KindIcon kind={node.kind} size={13} />
          {i.m.kinds[node.kind]}
          {node.criticality === 'critical' && <span className="entity-crit">· {i.m.criticality.critical}</span>}
        </span>
        <span className="entity-name">{i.lt(node.name)}</span>
        {scenario && impact && (
          <span className="entity-impact">
            {impact.uncertain && '? '}
            {status}
          </span>
        )}
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </>
  );
});

type BandData = { kind: NodeKind; label: string; index: number };
type BandNode = Node<BandData, 'band'>;

/** Bakgrunnsfelt med overskrift for én objekttype. Rent visuelt (skjult for skjermlesere). */
const BandView = memo(function BandView({ data, width, height }: NodeProps<BandNode>) {
  return (
    <div className={`map-band band-${data.kind}${data.index % 2 ? ' band-alt' : ''}`} style={{ width, height }} aria-hidden="true">
      <span className="map-band-label">
        <KindIcon kind={data.kind} size={14} />
        {data.label}
      </span>
    </div>
  );
});

const nodeTypes = { entity: EntityNodeView, band: BandView };

interface Props {
  result: ImpactResult | null;
  selectedId: string | null;
  visible: Set<string>;
  highlight: { nodes: Set<string>; edges: Set<string> };
  onSelect: (id: string) => void;
  /** Farg hele kartet etter tilstand (ingen prosess valgt). */
  focusAll?: boolean;
}

export function DependencyMap({ result, selectedId, visible, highlight, onSelect, focusAll = false }: Props) {
  const { m } = useI18n();

  // Måler kartrammen, så oppsettet kan tilpasses høyde/bredde-forholdet.
  const frame = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(0.6);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setAspect(Math.round((r.height / r.width) * 20) / 20);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { layout, bands, height } = useMemo(() => computeLayout(visible, aspect), [visible, aspect]);
  const layoutKey = useMemo(() => `${aspect}:${[...visible].sort().join('|')}`, [visible, aspect]);

  const bandNodes: BandNode[] = useMemo(
    () =>
      bands.map((b, index) => ({
        id: `band-${b.kind}`,
        type: 'band' as const,
        position: { x: b.x, y: 0 },
        width: b.width,
        height,
        data: { kind: b.kind, label: m.kindsPlural[b.kind], index },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -1,
      })),
    [m, bands, height],
  );

  const nodes: (EntityNode | BandNode)[] = useMemo(
    () => [
      ...bandNodes,
      ...[...dataset.nodes]
        // DOM-rekkefølge styrer tabulering: kolonnevis fra venstre, ovenfra og ned.
        .sort((a, b) => {
          const pa = layout[a.id] ?? { x: 1e9, y: 0 };
          const pb = layout[b.id] ?? { x: 1e9, y: 0 };
          return pa.x - pb.x || pa.y - pb.y || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind);
        })
        .map((n) => ({
          id: n.id,
          type: 'entity' as const,
          position: layout[n.id] ?? { x: 0, y: 0 },
          hidden: !visible.has(n.id),
          data: {
            node: n,
            impact: result?.impacts[n.id],
            scenario: !!result,
            selected: n.id === selectedId,
            highlighted: highlight.nodes.has(n.id),
            onSelect,
          },
          width: W,
          height: H,
        })),
    ],
    [bandNodes, layout, result, selectedId, visible, highlight, onSelect],
  );

  const edges: Edge[] = useMemo(
    () =>
      dataset.dependencies.map((d) => {
        const validity = effectiveValidity(d, dataset.asOf, dataset.staleAfterDays);
        const cause = result?.impacts[d.from]?.causes.find((c) => c.dependencyId === d.id);
        // I fokus farges pilen etter tilstanden til objektet den kommer fra (leverandøren), så en pil aldri
        // er rød ut fra noe som fungerer: rød = bortfall eller mulig bortfall, oransje = redusert, grønn = fungerer.
        const toImp = result?.impacts[d.to];
        const focusState = !toImp ? 'ok' : toImp.level === 'degraded' ? 'degraded' : toImp.uncertain ? 'uncertain' : 'outage';
        const cls = [
          'dep-edge',
          `strength-${d.strength}`,
          validity !== 'confirmed' ? 'edge-unconfirmed' : '',
          cause ? `edge-${cause.level}` : result ? 'edge-quiet' : '',
          highlight.edges.has(d.id) ? `edge-highlight focus-${focusState}` : '',
        ].join(' ');
        return {
          id: d.id,
          // Avhengigheten (d.to) leverer til den som er avhengig (d.from).
          source: d.to,
          target: d.from,
          className: cls,
          hidden: !visible.has(d.from) || !visible.has(d.to),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            // Pilen får samme farge som streken når relasjonen ligger i den valgte stien.
            color: highlight.edges.has(d.id) ? FOCUS_COLORS[focusState] : '#14232b',
          },
          focusable: false,
          zIndex: highlight.edges.has(d.id) ? 1 : 0,
        };
      }),
    [result, visible, highlight],
  );

  return (
    <div
      ref={frame}
      className={`map-canvas${selectedId || focusAll ? ' has-selection' : ''}${focusAll && !selectedId ? ' focus-all' : ''}`}
      role="region"
      aria-label={m.map.mapAria}
    >
      <ReactFlow
        // Nytt oppsett når filtrene endrer hva som vises: tegnes på nytt og tilpasses rammen.
        key={layoutKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.04 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        preventScrolling={false}
        zoomOnDoubleClick={false}
        // Uten onNodeClick setter React Flow pointer-events: none på nodene, og museklikk når ikke fram.
        onNodeClick={(_, n) => onSelect(n.id)}
        attributionPosition="bottom-left"
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
