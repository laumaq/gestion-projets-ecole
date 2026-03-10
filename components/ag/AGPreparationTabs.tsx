// components/ag/AGPreparationTabs.tsx
'use client';

interface AGPreparationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AGPreparationTabs({ activeTab, onTabChange }: AGPreparationTabsProps) {
  const tabs = [
    { id: 'configuration', label: 'Configuration' },
    { id: 'planning', label: 'Gestion du planning' },
    { id: 'gt', label: 'Gestion des GT' }
  ];

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