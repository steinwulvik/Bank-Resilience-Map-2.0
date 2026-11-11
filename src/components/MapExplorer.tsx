import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataset, kindOrder, nodesById } from '../data';
import type { Criticality, NodeKind } from '../data/types';
import { useI18n } from '../i18n';
import { cleanSearch, SEARCH_MAX } from '../lib/text';
import { useDemo } from '../state/demo';
import type { ImpactResult } from '../engine/impact';
import { BAND_ORDER, DependencyMap } from './DependencyMap';
import { NodeDetail } from './NodeDetail';
import { ImpactBadge, KindIcon } from './ui';

const SMALL = '(max-width: 760px)';

function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/**
 * Avhengighetskartet med filtre og detaljpanel. Vises i påvirkningsanalysen under «Kart».
 * Valgt objekt styres utenfra (ligger i adressen, så lenker kan deles og tåler oppfrisking).
 */
export function MapExplorer({
  selected,
  select,
  result: override,
  defaultImpactOnly = true,
  impactOnly: impactOnlyOverride,
}: {
  selected: string | null;
  select: (id: string | null) => void;
  /** Om kartet starter med bare berørte objekter (standard) eller hele kartet (brukes i veiledningen). */
  defaultImpactOnly?: boolean;
  /** Styrer «Bare berørte» utenfra (veiledningen). */
  impactOnly?: boolean;
  /** 2.0: vis en annen beregning enn det aktive scenarioet (f.eks. en planlagt endring). */
  result?: ImpactResult | null;
}) {
  const { m, f, lt } = useI18n();
  const demo = useDemo();
  const result = override !== undefined ? override : demo.result;
  const selectedId = selected && nodesById[selected] ? selected : null;

  // Kart på PC og nettbrett. Liste med egen detaljvisning bare på små skjermer (SPEC §10).
  const small = useMediaQuery(SMALL);
  const [search, setSearch] = useState('');
  const [kinds, setKinds] = useState<Set<NodeKind>>(new Set(kindOrder));
  const [crit, setCrit] = useState<Criticality | 'all'>('all');
  // Standard: bare objekter som rammes av scenarioet.
  const [impactOnlyState, setImpactOnly] = useState(defaultImpactOnly);
  const impactOnly = impactOnlyOverride ?? impactOnlyState;
  const onSelect = useCallback(
    (id: string) => {
      select(id);
      // På små skjermer erstatter detaljene listen; start øverst.
      if (window.matchMedia?.(SMALL).matches) document.querySelector('.map-explorer')?.scrollIntoView({ block: 'start' });
    },
    [select],
  );

  /**
   * Prosessen i fokus: alt det valgte objektet avhenger av (hele kjeden nedover) og de som bruker
   * det direkte. Boksene farges etter tilstand, så det som faller ut og det som fungerer, synes.
   */
  const process = useMemo(() => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    if (!selectedId) return { nodes, edges };
    nodes.add(selectedId);
    const stack = [selectedId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const d of dataset.dependencies) {
        if (d.from !== id || edges.has(d.id)) continue;
        edges.add(d.id);
        if (!nodes.has(d.to)) {
          nodes.add(d.to);
          stack.push(d.to);
        }
      }
    }
    for (const d of dataset.dependencies) {
      if (d.to === selectedId) {
        edges.add(d.id);
        nodes.add(d.from);
      }
    }
    return { nodes, edges };
  }, [selectedId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return new Set(
      dataset.nodes
        .filter((n) => kinds.has(n.kind))
        .filter((n) => crit === 'all' || n.criticality === crit)
        // Prosessen til valgt objekt vises alltid i sin helhet, også delene som fungerer.
        .filter((n) => !impactOnly || !!result?.impacts[n.id] || process.nodes.has(n.id))
        .filter((n) => !q || lt(n.name).toLowerCase().includes(q) || lt(n.description).toLowerCase().includes(q))
        .map((n) => n.id),
    );
  }, [search, kinds, crit, impactOnly, result, lt, process]);

  // Med et beregnet scenario og uten valgt objekt farges hele kartet etter tilstand
  // (samme fargeoppsett som når en prosess er i fokus). Med valgt objekt fremheves bare prosessen.
  const focusAll = !selectedId && !!result;
  const highlight = useMemo(
    () =>
      focusAll
        ? { nodes: new Set(dataset.nodes.map((n) => n.id)), edges: new Set(dataset.dependencies.map((d) => d.id)) }
        : process,
    [focusAll, process],
  );


  const toggleKind = (k: NodeKind) =>
    setKinds((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const filtersActive = search !== '' || kinds.size !== kindOrder.length || crit !== 'all' || !impactOnly;
  const clear = () => {
    setSearch('');
    setKinds(new Set(kindOrder));
    setCrit('all');
    setImpactOnly(true);
  };

  return (
    <div className="map-explorer">

      {!(small && selectedId) && (
      <>
      <form className="filters" onSubmit={(e) => e.preventDefault()} role="search">
        <div className="field">
          <label htmlFor="map-search">{m.map.search}</label>
          <input
            id="map-search"
            type="search"
            value={search}
            maxLength={SEARCH_MAX}
            autoComplete="off"
            spellCheck={false}
            placeholder={m.map.searchPlaceholder}
            onChange={(e) => setSearch(cleanSearch(e.target.value))}
          />
        </div>
        <fieldset className="field">
          <legend>{m.map.filterKind}</legend>
          <div className="chip-row">
            {BAND_ORDER.map((k) => (
              <label key={k} className={`chip ${kinds.has(k) ? 'on' : ''}`}>
                <input type="checkbox" checked={kinds.has(k)} onChange={() => toggleKind(k)} />
                <KindIcon kind={k} size={14} />
                {m.kindsPlural[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="map-crit">{m.map.filterCriticality}</label>
          <select id="map-crit" value={crit} onChange={(e) => setCrit(e.target.value as Criticality | 'all')}>
            <option value="all">{m.map.all}</option>
            <option value="critical">{m.criticality.critical}</option>
            <option value="high">{m.criticality.high}</option>
            <option value="medium">{m.criticality.medium}</option>
          </select>
        </div>
        {result && (
          <label className={`chip chip-toggle ${impactOnly ? 'on' : ''}`}>
            <input type="checkbox" checked={impactOnly} onChange={(e) => setImpactOnly(e.target.checked)} />
            {m.map.onlyImpacted}
          </label>
        )}
        {filtersActive && (
          <button type="button" className="link-button" onClick={clear}>
            {m.map.clearFilters}
          </button>
        )}
      </form>
      <p className="muted small" aria-live="polite">
        {visible.size === 0 ? m.map.noMatches : f(m.map.shown, { n: visible.size })}
      </p>
      </>
      )}

      {small ? (
        selectedId ? (
          <div className="mobile-detail">
            <button type="button" className="link-button back-to-list" onClick={() => select(null)}>
              ← {m.map.backToList}
            </button>
            <NodeDetail nodeId={selectedId} result={result} onSelect={onSelect} onClose={() => select(null)} />
          </div>
        ) : (
            <div className="entity-list">
              {BAND_ORDER.map((k) => {
                // Mest berørte øverst i hver gruppe; ellers rekkefølgen i datasettet.
                const rank = (id: string) => {
                  const imp = result?.impacts[id];
                  if (!imp) return 4;
                  return (imp.level === 'outage' ? 0 : 2) + (imp.uncertain ? 1 : 0);
                };
                const items = dataset.nodes
                  .filter((n) => n.kind === k && visible.has(n.id))
                  .sort((a, b) => rank(a.id) - rank(b.id));
                if (!items.length) return null;
                return (
                  <section key={k}>
                    <h2 className="list-heading">
                      <KindIcon kind={k} /> {m.kindsPlural[k]}
                    </h2>
                    <ul>
                      {items.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={`list-item ${n.id === selectedId ? 'is-selected' : ''}`}
                            aria-pressed={n.id === selectedId}
                            onClick={() => onSelect(n.id)}
                          >
                            <span className="list-text">
                              <span className="list-name">{lt(n.name)}</span>
                              <span className="list-sub">
                                {m.kinds[n.kind]} · {m.criticality[n.criticality]}
                              </span>
                            </span>
                            {result?.impacts[n.id] && <ImpactBadge impact={result.impacts[n.id]} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
        )
      ) : (
        <div className={`map-layout ${selectedId ? 'has-detail' : ''}`}>
          <div className="map-main">
            <DependencyMap
              result={result}
              selectedId={selectedId}
              visible={visible}
              highlight={highlight}
              focusAll={focusAll}
              onSelect={onSelect}
            />
            <details className="legend">
              <summary>{m.map.legendTitle}</summary>
              <ul>
                <li>{m.map.legendArrow}</li>
                {result && (
                  <li>
                    <span className="legend-swatches">
                      <span className="swatch swatch-outage">{m.impact.outage}</span>
                      <span className="swatch swatch-possible">{m.impact.possibleOutage}</span>
                      <span className="swatch swatch-degraded">{m.impact.degraded}</span>
                      <span className="swatch swatch-ok">{m.map.legendOk}</span>
                      <span className="swatch swatch-other">{m.map.legendOther}</span>
                    </span>
                  </li>
                )}
                {result && <li>{m.map.legendArrowColor}</li>}
                <li>{m.map.legendDashed}</li>
                <li>{m.map.legendSelect}</li>
                <li>{m.map.zoomHint}</li>
              </ul>
            </details>
          </div>
          <aside className="map-aside" aria-label={m.detail.dependsOn}>
            {selectedId ? (
              <NodeDetail nodeId={selectedId} result={result} onSelect={onSelect} onClose={() => select(null)} />
            ) : (
              <p className="muted select-hint">{m.map.selectHint}</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
