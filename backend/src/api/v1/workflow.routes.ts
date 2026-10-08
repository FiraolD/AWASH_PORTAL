import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import { workflowService } from '../../services/workflow.service.js';

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
