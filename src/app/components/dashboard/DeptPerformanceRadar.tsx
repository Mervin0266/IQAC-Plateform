/**
 * DeptPerformanceRadar — Department performance radar chart.
 *
 * Extracted from DashboardPage to keep the main page slim.
 */

import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card } from '../ui/card';
import { CustomTooltip } from './CustomTooltip';
import { STANDARD_DEPARTMENTS } from '../../utils/departmentMappings';
import type { DeptPerformanceDataPoint } from '../../types/dashboard';

interface DeptPerformanceRadarProps {
  data: DeptPerformanceDataPoint[];
}

export function DeptPerformanceRadar({ data }: DeptPerformanceRadarProps) {
  const chartData = data.length > 0 ? data : STANDARD_DEPARTMENTS;

  return (
    <Card className="p-6 bg-white shadow-sm border animate-in fade-in duration-500">
      <p className="text-sm font-medium text-gray-600 mb-4">Department Performance</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="department"
              tick={{ fontSize: 10, fill: '#4B5563' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 9 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#2f4692"
              fill="#2f4692"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
