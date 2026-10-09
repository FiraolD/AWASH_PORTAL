import pool from '../lib/db.js';
import { randomUUID } from 'crypto';
import { assertDecisionAllowed, assertDecisionCapability, assertQuorumFeasible, assertStepAmountAllowed, conditionMatches as matchesConditions, findNextApplicableStep, isStepComplete } from './workflow.policy.js';

export type WorkflowEntityType = 'POLICY' | 'CLAIM' | 'ENDORSEMENT' | 'CANCELLATION';
export type WorkflowDecision = 'APPROVED' | 'REJECTED' | 'REQUIRES_MODIFICATION';

type UserContext = { id: string; role?: string | null; department?: string | null };

export class WorkflowService {
  async listDefinitions() {
    const { rows } = await pool.query(`
      SELECT wd.*, COALESCE(MAX(wv.version_no), 0) AS latest_version
      FROM workflow_definitions wd
      LEFT JOIN workflow_versions wv ON wv.workflow_definition_id = wd.id
      GROUP BY wd.id ORDER BY wd.created_at DESC
    `);
    return rows;
  }

  async getDefinition(id: string) {
    const def = await pool.query('SELECT * FROM workflow_definitions WHERE id = $1', [id]);
    if (!def.rows.length) throw new Error('Workflow definition not found');
    const versions = await pool.query(`
      SELECT * FROM workflow_versions WHERE workflow_definition_id = $1 ORDER BY version_no DESC
    `, [id]);
    const versionRows = await Promise.all(versions.rows.map(async (version: any) => {
      const steps = await pool.query('SELECT * FROM workflow_steps WHERE workflow_version_id=$1 ORDER BY step_order', [version.id]);
      return { ...version, steps: steps.rows };
    }));
    return { ...def.rows[0], versions: versionRows };
  }

