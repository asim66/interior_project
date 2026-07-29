import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeData, DEFAULT_USERS, EMPTY_DATA, isSuperAdmin, isAdmin, canManageUsers, canDelete
} from '../src/shared.js';

test('normalizeData provides default studio users including Super Admin when none exist', () => {
  const result = normalizeData({});
  assert.ok(Array.isArray(result.users));
  assert.equal(result.users.length, DEFAULT_USERS.length);
  assert.equal(result.users[0].name, 'Studio Owner');
  assert.equal(result.users[0].role, 'super_admin');
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

test('EMPTY_DATA structure includes default Super Admin studio user', () => {
  assert.ok(Array.isArray(EMPTY_DATA.users));
  assert.ok(EMPTY_DATA.users.some(u => u.role === 'super_admin'));
  assert.ok(EMPTY_DATA.users.some(u => u.role === 'admin'));
  assert.ok(EMPTY_DATA.users.some(u => u.role === 'site_supervisor'));
});

test('permission helpers identify super_admin and admin privileges', () => {
  const superAdmin = { role: 'super_admin' };
  const admin = { role: 'admin' };
  const designer = { role: 'designer' };
  const supervisor = { role: 'site_supervisor' };

  assert.equal(isSuperAdmin(superAdmin), true);
  assert.equal(isSuperAdmin(admin), false);

  assert.equal(isAdmin(superAdmin), true);
  assert.equal(isAdmin(admin), true);
  assert.equal(isAdmin(designer), false);

  assert.equal(canManageUsers(superAdmin), true);
  assert.equal(canManageUsers(admin), false);
  assert.equal(canManageUsers(designer), false);

  assert.equal(canDelete(supervisor), false);
  assert.equal(canDelete(admin), true);
  assert.equal(canDelete(designer), true);
});
