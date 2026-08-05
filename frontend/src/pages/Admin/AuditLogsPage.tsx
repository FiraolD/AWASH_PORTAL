import * as React from 'react';
import { Search, Filter, RefreshCw, FileText, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const { token } = useAuthStore();

  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [actions, setActions] = React.useState<string[]>([]);
  const [entityTypes, setEntityTypes] = React.useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = React.useState('all');
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  // --------------------------------------------------------------------------
  // Auth headers
  // --------------------------------------------------------------------------
  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  // --------------------------------------------------------------------------
  // Fetch filter options
  // --------------------------------------------------------------------------
  const fetchFilterOptions = async () => {
    try {
      const [actionsRes, entityTypesRes] = await Promise.all([
        axios.get(`${API_URL}/audit/actions`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/audit/entity-types`, { headers: getAuthHeaders() }),
      ]);
      setActions(actionsRes.data || []);
      setEntityTypes(entityTypesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  // --------------------------------------------------------------------------
  // Fetch logs
  // --------------------------------------------------------------------------
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (entityTypeFilter !== 'all') params.entityType = entityTypeFilter;

      const response = await axios.get(`${API_URL}/audit`, {
        headers: getAuthHeaders(),
        params,
      });

      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Initial load
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    fetchFilterOptions();
    fetchLogs();
  }, []);

  // Refetch when filters change
  React.useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityTypeFilter]);

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      APPROVE: 'bg-green-100 text-green-800',
      REJECT: 'bg-red-100 text-red-800',
      REVIEWED: 'bg-cyan-100 text-cyan-800',
      ACTIVATE: 'bg-green-100 text-green-800',
      DEACTIVATE: 'bg-yellow-100 text-yellow-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatJSON = (value: any) => {
    if (!value) return 'N/A';
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(value);
    }
  };

  // --------------------------------------------------------------------------
  // Loading
  // --------------------------------------------------------------------------
  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system activities and changes</p>
        </div>
        <Button variant="outline" onClick={() => fetchLogs(pagination.page)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity Types</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {logs.length} of {pagination.total} log entries
      </p>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Audit Logs Found</h3>
              <p className="text-gray-500">
                Audit logs will appear here when system actions are performed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr className="text-left text-sm">
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Entity Type</th>
                    <th className="p-3 font-semibold">Entity ID</th>
                    <th className="p-3 font-semibold">User ID</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <Badge className={getActionBadge(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{log.entityType?.replace(/_/g, ' ')}</td>
                      <td className="p-3 text-sm font-mono text-xs">
                        {log.entityId?.substring(0, 12)}...
                      </td>
                      <td className="p-3 text-sm font-mono text-xs">
                        {log.userId?.substring(0, 12)}...
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchLogs(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchLogs(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[80vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit Log Detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Action</p>
                  <Badge className={getActionBadge(selectedLog.action)}>{selectedLog.action}</Badge>
                </div>
                <div>
                  <p className="text-gray-500">Entity Type</p>
                  <p className="font-medium">{selectedLog.entityType?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Entity ID</p>
                  <p className="font-mono text-xs">{selectedLog.entityId}</p>
                </div>
                <div>
                  <p className="text-gray-500">User ID</p>
                  <p className="font-mono text-xs">{selectedLog.userId}</p>
                </div>
                <div>
                  <p className="text-gray-500">IP Address</p>
                  <p className="font-mono text-xs">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p>{formatDate(selectedLog.createdAt)}</p>
                </div>
              </div>

              {selectedLog.oldValues && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Old Values</p>
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto max-h-40">
                    {formatJSON(selectedLog.oldValues)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">New Values</p>
                  <pre className="text-xs bg-blue-50 p-3 rounded-lg overflow-x-auto max-h-40">
                    {formatJSON(selectedLog.newValues)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}