  async createDefinition(input: { code: string; name: string; description?: string; entityType: WorkflowEntityType; createdBy: string }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const definition = await client.query(`
        INSERT INTO workflow_definitions(code,name,description,entity_type,created_by)
        VALUES($1,$2,$3,$4,$5) RETURNING *
      `, [input.code, input.name, input.description ?? null, input.entityType, input.createdBy]);
      const version = await client.query(`
        INSERT INTO workflow_versions(workflow_definition_id,version_no,status,created_by)
        VALUES($1,1,'DRAFT',$2) RETURNING *
      `, [definition.rows[0].id, input.createdBy]);
      await client.query('COMMIT');
      return { ...definition.rows[0], versions: [version.rows[0]] };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async createVersion(definitionId: string, actorId: string) {
    const current = await pool.query('SELECT COALESCE(MAX(version_no),0)::int AS version_no FROM workflow_versions WHERE workflow_definition_id=$1', [definitionId]);
    const next = current.rows[0].version_no + 1;
    const result = await pool.query(`
      INSERT INTO workflow_versions(workflow_definition_id,version_no,status,created_by)
      VALUES($1,$2,'DRAFT',$3) RETURNING *
    `, [definitionId,next,actorId]);
    return { ...result.rows[0], steps: [] };
  }

  async saveVersion(versionId: string, steps: any[], actorId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const version = await client.query('SELECT * FROM workflow_versions WHERE id = $1 FOR UPDATE', [versionId]);
      if (!version.rows.length) throw new Error('Workflow version not found');
      if (version.rows[0].status === 'ACTIVE') throw new Error('Active workflow versions are immutable; create a new version');
      await client.query('DELETE FROM workflow_steps WHERE workflow_version_id = $1', [versionId]);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await client.query(`
          INSERT INTO workflow_steps
          (workflow_version_id,step_key,step_order,name,department,authority_level_code,approval_mode,required_approvals,min_amount,max_amount,sla_hours,conditions)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [versionId, s.stepKey, i + 1, s.name, s.department ?? null, s.authorityLevelCode ?? null,
          s.approvalMode ?? 'ANY', Number(s.requiredApprovals ?? 1), s.minAmount ?? null, s.maxAmount ?? null,
          s.slaHours ?? null, JSON.stringify(s.conditions ?? {})]);
      }
      await client.query('UPDATE workflow_versions SET created_by=$2 WHERE id=$1', [versionId, actorId]);
      await client.query('COMMIT');
      return this.getVersion(versionId);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async getVersion(versionId: string) {
    const version = await pool.query('SELECT * FROM workflow_versions WHERE id=$1', [versionId]);
    if (!version.rows.length) throw new Error('Workflow version not found');
    const steps = await pool.query('SELECT * FROM workflow_steps WHERE workflow_version_id=$1 ORDER BY step_order', [versionId]);
    return { ...version.rows[0], steps: steps.rows };
  }

  async activateVersion(versionId: string, actorId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const version = await client.query('SELECT * FROM workflow_versions WHERE id=$1 FOR UPDATE', [versionId]);
      if (!version.rows.length) throw new Error('Workflow version not found');
      const steps = await client.query('SELECT * FROM workflow_steps WHERE workflow_version_id=$1 AND is_active=true ORDER BY step_order', [versionId]);
      if (!steps.rows.length) throw new Error('Cannot activate a workflow without steps');
      await client.query(`
        UPDATE workflow_versions SET status='RETIRED', effective_to=NOW()
        WHERE workflow_definition_id=$1 AND status='ACTIVE' AND id<>$2
      `, [version.rows[0].workflow_definition_id, versionId]);
      await client.query(`
        UPDATE workflow_versions SET status='ACTIVE', effective_from=NOW(), effective_to=NULL
        WHERE id=$1
      `, [versionId]);
      // Workflow history is instance-scoped. Activation is configuration history, not a runtime instance event.
      await client.query('COMMIT');
      return this.getVersion(versionId);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  private async getActiveVersion(entityType: WorkflowEntityType, workflowCode?: string) {
    const r = await pool.query(`
      SELECT wv.*, wd.code, wd.name, wd.entity_type
      FROM workflow_versions wv
      JOIN workflow_definitions wd ON wd.id=wv.workflow_definition_id
      WHERE wd.entity_type=$1 AND wd.is_active=true AND wv.status='ACTIVE'
        AND ($2::text IS NULL OR wd.code=$2)
      ORDER BY wv.version_no DESC
    `, [entityType, workflowCode ?? null]);
    if (r.rows.length > 1 && !workflowCode) {
      throw new Error(`Multiple active workflows exist for ${entityType}; the caller must specify workflowCode`);
    }
    return r.rows[0] ?? null;
  }

  private conditionMatches(conditions: any, context: any) {
    return matchesConditions(conditions, context);
  }

  async startInstance(input: { entityType: WorkflowEntityType; entityId: string; requestedBy: string; context?: any }) {
    const existing = await pool.query(`
      SELECT * FROM workflow_instances
      WHERE entity_type=$1 AND entity_id=$2 AND status IN ('PENDING','IN_PROGRESS')
      ORDER BY started_at DESC LIMIT 1
    `, [input.entityType, input.entityId]);
    if (existing.rows.length) return existing.rows[0];

    const version = await this.getActiveVersion(input.entityType, input.context?.workflowCode);
    if (!version) throw new Error(`No active workflow configured for ${input.entityType}`);
    const steps = await pool.query('SELECT * FROM workflow_steps WHERE workflow_version_id=$1 AND is_active=true ORDER BY step_order', [version.id]);
    const applicable = steps.rows.filter((s: any) => this.conditionMatches(s.conditions, input.context ?? {}));
    if (!applicable.length) throw new Error('No workflow step matched the supplied context');

    const first = applicable[0];
    const instanceId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO workflow_instances(id,workflow_version_id,entity_type,entity_id,requested_by,status,current_step_order,context)
        VALUES($1,$2,$3,$4,$5,'PENDING',$6,$7)
      `, [instanceId, version.id, input.entityType, input.entityId, input.requestedBy, first.step_order, JSON.stringify(input.context ?? {})]);
      await this.createTasks(client, instanceId, first, input.requestedBy, { ...(input.context ?? {}), entityType: input.entityType });
      await client.query(`
        INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,step_order,to_status,details)
        VALUES($1,'WORKFLOW_STARTED',$2,$3,'PENDING',$4)
      `, [instanceId, input.requestedBy, first.step_order, JSON.stringify({ workflow_code: version.code, version: version.version_no })]);
      await client.query('COMMIT');
      return this.getInstance(instanceId);
    } catch (e: any) {
      await client.query('ROLLBACK');
      // Concurrent requests for the same entity may race past the initial lookup.
      // The partial unique index is the final guard; return the winning instance.
      if (e?.code === '23505' && e?.constraint === 'idx_workflow_instances_one_open_per_entity') {
        const concurrent = await pool.query(`
          SELECT * FROM workflow_instances
          WHERE entity_type=$1 AND entity_id=$2 AND status IN ('PENDING','IN_PROGRESS')
          ORDER BY started_at DESC LIMIT 1
        `, [input.entityType, input.entityId]);
        if (concurrent.rows.length) return concurrent.rows[0];
      }
      throw e;
    } finally { client.release(); }
  }

