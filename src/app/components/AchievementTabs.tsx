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
    <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner mb-6">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-[#0B132B] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}