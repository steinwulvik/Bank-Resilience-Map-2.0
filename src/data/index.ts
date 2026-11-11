import raw from './morild-bank.json';
import type { Dataset, GraphNode, LocalizedText, ScenarioTemplate } from './types';

/** Det syntetiske datasettet for Morild Bank. */
export const dataset = raw as unknown as Dataset;

export const nodesById: Record<string, GraphNode> = Object.fromEntries(dataset.nodes.map((n) => [n.id, n]));

export const dependenciesById = Object.fromEntries(dataset.dependencies.map((d) => [d.id, d]));

export const scenariosById: Record<string, ScenarioTemplate> = Object.fromEntries(
  dataset.scenarios.map((s) => [s.id, s]),
);

export const kindOrder = ['channel', 'service', 'system', 'provider'] as const;

/** Visningsnavn for et land/en region; brukes med `lt(...)` fra språkoppsettet. */
export const regionName = (r: string): LocalizedText => dataset.regionNames[r] ?? { no: r };
