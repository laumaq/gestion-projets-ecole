// app/tools/ag/configuration/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import { useAGData } from '@/hooks/useAGData';
import BureauManagement from '@/components/ag/BureauManagement';
import GTAssignment from '@/components/ag/GTAssignment';
import AGStatusBadge from '@/components/ag/AGStatusBadge';
import ACTabs from '@/components/ag/ACTabs';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AGConfigurationPage() {
  const router = useRouter();
  const { canConfigure, isDirection, isBureau, loading: permissionsLoading } = useAGPermissions();
  const {
    config,
    bureau,
    groupes,
    employees,
    loading: dataLoading,
    error,
    saveConfig,
    addBureau,
    removeBureau,
    assignGroupe,
    refresh
  } = useAGData();

  const [activeTab, setActiveTab] = useState('config');
  const [dateAG, setDateAG] = useState('');
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('12:00');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initialiser le formulaire avec la config existante
  useEffect(() => {
    if (config) {
      setDateAG(config.date_ag || '');
      setHeureDebut(config.heure_debut || '09:00');
      setHeureFin(config.heure_fin || '12:00');
    }
  }, [config]);

  // Redirection si pas les droits
  useEffect(() => {
    if (!permissionsLoading && !canConfigure) {
      router.push('/tools/ag');
    }
  }, [canConfigure, permissionsLoading, router]);

  const handleSaveConfig = async () => {
    if (!dateAG) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner une date pour l\'AG' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    
    try {
      await saveConfig({
        date_ag: dateAG,
        heure_debut: heureDebut,
        heure_fin: heureFin
      });
      setStatusMessage({ type: 'success', text: 'Configuration sauvegardée avec succès' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatut = async (nouveauStatut: 'preparation' | 'planning_etabli') => {
    if (!config) return;
    
    setSaving(true);
    setStatusMessage(null);
    
    try {
      await saveConfig({ statut: nouveauStatut });
      setStatusMessage({ 
        type: 'success', 
        text: `Statut changé : ${nouveauStatut === 'preparation' ? 'En préparation' : 'Planning établi'}`
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur lors du changement de statut' });
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || dataLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Configuration de l'Assemblée Générale</h1>
          {config && <AGStatusBadge statut={config.statut} />}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les paramètres de l'AG, le bureau et les groupes de travail
        </p>
      </div>

      <ACTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isDirection={isDirection}
        isBureau={isBureau}
      />

      {statusMessage && (
        <div className={`mb-6 p-4 rounded-lg ${
          statusMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            statusMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>{statusMessage.text}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Onglet Configuration AG */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Configuration horaire */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Horaires de l'AG</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={dateAG}
                  onChange={(e) => setDateAG(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de début
                </label>
                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de fin
                </label>
                <input
                  type="time"
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
              </button>
            </div>
          </div>

          {/* Gestion du statut */}
          {config && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Statut de l'AG</h3>
              
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    Statut actuel : <span className="font-semibold">
                      {config.statut === 'preparation' ? 'En préparation' : 'Planning établi'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {config.statut === 'preparation' 
                      ? 'Les employés peuvent soumettre leurs demandes de temps'
                      : 'Le planning est figé, les employés voient le programme'}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleChangeStatut('preparation')}
                    disabled={config.statut === 'preparation' || saving}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      config.statut === 'preparation'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    Passer en préparation
                  </button>
                  <button
                    onClick={() => handleChangeStatut('planning_etabli')}
                    disabled={config.statut === 'planning_etabli' || saving}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      config.statut === 'planning_etabli'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Passer au planning établi
                  </button>
                </div>
              </div>

              {/* Info sur le calcul du temps */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">🕐 Calcul du temps disponible</h4>
                <p className="text-sm text-blue-600">
                  Temps total : {Math.abs(
                    (parseInt(heureFin.split(':')[0]) * 60 + parseInt(heureFin.split(':')[1])) -
                    (parseInt(heureDebut.split(':')[0]) * 60 + parseInt(heureDebut.split(':')[1])
                  ))} minutes
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {config.statut === 'preparation' 
                    ? 'Les professeurs peuvent soumettre leurs demandes de temps'
                    : 'Le planning est établi, consultez l\'onglet Planning'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onglet Groupes de travail */}
      {activeTab === 'gt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BureauManagement
            bureau={bureau}
            employees={employees}
            onAdd={addBureau}
            onRemove={removeBureau}
          />

          <GTAssignment
            employees={employees}
            groupes={groupes}
            onAssign={assignGroupe}
          />
        </div>
      )}
    </main>
  );
}