  private async createTasks(client: any, instanceId: string, step: any, requesterId: string, context: any) {
    assertStepAmountAllowed(Number(context.amount ?? 0), step.min_amount, step.max_amount);
    const authority = await client.query(`
      SELECT wa.*, rl."levelCode" AS level_code, rl.department
      FROM workflow_authorities wa
      JOIN role_levels rl ON rl.id=wa.role_level_id
      WHERE wa.is_active=true AND wa.entity_type=$1
        AND (wa.product_code IS NULL OR wa.product_code=$2)
        AND rl."isActive"=true AND rl."levelCode"=COALESCE($3, rl."levelCode")
        AND wa.can_approve=true
      ORDER BY wa.max_amount NULLS LAST
    `, [context.entityType ?? context.entity_type ?? '', context.productCode ?? context.product_code ?? null, step.authority_level_code]);
    const candidates = authority.rows.filter((a: any) => context.amount == null || a.max_amount == null || Number(a.max_amount) >= Number(context.amount));
    const uniqueRoles = new Map(candidates.map((a: any) => [a.level_code, a]));
    const roles = [...uniqueRoles.values()];
    if (!roles.length) throw new Error(`No approval authority configured for step ${step.step_key}`);

    const users = await client.query(`
      SELECT id, role FROM users WHERE status='ACTIVE' AND "isActive"=true AND role::text = ANY($1::text[])
    `, [roles.map((r: any) => r.level_code)]);
    if (!users.rows.length) throw new Error('No active approver is available for this workflow step');

    const filtered = users.rows.filter((u: any) => u.id !== requesterId && u.id !== context.operationalOwnerId);
    if (!filtered.length) throw new Error('Segregation of duties: requester cannot be the only approver');
    if (step.approval_mode === 'QUORUM') assertQuorumFeasible(Number(step.required_approvals), filtered.length);

    const selected = filtered;
    for (const u of selected) {
      await client.query(`
        INSERT INTO workflow_tasks(workflow_instance_id,workflow_step_id,assignee_user_id,authority_level_code,status,due_at)
        VALUES($1,$2,$3,$4,'PENDING',CASE WHEN $5::int IS NULL THEN NULL ELSE NOW()+($5::text||' hours')::interval END)
      `, [instanceId, step.id, u.id, step.authority_level_code ?? u.role, step.sla_hours]);
    }
  }

  async listWorkbench(user: UserContext, filters: { status?: string; entityType?: string } = {}) {
    const params: any[] = [user.id];
    const clauses = [`
      wt.status='PENDING' AND wi.status IN ('PENDING','IN_PROGRESS')
      AND wt.assignee_user_id=$1
    `];
    if (filters.status) { params.push(filters.status); clauses.push(`wt.status=$${params.length}`); }
    if (filters.entityType) { params.push(filters.entityType); clauses.push(`wi.entity_type=$${params.length}`); }
    const { rows } = await pool.query(`
      SELECT wt.*, wi.entity_type, wi.entity_id, wi.requested_by, wi.context,
             wi.current_step_order, wd.code AS workflow_code, wd.name AS workflow_name,
             wv.version_no, ws.name AS step_name, ws.approval_mode, ws.required_approvals,
             u.first_name AS requester_first_name, u.last_name AS requester_last_name
      FROM workflow_tasks wt
      JOIN workflow_instances wi ON wi.id=wt.workflow_instance_id
      JOIN workflow_steps ws ON ws.id=wt.workflow_step_id
      JOIN workflow_versions wv ON wv.id=wi.workflow_version_id
      JOIN workflow_definitions wd ON wd.id=wv.workflow_definition_id
      LEFT JOIN users u ON u.id=wi.requested_by
      WHERE ${clauses.join(' AND ')}
      ORDER BY wt.due_at NULLS LAST, wt.created_at ASC
    `, params);
    return rows;
  }

