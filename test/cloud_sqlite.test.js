import test from 'node:test';
import assert from 'node:assert/strict';
import { startCloudSync } from '../src/shared.js';

test('startCloudSync returns cleanup function when invoked', () => {
  const cleanup = startCloudSync(() => {});
  assert.equal(typeof cleanup, 'function');
  cleanup();
});
