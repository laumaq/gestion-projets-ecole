// app/tools/tfh/coordination/components/Header.tsx
'use client';

import { LogOut } from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  userName: string;
  onLogout: () => void;
}

export default function Header({ activeTab, userName, onLogout }: HeaderProps) {
  const getTabTitle = (tab: TabType): string => {
    const titles: Record<TabType, string> = {
      dashboard: 'Tableau de bord',
      'liste-tfh': 'Liste des TFH',
      convocations: 'Convocations',
      presences: 'Présences',
      defenses: 'Défenses',
      calendrier: 'Calendrier',
      'gestion-utilisateurs': 'Gestion des utilisateurs',
      parametres: 'Paramètres',
      stats: 'Statistiques',
      controle: 'Contrôle'
    };
    return titles[tab];
  };

  const getTabDescription = (tab: TabType): string => {
    const descriptions: Record<TabType, string> = {
      dashboard: 'Vue d\'ensemble du système',      
      'liste-tfh': 'Liste complète des travaux par classe',
      convocations: 'Gestion des convocations mars/avril',
      presences: 'Présences lors des journées TFH',
      defenses: 'Planification des soutenances',
      calendrier: 'Planning & détection de conflits',
      'gestion-utilisateurs': 'Gestion des comptes utilisateurs',
      parametres: 'Configuration système',
      stats: 'Analyses et métriques',
      controle: 'Suivi des guides'
    };
    return descriptions[tab];
  };

  return (
    <header className="hidden md:block px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {getTabTitle(activeTab)}
          </h1>
          <p className="text-gray-600">
            {getTabDescription(activeTab)}
          </p>
        </div>

      </div>
    </header>
  );
}