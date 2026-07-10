import React from 'react';
import { Progress } from './ui/progress';

export function PhDThesisStatus() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">PhD Thesis Status</h2>
      
      <div className="space-y-6">
        {/* Thesis Submissions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Thesis Submissions</h3>
            <span className="text-sm font-medium text-gray-900">70%</span>
          </div>
          <Progress value={70} className="h-2" />
        </div>

        {/* Thesis Defenses */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Thesis Defenses</h3>
            <span className="text-sm font-medium text-gray-900">60%</span>
          </div>
          <Progress value={60} className="h-2" />
        </div>
      </div>
    </div>
  );
}