import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, FileText, RefreshCw, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type Task = {
  id: string; entity_type: string; entity_id: string; workflow_name: string; workflow_code: string;
  step_name: string; authority_level_code?: string; due_at?: string; context?: any;
  requester_first_name?: string; requester_last_name?: string; current_step_order?: number;
};

export default function ApprovalWorkbenchPage() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading, refetch } = useQuery<Task[]>({
    queryKey: ['approval-workbench'],
    queryFn: async () => (await apiClient.get('/workflow/workbench')).data,
  });

  const decision = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) =>
      (await apiClient.post(`/workflow/tasks/${id}/decision`, {
        decision,
        comment: window.prompt('Decision comment (recommended):') || '',
      })).data,
    onSuccess: (_, variables) => {
      toast.success(variables.decision === 'APPROVED' ? 'Approval recorded' : 'Workflow decision recorded');
      qc.invalidateQueries({ queryKey: ['approval-workbench'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Unable to record decision'),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Workbench</h1>
          <p className="text-sm text-slate-500">One governed queue for policy, claim and other approval workflows.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">My pending tasks</p><p className="text-3xl font-bold">{tasks.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Due soon</p><p className="text-3xl font-bold">{tasks.filter(t => t.due_at && new Date(t.due_at).getTime() - Date.now() < 86400000).length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Workflow controlled</p><p className="text-3xl font-bold">100%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My Approval Queue</CardTitle></CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-slate-500">No approval tasks are currently assigned to you.</div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="rounded-xl border p-4 hover:bg-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{task.entity_type}</Badge>
                        <Badge>{task.step_name}</Badge>
                        {task.authority_level_code && <Badge>{task.authority_level_code}</Badge>}
                      </div>
                      <h3 className="mt-2 font-semibold">{task.workflow_name}</h3>
                      <p className="text-sm text-slate-600">Reference: {task.context?.referenceNumber || task.entity_id}</p>
                      <p className="text-sm text-slate-500">Requester: {[task.requester_first_name, task.requester_last_name].filter(Boolean).join(' ') || 'Unknown'}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span><FileText className="mr-1 inline h-3 w-3" />Step {task.current_step_order ?? '-'}</span>
                        {task.due_at && <span><Clock className="mr-1 inline h-3 w-3" />Due {new Date(task.due_at).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={decision.isPending} onClick={() => decision.mutate({ id: task.id, decision: 'APPROVED' })}>
                        <CheckCircle className="mr-2 h-4 w-4" />Approve
                      </Button>
                      <Button variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({ id: task.id, decision: 'REQUIRES_MODIFICATION' })}>
                        <RotateCcw className="mr-2 h-4 w-4" />Return
                      </Button>
                      <Button variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({ id: task.id, decision: 'REJECTED' })}>
                        <XCircle className="mr-2 h-4 w-4" />Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
