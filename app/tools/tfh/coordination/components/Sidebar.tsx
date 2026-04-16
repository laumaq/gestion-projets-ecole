// app/tools/tfh/coordination/components/Sidebar.tsx
'use client';

import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, LogOut,
  BookOpen
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  elevesCount: number;
  guidesCount: number;
  defensesCount: number;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  elevesCount,
  guidesCount,
  defensesCount,
  isMenuOpen,
  onMenuToggle,
  userName,
  onLogout
}: SidebarProps) {
  const tabs = [
    {
      id: 'dashboard' as TabType,
      name: 'Tableau de bord',
      icon: <Shield className="w-5 h-5" />,
      activeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      iconClass: 'bg-blue-100 text-blue-600',
      countClass: 'bg-blue-100 text-blue-700',
      showCount: false
    },
    {
      id: 'liste-tfh' as TabType,
      name: 'Liste des TFH',
      icon: <BookOpen className="w-5 h-5" />,
      activeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
      iconClass: 'bg-violet-100 text-violet-600',
      countClass: 'bg-violet-100 text-violet-700',
      showCount: true,
      count: elevesCount
    },
    {
      id: 'convocations' as TabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      activeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      iconClass: 'bg-purple-100 text-purple-600',
      countClass: 'bg-purple-100 text-purple-700',
      showCount: true,
      count: elevesCount
    },
    {
      id: 'presences' as TabType,
      name: 'Présences',
      icon: <span className="font-bold">✓</span>,
      activeClass: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
      iconClass: 'bg-fuchsia-100 text-fuchsia-600',
      countClass: 'bg-fuchsia-100 text-fuchsia-700',
      showCount: false
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      activeClass: 'bg-green-50 text-green-700 border border-green-200',
      iconClass: 'bg-green-100 text-green-600',
      countClass: 'bg-green-100 text-green-700',
      showCount: true,
      count: defensesCount
    },
    {
      id: 'calendrier' as TabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      activeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
      iconClass: 'bg-orange-100 text-orange-600',
      countClass: 'bg-orange-100 text-orange-700',
      showCount: false
    },
    {
      id: 'gestion-utilisateurs' as TabType,
      name: 'Utilisateurs',
      icon: <Users className="w-5 h-5" />,
      activeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      iconClass: 'bg-indigo-100 text-indigo-600',
      countClass: 'bg-indigo-100 text-indigo-700',
      showCount: true,
      count: elevesCount + guidesCount
    },
    {
      id: 'parametres' as TabType,
      name: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      activeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
      iconClass: 'bg-sky-100 text-sky-600',
      countClass: 'bg-sky-100 text-sky-700',
      showCount: false
    },
    {
      id: 'stats' as TabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      activeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      iconClass: 'bg-emerald-100 text-emerald-600',
      countClass: 'bg-emerald-100 text-emerald-700',
      showCount: false
    },
    {
      id: 'controle' as TabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      activeClass: 'bg-red-50 text-red-700 border border-red-200',
      iconClass: 'bg-red-100 text-red-600',
      countClass: 'bg-red-100 text-red-700',
      showCount: true,
      count: guidesCount
    }
  ];

  return (
    <>
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onMenuToggle}
        />
      )}

      <aside className={`
        fixed md:relative top-0 left-0 h-screen
        bg-white border-r border-gray-200
        z-40 transition-all duration-300 ease-in-out
        w-64
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">Portail TFH</h2>
              <p className="text-xs text-gray-500">Coordination</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                onMenuToggle();
              }}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all
                hover:bg-gray-50
                ${activeTab === tab.id ? tab.activeClass : 'text-gray-700'}
              `}
            >
              <div className={`
                p-2 rounded-lg
                ${activeTab === tab.id ? tab.iconClass : 'bg-gray-100 text-gray-600'}
              `}>
                {tab.icon}
              </div>
              
              <div className="flex-1 text-left">
                <div className="font-medium flex items-center justify-between">
                  <span>{tab.name}</span>
                  {tab.showCount && tab.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.id ? tab.countClass : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}