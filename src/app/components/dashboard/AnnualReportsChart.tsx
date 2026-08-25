/**
 * AnnualReportsChart — Stacked bar chart for completed/pending reports.
 *
 * Extracted from DashboardPage to keep the main page slim.
 */

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/card';
import { CustomTooltip } from './CustomTooltip';
import type { AnnualReportsDataPoint } from '../../types/dashboard';

interface AnnualReportsChartProps {
  data: AnnualReportsDataPoint[];
}

export function AnnualReportsChart({ data }: AnnualReportsChartProps) {
  return (
    <Card className="p-6 bg-white shadow-sm border animate-in fade-in duration-500">
      <p className="text-sm font-medium text-gray-600 mb-4">Annual Reports</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4B5563' }} />
            <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="completed"
              name="Completed"
              stackId="reports"
              fill="#2f4692"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="pending"
              name="Pending"
              stackId="reports"
              fill="#a0bbf5"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
