/**
 * CustomTooltip — Shared chart tooltip component.
 *
 * Previously defined twice inline in DashboardPage.
 * Supports both the generic and placement-specific tooltip variants.
 */

import React from 'react';
import type { ChartTooltipProps, PlacementTooltipProps } from '../../types/dashboard';

/** Generic chart tooltip */
export function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color || entry.stroke || entry.fill }}
          >
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

/** Placement-specific tooltip with avg package display */
export function PlacementTooltip({ active, payload, label, view }: PlacementTooltipProps) {
  if (active && payload && payload.length) {
    const avgPackage = payload[0]?.payload?.avgPackage;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-xs font-medium my-0.5"
            style={{ color: entry.color || entry.stroke || entry.fill }}
          >
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
        {(view === 'departmentwise' || view === 'overall') &&
          Boolean(avgPackage) && (
            <p className="text-xs text-gray-500 mt-1 border-t pt-1">
              Avg Package:{' '}
              <span className="font-medium text-gray-700">
                {String(avgPackage)} LPA
              </span>
            </p>
          )}
      </div>
    );
  }
  return null;
}
