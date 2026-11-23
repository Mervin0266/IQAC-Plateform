import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import sections from '../public-report-sections.json';
import { reportRequest } from '../publicReports';
import type { Metrics, PeriodReport, PublicRecord, Report, ReportSection } from '../publicReports';
import { ReportContent } from './PublicReportView';

const emptyReport: Report = { source: '', url: '', metrics: {}, records: [] };
const emptyRecord: PublicRecord = { title: '', category: '', detail: '', url: '' };
const periodPattern = '[0-9]{4}(-([0-9]{2}|[0-9]{4}))?';

export function PublicReportEditor({ section }: { section: ReportSection }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PeriodReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [period, setPeriod] = useState('');
  const [report, setReport] = useState(emptyReport);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const token = user?.token;
  const path = '/admin/' + section;
  const current = rows.find(row => row.period === selectedPeriod);
  const definition = sections[section];

  function select(row?: PeriodReport) {
    setSelectedPeriod(row?.period ?? '');
    setPeriod(row?.period ?? '');
    setReport(row?.draft ?? row?.published ?? emptyReport);
    setDirty(false);
    setPreview(false);
  }

  async function load(signal?: AbortSignal) {
    setBusy(true);
    setError('');
    try {
      const reports = await reportRequest<PeriodReport[]>(path, { headers: { Authorization: 'Bearer ' + token }, signal });
      if (signal?.aborted) return;
      setRows(reports);
      setLoaded(true);
      select(reports.find(row => row.period === period) ?? reports[0]);
    } catch (failure) {
      if (!signal?.aborted) setError((failure as Error).message);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [path, token]);

  function change(update: Partial<Report>) {
    setReport(previous => ({ ...previous, ...update }));
    setDirty(true);
    setNotice('');
  }

  async function run<T>(task: () => Promise<T>, success: (result: T) => void) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      success(await task());
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function persist(action: 'save' | 'publish' | 'archive') {
    return run(() => reportRequest<PeriodReport>(path + '/' + encodeURIComponent(period), {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: current?.version ?? 0, report }),
    }), row => {
      setRows(previous => [row, ...previous.filter(item => item.period !== row.period)].sort((a, b) => b.period.localeCompare(a.period)));
      select(row);
      setNotice(action === 'save' ? 'Draft saved.' : action === 'publish' ? 'Report published.' : 'Report archived.');
    });
  }

  function updateRecord(index: number, field: keyof PublicRecord, value: string) {
    change({ records: report.records.map((record, position) => position === index ? { ...record, [field]: value } : record) });
  }

  return <details className="iq-report-panel iq-report-editor">
    <summary>Manage public report <span>{definition.title}</span></summary>
    <div className="space-y-4">
      {error && <p role="alert">{error} <button type="button" disabled={busy} onClick={() => void load()}>Reload reports</button></p>}
      {notice && <p role="status">{notice}</p>}
      {busy && !loaded && <p role="status">Loading reports…</p>}
      {loaded && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void persist('save'); }}>
        <fieldset disabled={busy} className="space-y-4">
          <div className="iq-report-filters">
            <label>Saved periods<select value={current?.period ?? ''} onChange={event => {
              if (!dirty || window.confirm('Discard unsaved changes?')) select(rows.find(row => row.period === event.target.value));
            }}>
              <option value="">New report</option>
              {rows.map(row => <option key={row.period} value={row.period}>{row.period} · {row.published ? row.draft ? 'Published with draft' : 'Published' : 'Unpublished draft'}</option>)}
            </select></label>
            <label>Reporting period<input required readOnly={!!current} value={period} pattern={periodPattern} placeholder="2025 or 2025-26"
              onChange={event => { setPeriod(event.target.value); setDirty(true); }} /></label>
            <label>Public source name<input required maxLength={160} value={report.source} onChange={event => change({ source: event.target.value })} /></label>
            <label>Public source URL<input type="url" maxLength={500} value={report.url} placeholder="https://" onChange={event => change({ url: event.target.value })} /></label>
          </div>
          {section === 'placements-internships' && <div>
            <button type="button" disabled={!period} onClick={() => void run(
              () => reportRequest<Metrics>('/admin/placements-summary?batch=' + encodeURIComponent(period), { headers: { Authorization: 'Bearer ' + token } }),
              metrics => {
                const merged = { ...metrics };
                const letters = report.metrics['Students with internship offer letters'];
                if (letters !== undefined) merged['Students with internship offer letters'] = letters;
                change({ metrics: merged });
              }
            )}>Calculate from placement records</button>
            <p>Uses the exact batch and full-time placement records. Enter the verified internship offer letter count separately.</p>
          </div>}
          <div className="iq-report-filters">
            {Object.entries(definition.metrics).map(([label, kind]) => {
              const numeric = kind !== 'text' && kind !== 'date';
              return <label key={label}>{label}<input type={numeric ? 'number' : kind} min={numeric ? 0 : undefined}
                max={label === 'NAAC CGPA' ? 4 : undefined} maxLength={30} step={kind === 'count' ? 1 : 'any'}
                value={report.metrics[label] ?? ''} onChange={event => {
                  const value = event.target.value;
                  change({ metrics: { ...report.metrics, [label]: numeric && value !== '' ? Number(value) : value } });
                }} /></label>;
            })}
          </div>
          <h3>Public records</h3>
          <datalist id="report-categories">{definition.categories.map(name => <option key={name} value={name} />)}</datalist>
          <p>Enter approved public details and source links. Keep student identifiers, contact details, and offer letters in the staff records.</p>
          {report.records.map((record, index) => <fieldset key={index} className="iq-report-filters iq-report-record-editor">
            <legend>Record {index + 1}</legend>
            <label>Title<input required maxLength={160} value={record.title} onChange={event => updateRecord(index, 'title', event.target.value)} /></label>
            <label>Category<input list="report-categories" maxLength={80} value={record.category} onChange={event => updateRecord(index, 'category', event.target.value)} /></label>
            <label>Details<textarea maxLength={600} value={record.detail} onChange={event => updateRecord(index, 'detail', event.target.value)} /></label>
            <label>Public source URL<input type="url" maxLength={500} value={record.url} onChange={event => updateRecord(index, 'url', event.target.value)} /></label>
            <button type="button" onClick={() => change({ records: report.records.filter((_, position) => position !== index) })}>Remove record {index + 1}</button>
          </fieldset>)}
          <div className="iq-report-actions">
            <button type="button" disabled={report.records.length >= 100} onClick={() => change({ records: [...report.records, emptyRecord] })}>Add public record</button>
            <button type="submit">Save draft</button>
            <button type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? 'Hide preview' : 'Preview public view'}</button>
            <button type="button" disabled={dirty || !current?.draft} onClick={() => void persist('publish')}>Publish saved draft</button>
            <button type="button" disabled={dirty || !current?.published} onClick={() => {
              if (window.confirm('Archive this report and remove it from public view?')) void persist('archive');
            }}>Archive published report</button>
          </div>
        </fieldset>
      </form>}
      {preview && <section aria-label="Public report preview"><h3>Preview</h3><ReportContent key={period} section={section} period={period} report={report} /></section>}
    </div>
  </details>;
}
