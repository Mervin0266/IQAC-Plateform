import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { GitBranch, Layers, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { Card } from './ui/card';
import { useAuth } from '../contexts/AuthContext';
import { LineageAnalyticsResponse, TimelineDataPoint } from '../types/lineage';

const FALLBACK_LINEAGE_DATA: LineageAnalyticsResponse = {
  success: true,
  lineageEvent: {
    domainGroup: 'Computing Domain',
    parentDepartment: 'Computer Science and Engineering',
    childDepartment: 'Artificial Intelligence and Data Science',
    splitAcademicYear: '2024-25',
    markerLabel: 'ADSE Spun off from CSE'
  },
  timeline: [
    { academicYear: '2020-21', isSplitYear: false, cse: { placed: 150, publications: 32 }, adse: { placed: 0, publications: 0 }, combinedDomain: { placed: 150, publications: 32 } },
    { academicYear: '2021-22', isSplitYear: false, cse: { placed: 160, publications: 38 }, adse: { placed: 0, publications: 0 }, combinedDomain: { placed: 160, publications: 38 } },
    { academicYear: '2022-23', isSplitYear: false, cse: { placed: 168, publications: 45 }, adse: { placed: 0, publications: 0 }, combinedDomain: { placed: 168, publications: 45 } },
    { academicYear: '2023-24', isSplitYear: false, cse: { placed: 170, publications: 52 }, adse: { placed: 0, publications: 0 }, combinedDomain: { placed: 170, publications: 52 } },
    { academicYear: '2024-25', isSplitYear: true,  cse: { placed: 112, publications: 36 }, adse: { placed: 87, publications: 28 }, combinedDomain: { placed: 199, publications: 64 } },
    { academicYear: '2025-26', isSplitYear: false, cse: { placed: 120, publications: 40 }, adse: { placed: 95, publications: 34 }, combinedDomain: { placed: 215, publications: 74 } }
  ]
};

export const DepartmentLineageTrends: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<LineageAnalyticsResponse>(FALLBACK_LINEAGE_DATA);
  const [viewMode, setViewMode] = useState<'separate' | 'combined'>('separate');
  const [activeMetric, setActiveMetric] = useState<'placed' | 'publications'>('placed');
  const [loading, setLoading] = useState<boolean>(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchLineage = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/department-lineage/domain-trends?domainGroup=Computing Domain`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const json = await res.json();
        if (json.success && json.timeline) {
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching lineage data, using fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLineage();
  }, [user]);

  // Flatten data for Recharts
  const chartData = useMemo(() => {
    return data.timeline.map((item) => ({
      year: item.academicYear,
      'CSE (Parent)': activeMetric === 'placed' ? item.cse.placed : item.cse.publications,
      'ADSE (Child)': activeMetric === 'placed' ? item.adse.placed : item.adse.publications,
      'Combined Computing Domain': activeMetric === 'placed' ? item.combinedDomain.placed : item.combinedDomain.publications,
      isSplitYear: item.isSplitYear
    }));
  }, [data, activeMetric]);

  return (
    <Card className="p-6 bg-white shadow-sm border border-gray-200 space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider">
            <GitBranch className="w-4 h-4" />
            <span>Temporal Lineage & Department Bifurcation Tracking</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Computing Domain: CSE & ADSE Longitudinal Progression
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit-safe tracking with zero historical contamination prior to the {data.lineageEvent.splitAcademicYear} split.
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setActiveMetric('placed')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeMetric === 'placed' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Placements
            </button>
            <button
              onClick={() => setActiveMetric('publications')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeMetric === 'publications' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Publications
            </button>
          </div>

          {/* Separation vs Combined Toggle */}
          <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-200 text-xs">
            <button
              onClick={() => setViewMode('separate')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'separate' ? 'bg-[#1e3a8a] text-white shadow-sm font-semibold' : 'text-blue-700 hover:bg-blue-100'
              }`}
            >
              Split View (CSE vs ADSE)
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'combined' ? 'bg-[#1e3a8a] text-white shadow-sm font-semibold' : 'text-blue-700 hover:bg-blue-100'
              }`}
            >
              Combined Domain View
            </button>
          </div>
        </div>
      </div>

      {/* Historical Audit Notice Box */}
      <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-lg flex items-start space-x-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold">Accreditation Audit Integrity Rule:</span> Historical records from 2020–21 through 2023–24 remain 100% credited to Computer Science & Engineering (CSE) to preserve official NAAC/NIRF submissions. ADSE historical baseline starts strictly from {data.lineageEvent.splitAcademicYear}.
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="w-full h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'separate' ? (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              {/* Vertical Reference Line Marker for the Lineage Event */}
              <ReferenceLine
                x={data.lineageEvent.splitAcademicYear}
                stroke="#dc2626"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `⚡ ${data.lineageEvent.markerLabel}`,
                  position: 'insideTopLeft',
                  fill: '#dc2626',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />

              <Line
                type="monotone"
                dataKey="CSE (Parent)"
                stroke="#1e3a8a"
                strokeWidth={3}
                dot={{ r: 5, fill: '#1e3a8a' }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="ADSE (Child)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5, fill: '#10b981' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="colorDomain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <ReferenceLine
                x={data.lineageEvent.splitAcademicYear}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `⚡ Unified Domain Baseline`,
                  position: 'insideTopLeft',
                  fill: '#d97706',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />

              <Area
                type="monotone"
                dataKey="Combined Computing Domain"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorDomain)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
