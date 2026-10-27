import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seed, validate } from '../src/domain/inventory.js';

const read = path => readFileSync(new URL(path, import.meta.url));
test('Export retains the original business engine byte for byte', () => {
  assert.deepEqual(read('../src/domain/inventory.js'), read('../reference/original/inventory.js'));
});
test('Export retains the original responsive CSS byte for byte', () => {
  assert.deepEqual(read('../src/styles/warehouse.css'), read('../reference/original/style.css'));
});
test('Portable demonstration snapshot equals the original seed', () => {
  const snapshot = JSON.parse(read('../data/demo-state.json').toString('utf8'));
  validate(snapshot);
  assert.deepEqual(snapshot, seed());
});
