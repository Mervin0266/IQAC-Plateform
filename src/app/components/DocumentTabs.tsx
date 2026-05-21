import React from 'react';
import { FileText, BookOpen, PenTool, ClipboardCheck, Users, Target } from 'lucide-react';

interface DocumentTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function DocumentTabs({ activeTab, setActiveTab }: DocumentTabsProps) {
  const tabs = [
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen, count: 24 },
    { id: 'lesson-plan', label: 'Lesson Plan', icon: FileText, count: 18 },
    { id: 'teaching-notes', label: 'Teaching Notes', icon: PenTool, count: 32 },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheck, count: 15 },
    { id: 'attendance', label: 'Attendance', icon: Users, count: 42 },
    { id: 'co-po-mapping', label: 'CO-PO Mapping', icon: Target, count: 8 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}