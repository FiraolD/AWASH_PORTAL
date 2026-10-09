export type ApprovalMode = 'ANY' | 'ALL' | 'QUORUM';
export type DecisionOutcome = 'APPROVED' | 'REJECTED' | 'REQUIRES_MODIFICATION';

export function conditionMatches(conditions: Record<string, unknown> | null | undefined, context: Record<string, unknown>) {
  if (!conditions || typeof conditions !== 'object') return true;
  return Object.entries(conditions).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === '') return true;
    return context?.[key] === expected;
  });
}

export function isStepComplete(mode: ApprovalMode, requiredApprovals: number, totalTasks: number, approvedCount: number, pendingCount: number) {
  if (mode === 'ALL') return totalTasks > 0 && pendingCount === 0 && approvedCount === totalTasks;
  if (mode === 'QUORUM') return requiredApprovals > 0 && approvedCount >= requiredApprovals;
  return approvedCount >= 1;
}

export function assertDecisionAllowed(input: {
  actorId: string;
  requesterId: string;
  operationalOwnerId?: string | null;
  amount: number;
  maxAmount?: number | string | null;
}) {
  if (input.actorId === input.requesterId) throw new Error('Segregation of duties: requester cannot approve their own request');
  if (input.operationalOwnerId && input.actorId === input.operationalOwnerId) throw new Error('Segregation of duties: operational owner cannot approve the same transaction');
  if (input.maxAmount != null && input.amount > Number(input.maxAmount)) throw new Error('Approval amount exceeds the actor authority limit');
}

export function assertDecisionCapability(
  decision: DecisionOutcome,
  authority: { can_approve?: boolean; can_reject?: boolean; can_modify?: boolean }
) {
  const allowed = decision === 'APPROVED'
    ? authority.can_approve
    : decision === 'REJECTED'
      ? authority.can_reject
      : authority.can_modify;
  if (!allowed) throw new Error(`Authority does not permit the ${decision.toLowerCase().replace('_', ' ')} decision`);
}

export function findNextApplicableStep<T extends { step_order: number; conditions?: Record<string, unknown> | null; is_active?: boolean }>(
  steps: T[],
  currentOrder: number,
  context: Record<string, unknown>
): T | undefined {
  return steps
    .filter(step => step.step_order > currentOrder && step.is_active !== false)
    .sort((a, b) => a.step_order - b.step_order)
    .find(step => conditionMatches(step.conditions, context));
}
