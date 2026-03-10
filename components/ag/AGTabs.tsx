// components/ag/AGTabs.tsx (MODIFIÉ)
'use client';

interface AGTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  canConfigure: boolean;
  canSubmit: boolean;
  canViewPlanning: boolean;
  agStatut: string;
  hasVotesActifs?: boolean; // NOUVEAU
}

export default function AGTabs({ 
  activeTab, 
  onTabChange, 
  canConfigure, 
  canSubmit, 
  canViewPlanning,
  agStatut,
  hasVotesActifs = false // NOUVEAU
}: AGTabsProps) {
  
  const tabs = [];

  // Onglet 1 : Préparer l'AG (uniquement pour la direction)
  if (canConfigure) {
    tabs.push({ id: 'preparer-ag', label: 'Préparer l\'AG' });
  }

  // Onglet 2 : Préparer mon intervention (pour tous en mode préparation)
  if (agStatut === 'preparation' && canSubmit) {
    tabs.push({ id: 'mon-intervention', label: 'Préparer mon intervention' });
  }

  // Onglet 3 : Voir le planning (pour tous quand planning établi)
  if (agStatut === 'planning_etabli' && canViewPlanning) {
    tabs.push({ id: 'planning', label: 'Voir le planning' });
  }

  // NOUVEAU : Onglet 4 : Votes (pour tous, toujours visible)
  tabs.push({ 
    id: 'votes', 
    label: hasVotesActifs ? '🗳️ Votes (nouveau)' : '🗳️ Votes'
  });

  if (tabs.length <= 1) return null;

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm relative
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