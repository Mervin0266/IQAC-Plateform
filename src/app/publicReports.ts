import { useEffect, useState } from 'react';
import sections from './public-report-sections.json';

export type ReportSection = keyof typeof sections;
export type PublicRecord = { title: string; category: string; detail: string; url: string };
export type Metrics = Record<string, number | string>;
export type Report = { source: string; url: string; metrics: Metrics; records: PublicRecord[] };
export type PublishedReport = { period: string; published: Report; publishedAt: string };
export type PeriodReport = {
  period: string;
  version: number;
  draft: Report | null;
  published: Report | null;
};
export type Overview = Partial<Record<ReportSection, {
  period: string;
  published: Omit<Report, 'records'>;
  publishedAt: string;
}>>;

export const demoReports = import.meta.env.DEV && import.meta.env.VITE_ENABLE_REPORT_DEMO === 'true';

export function isReportSection(value: string): value is ReportSection {
  return Object.prototype.hasOwnProperty.call(sections, value);
}

export function reportMetric(section: ReportSection, label: string, value: number | string | undefined) {
  if (value === undefined) return 'Data unavailable';
  const type = (sections[section].metrics as Record<string, string>)[label];
  if (type === 'date') return new Date(value + 'T00:00:00Z').toLocaleDateString('en-IN', { dateStyle: 'long', timeZone: 'UTC' });
  if (typeof value === 'string') return value;
  if (type === 'package') return '₹' + value.toFixed(2) + ' LPA';
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export async function reportRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/+$/, '');
  const response = await fetch(base + '/api/public-reports' + path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body === null) throw new Error(body?.message || 'Reports are temporarily unavailable.');
  return body as T;
}

export function usePublicReport<T>(path: string) {
  const [result, setResult] = useState<{ data?: T; failed?: boolean }>({});
  useEffect(() => {
    const controller = new AbortController();
    setResult({});
    reportRequest<T>(path, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult({ data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ failed: true }); });
    return () => controller.abort();
  }, [path]);
  return result;
}
