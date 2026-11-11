import { useEffect, useState } from 'react';
import { dataset, nodesById, regionName, scenariosById } from '../data';
import type { Provider, ScenarioParams } from '../data/types';
import { useI18n } from '../i18n';
import { navigate } from '../router';
import { scenarioStartFromNow, useDemo, type RunMode } from '../state/demo';
import { FlowSteps } from '../components/FlowSteps';
import { PageHeader, SyntheticTag } from '../components/ui';
import { Flag } from '../components/Flag';

export default function ScenarioPage({ query }: { query: URLSearchParams }) {
  const { m, lt, duration, dateTime } = useI18n();
  const { state, runScenario } = useDemo();

  const [scenarioId, setScenarioId] = useState(state.scenarioId ?? dataset.scenarios[0].id);
  // 2.0: «Start en øvelse» på «Øvelser og funn» åpner skjemaet med øvelse valgt.
  const [mode, setMode] = useState<RunMode>(query.get('mode') === 'ovelse' ? 'exercise' : state.mode);
  const template = scenariosById[scenarioId];
  const [params, setParams] = useState<ScenarioParams>(
    state.scenarioId === scenarioId && state.params ? state.params : template.defaults,
  );

  useEffect(() => {
    setParams(state.scenarioId === scenarioId && state.params ? state.params : scenariosById[scenarioId].defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  // Berørte land er forhåndsbestemt: alle land leverandøren driver i.
  const regionsFor = (id: string) => {
    const n = nodesById[id];
    return n.kind === 'provider' ? [...(n as Provider).regions] : [];
  };
  const affectedRegions = regionsFor(params.targetId);
  // Valgbare komponenter hentes fra datasettet, slik at alt som vises i kartet også kan velges her:
  // alle leverandører ved leverandørsvikt og alle systemer ved feil etter systemendring.
  const targetKind = template.failureType === 'regionalProviderOutage' ? 'provider' : 'system';
  const targetOptions = dataset.nodes.filter((n) => n.kind === targetKind).map((n) => n.id);
  const isCurrent =
    state.scenarioId === scenarioId &&
    state.mode === mode &&
    JSON.stringify(state.params) === JSON.stringify({ ...params, regions: affectedRegions });

  const set = (patch: Partial<ScenarioParams>) => setParams((p) => ({ ...p, ...patch }));
  const setTarget = (id: string) => set({ targetId: id, regions: regionsFor(id) });
  const startTime =
    state.scenarioId === scenarioId && state.startedAt ? new Date(state.startedAt) : scenarioStartFromNow(scenarioId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    runScenario(scenarioId, { ...params, regions: affectedRegions }, mode);
    navigate('analysis');
  };

  return (
    <div className="page">
      <PageHeader title={m.meta.appName}>
        <SyntheticTag />
      </PageHeader>
      <FlowSteps current="scenario" />

      <form className="card scenario-form" onSubmit={submit}>
        <fieldset>
          <legend>{m.scenario.chooseTemplate}</legend>
          <div className="radio-cards">
            {dataset.scenarios.map((sc) => (
              <label key={sc.id} className={`radio-card ${sc.id === scenarioId ? 'on' : ''}`}>
                <input
                  type="radio"
                  name="scenario"
                  value={sc.id}
                  checked={sc.id === scenarioId}
                  onChange={() => setScenarioId(sc.id)}
                />
                <span>
                  <strong>{lt(sc.title)}</strong>
                  <span className="muted">{lt(sc.summary)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="sc-target">
            {template.failureType === 'regionalProviderOutage' ? m.scenario.targetProvider : m.scenario.target}
          </label>
          <select
            id="sc-target"
            value={params.targetId}
            onChange={(e) => setTarget(e.target.value)}
            disabled={targetOptions.length < 2}
          >
            {targetOptions.map((id) => (
              <option key={id} value={id}>
                {lt(nodesById[id].name)}
              </option>
            ))}
          </select>
        </div>

        {affectedRegions.length > 0 && (
          <div className="field">
            <span className="field-label" id="sc-regions">{m.scenario.regions}</span>
            <ul className="country-list" aria-labelledby="sc-regions">
              {affectedRegions.map((r) => (
                <li key={r} className="country">
                  <Flag code={r} />
                  {lt(regionName(r))}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <label htmlFor="sc-severity">{m.scenario.severity}</label>
          <select
            id="sc-severity"
            className="select-narrow"
            value={params.severity}
            onChange={(e) => set({ severity: e.target.value as ScenarioParams['severity'] })}
          >
            <option value="outage">{m.scenario.severityOutage}</option>
            <option value="degraded">{m.scenario.severityDegraded}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="sc-duration">{m.scenario.duration}</label>
          <select
            id="sc-duration"
            className="select-narrow"
            value={params.durationMinutes}
            onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
          >
            {template.durationOptions.map((d) => (
              <option key={d} value={d}>
                {duration(d)}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="field">
          <legend className="field-label">{m.scenario.mode}</legend>
          <div className="segmented segmented-fit">
            {(['incident', 'exercise'] as RunMode[]).map((md) => (
              <label key={md} className={mode === md ? 'on' : ''}>
                <input type="radio" name="run-mode" checked={mode === md} onChange={() => setMode(md)} />
                {md === 'incident' ? m.scenario.modeIncident : m.scenario.modeExercise}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="muted small">
          {m.scenario.start}: {dateTime(startTime)}
        </p>

        <button type="submit" className="btn btn-primary btn-large">
          {state.scenarioId === scenarioId && state.mode === mode && !isCurrent ? m.scenario.update : m.scenario.run}
        </button>
      </form>
    </div>
  );
}
