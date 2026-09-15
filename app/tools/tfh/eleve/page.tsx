// app/tools/tfh/eleve/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, User, GraduationCap, Users, AlertCircle } from 'lucide-react';
import TypeInfoModal from './components/TypeInfoModal';
import { TabNavigation } from './tabs';
import MesChoixTab from './tabs/MesChoixTab';
import MonCarnetDeBordTab from './tabs/MonCarnetDeBordTab';
import MesInfosTab from './tabs/MesInfosTab';
import MaDefenseTab from './tabs/MaDefenseTab';
import { useEleveData } from './hooks/useEleveData';
import { useTypesTFH } from './hooks/useTypesTFH';
import { Tab, TabId } from './types';
import VadeMecumTab from './tabs/VadeMecumTab';

export default function EleveDashboard() {
  const [matricule, setMatricule] = useState<number | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('mes-choix');

  // Modal info
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalType, setInfoModalType] = useState('');
  const [infoModalLabel, setInfoModalLabel] = useState('');

  const router = useRouter();

  // Récupération du matricule depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      if (userType !== 'student' || !userId) {
        router.push('/');
        return;
      }
      setMatricule(parseInt(userId));
    }
  }, [router]);

  // Chargement des données
  const { 
    eleve, 
    loading, 
    phasePreparatoire, 
    objectifGeneral, 
    objectifParticulier,
    autorisationModification,
    refresh, 
    updateField 
  } = useEleveData(matricule);

  // Chargement des types (uniquement si phase préparatoire)
  const { typesDisponibles, loading: loadingTypes } = useTypesTFH(phasePreparatoire);

  // Déterminer si le carnet de bord doit être affiché
  const shouldShowJournal = useMemo(() => {
    if (!eleve) return false;
    return eleve.type !== 'traditionnel' && eleve.type !== '';
  }, [eleve]);

  const shouldShowDefense = useMemo(() => {
    return eleve?.displaySettings?.eleves_voir_defenses === true;
  }, [eleve]);

  // Construction des onglets selon le contexte
  const tabs = useMemo<Tab[]>(() => {
    const list: Tab[] = [];

    if (phasePreparatoire) {
      list.push({ id: 'mes-choix', label: 'Mes choix', icon: 'mes-choix' });
      if (shouldShowJournal) {
        list.push({ id: 'mon-carnet-de-bord', label: 'Mon carnet de bord', icon: 'mon-carnet-de-bord' });
      }
      list.push({ id: 'mes-infos', label: 'Mes infos', icon: 'mes-infos' });
      if (shouldShowDefense) {
        list.push({ id: 'ma-defense', label: 'Ma défense', icon: 'ma-defense' });
      }
    } else {
      list.push({ id: 'mes-infos', label: 'Mes infos', icon: 'mes-infos' });
      if (shouldShowJournal) {
        list.push({ id: 'mon-carnet-de-bord', label: 'Mon carnet de bord', icon: 'mon-carnet-de-bord' });
      }
      list.push({ id: 'mes-choix', label: 'Mes choix', icon: 'mes-choix' });
      if (shouldShowDefense) {
        list.push({ id: 'ma-defense', label: 'Ma défense', icon: 'ma-defense' });
      }
    }

    // Vade Mecum toujours en dernier
    list.push({ id: 'vade-mecum', label: 'Vade Mecum', icon: 'vade-mecum' });

    return list;
  }, [phasePreparatoire, shouldShowJournal, shouldShowDefense]);

  // S'assurer que l'onglet actif est toujours valide
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const handleSaveType = async (newType: string) => {
    if (!eleve || savingType) return;
    setSavingType(true);
    try {
      await updateField('type', newType || null);
    } finally {
      setSavingType(false);
    }
  };

  const openInfoModal = (type: string, label: string) => {
    setInfoModalType(type);
    setInfoModalLabel(label);
    setInfoModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre espace TFH...</p>
        </div>
      </div>
    );
  }

  if (!eleve) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Élève non trouvé</p>
          <p className="text-gray-400 text-sm">Veuillez contacter votre coordinateur TFH.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header avec toggle d'onglets à droite */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mon TFH</h1>
            {phasePreparatoire && (
              <span className="ml-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                🚧 Phase préparatoire
              </span>
            )}
          </div>

          {/* Toggle des onglets aligné à droite */}
          <div className="md:ml-auto">
            <TabNavigation 
              tabs={tabs} 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 border border-white/50">
          {/* En-tête élève */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {eleve.prenom} {eleve.nom}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4" />
                    {eleve.classe}
                  </span>
                  {eleve.displaySettings?.eleves_voir_guides && eleve.guide_nom && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      Guide: {eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.
                    </span>
                  )}
                  {eleve.categorie && (
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {eleve.categorie}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Contenu de l'onglet actif */}
        <div>
          {activeTab === 'mes-choix' && (
            <MesChoixTab
              eleve={eleve}
              typesDisponibles={typesDisponibles}
              loadingTypes={loadingTypes}
              savingType={savingType}
              autorisationModification={autorisationModification}
              onSaveType={handleSaveType}
              onSaveField={updateField}
              onOpenInfoModal={openInfoModal}
            />
          )}

          {activeTab === 'mon-carnet-de-bord' && shouldShowJournal && (
            <MonCarnetDeBordTab eleve={eleve} onUpdate={refresh} />
          )}

          {activeTab === 'mes-infos' && (
            <MesInfosTab
              eleve={eleve}
              objectifGeneral={objectifGeneral}
              objectifParticulier={objectifParticulier}
              autorisationModification={autorisationModification}
              onSaveField={updateField}
            />
          )}

          {activeTab === 'ma-defense' && shouldShowDefense && (
            <MaDefenseTab eleve={eleve} />
          )}

          {activeTab === 'vade-mecum' && <VadeMecumTab />}
        </div>

        </div>
      </div>

      {/* Modal d'info */}
      <TypeInfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        type={infoModalType}
        label={infoModalLabel}
      />
    </div>
  );
}