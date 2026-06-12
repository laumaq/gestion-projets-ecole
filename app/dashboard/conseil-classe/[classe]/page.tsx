// app/dashboard/conseil-classe/[classe]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { VoteCreator } from '@/components/votes/VoteCreator';
import { VoteCard } from '@/components/votes/VoteCard';
import { Users, UserPlus, Vote, ChevronLeft, Shield } from 'lucide-react';
import { useVotes } from '@/hooks/votes/useVotes';

interface RolesData {
  titulaire_id: string | null;
  co_titulaire_id: string | null;
  president_matricule: number | null;
  secretaire_matricule: number | null;
  delegue_voyage_matricule: number | null;
  titulaire?: { nom: string; prenom: string };
  co_titulaire?: { nom: string; prenom: string };
  president?: { nom: string; prenom: string };
  secretaire?: { nom: string; prenom: string };
  delegue_voyage?: { nom: string; prenom: string };
}

export default function ConseilClassePage() {
  const params = useParams();
  const router = useRouter();
  const classeNom = decodeURIComponent(params.classe as string);
  const anneeScolaire = '2024-2025';
  
  const [roles, setRoles] = useState<RolesData | null>(null);
  const [eleves, setEleves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoteCreator, setShowVoteCreator] = useState(false);
  const [userRole, setUserRole] = useState<'titulaire' | 'co_titulaire' | 'eleve' | 'direction' | 'none'>('none');

  const { votes, loading: votesLoading } = useVotes({
    module: 'conseil_classe',
    id: classeNom
  });

  const loadData = async () => {
    try {
      setLoading(true);

      // Dans la requête, modifier les sélections pour inclure id et job :
      const { data: rolesData, error: rolesError } = await supabase
        .from('conseil_classes_roles')
        .select(`
          id,
          annee_scolaire,
          classe_nom,
          titulaire_id,
          co_titulaire_id,
          president_matricule,
          secretaire_matricule,
          delegue_voyage_matricule,
          updated_at,
          titulaire:titulaire_id (id, nom, prenom, job),
          co_titulaire:co_titulaire_id (id, nom, prenom, job),
          president:president_matricule (matricule, nom, prenom, classe),
          secretaire:secretaire_matricule (matricule, nom, prenom, classe),
          delegue_voyage:delegue_voyage_matricule (matricule, nom, prenom, classe)
        `)
        .eq('annee_scolaire', anneeScolaire)
        .eq('classe_nom', classeNom)
        .maybeSingle();

      if (rolesData) {
        const titulaire = Array.isArray(rolesData.titulaire) && rolesData.titulaire.length > 0 
          ? { nom: rolesData.titulaire[0].nom, prenom: rolesData.titulaire[0].prenom }
          : undefined;
        const coTitulaire = Array.isArray(rolesData.co_titulaire) && rolesData.co_titulaire.length > 0
          ? { nom: rolesData.co_titulaire[0].nom, prenom: rolesData.co_titulaire[0].prenom }
          : undefined;
        const president = Array.isArray(rolesData.president) && rolesData.president.length > 0
          ? { nom: rolesData.president[0].nom, prenom: rolesData.president[0].prenom }
          : undefined;
        const secretaire = Array.isArray(rolesData.secretaire) && rolesData.secretaire.length > 0
          ? { nom: rolesData.secretaire[0].nom, prenom: rolesData.secretaire[0].prenom }
          : undefined;
        const delegueVoyage = Array.isArray(rolesData.delegue_voyage) && rolesData.delegue_voyage.length > 0
          ? { nom: rolesData.delegue_voyage[0].nom, prenom: rolesData.delegue_voyage[0].prenom }
          : undefined;

        setRoles({
          titulaire_id: rolesData.titulaire_id,
          co_titulaire_id: rolesData.co_titulaire_id,
          president_matricule: rolesData.president_matricule,
          secretaire_matricule: rolesData.secretaire_matricule,
          delegue_voyage_matricule: rolesData.delegue_voyage_matricule,
          titulaire: titulaire,
          co_titulaire: coTitulaire,
          president: president,
          secretaire: secretaire,
          delegue_voyage: delegueVoyage
        });
      }

      // 2. Charger les élèves de la classe
      const { data: elevesData, error: elevesError } = await supabase
        .from('students')
        .select('matricule, nom, prenom, niveau')
        .eq('classe', classeNom)
        .order('nom');

      if (!elevesError) {
        setEleves(elevesData || []);
      }

      // 3. Déterminer le rôle de l'utilisateur
      const userId = localStorage.getItem('userId');
      const userJob = localStorage.getItem('userJob');
      const userType = localStorage.getItem('userType');

      if (userType === 'employee') {
        if (userJob === 'direction') {
          setUserRole('direction');
        } else if (rolesData?.titulaire_id === userId) {
          setUserRole('titulaire');
        } else if (rolesData?.co_titulaire_id === userId) {
          setUserRole('co_titulaire');
        } else {
          setUserRole('none');
        }
      } else if (userType === 'student') {
        const userIdNum = parseInt(userId || '0');
        if (rolesData?.president_matricule === userIdNum ||
            rolesData?.secretaire_matricule === userIdNum ||
            rolesData?.delegue_voyage_matricule === userIdNum) {
          setUserRole('eleve');
        } else {
          setUserRole('none');
        }
      }

    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const peutCreerVote = (): boolean => {
    if (userRole === 'direction') return true;
    if (userRole === 'titulaire' || userRole === 'co_titulaire') return true;
    if (userRole === 'eleve' && (roles?.president_matricule || roles?.secretaire_matricule)) return true;
    return false;
  };

  useEffect(() => {
    loadData();
  }, [classeNom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du conseil de la classe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Conseil de la classe {classeNom}
          </h1>
          <p className="text-amber-100">
            Espace de vie démocratique et de décisions collectives
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {userRole === 'direction' && '📋 Direction'}
              {userRole === 'titulaire' && '👩‍🏫 Titulaire'}
              {userRole === 'co_titulaire' && '👨‍🏫 Co-titulaire'}
              {userRole === 'eleve' && '🎓 Élève'}
            </span>
            {roles?.president && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                👑 Président: {roles.president.prenom} {roles.president.nom}
              </span>
            )}
            {roles?.secretaire && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                📝 Secrétaire: {roles.secretaire.prenom} {roles.secretaire.nom}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Onglets pour la direction */}
      {userRole === 'direction' && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => router.push(`/dashboard/conseil-classe/${encodeURIComponent(classeNom)}`)}
              className="px-4 py-2 text-sm font-medium text-amber-600 border-b-2 border-amber-600"
            >
              <Vote className="w-4 h-4 inline mr-2" />
              Conseil
            </button>
            <button
              onClick={() => router.push(`/dashboard/conseil-classe/${encodeURIComponent(classeNom)}/titulariat`)}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Titulariat
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed"
            >
              Ordre du jour (bientôt)
            </button>
          </nav>
        </div>
      )}

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne de gauche - Infos */}
        <div className="lg:col-span-1 space-y-6">
          {/* Carte des titulaires */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Équipe pédagogique</h2>
            </div>
            <div className="space-y-3">
              {roles?.titulaire && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-gray-500">Titulaire</p>
                  <p className="font-medium">{roles.titulaire.prenom} {roles.titulaire.nom}</p>
                </div>
              )}
              {roles?.co_titulaire ? (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-gray-500">Co-titulaire</p>
                  <p className="font-medium">{roles.co_titulaire.prenom} {roles.co_titulaire.nom}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Co-titulaire non désigné</p>
              )}
            </div>
          </div>

          {/* Carte des élèves (pour direction et titulaires) */}
          {(userRole === 'direction' || userRole === 'titulaire' || userRole === 'co_titulaire') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold">Élèves ({eleves.length})</h2>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eleves.map(eleve => (
                  <div key={eleve.matricule} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{eleve.prenom} {eleve.nom}</p>
                      <p className="text-xs text-gray-500">Niveau {eleve.niveau}</p>
                    </div>
                    {roles?.president_matricule === eleve.matricule && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Président</span>
                    )}
                    {roles?.secretaire_matricule === eleve.matricule && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Secrétaire</span>
                    )}
                    {roles?.delegue_voyage_matricule === eleve.matricule && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Voyages</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne de droite - Votes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold">Votations</h2>
              </div>
              {peutCreerVote() && (
                <button
                  onClick={() => setShowVoteCreator(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Nouvelle votation
                </button>
              )}
            </div>

            {votesLoading ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Chargement des votations...</p>
              </div>
            ) : votes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Vote className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Aucune votation</p>
                {peutCreerVote() && (
                  <button
                    onClick={() => setShowVoteCreator(true)}
                    className="mt-3 text-amber-600 hover:text-amber-700"
                  >
                    Créer la première votation →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {votes.map(vote => (
                  <VoteCard
                    key={vote.id}
                    vote={vote}
                  />  
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal création vote */}
      {showVoteCreator && (
        <VoteCreator
          context={{ module: 'conseil_classe', id: classeNom }}
          onClose={() => setShowVoteCreator(false)}
          onSuccess={() => {
            setShowVoteCreator(false);
            loadData();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}