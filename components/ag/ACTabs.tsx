// components/ag/ACTabs.tsx
'use client';

interface TabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDirection: boolean;
  isBureau: boolean;
}

export default function ACTabs({ activeTab, onTabChange, isDirection, isBureau }: TabProps) {
  const canSeeAll = isDirection || isBureau;

  const tabs = [
    { id: 'config', label: 'Configuration AG', visible: canSeeAll },
    { id: 'gt', label: 'Groupes de travail', visible: canSeeAll },
    { id: 'preparation', label: 'Préparation', visible: !canSeeAll },
    { id: 'planning', label: 'Planning', visible: true }
  ].filter(tab => tab.visible);

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
