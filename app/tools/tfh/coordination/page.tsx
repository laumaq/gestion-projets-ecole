// app/tools/tfh/coordination/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import DashboardTab from './tabs/DashboardTab';
import ConvocationsTab from './tabs/ConvocationsTab';
import PresencesTab from './tabs/PresencesTab';
import DefensesTab from './tabs/DefensesTab';
import CalendrierTab from './tabs/CalendrierTab';
import ParametresTab from './tabs/ParametresTab';
import StatsTab from './tabs/StatsTab';
import ControleTab from './tabs/ControleTab';
import ListeTFHTab from './tabs/ListeTFHTab';
import GestionUtilisateursTab from './tabs/GestionUtilisateursTab';
import { useCoordinateurData } from './hooks/useCoordinateurData';
import { useElevesOperations } from './hooks/useElevesOperations';
import { TabType, Eleve } from './types';

export default function CoordinateurDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [editingModeConvocations, setEditingModeConvocations] = useState(false);
  const [editingModeDefenses, setEditingModeDefenses] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Vérifier que l'utilisateur est bien dans le groupe de coordination TFH

  useEffect(() => {
    const checkAuthorization = async () => {
      const userType = localStorage.getItem('userType');
      const id = localStorage.getItem('userId');
      const name = localStorage.getItem('userName');

      if (userType !== 'employee' || !id) {
        router.push('/');
        return;
      }

      // Vérifier si l'employé a le groupe_id correspondant au groupe TFH
      const { data: employee, error } = await supabase
        .from('employees')
        .select('groupe_id')
        .eq('id', id)
        .single();

      if (error || !employee) {
        router.push('/dashboard');
        return;
      }

      // Vérifier si le groupe_id correspond à l'ID du groupe TFH dans ag_groupes
      // L'ID du groupe TFH est '0092b3db-1f7e-40e1-8f6b-70219d6a50f2'
      if (employee.groupe_id !== '0092b3db-1f7e-40e1-8f6b-70219d6a50f2') {
        router.push('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setUserId(id);
      setUserName(name || '');
    };

    checkAuthorization();
  }, [router]);

  // Hooks personnalisés (à adapter)
  const { 
    eleves, 
    guides, 
    lecteursExternes, 
    mediateurs, 
    currentCoordinateur,
    categories,
    loading, 
    refreshData 
  } = useCoordinateurData();
  
  const {
    editingCell,
    setEditingCell,
    handleUpdate,
    handleSelectUpdate,
    handlePresenceUpdate
  } = useElevesOperations(refreshData);

  if (!isAuthorized) {
    return <LoadingSpinner />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab 
            eleves={eleves}
            guides={guides}
            onTabChange={setActiveTab}
            userName={userName}
            coordinateurNom={currentCoordinateur?.nom || ''}
            coordinateurPrenom={currentCoordinateur?.prenom || ''}
          />
        );
        
      case 'liste-tfh':
        return (
          <ListeTFHTab
            eleves={eleves}
            onRefresh={refreshData}
            onUpdate={handleUpdate}
          />
        );
            
      case 'convocations':
        return (
          <ConvocationsTab
            eleves={eleves}
            guides={guides}
            editingMode={editingModeConvocations}
            editingCell={editingCell}
            onUpdate={handleUpdate}
            onSelectUpdate={handleSelectUpdate}
            onRefresh={refreshData}
            onSetEditingCell={setEditingCell}
            onSetEditingMode={setEditingModeConvocations}
          />
        );

      case 'presences':
        return (
          <PresencesTab
            eleves={eleves}
            editingMode={editingModeConvocations}
            onSetEditingMode={setEditingModeConvocations}
            onPresenceUpdate={handlePresenceUpdate}
            onRefresh={refreshData}
          />
        );

      case 'defenses': 
        return (
          <DefensesTab
            eleves={eleves}
            guides={guides}
            lecteursExternes={lecteursExternes}
            mediateurs={mediateurs}
            editingMode={editingModeDefenses}
            onUpdate={handleUpdate}
            onSelectUpdate={handleSelectUpdate}
            onRefresh={refreshData}
            onSetEditingMode={setEditingModeDefenses}
          />
        );

      case 'calendrier':
        return (
          <CalendrierTab
            eleves={eleves}
            categories={categories}
            onRefresh={refreshData}
          />
        );

      case 'gestion-utilisateurs':
        return (
          <GestionUtilisateursTab
            eleves={eleves}
            guides={guides}
            lecteursExternes={lecteursExternes}
            mediateurs={mediateurs}
            onRefresh={refreshData}
          />
        );

      case 'parametres':
        return <ParametresTab />;

      case 'stats':
        return <StatsTab eleves={eleves} />;

      case 'controle':
        return <ControleTab eleves={eleves} onRefresh={refreshData} />;
        
      default:
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Onglet {activeTab} - En cours de modularisation
            </h2>
            <p className="text-gray-600 mt-2">
              Cet onglet sera bientôt extrait dans un composant séparé.
            </p>
            <button
              onClick={() => setActiveTab('convocations')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voir l'onglet Convocations (modularisé)
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          elevesCount={eleves.length}
          guidesCount={guides.length}
          defensesCount={eleves.filter(e => e.date_defense).length}
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
          userName={userName}
          onLogout={() => {
            localStorage.clear();
            router.push('/');
          }}
        />
        
        <main className="flex-1 overflow-auto">
          <header className="md:hidden p-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="font-semibold text-gray-800">
                  {activeTab === 'dashboard' ? 'Tableau de bord' : 
                   activeTab === 'convocations' ? 'Convocations' : 
                   activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-xs text-gray-500">Coordination TFH</p>
              </div>
              <div className="w-10"></div>
            </div>
          </header>

          <Header 
            activeTab={activeTab}
            userName={userName}
            onLogout={() => {
              localStorage.clear();
              router.push('/');
            }}
          />
          
          <div className="p-4">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
}