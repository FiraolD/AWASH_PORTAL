import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDecisionAllowed, conditionMatches, isStepComplete } from '../services/workflow.policy.js';

test('workflow conditions match only when all configured context values match', () => {
  assert.equal(conditionMatches({ productCode: 'MOTOR', amountBand: 'HIGH' }, { productCode: 'MOTOR', amountBand: 'HIGH' }), true);
  assert.equal(conditionMatches({ productCode: 'MOTOR' }, { productCode: 'PROPERTY' }), false);
  assert.equal(conditionMatches({}, {}), true);
});

test('ANY approval completes after one approval', () => {
  assert.equal(isStepComplete('ANY', 1, 5, 1, 4), true);
  assert.equal(isStepComplete('ANY', 1, 5, 0, 5), false);
});

test('ALL approval requires every task to approve and no pending tasks', () => {
  assert.equal(isStepComplete('ALL', 1, 3, 3, 0), true);
  assert.equal(isStepComplete('ALL', 1, 3, 2, 0), false);
  assert.equal(isStepComplete('ALL', 1, 3, 2, 1), false);
});

test('QUORUM approval requires the configured threshold', () => {
  assert.equal(isStepComplete('QUORUM', 3, 5, 2, 3), false);
  assert.equal(isStepComplete('QUORUM', 3, 5, 3, 2), true);
});

test('maker-checker prevents requester self-approval', () => {
  assert.throws(() => assertDecisionAllowed({ actorId: 'u1', requesterId: 'u1', amount: 1 }), /requester cannot approve/);
});

test('segregation of duties prevents operational owner approval', () => {
  assert.throws(() => assertDecisionAllowed({ actorId: 'u2', requesterId: 'u1', operationalOwnerId: 'u2', amount: 1 }), /operational owner cannot approve/);
});

test('authority limit blocks amount above the configured maximum', () => {
  assert.throws(() => assertDecisionAllowed({ actorId: 'u2', requesterId: 'u1', amount: 1001, maxAmount: 1000 }), /exceeds the actor authority limit/);
  assert.doesNotThrow(() => assertDecisionAllowed({ actorId: 'u2', requesterId: 'u1', amount: 1000, maxAmount: 1000 }));
});

test('missing authority ceiling does not invent an amount limit', () => {
  assert.doesNotThrow(() => assertDecisionAllowed({ actorId: 'u2', requesterId: 'u1', amount: 100000, maxAmount: null }));
});
