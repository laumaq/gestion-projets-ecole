// app/dashboard/conseil-de-la-classe/[classe]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { VoteCreator } from '@/components/votes/VoteCreator';
import { VoteCard } from '@/components/votes/VoteCard';
import { useVoteContext } from '@/hooks/votes/useVoteContext';
import { Users, UserPlus, Vote, ChevronLeft, Shield } from 'lucide-react';

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
  
  const [anneeScolaire, setAnneeScolaire] = useState<string>('');
  const [roles, setRoles] = useState<RolesData | null>(null);
  const [eleves, setEleves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoteCreator, setShowVoteCreator] = useState(false);
  const [userRole, setUserRole] = useState<'titulaire' | 'co_titulaire' | 'eleve' | 'educateur' | 'none'>('none');

  // Utilisation du hook générique pour les votes
  const { votes, loading: votesLoading, refresh: refreshVotes } = useVoteContext({
    module: 'conseil_classe',
    id: classeNom,
    idField: 'conseil_classe_classe_nom'
  });

  // Récupérer l'année scolaire courante
  useEffect(() => {
    const getAnnee = async () => {
      const { data } = await supabase
        .from('conseil_classes_config')
        .select('annee_scolaire')
        .order('annee_scolaire', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setAnneeScolaire(data.annee_scolaire);
      } else {
        setAnneeScolaire('2025-2026');
      }
    };
    getAnnee();
  }, []);

  const loadData = async () => {
    if (!anneeScolaire) return;
    
    try {
      setLoading(true);

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
        let titulaire = undefined;
        let coTitulaire = undefined;
        let president = undefined;
        let secretaire = undefined;
        let delegueVoyage = undefined;
        
        if (rolesData.titulaire && typeof rolesData.titulaire === 'object') {
          const titulaireData = Array.isArray(rolesData.titulaire) ? rolesData.titulaire[0] : rolesData.titulaire;
          titulaire = {
            nom: titulaireData.nom,
            prenom: titulaireData.prenom
          };
        }
        
        if (rolesData.co_titulaire && typeof rolesData.co_titulaire === 'object') {
          const coTitulaireData = Array.isArray(rolesData.co_titulaire) ? rolesData.co_titulaire[0] : rolesData.co_titulaire;
          coTitulaire = {
            nom: coTitulaireData.nom,
            prenom: coTitulaireData.prenom
          };
        }
        
        if (rolesData.president && typeof rolesData.president === 'object') {
          const presidentData = Array.isArray(rolesData.president) ? rolesData.president[0] : rolesData.president;
          president = {
            nom: presidentData.nom,
            prenom: presidentData.prenom
          };
        }
        
        if (rolesData.secretaire && typeof rolesData.secretaire === 'object') {
          const secretaireData = Array.isArray(rolesData.secretaire) ? rolesData.secretaire[0] : rolesData.secretaire;
          secretaire = {
            nom: secretaireData.nom,
            prenom: secretaireData.prenom
          };
        }
        
        if (rolesData.delegue_voyage && typeof rolesData.delegue_voyage === 'object') {
          const delegueData = Array.isArray(rolesData.delegue_voyage) ? rolesData.delegue_voyage[0] : rolesData.delegue_voyage;
          delegueVoyage = {
            nom: delegueData.nom,
            prenom: delegueData.prenom
          };
        }

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

      // Charger les élèves
      const { data: elevesData } = await supabase
        .from('students')
        .select('matricule, nom, prenom, niveau')
        .eq('classe', classeNom)
        .order('nom');

      setEleves(elevesData || []);

      // Déterminer le rôle
      const userId = localStorage.getItem('userId');
      const userJob = localStorage.getItem('userJob');
      const userType = localStorage.getItem('userType');

      if (userType === 'employee') {
        if (rolesData?.titulaire_id === userId) {
          setUserRole('titulaire');
        } else if (rolesData?.co_titulaire_id === userId) {
          setUserRole('co_titulaire');
        } else if (userJob === 'educ') {
          const niveau = classeNom.match(/^(\d+)/)?.[1];
          if (niveau) {
            const { data: educNiveau } = await supabase
              .from('conseil_annee_educateurs')
              .select('id')
              .eq('annee_scolaire', anneeScolaire)
              .eq('niveau', niveau)
              .eq('educateur_id', userId)
              .maybeSingle();
            
            if (educNiveau) {
              setUserRole('educateur');
            } else {
              setUserRole('none');
            }
          } else {
            setUserRole('none');
          }
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
    if (userRole === 'titulaire' || userRole === 'co_titulaire' || userRole === 'educateur') return true;
    if (userRole === 'eleve' && (roles?.president_matricule || roles?.secretaire_matricule || roles?.delegue_voyage_matricule)) return true;
    return false;
  };

  useEffect(() => {
    if (anneeScolaire) {
      loadData();
    }
  }, [classeNom, anneeScolaire]);

  if (loading || !anneeScolaire) {
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


        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Conseil de la classe {classeNom}
              </h1>
              <p className="text-amber-100">
                Espace de vie démocratique et de décisions collectives
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {userRole === 'titulaire' && '👩‍🏫 Titulaire'}
                  {userRole === 'co_titulaire' && '👨‍🏫 Co-titulaire'}
                  {userRole === 'educateur' && '🧑‍🏫 Éducateur'}
                  {userRole === 'eleve' && '🎓 Élève'}
                  {userRole === 'none' && '👤 Visiteur'}
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
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne de gauche */}
        <div className="lg:col-span-1 space-y-6">
          {/* Équipe pédagogique */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Équipe pédagogique</h2>
            </div>
            <div className="space-y-3">
              {roles?.titulaire ? (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-gray-500">Titulaire</p>
                  <p className="font-medium">{roles.titulaire.prenom} {roles.titulaire.nom}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Titulaire non désigné</p>
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

          {/* Élèves */}
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
                  <div className="flex gap-1">
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
                </div>
              ))}
            </div>
          </div>
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
                    onUpdate={refreshVotes}
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
          context={{ 
            module: 'conseil_classe', 
            id: classeNom,
            idField: 'conseil_classe_classe_nom'
          }}
          onClose={() => setShowVoteCreator(false)}
          onSuccess={() => {
            setShowVoteCreator(false);
            refreshVotes();
          }}
        />
      )}
    </div>
  );
}