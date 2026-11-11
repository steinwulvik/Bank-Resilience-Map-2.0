import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/morild-bank.json' with { type: 'json' };
import type { Dataset } from '../data/types';
import { closestRank, supplierChains } from './suppliers';

const ds = data as unknown as Dataset;

test('ledd i leverandørkjeden: direkte avtaler er ledd 1, underleverandører ledd 2', () => {
  const c = supplierChains(ds);
  assert.deepEqual(c['prv-kortnord'], [{ rank: 1, via: null }]);
  assert.deepEqual(c['prv-datahall'], [{ rank: 2, via: 'prv-kortnord' }]);
  assert.deepEqual(c['prv-nordnett'], [{ rank: 2, via: 'prv-smslinje' }]);
});

test('en leverandør kan stå i flere ledd', () => {
  const nimbus = supplierChains(ds)['prv-nimbus'];
  assert.equal(nimbus.length, 2);
  assert.equal(closestRank(nimbus), 1);
  assert.ok(nimbus.some((p) => p.rank === 2 && p.via === 'prv-saksflyt'));
});

test('alle leverandører med direkte avtale har exit-felt', () => {
  for (const n of ds.nodes) {
    if (n.kind !== 'provider') continue;
    if (n.directContract) {
      assert.ok(n.contractOwner && n.exitPlan && n.substitutability, n.id);
      assert.ok(n.lastAssessed !== undefined && n.exitTested !== undefined, n.id);
    } else {
      assert.equal(n.exitPlan, undefined, n.id);
    }
  }
});
