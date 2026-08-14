import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { cn } from '../../lib/utils';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            {columns.map((column, index) => (
              <TableHead key={index} className={cn('font-semibold uppercase tracking-[0.12em] text-slate-500', column.className)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              className={cn(onRowClick && 'cursor-pointer transition-colors hover:bg-slate-50/80')}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={cn('text-sm text-slate-600', column.className)}>
                  {typeof column.accessor === 'function'
                    ? column.accessor(item)
                    : (item[column.accessor] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}