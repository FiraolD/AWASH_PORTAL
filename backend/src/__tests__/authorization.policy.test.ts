import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessOwnedResource,
  hasAnyRole,
  isAuthenticatedUser,
  isResourceOwner,
} from '../middleware/authorization.policy.js';

const CUSTOMER = { id: 'customer-1', role: 'CUSTOMER' };
const OTHER_CUSTOMER = { id: 'customer-2', role: 'CUSTOMER' };
const CLAIMS_STAFF = { id: 'claims-1', role: 'CLAIM_OFFICER_I' };
const CUSTOMER_ADMIN = { id: 'admin-1', role: 'CUSTOMER_ADMIN' };

test('authorization regression: unauthenticated user is not considered authenticated', () => {
  assert.equal(isAuthenticatedUser(undefined), false);
  assert.equal(isAuthenticatedUser(null), false);
  assert.equal(isAuthenticatedUser({ id: 'customer-1' }), false);
  assert.equal(isAuthenticatedUser({ role: 'CUSTOMER' }), false);
});

test('authorization regression: role checks allow only explicitly permitted roles', () => {
  assert.equal(hasAnyRole(CUSTOMER, ['CUSTOMER']), true);
  assert.equal(hasAnyRole(CUSTOMER, ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), false);
  assert.equal(hasAnyRole(CUSTOMER_ADMIN, ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), true);
  assert.equal(hasAnyRole(CLAIMS_STAFF, ['CLAIM_OFFICER_I', 'CLAIM_OFFICER_II']), true);
});

test('authorization regression: resource ownership is exact and non-empty', () => {
  assert.equal(isResourceOwner('customer-1', 'customer-1'), true);
  assert.equal(isResourceOwner('customer-1', 'customer-2'), false);
  assert.equal(isResourceOwner(undefined, 'customer-1'), false);
  assert.equal(isResourceOwner('customer-1', undefined), false);
});

test('authorization regression: customer can access own policy', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER, 'customer-1', ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), true);
});

test('authorization regression: customer cannot access another customer policy', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER, 'customer-2', ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), false);
});

test('authorization regression: privileged staff can access customer-owned resource', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER_ADMIN, 'customer-2', ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), true);
});

test('authorization regression: claims staff can access claim resources', () => {
  assert.equal(canAccessOwnedResource(CLAIMS_STAFF, 'customer-2', [
    'CLAIM_OFFICER_I',
    'CLAIM_OFFICER_II',
    'SENIOR_CLAIM_OFFICER',
    'SUPERVISOR_CLAIMS',
    'MANAGER_CLAIMS',
    'HEAD_CLAIMS',
    'CLAIMS_ADMIN',
  ]), true);
});

test('authorization regression: customer cannot access claim owned by another customer', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER, 'customer-2', [
    'CLAIM_OFFICER_I',
    'CLAIM_OFFICER_II',
    'SENIOR_CLAIM_OFFICER',
    'SUPERVISOR_CLAIMS',
    'MANAGER_CLAIMS',
    'HEAD_CLAIMS',
    'CLAIMS_ADMIN',
    'MASTER_ADMIN',
  ]), false);
});

test('authorization regression: own user profile is accessible to the customer', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER, 'customer-1', ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), true);
});

test('authorization regression: another user profile is denied to a normal customer', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER, 'customer-2', ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), false);
});

test('authorization regression: policy statistics require a privileged role', () => {
  assert.equal(hasAnyRole(CUSTOMER, ['CUSTOMER_ADMIN', 'MASTER_ADMIN', 'UNDERWRITING_ADMIN']), false);
  assert.equal(hasAnyRole(CUSTOMER_ADMIN, ['CUSTOMER_ADMIN', 'MASTER_ADMIN', 'UNDERWRITING_ADMIN']), true);
});

test('authorization regression: missing owner identity fails closed', () => {
  assert.equal(canAccessOwnedResource(CUSTOMER, undefined, ['CUSTOMER_ADMIN']), false);
  assert.equal(canAccessOwnedResource(undefined, 'customer-1', ['CUSTOMER_ADMIN']), false);
});

test('authorization regression: different user IDs never gain access by role mismatch', () => {
  assert.equal(canAccessOwnedResource(OTHER_CUSTOMER, 'customer-1', ['CUSTOMER_ADMIN', 'MASTER_ADMIN']), false);
});
