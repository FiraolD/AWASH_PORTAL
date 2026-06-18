import pool from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

export interface RoleLevel {
  id: string;
  levelCode: string;
  levelName: string;
  department: string;
  levelOrder: number;
  canApprove: boolean;
  canReject: boolean;
  maxAmountLimit?: number;
  isActive: boolean;
}

export interface ApprovalRule {
  id: string;
  ruleName: string;
  productType: string;
  minSumInsured: number | null;
  maxSumInsured: number | null;
  minRiskScore: number | null;
  maxRiskScore: number | null;
  approvalLevels: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequest {
  id: string;
  requestNumber: string;
  entityId: string;
  entityType: 'POLICY' | 'CLAIM' | 'PAYMENT';
  currentLevel: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_MODIFICATION' | 'IN_PROGRESS';
  requestedBy: string;
  submittedAt: Date;
  approvalMetadata?: any;
}

export interface ApprovalHistory {
  id: string;
  requestId: string;
  approvedBy: string;
  approvalLevel: string;
  decision: 'APPROVED' | 'REJECTED' | 'REQUIRES_MODIFICATION';
  notes: string;
  approvedAt: Date;
  createdAt: Date;
}

class ApprovalService {
  private mapRoleLevelRow(row: any): RoleLevel {
    return {
      id: row.id,
      levelCode: row.level_code,
      levelName: row.level_name,
      department: row.department,
      levelOrder: row.level_order,
      canApprove: row.can_approve,
      canReject: row.can_reject,
      maxAmountLimit: row.max_amount_limit,
      isActive: row.is_active
    };
  }

  private mapApprovalRequestRow(row: any): ApprovalRequest {
    return {
      id: row.id,
      requestNumber: row.request_number,
      entityId: row.entity_id,
      entityType: row.entity_type,
      currentLevel: row.current_level,
      status: row.status,
      requestedBy: row.requested_by,
      submittedAt: row.submitted_at,
      approvalMetadata: row.approval_metadata
    };
  }

  async getApprovalFlowWithDetails(approvalFlowIds: string[]): Promise<RoleLevel[]> {
    if (!approvalFlowIds.length) return [];

    const result = await pool.query(
      `SELECT * FROM role_levels WHERE id = ANY($1) AND is_active = true ORDER BY level_order ASC`,
      [approvalFlowIds]
    );

    const roleLevels = result.rows.map(this.mapRoleLevelRow);
    const roleLevelsMap = new Map(roleLevels.map(row => [row.id, row]));

    return approvalFlowIds
      .map(id => roleLevelsMap.get(id))
      .filter(Boolean) as RoleLevel[];
  }

