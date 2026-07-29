import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeData, DEFAULT_USERS, EMPTY_DATA
} from '../src/shared.js';

test('normalizeData provides default studio users when none exist', () => {
  const result = normalizeData({});
  assert.ok(Array.isArray(result.users));
  assert.equal(result.users.length, DEFAULT_USERS.length);
  assert.equal(result.users[0].name, 'Ananya Sharma');
  assert.equal(result.users[0].role, 'admin');
});

test('normalizeData preserves custom registered studio users and assigns defaults', () => {
  const customUser = {
    id: 'usr_custom_1',
    name: 'Kabir Mehta',
    email: 'kabir@studiovista.in',
    role: 'designer',
    pin: '5678',
  };
  const result = normalizeData({ users: [customUser] });
  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].name, 'Kabir Mehta');
  assert.equal(result.users[0].pin, '5678');
  assert.equal(result.users[0].avatar, 'KM');
});

test('EMPTY_DATA structure includes default studio users', () => {
  assert.ok(Array.isArray(EMPTY_DATA.users));
  assert.ok(EMPTY_DATA.users.some(u => u.role === 'admin'));
  assert.ok(EMPTY_DATA.users.some(u => u.role === 'site_supervisor'));
});
