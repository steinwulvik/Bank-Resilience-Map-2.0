import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/morild-bank.json' with { type: 'json' };
import type { Dataset, ScenarioParams } from '../data/types';
import { computeImpact, coverageFor, effectiveValidity, primaryPath } from './impact';

const ds = data as unknown as Dataset;
const sky = (regions: string[], durationMinutes = 240): ScenarioParams => ({
  targetId: 'prv-nimbus', regions, severity: 'outage', durationMinutes,
});

test('datasettet oppfyller minstekravene i D-02 og er merket syntetisk', () => {
  const count = (k: string) => ds.nodes.filter((n) => n.kind === k).length;
  assert.ok(count('service') >= 6);
  assert.ok(count('system') >= 10);
  assert.ok(count('provider') >= 4);
  assert.ok(ds.nodes.every((n) => n.synthetic === true));
  assert.ok(ds.dependencies.every((d) => d.synthetic === true));
  assert.ok(ds.scenarios.every((s) => s.synthetic === true));
});

test('alle relasjoner peker på objekter som finnes', () => {
  const ids = new Set(ds.nodes.map((n) => n.id));
  for (const d of ds.dependencies) {
    assert.ok(ids.has(d.from), d.id);
    assert.ok(ids.has(d.to), d.id);
  }
});

test('Bortfall i Norge: system bare i Norge får bortfall, aktiv-aktiv blir redusert', () => {
  const r = computeImpact(ds, sky(['no']));
  assert.equal(r.impacts['sys-api'].level, 'outage');
  assert.equal(r.impacts['sys-api'].uncertain, false);
  assert.equal(r.impacts['sys-iam'].level, 'degraded');
  assert.deepEqual(r.impacts['sys-iam'].causes[0].notes, ['partialRegion']);
  assert.equal(r.impacts['sys-dwh'], undefined, 'datavarehuset kjører bare i Sverige');
});

test('indirekte påvirkning følger harde relasjoner og myke relasjoner gir redusert', () => {
  const r = computeImpact(ds, sky(['no']));
  assert.equal(r.impacts['svc-accounts'].level, 'outage');
  assert.equal(r.impacts['svc-accounts'].direct, false);
  assert.equal(r.impacts['ch-mobile'].level, 'outage'); // via mobilbank-backend
  // Kundesenteret: myk relasjon til kontooversikt gir bare redusert …
  const viaAccounts = r.impacts['ch-contact'].causes.find((c) => c.viaNodeId === 'svc-accounts')!;
  assert.equal(viaAccounts.level, 'degraded');
  assert.deepEqual(viaAccounts.notes, ['soft']);
  // … men den usikre harde relasjonen via CRM-leverandøren gir mulig bortfall.
  assert.equal(r.impacts['ch-contact'].level, 'outage');
  assert.equal(r.impacts['ch-contact'].uncertain, true);
  assert.deepEqual(primaryPath(r, 'svc-accounts'), ['svc-accounts', 'sys-api', 'prv-nimbus']);
});

test('ukjent region gir mulig bortfall merket som usikkert og registrert datamangel', () => {
  const r = computeImpact(ds, sky(['se']));
  const notify = r.impacts['sys-notify'];
  assert.equal(notify.level, 'outage');
  assert.equal(notify.uncertain, true);
  assert.ok(r.gaps.some((g) => g.reason === 'regionUnknown' && g.dependencyId === 'sys-notify__prv-nimbus'));
});

test('antatt fjerdepartsrelasjon gir usikker påvirkning, ikke stilltiende sikker', () => {
  const r = computeImpact(ds, sky(['no']));
  assert.equal(r.impacts['prv-saksflyt'].uncertain, true);
  assert.equal(r.impacts['svc-support'].uncertain, true);
  assert.ok(r.gaps.some((g) => g.reason === 'assumed' && g.dependencyId === 'prv-saksflyt__prv-nimbus'));
});

test('utdatert relasjon merkes som usikker', () => {
  assert.equal(
    effectiveValidity(ds.dependencies.find((d) => d.id === 'sys-aml__sys-dwh')!, ds.asOf, ds.staleAfterDays),
    'stale',
  );
  const r = computeImpact(ds, sky(['se']));
  assert.equal(r.impacts['svc-aml'].level, 'outage');
  assert.equal(r.impacts['svc-aml'].uncertain, true);
});

test('sikker relasjon vinner over usikker på samme nivå', () => {
  // Lånesøknad: sikker via lånemotor og usikker via antatt relasjon fra kredittvurdering.
  const r = computeImpact(ds, sky(['no']));
  assert.equal(r.impacts['svc-loans'].level, 'outage');
  assert.equal(r.impacts['svc-loans'].uncertain, false);
  assert.equal(r.impacts['svc-loans'].causes[0].viaNodeId, 'sys-loan');
});

test('RTO overskrides bare når varigheten er lengre enn gjenopprettingsmålet', () => {
  assert.equal(computeImpact(ds, sky(['no'], 60)).impacts['svc-payments'].rtoExceeded, false);
  assert.equal(computeImpact(ds, sky(['no'], 240)).impacts['svc-payments'].rtoExceeded, true);
});

test('mislykket endring i betalingsmotoren rammer betaling, ikke kort', () => {
  const r = computeImpact(ds, { targetId: 'sys-pay', regions: [], severity: 'outage', durationMinutes: 120 });
  assert.equal(r.impacts['svc-payments'].level, 'outage');
  assert.equal(r.impacts['ch-mobile'].level, 'degraded');
  assert.equal(r.impacts['svc-cards'], undefined);
});

test('redusert ytelse gir aldri bortfall oppover', () => {
  const r = computeImpact(ds, { targetId: 'sys-api', regions: [], severity: 'degraded', durationMinutes: 120 });
  assert.ok(Object.values(r.impacts).every((i) => i.level === 'degraded'));
});

test('datadekning teller utdaterte, antatte og manglende regioner', () => {
  const cov = coverageFor(ds, 'svc-notify');
  // Varslingstjenesten (2025) og underleverandøren til SMS-Linje (2024, lagt til i 2.0).
  assert.equal(cov.stale, 2);
  assert.equal(cov.regionUnknown, 1);
  const support = coverageFor(ds, 'svc-support');
  assert.ok(support.assumed >= 1);
});