  async decide(taskId: string, actor: UserContext, decision: WorkflowDecision, comment = '') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Lock the instance before its task so two different approvers cannot advance
      // the same workflow concurrently or deadlock while cancelling sibling tasks.
      const instanceLock = await client.query(`
        SELECT wi.id FROM workflow_instances wi
        JOIN workflow_tasks wt ON wt.workflow_instance_id=wi.id
        WHERE wt.id=$1 AND wt.assignee_user_id=$2 AND wt.status='PENDING'
        FOR UPDATE OF wi
      `, [taskId, actor.id]);
      if (!instanceLock.rows.length) throw new Error('Approval task is unavailable, already decided, or you are not assigned to it');

      const taskResult = await client.query(`
        SELECT wt.*, wi.*, ws.step_order, ws.approval_mode, ws.required_approvals, ws.authority_level_code, ws.min_amount, ws.max_amount,
               ws.name AS step_name, wv.version_no, wd.code AS workflow_code
        FROM workflow_tasks wt
        JOIN workflow_instances wi ON wi.id=wt.workflow_instance_id
        JOIN workflow_steps ws ON ws.id=wt.workflow_step_id
        JOIN workflow_versions wv ON wv.id=wi.workflow_version_id
        JOIN workflow_definitions wd ON wd.id=wv.workflow_definition_id
        WHERE wt.id=$1 AND wt.assignee_user_id=$2 AND wt.status='PENDING'
        FOR UPDATE OF wt
      `, [taskId, actor.id]);
      if (!taskResult.rows.length) throw new Error('Approval task is unavailable, already decided, or you are not assigned to it');
      const task = taskResult.rows[0];

      assertDecisionAllowed({ actorId: actor.id, requesterId: task.requested_by, operationalOwnerId: task.context?.operationalOwnerId, amount: Number(task.context?.amount ?? 0) });

      const role = await client.query('SELECT role::text AS role FROM users WHERE id=$1 AND status=\'ACTIVE\' AND "isActive"=true', [actor.id]);
      if (!role.rows.length || (task.authority_level_code && role.rows[0].role !== task.authority_level_code)) {
        throw new Error('Approval authority does not match the configured workflow step');
      }

      const amount = Number(task.context?.amount ?? 0);
      assertStepAmountAllowed(amount, task.min_amount, task.max_amount);
      const authority = await client.query(`
        SELECT wa.max_amount, wa.can_approve, wa.can_reject, wa.can_modify
        FROM workflow_authorities wa
        JOIN role_levels rl ON rl.id=wa.role_level_id
        WHERE wa.is_active=true AND rl."isActive"=true AND wa.entity_type=$1 AND rl."levelCode"=$2
          AND (wa.product_code IS NULL OR wa.product_code=$3)
        ORDER BY (wa.product_code=$3) DESC NULLS LAST, wa.max_amount DESC NULLS FIRST LIMIT 1
      `, [task.entity_type, role.rows[0].role, task.context?.productCode ?? null]);
      const authorityRow = authority.rows[0];
      if (!authorityRow) throw new Error('No active approval authority is configured for this user and entity');
      const maxAmount = authorityRow.max_amount;
      assertDecisionAllowed({ actorId: actor.id, requesterId: task.requested_by, operationalOwnerId: task.context?.operationalOwnerId, amount, maxAmount });
      assertDecisionCapability(decision, authorityRow);

      await client.query(`
        INSERT INTO workflow_decisions(workflow_instance_id,workflow_task_id,actor_user_id,decision,comment,metadata)
        VALUES($1,$2,$3,$4,$5,$6)
      `, [task.workflow_instance_id, task.id, actor.id, decision, comment, JSON.stringify({ authority_max_amount: maxAmount ?? null })]);

      await client.query(`
        UPDATE workflow_tasks SET status=$2, decision=$3, decision_comment=$4, decided_by=$1, decided_at=NOW(), updated_at=NOW()
        WHERE id=$5 AND status='PENDING'
      `, [actor.id, decision, decision, comment, task.id]);

