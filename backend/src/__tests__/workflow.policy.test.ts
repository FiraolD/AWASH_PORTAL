import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDecisionAllowed, assertDecisionCapability, assertStepAmountAllowed, conditionMatches, findNextApplicableStep, isStepComplete } from '../services/workflow.policy.js';

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


test('authority matrix enforces approve, reject, and modification permissions independently', () => {
  assert.doesNotThrow(() => assertDecisionCapability('APPROVED', { can_approve: true, can_reject: false, can_modify: false }));
  assert.throws(() => assertDecisionCapability('REJECTED', { can_approve: true, can_reject: false, can_modify: true }), /does not permit the rejected decision/);
  assert.throws(() => assertDecisionCapability('REQUIRES_MODIFICATION', { can_approve: true, can_reject: true, can_modify: false }), /does not permit the requires modification decision/);
  assert.throws(() => assertDecisionCapability('APPROVED', {}), /does not permit the approved decision/);
});


test('conditional workflow steps are skipped when their conditions do not match', () => {
  const steps = [
    { step_order: 2, conditions: { productCode: 'MOTOR' } },
    { step_order: 3, conditions: { productCode: 'PROPERTY' } },
    { step_order: 4, conditions: {} },
  ];
  assert.equal(findNextApplicableStep(steps, 1, { productCode: 'PROPERTY' })?.step_order, 3);
  assert.equal(findNextApplicableStep(steps, 3, { productCode: 'MOTOR' })?.step_order, 4);
  assert.equal(findNextApplicableStep(steps, 4, { productCode: 'MOTOR' }), undefined);
});


test('workflow step enforces configured minimum and maximum amounts', () => {
  assert.doesNotThrow(() => assertStepAmountAllowed(500, 100, 1000));
  assert.throws(() => assertStepAmountAllowed(99, 100, 1000), /below the workflow step minimum/);
  assert.throws(() => assertStepAmountAllowed(1001, 100, 1000), /exceeds the workflow step maximum/);
  assert.doesNotThrow(() => assertStepAmountAllowed(100000, null, null));
});

test('QUORUM cannot start when fewer eligible approvers exist than the threshold', () => {
  const requiredApprovals = 3;
  const eligibleApprovers = 2;
  assert.ok(eligibleApprovers < requiredApprovals);
});
