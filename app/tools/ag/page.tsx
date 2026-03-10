// app/tools/ag/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import { useAGData } from '@/hooks/useAGData';
import { useVotes } from '@/hooks/votes/useVotes';
import AGTabs from '../../../components/ag/AGTabs';
import AGPreparationTabs from '../../../components/ag/AGPreparationTabs';
import AGPreparationForm from '../../../components/ag/AGPreparationForm';
import AGStatusBadge from '@/components/ag/AGStatusBadge';
import PausesManager from '@/components/ag/PausesManager';
import BureauManagement from '@/components/ag/BureauManagement';
import GTAssignment from '@/components/ag/GTAssignment';
import AGPlanningView from '@/components/ag/AGPlanningView';
import AGVotesView from '@/components/ag/AGVotesView';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';

export default function AGPage() {
  const router = useRouter();
  const { agStatut, canConfigure, canSubmit, canViewPlanning, loading: permissionsLoading } = useAGPermissions();
  const {
    config,
    bureau,
    groupes,
    employees,
    communications,
    interventionsLibres,
    pauses,
    loading: dataLoading,
    error,
    updateConfig,
    addBureau,
    removeBureau,
    assignGroupe,
    addPause,
    updatePause,
    removePause,
    resetCommunications,
    updateOrdre,
    deleteInterventionLibre,
    saveCommunication,
    saveInterventionLibre,
    refresh
  } = useAGData();

  // NOUVEAU : Récupérer les votes UNIQUEMENT si config existe
  const { votes } = useVotes({ 
    module: 'ag', 
    id: config?.id || '' 
  });
  
  // Calculer hasVotesActifs seulement si votes existe
  const hasVotesActifs = votes?.some(v => v.statut === 'actif') || false;

  // Onglet principal
  const [activeTab, setActiveTab] = useState('preparer-ag'); 

  // Sous-onglet pour "Préparer l'AG" (direction)
  const [preparationSubTab, setPreparationSubTab] = useState('configuration');

  const [dateAG, setDateAG] = useState('');
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('12:00');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  console.log('📌 AGPage - canConfigure:', canConfigure);
  console.log('📌 AGPage - canSubmit:', canSubmit);
  console.log('📌 AGPage - canViewPlanning:', canViewPlanning);
  console.log('📌 AGPage - agStatut:', agStatut);

  useEffect(() => {
    if (config) {
      setDateAG(config.date_ag || '');
      setHeureDebut(config.heure_debut || '09:00');
      setHeureFin(config.heure_fin || '12:00');
    }
  }, [config]);

  useEffect(() => {
    if (!permissionsLoading && agStatut === 'pas_ag') {
      router.push('/dashboard?ag=desactivee');
    }
  }, [agStatut, permissionsLoading, router]);

  useEffect(() => {
    if (!permissionsLoading && !dataLoading) {
      if (canConfigure) {
        setActiveTab('preparer-ag');
      } else if (agStatut === 'preparation' && canSubmit) {
        setActiveTab('mon-intervention');
      } else if (agStatut === 'planning_etabli' && canViewPlanning) {
        setActiveTab('planning');
      }
    }
  }, [canConfigure, canSubmit, canViewPlanning, agStatut, permissionsLoading, dataLoading]);

  const handleUpdateConfig = async () => {
    if (!dateAG) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner une date pour l\'AG' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    
    try {
      await updateConfig({
        date_ag: dateAG,
        heure_debut: heureDebut,
        heure_fin: heureFin
      });
      setStatusMessage({ type: 'success', text: 'Configuration mise à jour' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatut = async (nouveauStatut: 'pas_ag' | 'preparation' | 'planning_etabli') => {
    if (!config) return;
    
    setSaving(true);
    setStatusMessage(null);
    
    try {
      await updateConfig({ statut: nouveauStatut });
      
      const messages = {
        pas_ag: 'AG désactivée',
        preparation: 'Mode préparation activé',
        planning_etabli: 'Planning établi'
      };
      
      setStatusMessage({ type: 'success', text: messages[nouveauStatut] });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur lors du changement de statut' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetCommunications = async () => {
    if (!confirm('Êtes-vous sûr de vouloir effacer toutes les demandes des GT ?')) return;
    
    setSaving(true);
    try {
      await resetCommunications();
      setStatusMessage({ type: 'success', text: 'Toutes les demandes ont été effacées' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur lors de l\'effacement' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditIntervention = (item: any) => {
    setActiveTab('mon-intervention');
  };

  const handleDeleteIntervention = async (item: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette intervention ?`)) return;
    
    try {
      if (item.type_intervention === 'gt') {
        await supabase
          .from('ag_communications')
          .delete()
          .eq('id', item.id);
      } else {
        await deleteInterventionLibre(item.id);
      }
      await refresh();
      setStatusMessage({ type: 'success', text: 'Intervention supprimée' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erreur lors de la suppression' });
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
          <h1 className="text-2xl font-bold text-gray-900">Assemblée Générale</h1>
          {config && <AGStatusBadge statut={config.statut} />}
        </div>
      </div>

      {/* Onglets principaux */}
      <AGTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        canConfigure={canConfigure}
        canSubmit={canSubmit}
        canViewPlanning={canViewPlanning}
        agStatut={agStatut}
        hasVotesActifs={hasVotesActifs}
      />

      {statusMessage && (
        <div className={`mb-6 p-4 rounded-lg ${
          statusMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {statusMessage.text}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ONGLET 1 : PRÉPARER L'AG (direction uniquement) */}
      {activeTab === 'preparer-ag' && canConfigure && (
        <div className="space-y-6">
          {/* Sous-onglets pour la direction */}
          <AGPreparationTabs 
            activeTab={preparationSubTab} 
            onTabChange={setPreparationSubTab}
          />

          {/* SOUS-ONGLET CONFIGURATION */}
          {preparationSubTab === 'configuration' && (
            <div className="space-y-6">
              {/* Statut */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statut de l'AG</h3>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleChangeStatut('pas_ag')}
                    disabled={config?.statut === 'pas_ag' || saving}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      config?.statut === 'pas_ag'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    Pas d'AG
                  </button>
                  <button
                    onClick={() => handleChangeStatut('preparation')}
                    disabled={config?.statut === 'preparation' || saving}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      config?.statut === 'preparation'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    En préparation
                  </button>
                  <button
                    onClick={() => handleChangeStatut('planning_etabli')}
                    disabled={config?.statut === 'planning_etabli' || saving}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      config?.statut === 'planning_etabli'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Planning établi
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Statut actuel :</span>{' '}
                    {config?.statut === 'pas_ag' && 'AG désactivée'}
                    {config?.statut === 'preparation' && 'Les GT peuvent soumettre leurs demandes'}
                    {config?.statut === 'planning_etabli' && 'Planning visible par tous'}
                  </p>
                </div>

                {config?.statut === 'preparation' && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex-1 mr-4">
                      <p className="text-sm text-blue-700">
                        📊 {communications.length} GT ont déjà soumis une demande
                        {interventionsLibres.length > 0 && (
                          <span className="ml-2">
                            (+ {interventionsLibres.length} intervention{interventionsLibres.length > 1 ? 's' : ''} libre{interventionsLibres.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={handleResetCommunications}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                    >
                      Effacer toutes les demandes
                    </button>
                  </div>
                )}
              </div>

              {/* Horaires */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Horaires</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={dateAG}
                      onChange={(e) => setDateAG(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                    <input
                      type="time"
                      value={heureDebut}
                      onChange={(e) => setHeureDebut(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                    <input
                      type="time"
                      value={heureFin}
                      onChange={(e) => setHeureFin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdateConfig}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Mise à jour...' : 'Mettre à jour les horaires'}
                </button>
              </div>

              {/* Pauses */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <PausesManager
                  pauses={pauses}
                  heureDebut={heureDebut}
                  heureFin={heureFin}
                  onAdd={addPause}
                  onUpdate={updatePause}
                  onRemove={removePause}
                />
              </div>
            </div>
          )}

          {/* SOUS-ONGLET GESTION DU PLANNING */}
          {preparationSubTab === 'planning' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <AGPlanningView
                config={config}
                communications={communications}
                interventionsLibres={interventionsLibres}
                pauses={pauses}
                isEditable={true}
                onEdit={handleEditIntervention}
                onDelete={handleDeleteIntervention}
                onReorder={async (newOrder) => {
                  const ordreData = newOrder.map((item, index) => ({
                    id: item.id,
                    position: index + 1,
                    type: item.type
                  }));
                  await updateOrdre(ordreData);
                }}
              />
            </div>
          )}

          {/* SOUS-ONGLET GESTION DES GT */}
          {preparationSubTab === 'gt' && (
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
        </div>
      )}

      {/* ONGLET 2 : PRÉPARER MON INTERVENTION (pour tous les employés) */}
      {activeTab === 'mon-intervention' && agStatut === 'preparation' && (
        <AGPreparationForm
          groupes={groupes}
          employees={employees}
          communications={communications}
          interventionsLibres={interventionsLibres}
          saveCommunication={saveCommunication}
          saveInterventionLibre={saveInterventionLibre}
          deleteInterventionLibre={deleteInterventionLibre}
        />
      )}

      {/* ONGLET 3 : VOIR LE PLANNING (pour tous) */}
      {activeTab === 'planning' && agStatut === 'planning_etabli' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <AGPlanningView
            config={config}
            communications={communications}
            interventionsLibres={interventionsLibres}
            pauses={pauses}
            isEditable={canConfigure}
            onEdit={canConfigure ? handleEditIntervention : undefined}
            onDelete={canConfigure ? handleDeleteIntervention : undefined}
            onReorder={canConfigure ? async (newOrder) => {
              const ordreData = newOrder.map((item, index) => ({
                id: item.id,
                position: index + 1,
                type: item.type
              }));
              await updateOrdre(ordreData);
            } : undefined}
          />
        </div>
      )}

      {/* NOUVEL ONGLET 4 : VOTES (pour tous) */}
      {activeTab === 'votes' && config && (
        <AGVotesView agId={config.id} />
      )}
    </main>
  );
}