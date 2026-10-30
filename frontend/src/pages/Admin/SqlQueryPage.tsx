import * as React from 'react';
import { AlertTriangle, Clock3, Copy, Database, Play, RotateCcw, ShieldCheck, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  maxRows: number;
  durationMs: number;
  readOnly: boolean;
};

const DEFAULT_QUERY = 'SELECT table_schema, table_name\nFROM information_schema.tables\nWHERE table_schema NOT IN (\'pg_catalog\', \'information_schema\')\nORDER BY table_schema, table_name\nLIMIT 50;';

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function SqlQueryPage() {
  const [sql, setSql] = React.useState(DEFAULT_QUERY);
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [error, setError] = React.useState('');
  const [running, setRunning] = React.useState(false);

  const executeQuery = async () => {
    if (!sql.trim()) {
      toast.error('Enter a SQL query first.');
      return;
    }

    setRunning(true);
    setError('');
    setResult(null);
    try {
      const response = await apiClient.post<QueryResult>('/admin/sql/query', { sql });
      setResult(response.data);
      toast.success(`Query completed: ${response.data.rowCount} row(s)`);
    } catch (requestError: any) {
      const message = requestError.response?.data?.error || 'Unable to execute the query.';
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  const copyResults = async () => {
    if (!result) return;
    const csv = [
      result.columns.join('\t'),
      ...result.rows.map((row) => row.map((value) => displayValue(value).replace(/\t/g, ' ')).join('\t')),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      toast.success('Results copied as tab-separated text.');
    } catch {
      toast.error('Could not access the clipboard.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-[#1A3E6F]"><Database className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A3E6F] sm:text-3xl">SQL Query Console</h1>
              <p className="mt-1 text-sm text-slate-500">Inspect production database records and schema.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Read-only mode
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Production database safety restrictions</p>
            <p className="mt-1">Only one SELECT or read-only CTE statement is accepted. INSERT, UPDATE, DELETE, schema changes, and other write operations are blocked. Each query has a 5-second timeout and results are capped at 200 rows. Query activity is audited.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> SQL Editor</CardTitle>
            <span className="text-xs text-slate-500">Maximum 10,000 characters</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
            aria-label="SQL query"
            className="min-h-[240px] w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-6 text-emerald-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="SELECT * FROM users LIMIT 20;"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={executeQuery} disabled={running || !sql.trim()} className="bg-[#1A3E6F] hover:bg-[#14345e]">
              <Play className="mr-2 h-4 w-4" /> {running ? 'Executing…' : 'Run query'}
            </Button>
            <Button variant="outline" onClick={() => { setSql(DEFAULT_QUERY); setError(''); setResult(null); }} disabled={running}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            {result && <Button variant="outline" onClick={copyResults}><Copy className="mr-2 h-4 w-4" /> Copy results</Button>}
          </div>
          <p className="text-xs text-slate-500">Tip: use information_schema.tables to inspect available tables. Quote mixed-case PostgreSQL identifiers, for example <code className="rounded bg-slate-100 px-1 py-0.5">"createdAt"</code>.</p>
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2"><Table2 className="h-5 w-5" /> Query Results</CardTitle>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{result.rowCount} row(s)</span>
                <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {result.durationMs} ms</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {result.truncated && <p className="mb-3 text-sm text-amber-700">Showing the first {result.maxRows} rows. Refine your query to retrieve a smaller result set.</p>}
            {result.rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Query returned no rows.</p>
            ) : (
              <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>{result.columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-semibold text-slate-700">{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">
                        {row.map((value, columnIndex) => (
                          <td key={columnIndex} className="max-w-[420px] whitespace-pre-wrap break-words px-3 py-2 align-top font-mono text-xs text-slate-700">{displayValue(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
