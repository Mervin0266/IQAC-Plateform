import React from 'react';
import { Progress } from './ui/progress';

export function NAACAccreditation() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">NAAC Accreditation</h2>
      
      {/* NAAC Accreditation Grade */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">NAAC Accreditation</h3>
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-3xl font-bold text-green-600">A+</span>
          <span className="text-sm text-gray-500">Current Grade</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Criterion 1</span>
          </div>
          <Progress value={85} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Criterion 2</span>
          </div>
          <Progress value={92} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Criterion 3</span>
          </div>
          <Progress value={78} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Criterion 4</span>
          </div>
          <Progress value={88} className="h-2" />
        </div>
      </div>
    </div>
  );
}