      if (decision !== 'APPROVED') {
        const outcome = decision === 'REJECTED' ? 'REJECTED' : 'REQUIRES_MODIFICATION';
        await client.query('UPDATE workflow_instances SET status=$2, completed_at=NOW(), updated_at=NOW() WHERE id=$1', [task.workflow_instance_id, outcome]);
        // A terminal decision closes every other task so no stale approvals remain pending.
        await client.query("UPDATE workflow_tasks SET status='CANCELLED', updated_at=NOW() WHERE workflow_instance_id=$1 AND status='PENDING'", [task.workflow_instance_id]);
        await this.applyEntityOutcome(client, task.entity_type, task.entity_id, outcome, actor.id, task.context);
        await client.query(`
          INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,step_order,from_status,to_status,details)
          VALUES($1,'DECISION_RECORDED',$2,$3,'PENDING',$4,$5)
        `, [task.workflow_instance_id, actor.id, task.step_order, decision === 'REJECTED' ? 'REJECTED' : 'REQUIRES_MODIFICATION', JSON.stringify({ comment })]);
        await client.query('COMMIT');
        return this.getInstance(task.workflow_instance_id);
      }

      const pending = await client.query('SELECT COUNT(*)::int AS count FROM workflow_tasks WHERE workflow_instance_id=$1 AND workflow_step_id=$2 AND status=\'PENDING\'', [task.workflow_instance_id, task.workflow_step_id]);
      const approved = await client.query('SELECT COUNT(*)::int AS count FROM workflow_tasks WHERE workflow_instance_id=$1 AND workflow_step_id=$2 AND decision=\'APPROVED\'', [task.workflow_instance_id, task.workflow_step_id]);
      const pendingCount = pending.rows[0].count;
      const approvedCount = approved.rows[0].count;
      const mode = task.approval_mode;
      const totalTasks = await this.taskCount(client, task.workflow_instance_id, task.workflow_step_id);
      const stepComplete = isStepComplete(mode, Number(task.required_approvals), totalTasks, approvedCount, pendingCount);

      if (!stepComplete) {
        await client.query('COMMIT');
        return this.getInstance(task.workflow_instance_id);
      }

      const next = await client.query(`
        SELECT * FROM workflow_steps WHERE workflow_version_id=(SELECT workflow_version_id FROM workflow_instances WHERE id=$1)
        AND is_active=true AND step_order>$2 ORDER BY step_order
      `, [task.workflow_instance_id, task.step_order]);
      const nextStep = findNextApplicableStep(next.rows, Number(task.step_order), task.context ?? {});

