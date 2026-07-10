import React from 'react';

interface AchievementTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AchievementTabs({ activeTab, setActiveTab }: AchievementTabsProps) {
  const tabs = [
    { id: 'scholar', label: 'SCHOLAR' },
    { id: 'student', label: 'STUDENT' },
    { id: 'faculty', label: 'FACULTY' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}