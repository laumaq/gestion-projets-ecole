// app/tools/voyages/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useVoyagePermissions } from '@/hooks/useVoyagePermissions';
import { useCharteVoyage } from '@/hooks/useCharteVoyage';
import ParticipantsList from '@/components/voyages/ParticipantsList';
import HebergementConfigs from '@/components/voyages/HebergementConfigs';
import GestionCharte from '@/components/voyages/GestionCharte';
import CharteModal from '@/components/voyages/CharteModal';
import GestionPlanning from '@/components/voyages/activites/GestionPlanning';
import VueElevePlanning from '@/components/voyages/activites/VueElevePlanning';
import VueEleveChoixActivites from '@/components/voyages/activites/VueEleveChoixActivites';
import PrisePresencesActivites from '@/components/voyages/activites/PrisePresencesActivites';

interface Voyage {
  id: string;
  nom: string;
  destination: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  config_visible_eleves: boolean;
}

export default function VoyageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const voyageId = params.id as string;
  
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('planning');
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [currentUserEleveId, setCurrentUserEleveId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCharte, setShowCharte] = useState(false);
  
  // États pour les sous-onglets
  const [planningTab, setPlanningTab] = useState<'planning' | 'eleve_choix' | 'presences' | 'gestion'>('planning');
  const [elevePlanningTab, setElevePlanningTab] = useState<'planning' | 'choix'>('planning');

  // Récupérer l'ID de l'utilisateur
  useEffect(() => {
    const type = localStorage.getItem('userType');
    const id = localStorage.getItem('userId');
    setCurrentUserId(id);
    
    if (type === 'student' && id) {
      setCurrentUserEleveId(parseInt(id));
    }
  }, []);
  
  const { isLoading: permissionsLoading, hasAccess, isResponsable, userType, error } = useVoyagePermissions(voyageId);

  const { charte, aAccepte, loading: charteLoading, tempsLecture, peutAccepter, accepterCharte } = 
    useCharteVoyage(voyageId, userType === 'student' ? currentUserEleveId : null);

  useEffect(() => {
    if (hasAccess) {
      loadVoyage();
    }
  }, [hasAccess, voyageId]);

  const loadVoyage = async () => {
    const { data, error } = await supabase
      .from('voyages')
      .select('*')
      .eq('id', voyageId)
      .single();

    if (!error && data) {
      setVoyage(data);
    }
    setLoading(false);
  };

  const handleConfigSelect = (configId: string) => {
    setSelectedConfigId(configId);
  };

  // Gestion de l'affichage de la charte
  useEffect(() => {
    // Ne rien faire tant qu'on charge
    if (charteLoading || permissionsLoading || loading) {
      return;
    }
    
    if (userType === 'student' && charte && !aAccepte) {
      setShowCharte(true);
    }
  }, [userType, charteLoading, permissionsLoading, loading, charte, aAccepte]);

  if (permissionsLoading || loading || (userType === 'student' && charteLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Bloquer l'affichage du contenu si charte non acceptée
  if (userType === 'student' && showCharte && charte) {
    return (
      <CharteModal
        contenu={charte.contenu}
        tempsLecture={tempsLecture}
        peutAccepter={peutAccepter}
        onAccepter={() => {
          accepterCharte();
          setShowCharte(false);
        }}
        onRefuser={() => {
          router.push('/dashboard');
        }}
      />
    );
  }

  if (!hasAccess || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Vous n\'avez pas les permissions nécessaires pour accéder à ce voyage.'}
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retour au tableau de bord
            </Link>
            <p className="text-sm text-gray-500">
              Si vous pensez que c'est une erreur, veuillez contacter les organisateurs du voyage.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!voyage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Voyage introuvable</h1>
          <Link href="/tools/voyages" className="text-blue-600 hover:underline">
            Retour à la liste des voyages
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'planning', label: 'Planning', icon: '📅' },
    { id: 'participants', label: 'Participants', icon: '👥' },
    { id: 'hebergement', label: 'Hébergement', icon: '🏨' },
    { id: 'charte', label: 'Charte', icon: '📜' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête du voyage */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/tools/voyages" 
              className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
            >
              ← Retour aux voyages
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{voyage.nom}</h1>
            <p className="text-gray-600 mt-2">{voyage.destination}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>📅 {new Date(voyage.date_debut).toLocaleDateString('fr-FR')} - {new Date(voyage.date_fin).toLocaleDateString('fr-FR')}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                voyage.statut === 'preparation' ? 'bg-yellow-100 text-yellow-800' :
                voyage.statut === 'actif' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {voyage.statut === 'preparation' ? 'En préparation' : 
                 voyage.statut === 'actif' ? 'Actif' : 'Terminé'}
              </span>
            </div>
          </div>
          
          {/* Badge pour indiquer le niveau de permission */}
          {isResponsable && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
              ⭐ Tu es profondément responsable de ce voyage
            </div>
          )}
        </div>
      </div>

      {/* Onglets principaux */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="mt-6">
        {/* Onglet Participants */}
        {activeTab === 'participants' && (
          <ParticipantsList 
            voyageId={voyageId} 
            isResponsable={isResponsable}
            userType={userType}
          />
        )}
        
        {/* Onglet Hébergement */}
        {activeTab === 'hebergement' && (
          <HebergementConfigs 
            voyageId={voyageId}
            isResponsable={isResponsable}
            userType={userType}
            onConfigSelect={handleConfigSelect} 
          />
        )}

        {/* Onglet Planning */}
        {activeTab === 'planning' && (
          <>
            {/* Sous-onglets - visibles selon le rôle */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex gap-4 flex-wrap">
                {/* Mon planning - visible pour tous */}
                <button
                  onClick={() => setPlanningTab('planning')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    planningTab === 'planning'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📅 Mon planning
                </button>
                
                {/* Choix des activités - visible pour tous (élèves et employés) */}
                <button
                  onClick={() => setPlanningTab('eleve_choix')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    planningTab === 'eleve_choix'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🎯 Choix des activités
                </button>
                
                {/* Prise de présence - visible UNIQUEMENT pour les employés */}
                {userType === 'employee' && (
                  <button
                    onClick={() => setPlanningTab('presences')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      planningTab === 'presences'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📋 Prise de présence
                  </button>
                )}
                
                {/* Gestion du planning - visible UNIQUEMENT pour les responsables */}
                {userType === 'employee' && isResponsable && (
                  <button
                    onClick={() => setPlanningTab('gestion')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      planningTab === 'gestion'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    ⚙️ Gestion du planning
                  </button>
                )}
              </nav>
            </div>

            {/* Contenu selon le sous-onglet et les permissions */}
            {planningTab === 'eleve_choix' && (
              (userType === 'student' || userType === 'employee') && (
                <VueEleveChoixActivites
                  voyageId={voyageId}
                  participantId={userType === 'student' ? currentUserEleveId!.toString() : currentUserId!}
                  participantType={userType}
                />
              )
            )}

            {planningTab === 'planning' && userType && (
              <VueElevePlanning
                voyageId={voyageId}
                participantId={userType === 'student' 
                  ? currentUserEleveId!.toString() 
                  : currentUserId!}
                participantType={userType as 'student' | 'employee'}
              />
            )}

            {planningTab === 'presences' && (
              userType === 'employee' ? (
                <PrisePresencesActivites
                  voyageId={voyageId}
                  employeId={currentUserId!}
                  userType={userType}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Accès réservé</h3>
                  <p className="text-gray-600">Seuls les employés peuvent accéder à la prise de présence.</p>
                </div>
              )
            )}

            {planningTab === 'gestion' && (
              userType === 'employee' && isResponsable ? (
                <GestionPlanning 
                  voyageId={voyageId}
                  isResponsable={isResponsable}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Accès réservé</h3>
                  <p className="text-gray-600">Seuls les responsables peuvent gérer le planning.</p>
                </div>
              )
            )}
          </>
        )}

        {/* Onglet Charte */}
        {activeTab === 'charte' && (
          <GestionCharte 
            voyageId={voyageId}
            isResponsable={isResponsable}
            userType={userType}
          />
        )}
      </div>
    </div>
  );
}