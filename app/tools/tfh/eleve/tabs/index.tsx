// app/tools/tfh/eleve/tabs/index.tsx
'use client';

import { Tab, TabId } from '../types';
import { getTabIcon } from '../utils/constants';

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6 bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-white/50 shadow-sm">
      {tabs.map((tab) => {
        const Icon = getTabIcon(tab.id);
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${isActive 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'}
            `}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}