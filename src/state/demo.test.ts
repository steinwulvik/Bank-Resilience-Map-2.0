import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize } from './demo';

test('2.0-felter: gyldige verdier beholdes, også uten valgt scenario', () => {
  const s = sanitize({
    changeChecks: { 'CHG-2026-121': [0, 2, 2] },
    changeLog: [{ id: 'a', changeId: 'CHG-2026-121', at: '2026-11-07T10:00:00Z', outcome: 'rejected', reason: 'Høy risiko', role: 'Endringsansvarlig' }],
    userExercises: [{ id: 'EX-DEMO-1', scenarioId: 'sky-region', startedAt: '2026-11-07T09:00:00Z' }],
    userFindings: [{ id: 'F-DEMO-1', title: 'Mangler kontaktliste', exerciseId: 'EX-DEMO-1', role: 'Beredskapsleder', due: '2026-12-01' }],
    findingStatus: { 'F-01': 'closed', 'F-DEMO-1': 'inProgress' },
  });
  assert.deepEqual(s.changeChecks['CHG-2026-121'], [0, 2]);
  assert.equal(s.changeLog.length, 1);
  assert.equal(s.userExercises.length, 1);
  assert.equal(s.userFindings.length, 1);
  assert.equal(s.findingStatus['F-01'], 'closed');
  assert.equal(s.mode, 'incident');
});

test('2.0-felter: ugyldige verdier forkastes uten feil', () => {
  const s = sanitize({
    changeChecks: { 'CHG-UKJENT': [0], 'CHG-2026-121': [99, -1, 'x'] },
    changeLog: [{ changeId: 'CHG-2026-121', outcome: 'kanskje', reason: 'x', at: 'nå' }],
    userExercises: [{ id: 'EX', scenarioId: 'finnes-ikke', startedAt: '2026-11-07' }],
    userFindings: [{ id: 'F', title: 'x', exerciseId: 'EX-UKJENT', due: 'snart' }],
    findingStatus: { 'F-01': 'ferdig', 'F-99': 'closed' },
    mode: 'ukjent',
  });
  assert.equal(s.changeChecks['CHG-UKJENT'], undefined);
  assert.deepEqual(s.changeChecks['CHG-2026-121'], []);
  assert.equal(s.changeLog.length, 0);
  assert.equal(s.userExercises.length, 0);
  assert.equal(s.userFindings.length, 0);
  assert.deepEqual(s.findingStatus, {});
});
