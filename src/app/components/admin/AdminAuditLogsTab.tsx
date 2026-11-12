import React, { useEffect, useState } from 'react';
import { History, Search, Download, Eye, Filter, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { adminFetch } from './adminApi';

interface AdminAuditLogsTabProps {
  token: string;
}

export function AdminAuditLogsTab({ token }: AdminAuditLogsTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const loadLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (search.trim()) params.set('search', search.trim());
      if (moduleFilter !== 'all') params.set('module', moduleFilter);
      if (resultFilter !== 'all') params.set('result', resultFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await adminFetch(`/api/admin/audit-logs?${params.toString()}`, token);
      setLogs(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [token, moduleFilter, resultFilter]);

  const exportCsv = () => {
    const headers = ['Timestamp', 'Correlation ID', 'Admin Identity', 'Action', 'Module', 'Entity', 'Record ID', 'Result', 'Remarks'];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.correlationId || '',
      l.adminIdentity || l.userName,
      l.action,
      l.module || '',
      l.entity || '',
      l.affectedRecordId || l.recordId || '',
      l.result || 'Success',
      (l.remarks || l.reason || '').replace(/"/g, '""')
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iqac-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Immutable Administrative Audit Trail</h3>
              <p className="text-[11px] text-slate-500">Append-only security & configuration log ({pagination.total} records)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} className="h-8 text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => loadLogs(1)} className="h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs(1)}
              placeholder="Search action, admin, correlation ID..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs"
          >
            <option value="all">All Modules</option>
            <option value="User Management">User Management</option>
            <option value="Roles & Permissions">Roles & Permissions</option>
            <option value="Form Builder">Form Builder</option>
            <option value="Institutional Structure">Institutional Structure</option>
            <option value="System Configuration">System Configuration</option>
            <option value="Module Management">Module Management</option>
            <option value="Data & Configuration">Data & Configuration</option>
          </select>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-xs"
            title="Start Date"
          />
          <div className="flex gap-1.5">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs"
              title="End Date"
            />
            <Button size="sm" onClick={() => loadLogs(1)} className="h-8 px-2.5 text-xs bg-[#2855B9]">
              <Filter className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Administrator</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Module / Entity</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div>{log.adminIdentity || log.userName}</div>
                      {log.correlationId && (
                        <span className="text-[10px] text-slate-400 font-mono">{log.correlationId}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] text-slate-800">{log.action}</span>
                      {log.achievementTitle && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{log.achievementTitle}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {log.module || log.department || 'Platform'}
                      {log.entity && <span className="text-slate-400"> / {log.entity}</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          log.result === 'Failure'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {log.result || 'Success'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadLogs(pagination.page + 1)}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Detail & Diff Inspector Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Audit Entry Inspection ({selectedLog?.action})
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">Audit ID:</span>
                  <p className="font-mono text-[11px] text-slate-900">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-slate-500">Correlation ID:</span>
                  <p className="font-mono text-[11px] text-slate-900">{selectedLog.correlationId || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Administrator:</span>
                  <p className="font-medium text-slate-900">{selectedLog.adminIdentity || selectedLog.userName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>
                  <p className="font-medium text-slate-900">{new Date(selectedLog.createdAt).toLocaleString('en-IN')}</p>
                </div>
                {(selectedLog.reason || selectedLog.remarks) && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Reason / Remarks:</span>
                    <p className="text-slate-900 mt-0.5">{selectedLog.reason || selectedLog.remarks}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Previous Value</p>
                  <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] overflow-x-auto max-h-60">
                    {selectedLog.previousValue ? JSON.stringify(selectedLog.previousValue, null, 2) : 'null'}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 mb-1">New Value</p>
                  <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] overflow-x-auto max-h-60">
                    {selectedLog.updatedValue ? JSON.stringify(selectedLog.updatedValue, null, 2) : 'null'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