  async findMatchingRule(
    productType: string,
    sumInsured: number,
    riskScore: number = 0
  ): Promise<ApprovalRule | null> {
    const result = await pool.query(
      `SELECT * FROM approval_rules
       WHERE is_active = true
         AND (product_type = $1 OR product_type = 'ALL')
         AND (min_sum_insured IS NULL OR min_sum_insured <= $2)
         AND (max_sum_insured IS NULL OR max_sum_insured >= $2)
         AND (min_risk_score IS NULL OR min_risk_score <= $3)
         AND (max_risk_score IS NULL OR max_risk_score >= $3)
       ORDER BY
         CASE WHEN product_type = $1 THEN 0 ELSE 1 END,
         min_sum_insured DESC
       LIMIT 1`,
      [productType, sumInsured, riskScore]
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      ruleName: row.rule_name,
      productType: row.product_type,
      minSumInsured: row.min_sum_insured,
      maxSumInsured: row.max_sum_insured,
      minRiskScore: row.min_risk_score,
      maxRiskScore: row.max_risk_score,
      approvalLevels: row.approval_levels || [],
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async requiresApproval(
    entityType: 'POLICY' | 'CLAIM' | 'PAYMENT',
    productType: string,
    sumInsured: number,
    riskScore: number = 0
  ): Promise<{
    requires: boolean;
    rule?: ApprovalRule;
    approvalFlow?: RoleLevel[];
    reason?: string;
  }> {
    const rule = await this.findMatchingRule(productType, sumInsured, riskScore);

    if (!rule) {
      return {
        requires: false,
        reason: 'No matching approval rule found'
      };
    }

    if (!rule.approvalLevels || rule.approvalLevels.length === 0) {
      return {
        requires: false,
        reason: 'Rule has no approval flow configured'
      };
    }

    const approvalFlow = await this.getApprovalFlowWithDetails(rule.approvalLevels);
    const needsApproval = approvalFlow.length > 0;

    return {
      requires: needsApproval,
      rule,
      approvalFlow,
      reason: needsApproval
        ? `Sum insured ${sumInsured} requires ${approvalFlow.length}-level approval`
        : 'Sum insured within automatic approval limits'
    };
  }

  async createApprovalRequest(
    entityId: string,
    entityType: 'POLICY' | 'CLAIM' | 'PAYMENT',
    productType: string,
    sumInsured: number,
    riskScore: number,
    requestedBy: string,
    metadata: any = {}
  ): Promise<ApprovalRequest> {
    const approvalCheck = await this.requiresApproval(
      entityType,
      productType,
      sumInsured,
      riskScore
    );

    if (!approvalCheck.requires) {
      await this.autoApproveEntity(entityId, entityType, requestedBy, approvalCheck.reason);
      return {
        id: uuidv4(),
        requestNumber: `REQ-${Date.now()}`,
        entityId,
        entityType,
        currentLevel: '',
        status: 'APPROVED',
        requestedBy,
        submittedAt: new Date(),
        approvalMetadata: { ...metadata, auto_approved: true, reason: approvalCheck.reason }
      };
    }

    const existingRequest = await this.getPendingRequest(entityId, entityType);
    if (existingRequest) {
      return existingRequest;
    }

    const requestNumber = `REQ-${Date.now()}`;
    const firstLevel = approvalCheck.approvalFlow?.[0];
    const approvalMetadata = {
      ...metadata,
      rule_id: approvalCheck.rule?.id,
      product_type: productType,
      sum_insured: sumInsured,
      risk_score: riskScore,
      approval_flow: approvalCheck.approvalFlow?.map(level => ({
        id: level.id,
        levelCode: level.levelCode,
        levelName: level.levelName,
        department: level.department,
        levelOrder: level.levelOrder,
        canApprove: level.canApprove,
        canReject: level.canReject,
        maxAmountLimit: level.maxAmountLimit
      }))
    };

    const insertResult = await pool.query(
      `INSERT INTO approval_requests
       (id, request_number, entity_type, entity_id, requested_by, current_level, status, priority, approval_metadata, submitted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 'NORMAL', $7, NOW(), NOW(), NOW())
       RETURNING *`,
      [uuidv4(), requestNumber, entityType, entityId, requestedBy, firstLevel?.id || '', approvalMetadata]
    );

    const request = insertResult.rows[0];

    if (firstLevel) {
      await this.notifyApprovers(request.id, firstLevel);
    }

    await this.updateEntityStatus(entityId, entityType, 'PENDING_APPROVAL');

    return this.mapApprovalRequestRow(request);
  }

  async getPendingRequest(entityId: string, entityType: string): Promise<ApprovalRequest | null> {
    const result = await pool.query(
      `SELECT * FROM approval_requests WHERE entity_id = $1 AND entity_type = $2 AND status = 'PENDING' ORDER BY submitted_at DESC LIMIT 1`,
      [entityId, entityType]
    );

    if (!result.rows.length) return null;
    return this.mapApprovalRequestRow(result.rows[0]);
  }

  async processApproval(
    requestId: string,
    approverId: string,
    approverRole: string,
    action: 'APPROVED' | 'REJECTED' | 'REQUIRES_MODIFICATION',
    comments: string = ''
  ): Promise<{
    success: boolean;
    completed: boolean;
    nextLevelIndex?: number;
    nextLevel?: RoleLevel;
    status: string;
  }> {
    const requestResult = await pool.query(
      `SELECT * FROM approval_requests WHERE id = $1`,
      [requestId]
    );

    if (!requestResult.rows.length) {
      throw new Error('Approval request not found');
    }

    const request = requestResult.rows[0];
    const approvalFlow: RoleLevel[] = (request.approval_metadata?.approval_flow || []) as RoleLevel[];
    const currentLevelIndex = approvalFlow.findIndex(level => level.id === request.current_level);

    if (currentLevelIndex === -1) {
      throw new Error('Current approval level not found in the request flow');
    }

    const currentLevel = approvalFlow[currentLevelIndex];

    if (!(await this.isApproverAuthorized(approverRole, currentLevel, approverId))) {
      throw new Error('You are not authorized to approve this request');
    }

    await pool.query(
      `INSERT INTO approval_history
       (id, request_id, approved_by, approval_level, decision, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), requestId, approverId, request.current_level, action, comments]
    );

    if (action === 'REJECTED') {
      await pool.query(`UPDATE approval_requests SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`, [requestId]);
      await this.updateEntityStatus(request.entity_id, request.entity_type, 'REJECTED');
      return { success: true, completed: true, status: 'REJECTED' };
    }

    if (action === 'REQUIRES_MODIFICATION') {
      await pool.query(`UPDATE approval_requests SET status = 'REQUIRES_MODIFICATION', updated_at = NOW() WHERE id = $1`, [requestId]);
      await this.updateEntityStatus(request.entity_id, request.entity_type, 'REQUIRES_MODIFICATION');
      return { success: true, completed: true, status: 'REQUIRES_MODIFICATION' };
    }

    const isLastLevel = currentLevelIndex === approvalFlow.length - 1;

    if (isLastLevel) {
      await pool.query(`UPDATE approval_requests SET status = 'APPROVED', updated_at = NOW() WHERE id = $1`, [requestId]);
      await this.finalizeApproval(request.entity_id, request.entity_type);
      return { success: true, completed: true, status: 'APPROVED' };
    }

    const nextLevelIndex = currentLevelIndex + 1;
    const nextLevel = approvalFlow[nextLevelIndex];

    await pool.query(`UPDATE approval_requests SET current_level = $1, updated_at = NOW() WHERE id = $2`, [nextLevel.id, requestId]);
    await this.notifyApprovers(requestId, nextLevel);

    return {
      success: true,
      completed: false,
      nextLevelIndex,
      nextLevel,
      status: 'PENDING'
    };
  }

  async getUserPendingApprovals(userId: string, userRole: string, userDepartment?: string): Promise<any[]> {
    const levelsResult = await pool.query(
      `SELECT * FROM role_levels WHERE is_active = true AND (level_code = $1 OR (department = $2 AND can_approve = true)) ORDER BY level_order ASC`,
      [userRole, userDepartment || null]
    );

    const userLevelIds = levelsResult.rows.map((row: any) => row.id);
    if (!userLevelIds.length) return [];

    const requests = await pool.query(
      `SELECT ar.*, u.first_name, u.last_name, u.email
       FROM approval_requests ar
       JOIN users u ON ar.requested_by = u.id
       WHERE ar.status = 'PENDING' AND ar.current_level = ANY($1)
       ORDER BY ar.submitted_at ASC`,
      [userLevelIds]
    );

    return await Promise.all(requests.rows.map(async (request: any) => {
      let referenceNumber = request.entity_id;

      if (request.entity_type === 'POLICY') {
        const policyResult = await pool.query(`SELECT policy_number FROM policies WHERE id = $1`, [request.entity_id]);
        referenceNumber = policyResult.rows[0]?.policy_number || referenceNumber;
      } else if (request.entity_type === 'CLAIM') {
        const claimResult = await pool.query(`SELECT claim_number FROM claims WHERE id = $1`, [request.entity_id]);
        referenceNumber = claimResult.rows[0]?.claim_number || referenceNumber;
      }

      const approvalFlow: RoleLevel[] = (request.approval_metadata?.approval_flow || []) as RoleLevel[];
      const currentLevelIndex = approvalFlow.findIndex(level => level.id === request.current_level);
      const currentApprovalLevel = approvalFlow[currentLevelIndex];

      return {
        ...request,
        reference_number: referenceNumber,
        requester_name: `${request.first_name || ''} ${request.last_name || ''}`.trim(),
        requester_email: request.email,
        current_approval_level: currentApprovalLevel
      };
    }));
  }

  async getApprovalHistory(entityId: string, entityType: string): Promise<ApprovalHistory[]> {
    const result = await pool.query(
      `SELECT ah.*, u.first_name, u.last_name, u.email
       FROM approval_history ah
       JOIN approval_requests ar ON ah.request_id = ar.id
       JOIN users u ON ah.approved_by = u.id
       WHERE ar.entity_id = $1 AND ar.entity_type = $2
       ORDER BY ah.created_at ASC`,
      [entityId, entityType]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      requestId: row.request_id,
      approvedBy: row.approved_by,
      approvalLevel: row.approval_level,
      decision: row.decision,
      notes: row.notes || '',
      approvedAt: row.approved_at,
      createdAt: row.created_at
    }));
  }

  private async isApproverAuthorized(approverRole: string, level: RoleLevel, approverId: string): Promise<boolean> {
    if (!level) return false;
    if (approverRole === 'MASTER_ADMIN') return true;

    const result = await pool.query(`SELECT role FROM users WHERE id = $1`, [approverId]);
    const user = result.rows[0];
    return !!user && user.role === level.levelCode && level.canApprove === true;
  }

  private async autoApproveEntity(
    entityId: string,
    entityType: string,
    approvedBy: string,
    reason?: string
  ): Promise<void> {
    await this.finalizeApproval(entityId, entityType);
  }

  private async finalizeApproval(entityId: string, entityType: string): Promise<void> {
    switch (entityType) {
      case 'POLICY':
        await pool.query(`UPDATE policies SET status = 'ACTIVE', approved_at = NOW() WHERE id = $1`, [entityId]);
        break;
      case 'CLAIM':
        await pool.query(`UPDATE claims SET status = 'APPROVED' WHERE id = $1`, [entityId]);
        break;
      case 'PAYMENT':
        await pool.query(`UPDATE payments SET status = 'COMPLETED', paid_at = NOW() WHERE id = $1`, [entityId]);
        break;
    }
  }

  private async updateEntityStatus(entityId: string, entityType: string, status: string): Promise<void> {
    switch (entityType) {
      case 'POLICY':
        await pool.query(`UPDATE policies SET status = $1 WHERE id = $2`, [status, entityId]);
        break;
      case 'CLAIM':
        await pool.query(`UPDATE claims SET status = $1 WHERE id = $2`, [status, entityId]);
        break;
      case 'PAYMENT':
        await pool.query(`UPDATE payments SET status = $1 WHERE id = $2`, [status, entityId]);
        break;
    }
  }

  private async notifyApprovers(requestId: string, level: RoleLevel): Promise<void> {
    if (!level) return;

    const result = await pool.query(
      `SELECT ar.*, u.first_name, u.last_name, u.email
       FROM approval_requests ar
       JOIN users u ON ar.requested_by = u.id
       WHERE ar.id = $1`,
      [requestId]
    );

    if (!result.rows.length) return;
    const request = result.rows[0];

    const approvers = await pool.query(
      `SELECT id, email, first_name, last_name FROM users WHERE role = $1 AND status = 'ACTIVE'`,
      [level.levelCode]
    );

    approvers.rows.forEach((approver: any) => {
      console.log(`[NOTIFICATION] Approval required for request ${requestId}`);
      console.log(`  To: ${approver.email} (${approver.first_name} ${approver.last_name})`);
      console.log(`  Role: ${level.levelName} (${level.levelCode})`);
      console.log(`  Entity: ${request.entity_type} - ${request.entity_id}`);
      console.log(`  Requested by: ${request.first_name} ${request.last_name}`);
    });
  }

  async getApprovalStats(userId?: string, userRole?: string): Promise<any> {
    const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS count FROM approval_requests WHERE status = 'PENDING'`),
      pool.query(`SELECT COUNT(*) AS count FROM approval_requests WHERE status = 'APPROVED'`),
      pool.query(`SELECT COUNT(*) AS count FROM approval_requests WHERE status = 'REJECTED'`)
    ]);

    const pendingCount = parseInt(pendingResult.rows[0].count || '0', 10);
    const approvedCount = parseInt(approvedResult.rows[0].count || '0', 10);
    const rejectedCount = parseInt(rejectedResult.rows[0].count || '0', 10);

    const approvedRequests = await pool.query(
      `SELECT submitted_at, updated_at FROM approval_requests WHERE status = 'APPROVED'`
    );

    const approvedDurations = approvedRequests.rows
      .filter((r: any) => r.submitted_at && r.updated_at)
      .map((r: any) => (new Date(r.updated_at).getTime() - new Date(r.submitted_at).getTime()) / 3600000);

    const avgApprovalHours = approvedDurations.length
      ? approvedDurations.reduce((sum, hours) => sum + hours, 0) / approvedDurations.length
      : 0;

    const pendingByLevelResult = await pool.query(
      `SELECT ar.current_level, rl.level_order, rl.level_name, rl.level_code, COUNT(*) as count
       FROM approval_requests ar
       JOIN role_levels rl ON ar.current_level = rl.id
       WHERE ar.status = 'PENDING'
       GROUP BY ar.current_level, rl.level_order, rl.level_name, rl.level_code
       ORDER BY rl.level_order ASC`
    );

    const recentRequestsResult = await pool.query(
      `SELECT ar.*, u.first_name, u.last_name, u.email,
              p.policy_number, c.claim_number
       FROM approval_requests ar
       JOIN users u ON ar.requested_by = u.id
       LEFT JOIN policies p ON ar.entity_type = 'POLICY' AND ar.entity_id = p.id
       LEFT JOIN claims c ON ar.entity_type = 'CLAIM' AND ar.entity_id = c.id
       WHERE ar.status IN ('APPROVED', 'REJECTED')
       ORDER BY ar.updated_at DESC
       LIMIT 10`
    );

    const recentApprovals = recentRequestsResult.rows.map((request: any) => ({
      ...request,
      requester_name: `${request.first_name || ''} ${request.last_name || ''}`.trim(),
      requester_email: request.email,
      reference_number: request.policy_number || request.claim_number || request.entity_id
    }));

    return {
      overview: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        averageApprovalTime: parseFloat(avgApprovalHours.toFixed(1))
      },
      pendingByLevel: pendingByLevelResult.rows.map((row: any) => ({
        level: row.level_order,
        levelName: row.level_name,
        levelCode: row.level_code,
        count: parseInt(row.count, 10)
      })),
      recentApprovals
    };
  }