      // Once a step reaches its completion rule, outstanding parallel tasks are no longer actionable.
      await client.query("UPDATE workflow_tasks SET status='CANCELLED', updated_at=NOW() WHERE workflow_instance_id=$1 AND workflow_step_id=$2 AND status='PENDING'", [task.workflow_instance_id, task.workflow_step_id]);
      if (!nextStep) {
        await client.query('UPDATE workflow_instances SET status=\'APPROVED\', completed_at=NOW(), updated_at=NOW() WHERE id=$1', [task.workflow_instance_id]);
        await this.applyEntityOutcome(client, task.entity_type, task.entity_id, 'APPROVED', actor.id, task.context);
        await client.query(`
          INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,step_order,from_status,to_status,details)
          VALUES($1,'WORKFLOW_COMPLETED',$2,$3,'IN_PROGRESS','APPROVED',$4)
        `, [task.workflow_instance_id, actor.id, task.step_order, JSON.stringify({ workflow_code: task.workflow_code })]);
      } else {
        await client.query('UPDATE workflow_instances SET status=\'IN_PROGRESS\', current_step_order=$2, updated_at=NOW() WHERE id=$1', [task.workflow_instance_id, nextStep.step_order]);
        await this.createTasks(client, task.workflow_instance_id, nextStep, task.requested_by, { ...(task.context ?? {}), entityType: task.entity_type });
        await client.query(`
          INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,step_order,from_status,to_status,details)
          VALUES($1,'STEP_COMPLETED',$2,$3,'PENDING','IN_PROGRESS',$4)
        `, [task.workflow_instance_id, actor.id, task.step_order, JSON.stringify({ next_step: nextStep.step_order })]);
      }
      await client.query('COMMIT');
      return this.getInstance(task.workflow_instance_id);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }



  private async applyEntityOutcome(client: any, entityType: string, entityId: string, outcome: string, actorId: string, context: any) {
    if (entityType === 'CLAIM') {
      const status = outcome === 'APPROVED' ? 'APPROVED' : outcome;
      await client.query(`
        UPDATE claims SET status=$1, "approvedBy"=CASE WHEN $1='APPROVED' THEN $2 ELSE "approvedBy" END,
          "approvedAmount"=CASE WHEN $1='APPROVED' AND $3 IS NOT NULL THEN $3 ELSE "approvedAmount" END,
          "approvedAt"=CASE WHEN $1='APPROVED' THEN NOW() ELSE "approvedAt" END, "updatedAt"=NOW()
        WHERE id=$4
      `, [status, actorId, context?.approvedAmount ?? context?.amount ?? null, entityId]);
      return;
    }
    if (entityType === 'ENDORSEMENT') {
      const status = outcome === 'APPROVED' ? 'APPROVED' : outcome === 'REJECTED' ? 'REJECTED' : 'REQUIRES_MODIFICATION';
      await client.query(`UPDATE endorsements SET status=$1, "approvedBy"=CASE WHEN $1='APPROVED' THEN $2 ELSE "approvedBy" END, "approvedAt"=CASE WHEN $1='APPROVED' THEN NOW() ELSE "approvedAt" END, "updatedAt"=NOW() WHERE id=$3`, [status, actorId, entityId]);
      return;
    }
    if (entityType === 'POLICY') {
      const status = outcome === 'APPROVED' ? 'ACTIVE' : outcome === 'REJECTED' ? 'REJECTED' : 'PENDING_UNDERWRITING';
      await client.query(`
        UPDATE policies SET status=$1, "approvedBy"=CASE WHEN $1='ACTIVE' THEN $2 ELSE "approvedBy" END,
          "approvedAt"=CASE WHEN $1='ACTIVE' THEN NOW() ELSE "approvedAt" END, "updatedAt"=NOW()
        WHERE id=$3
      `, [status, actorId, entityId]);
    }
  }

  private async taskCount(client: any, instanceId: string, stepId: string): Promise<number> {
    const result = await client.query(
      'SELECT COUNT(*)::int AS count FROM workflow_tasks WHERE workflow_instance_id=$1 AND workflow_step_id=$2',
      [instanceId, stepId]
    );
    return result.rows[0].count;
  }

  async getInstance(id: string) {
    const instance = await pool.query(`SELECT wi.*, wd.code AS workflow_code, wd.name AS workflow_name, wv.version_no
      FROM workflow_instances wi JOIN workflow_versions wv ON wv.id=wi.workflow_version_id
      JOIN workflow_definitions wd ON wd.id=wv.workflow_definition_id WHERE wi.id=$1`, [id]);
    if (!instance.rows.length) throw new Error('Workflow instance not found');
    const tasks = await pool.query(`SELECT wt.*, ws.name AS step_name, ws.step_order
      FROM workflow_tasks wt JOIN workflow_steps ws ON ws.id=wt.workflow_step_id
      WHERE wt.workflow_instance_id=$1 ORDER BY ws.step_order, wt.created_at`, [id]);
    const history = await pool.query('SELECT * FROM workflow_history WHERE workflow_instance_id=$1 ORDER BY created_at', [id]);
    return { ...instance.rows[0], tasks: tasks.rows, history: history.rows };
  }

  async getHistory(entityType: string, entityId: string) {
    const r = await pool.query(`
      SELECT wi.*, wd.code AS workflow_code, wd.name AS workflow_name, wv.version_no
      FROM workflow_instances wi JOIN workflow_versions wv ON wv.id=wi.workflow_version_id
      JOIN workflow_definitions wd ON wd.id=wv.workflow_definition_id
      WHERE wi.entity_type=$1 AND wi.entity_id=$2 ORDER BY wi.started_at DESC
    `, [entityType, entityId]);
    return Promise.all(r.rows.map((x: any) => this.getInstance(x.id)));
  }

  async listAuthorities() {
    const { rows } = await pool.query(`
      SELECT wa.*, rl."levelCode" AS level_code, rl."levelName" AS level_name, rl.department
      FROM workflow_authorities wa JOIN role_levels rl ON rl.id=wa.role_level_id
      ORDER BY rl.department, rl."levelOrder", wa.entity_type, wa.product_code NULLS FIRST
    `);
    return rows;
  }
}

export const workflowService = new WorkflowService();
