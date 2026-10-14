// app/tools/tfh/coordination/components/Header.tsx
'use client';

import { LogOut } from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  userName: string;
  onLogout: () => void;
}

const TAB_TITLES: Record<TabType, string> = {
  dashboard: 'Tableau de bord',
  'liste-tfh': 'Liste des TFH',
  'suivi-carnets': 'Suivi des TFH non-traditionnels',
  convocations: 'Convocations',
  presences: 'Présences',
  defenses: 'Défenses',
  calendrier: 'Calendrier',
  'gestion-utilisateurs': 'Gestion des utilisateurs',
  parametres: 'Paramètres',
  'annee-tfh': 'Année TFH',
  'documents': 'Documents TFH',
  stats: 'Statistiques',
  controle: 'Contrôle',
};

const TAB_DESCRIPTIONS: Record<TabType, string> = {
  dashboard: 'Vue d\'ensemble des TFH',
  'liste-tfh': 'Liste complète des travaux par classe',
  'suivi-carnets': 'Vue d\'ensemble de la tenue des carnets de bord',
  convocations: 'Gestion des convocations mars/avril',
  presences: 'Présences lors des journées TFH',
  defenses: 'Planification des soutenances',
  calendrier: 'Planning & détection de conflits',
  'gestion-utilisateurs': 'Gestion des comptes utilisateurs',
  parametres: 'Configuration système',
  'annee-tfh': 'Calendrier : journées de travail, défenses et échéancier',
  'documents': 'Documents génériques accessibles à tous',
  stats: 'Analyses et métriques',
  controle: 'Suivi des guides',
};

export function getTabTitle(tab: TabType): string {
  return TAB_TITLES[tab];
}

export function getTabDescription(tab: TabType): string {
  return TAB_DESCRIPTIONS[tab];
}

export default function Header({ activeTab, userName, onLogout }: HeaderProps) {
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