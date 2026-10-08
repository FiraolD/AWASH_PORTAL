import pool from '../lib/db.js';
import { randomUUID } from 'crypto';

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
    return { ...def.rows[0], versions: versions.rows };
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
      await client.query(`
        INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,details)
        SELECT gen_random_uuid(),'WORKFLOW_ACTIVATED',$2,jsonb_build_object('version_id',$1)
      `, [versionId, actorId]);
      await client.query('COMMIT');
      return this.getVersion(versionId);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  private async getActiveVersion(entityType: WorkflowEntityType) {
    const r = await pool.query(`
      SELECT wv.*, wd.code, wd.name, wd.entity_type
      FROM workflow_versions wv
      JOIN workflow_definitions wd ON wd.id=wv.workflow_definition_id
      WHERE wd.entity_type=$1 AND wd.is_active=true AND wv.status='ACTIVE'
      ORDER BY wv.version_no DESC LIMIT 1
    `, [entityType]);
    return r.rows[0] ?? null;
  }

  private conditionMatches(conditions: any, context: any) {
    if (!conditions || typeof conditions !== 'object') return true;
    return Object.entries(conditions).every(([key, expected]) => {
      if (expected === undefined || expected === null || expected === '') return true;
      return context?.[key] === expected;
    });
  }

  async startInstance(input: { entityType: WorkflowEntityType; entityId: string; requestedBy: string; context?: any }) {
    const existing = await pool.query(`
      SELECT * FROM workflow_instances
      WHERE entity_type=$1 AND entity_id=$2 AND status IN ('PENDING','IN_PROGRESS')
      ORDER BY started_at DESC LIMIT 1
    `, [input.entityType, input.entityId]);
    if (existing.rows.length) return existing.rows[0];

    const version = await this.getActiveVersion(input.entityType);
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
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  private async createTasks(client: any, instanceId: string, step: any, requesterId: string, context: any) {
    const authority = await client.query(`
      SELECT wa.*, rl.level_code, rl.department
      FROM workflow_authorities wa
      JOIN role_levels rl ON rl.id=wa.role_level_id
      WHERE wa.is_active=true AND wa.entity_type=$1
        AND (wa.product_code IS NULL OR wa.product_code=$2)
        AND rl.is_active=true AND rl.level_code=COALESCE($3, rl.level_code)
        AND wa.can_approve=true
      ORDER BY wa.max_amount NULLS LAST
    `, [context.entityType ?? context.entity_type ?? '', context.productCode ?? context.product_code ?? null, step.authority_level_code]);
    const candidates = authority.rows.filter((a: any) => context.amount == null || a.max_amount == null || Number(a.max_amount) >= Number(context.amount));
    const uniqueRoles = new Map(candidates.map((a: any) => [a.level_code, a]));
    const roles = [...uniqueRoles.values()];
    if (!roles.length) throw new Error(`No approval authority configured for step ${step.step_key}`);

    const users = await client.query(`
      SELECT id, role FROM users WHERE status='ACTIVE' AND is_active=true AND role = ANY($1::text[])
    `, [roles.map((r: any) => r.level_code)]);
    if (!users.rows.length) throw new Error('No active approver is available for this workflow step');

    const filtered = users.rows.filter((u: any) => u.id !== requesterId);
    if (!filtered.length) throw new Error('Segregation of duties: requester cannot be the only approver');

    const selected = step.approval_mode === 'ALL' || step.approval_mode === 'QUORUM' ? filtered : filtered;
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
      const taskResult = await client.query(`
        SELECT wt.*, wi.*, ws.step_order, ws.approval_mode, ws.required_approvals, ws.authority_level_code,
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

      if (task.requested_by === actor.id) throw new Error('Segregation of duties: requester cannot approve their own request');

      const role = await client.query('SELECT role FROM users WHERE id=$1 AND status=\'ACTIVE\' AND is_active=true', [actor.id]);
      if (!role.rows.length || (task.authority_level_code && role.rows[0].role !== task.authority_level_code)) {
        throw new Error('Approval authority does not match the configured workflow step');
      }

      const amount = Number(task.context?.amount ?? 0);
      const authority = await client.query(`
        SELECT wa.max_amount FROM workflow_authorities wa
        JOIN role_levels rl ON rl.id=wa.role_level_id
        WHERE wa.is_active=true AND wa.entity_type=$1 AND rl.level_code=$2
          AND (wa.product_code IS NULL OR wa.product_code=$3)
          AND wa.can_approve=true
        ORDER BY wa.max_amount DESC NULLS FIRST LIMIT 1
      `, [task.entity_type, role.rows[0].role, task.context?.productCode ?? null]);
      const maxAmount = authority.rows[0]?.max_amount;
      if (maxAmount != null && amount > Number(maxAmount)) throw new Error('Approval amount exceeds the actor authority limit');

      await client.query(`
        INSERT INTO workflow_decisions(workflow_instance_id,workflow_task_id,actor_user_id,decision,comment,metadata)
        VALUES($1,$2,$3,$4,$5,$6)
      `, [task.workflow_instance_id, task.id, actor.id, decision, comment, JSON.stringify({ authority_max_amount: maxAmount ?? null })]);

      await client.query(`
        UPDATE workflow_tasks SET status=$2, decision=$3, decision_comment=$4, decided_by=$1, decided_at=NOW(), updated_at=NOW()
        WHERE id=$5 AND status='PENDING'
      `, [actor.id, decision, decision, comment, task.id]);

      if (decision !== 'APPROVED') {
        await client.query('UPDATE workflow_instances SET status=$2, completed_at=NOW(), updated_at=NOW() WHERE id=$1', [task.workflow_instance_id, decision === 'REJECTED' ? 'REJECTED' : 'REQUIRES_MODIFICATION']);
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
      const threshold = mode === 'ALL' ? await this.taskCount(client, task.workflow_instance_id, task.workflow_step_id) : mode === 'QUORUM' ? task.required_approvals : 1;
      const stepComplete = mode === 'ALL' ? pendingCount === 0 : approvedCount >= threshold;

      if (!stepComplete) {
        await client.query('COMMIT');
        return this.getInstance(task.workflow_instance_id);
      }

      const next = await client.query(`
        SELECT * FROM workflow_steps WHERE workflow_version_id=(SELECT workflow_version_id FROM workflow_instances WHERE id=$1)
        AND is_active=true AND step_order>$2 ORDER BY step_order LIMIT 1
      `, [task.workflow_instance_id, task.step_order]);

      if (!next.rows.length) {
        await client.query('UPDATE workflow_instances SET status=\'APPROVED\', completed_at=NOW(), updated_at=NOW() WHERE id=$1', [task.workflow_instance_id]);
        await client.query(`
          INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,step_order,from_status,to_status,details)
          VALUES($1,'WORKFLOW_COMPLETED',$2,$3,'IN_PROGRESS','APPROVED',$4)
        `, [task.workflow_instance_id, actor.id, task.step_order, JSON.stringify({ workflow_code: task.workflow_code })]);
      } else {
        await client.query("UPDATE workflow_tasks SET status='CANCELLED', updated_at=NOW() WHERE workflow_instance_id=$1 AND workflow_step_id=$2 AND status='PENDING'", [task.workflow_instance_id, task.workflow_step_id]);
        await client.query('UPDATE workflow_instances SET status=\'IN_PROGRESS\', current_step_order=$2, updated_at=NOW() WHERE id=$1', [task.workflow_instance_id, next.rows[0].step_order]);
        await this.createTasks(client, task.workflow_instance_id, next.rows[0], task.requested_by, { ...(task.context ?? {}), entityType: task.entity_type });
        await client.query(`
          INSERT INTO workflow_history(workflow_instance_id,event_type,actor_user_id,step_order,from_status,to_status,details)
          VALUES($1,'STEP_COMPLETED',$2,$3,'PENDING','IN_PROGRESS',$4)
        `, [task.workflow_instance_id, actor.id, task.step_order, JSON.stringify({ next_step: next.rows[0].step_order })]);
      }
      await client.query('COMMIT');
      return this.getInstance(task.workflow_instance_id);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
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
      SELECT wa.*, rl.level_code, rl.level_name, rl.department
      FROM workflow_authorities wa JOIN role_levels rl ON rl.id=wa.role_level_id
      ORDER BY rl.department, rl.level_order, wa.entity_type, wa.product_code NULLS FIRST
    `);
    return rows;
  }
}

export const workflowService = new WorkflowService();