  async getApprovalFlow(entityId: string, entityType: string): Promise<any> {
    const result = await pool.query(
      `SELECT ar.*, u.first_name, u.last_name, u.email
       FROM approval_requests ar
       JOIN users u ON ar.requested_by = u.id
       WHERE ar.entity_id = $1 AND ar.entity_type = $2 AND ar.status = 'PENDING'
       ORDER BY ar.submitted_at DESC
       LIMIT 1`,
      [entityId, entityType]
    );

    if (!result.rows.length) {
      return { hasActiveRequest: false, levels: [] };
    }

    const request = result.rows[0];
    const approvalFlow: RoleLevel[] = (request.approval_metadata?.approval_flow || []) as RoleLevel[];
    const currentLevelIndex = approvalFlow.findIndex((level: any) => level.id === request.current_level);

    const flow = approvalFlow.map((level: any, index: number) => ({
      id: level.id,
      levelCode: level.levelCode,
      levelName: level.levelName,
      department: level.department,
      levelOrder: level.levelOrder,
      status: index < currentLevelIndex ? 'COMPLETED' : index === currentLevelIndex ? 'PENDING' : 'WAITING',
      canApprove: index === currentLevelIndex,
      maxAmountLimit: level.maxAmountLimit
    }));

    return {
      hasActiveRequest: true,
      requestId: request.id,
      currentLevel: currentLevelIndex + 1,
      totalLevels: approvalFlow.length,
      levels: flow,
      requestedBy: `${request.first_name || ''} ${request.last_name || ''}`.trim(),
      requestedAt: request.submitted_at,
      metadata: request.approval_metadata
    };
  }
}

export default new ApprovalService();
