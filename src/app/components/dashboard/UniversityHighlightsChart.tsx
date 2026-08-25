/**
 * UniversityHighlightsChart — Publications, events, and awards multi-line chart.
 *
 * Extracted from DashboardPage to keep the main page slim.
 */

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/card';
import { CustomTooltip } from './CustomTooltip';
import type { UniversityHighlightsDataPoint } from '../../types/dashboard';

interface UniversityHighlightsChartProps {
  data: UniversityHighlightsDataPoint[];
}

export function UniversityHighlightsChart({ data }: UniversityHighlightsChartProps) {
  return (
    <Card className="p-6 bg-white shadow-sm border animate-in fade-in duration-500">
      <p className="text-sm font-medium text-gray-600 mb-4">University Highlights</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4B5563' }} />
            <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="publications"
              name="Publications"
              stroke="#2f4692"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="events"
              name="Events"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="awards"
              name="Awards"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
