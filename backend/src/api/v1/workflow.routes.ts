import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import { workflowService } from '../../services/workflow.service.js';
import pool from '../../lib/db.js';

const router = Router();

const requireWorkflowAdmin = [authenticate, authorizeExecutives];

router.get('/definitions', ...requireWorkflowAdmin, async (_req, res) => {
  try { res.json(await workflowService.listDefinitions()); }
  catch (e:any) { res.status(500).json({ error: 'Failed to load workflow definitions', detail: e.message }); }
});

router.get('/definitions/:id', ...requireWorkflowAdmin, async (req,res) => {
  try { res.json(await workflowService.getDefinition(req.params.id)); }
  catch (e:any) { res.status(404).json({ error: e.message }); }
});

router.post('/definitions', ...requireWorkflowAdmin, async (req: AuthRequest,res:Response) => {
  try {
    const { code, name, description, entityType } = req.body;
    if (!code || !name || !entityType) return res.status(400).json({ error:'code, name and entityType are required' });
    res.status(201).json(await workflowService.createDefinition({ code, name, description, entityType, createdBy:req.user!.id }));
  } catch (e:any) { res.status(400).json({ error:e.message }); }
});

router.put('/versions/:id/steps', ...requireWorkflowAdmin, async (req: AuthRequest,res:Response) => {
  try {
    if (!Array.isArray(req.body.steps)) return res.status(400).json({ error:'steps must be an array' });
    res.json(await workflowService.saveVersion(req.params.id, req.body.steps, req.user!.id));
  } catch (e:any) { res.status(400).json({ error:e.message }); }
});

router.post('/versions/:id/activate', ...requireWorkflowAdmin, async (req: AuthRequest,res:Response) => {
  try { res.json(await workflowService.activateVersion(req.params.id, req.user!.id)); }
  catch (e:any) { res.status(400).json({ error:e.message }); }
});

router.get('/versions/:id', ...requireWorkflowAdmin, async (req,res) => {
  try { res.json(await workflowService.getVersion(req.params.id)); }
  catch (e:any) { res.status(404).json({ error:e.message }); }
});


router.get('/role-levels', ...requireWorkflowAdmin, async (_req,res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, level_code, level_name, department, level_order FROM role_levels WHERE is_active=true ORDER BY department, level_order'
    );
    res.json(rows);
  } catch (e:any) { res.status(500).json({ error:'Failed to load role levels', detail:e.message }); }
});

router.post('/authorities', ...requireWorkflowAdmin, async (req: AuthRequest,res:Response) => {
  try {
    const { roleLevelId, entityType, productCode, maxAmount, canApprove=true, canReject=true, canModify=true } = req.body;
    if (!roleLevelId || !entityType) return res.status(400).json({ error:'roleLevelId and entityType are required' });
    const existing = await pool.query(
      'SELECT id FROM workflow_authorities WHERE role_level_id=$1 AND entity_type=$2 AND product_code IS NOT DISTINCT FROM $3 LIMIT 1',
      [roleLevelId, entityType, productCode || null]
    );
    const query = existing.rows.length
      ? `UPDATE workflow_authorities SET max_amount=$1,can_approve=$2,can_reject=$3,can_modify=$4,is_active=true WHERE id=$5 RETURNING *`
      : `INSERT INTO workflow_authorities(role_level_id,entity_type,product_code,max_amount,can_approve,can_reject,can_modify,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    const params = existing.rows.length
      ? [maxAmount ?? null,canApprove,canReject,canModify,existing.rows[0].id]
      : [roleLevelId,entityType,productCode||null,maxAmount??null,canApprove,canReject,canModify,req.user!.id];
    const { rows } = await pool.query(query, params);
    res.status(201).json(rows[0]);
  } catch (e:any) { res.status(400).json({ error:e.message }); }
});

router.get('/authorities', ...requireWorkflowAdmin, async (_req,res) => {
  try { res.json(await workflowService.listAuthorities()); }
  catch (e:any) { res.status(500).json({ error:'Failed to load authorities', detail:e.message }); }
});

router.get('/workbench', authenticate, async (req: AuthRequest,res) => {
  try {
    const rows = await workflowService.listWorkbench(req.user!, { status:req.query.status as string | undefined, entityType:req.query.entityType as string | undefined });
    res.json(rows);
  } catch (e:any) { res.status(500).json({ error:'Failed to load approval workbench', detail:e.message }); }
});

router.post('/tasks/:id/decision', authenticate, async (req: AuthRequest,res) => {
  try {
    const { decision, comment } = req.body;
    if (!['APPROVED','REJECTED','REQUIRES_MODIFICATION'].includes(decision)) return res.status(400).json({ error:'Invalid decision' });
    res.json(await workflowService.decide(req.params.id, req.user!, decision, comment ?? ''));
  } catch (e:any) { res.status(403).json({ error:e.message }); }
});

router.get('/instances/:id', authenticate, async (req,res) => {
  try { res.json(await workflowService.getInstance(req.params.id)); }
  catch (e:any) { res.status(404).json({ error:e.message }); }
});

router.get('/history/:entityType/:entityId', authenticate, async (req,res) => {
  try { res.json(await workflowService.getHistory(req.params.entityType, req.params.entityId)); }
  catch (e:any) { res.status(404).json({ error:e.message }); }
});

export default router;
