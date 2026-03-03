// components/ag/DirectionTabs.tsx
'use client';

interface DirectionTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DirectionTabs({ activeTab, onTabChange }: DirectionTabsProps) {
  const tabs = [
    { id: 'preparation', label: 'PRÉPARATION' },
    { id: 'gt', label: 'GESTION DES GT' },
    { id: 'planning', label: 'PLANNING' }
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-3 px-1 border-b-2 font-medium text-sm uppercase tracking-wider
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
