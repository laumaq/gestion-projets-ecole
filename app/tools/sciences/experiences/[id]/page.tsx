'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DataTable from '@/components/sciences/experiences/DataTable';
import GraphiqueIntelligent from '@/components/sciences/experiences/GraphiqueIntelligent';
import GraphiqueConfigurator from '@/components/sciences/experiences/GraphiqueConfigurator';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Cibles {
  classes: string[];
  groupes: string[];
}

interface GraphiqueConfig {
  nom: string;
  type: 'scatter' | 'line' | 'bar';
  tableau_index: number;
  axe_x: string;
  axe_y: string;
  groupe_par?: string;
}

interface Experience {
  id: string;
  nom: string;
  description: string;
  cibles: {  
    classes: string[];
    groupes: string[];
  };
  classe?: string;
  created_by: string;
  created_at: string;
  statut: string;
  config: {
    tableaux: {
      nom: string;
      colonnes: {
        nom: string;
        unite: string;
        type: string;
      }[];
    }[];
    graphiques: GraphiqueConfig[];
  };
}

interface Mesure {
  id: string;
  eleve_matricule: number;
  tableau_index: number;
  mesures: Record<string, number | null>;
  created_at: string;
  updated_at: string;
  eleve?: { nom: string; prenom: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Vérifie si un élève a accès à une expérience.
 * Compatibilité assurée : si cibles est absent, on retombe sur l'ancienne
 * logique (classe = exp.classe).
 */
// Fonction pour vérifier si un élève a accès à une expérience
function eleveAAcces(
  exp: Experience,
  classeEleve: string,
  groupesEleve: string[]
): boolean {
  // Si cibles n'existe pas (anciennes données), on considère que c'est la classe du premier tableau
  // mais en réalité, les anciennes données avaient un champ classe direct
  const cibles = exp.cibles ?? { 
    classes: exp.classe ? [exp.classe] : [], 
    groupes: [] 
  };
  
  return (
    cibles.classes.includes(classeEleve) ||
    groupesEleve.some(g => cibles.groupes.includes(g))
  );
}

// Fonction pour obtenir un résumé des cibles
function resumeCibles(exp: Experience): string {
  const cibles = exp.cibles;
  
  // Si cibles existe et a des éléments
  if (cibles) {
    const parts = [...cibles.classes, ...cibles.groupes];
    if (parts.length > 0) {
      // Limiter l'affichage à 3 éléments pour ne pas surcharger
      if (parts.length <= 3) {
        return parts.join(', ');
      } else {
        return `${parts.slice(0, 3).join(', ')}... (+${parts.length - 3})`;
      }
    }
  }
  
  // Fallback : utiliser l'ancien champ classe si présent
  if (exp.classe) {
    return exp.classe;
  }
  
  return 'Tous';
}


// Et si vous voulez une version plus détaillée pour l'affichage dans l'en-tête :
function afficherCiblesDetail(exp: Experience): string {
  const cibles = exp.cibles;
  if (!cibles) return 'Tous';
  
  const classes = cibles.classes;
  const groupes = cibles.groupes;
  
  if (classes.length === 0 && groupes.length === 0) return 'Tous';
  
  const parties: string[] = [];
  if (classes.length > 0) {
    parties.push(`${classes.length} classe${classes.length > 1 ? 's' : ''}`);
  }
  if (groupes.length > 0) {
    parties.push(`${groupes.length} groupe${groupes.length > 1 ? 's' : ''}`);
  }
  
  return parties.join(' · ');
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ExperienceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const experienceId = params.id as string;

  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  const [experience, setExperience] = useState<Experience | null>(null);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [editingGraphiques, setEditingGraphiques] = useState(false);
  const [tempGraphiques, setTempGraphiques] = useState<GraphiqueConfig[]>([]);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [currentGraphique, setCurrentGraphique] = useState<GraphiqueConfig | null>(null);
  const [currentGraphiqueIndex, setCurrentGraphiqueIndex] = useState(-1);

  useEffect(() => {
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const id = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');

    if (!type || !id) {
      router.push('/');
      return;
    }

    setUserType(type);
    setUserId(id);
    setUserName(name || '');
    chargerExperience(type, id);
  }, [router, experienceId]);

  // ── Chargement ─────────────────────────────────────────────

  const chargerExperience = async (type: string, id: string) => {
    try {
      setLoading(true);

      const { data: expData, error: expError } = await supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .single();

      if (expError) throw expError;

      // Vérification d'accès pour les élèves
      if (type === 'student') {
        const classeEleve = localStorage.getItem('userClass') || '';
        const matricule = parseInt(id);

        const { data: groupesData } = await supabase
          .from('students_groups')
          .select('groupe_code')
          .eq('matricule', matricule);

        const groupesEleve = (groupesData || []).map(g => g.groupe_code);

        if (!eleveAAcces(expData, classeEleve, groupesEleve)) {
          router.push('/tools/sciences');
          return;
        }
      }

      setExperience(expData);

      const { data: mesuresData, error: mesuresError } = await supabase
        .from('experience_mesures')
        .select(`
          *,
          eleve:students!experience_mesures_eleve_matricule_fkey (
            nom, prenom
          )
        `)
        .eq('experience_id', experienceId)
        .order('created_at', { ascending: false });

      if (mesuresError) throw mesuresError;
      setMesures(mesuresData || []);

      // Subscription temps réel
      const subscription = supabase
        .channel(`experience-${experienceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'experience_mesures', filter: `experience_id=eq.${experienceId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMesures(prev => [payload.new as Mesure, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setMesures(prev => prev.map(m => m.id === payload.new.id ? payload.new as Mesure : m));
            } else if (payload.eventType === 'DELETE') {
              setMesures(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => { subscription.unsubscribe(); };

    } catch (error) {
      console.error('Erreur chargement expérience:', error);
      router.push('/tools/sciences');
    } finally {
      setLoading(false);
    }
  };

  // ── Mesures ────────────────────────────────────────────────

  const ajouterMesure = async (tableauIndex: number, valeurs: Record<string, number | null>) => {
    if (userType !== 'student') return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('experience_mesures').insert([{
        experience_id: experienceId,
        eleve_matricule: parseInt(userId),
        tableau_index: tableauIndex,
        mesures: valeurs
      }]);
      if (error) throw error;
    } catch (error) {
      console.error('Erreur ajout mesure:', error);
      alert('Erreur lors de l\'ajout de la mesure');
    } finally {
      setSubmitting(false);
    }
  };

  const modifierMesure = async (mesureId: string, valeurs: Record<string, number | null>) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('experience_mesures')
        .update({ mesures: valeurs, updated_at: new Date().toISOString() })
        .eq('id', mesureId);
      if (error) throw error;
      await chargerExperience(userType, userId);
    } catch (error) {
      console.error('Erreur modification mesure:', error);
      alert('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerMesure = async (mesureId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette mesure ?')) return;
    try {
      const { error } = await supabase.from('experience_mesures').delete().eq('id', mesureId);
      if (error) throw error;
      await chargerExperience(userType, userId);
    } catch (error) {
      console.error('Erreur suppression mesure:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // ── Graphiques ─────────────────────────────────────────────

  const handleEditGraphiques = () => {
    setTempGraphiques(experience?.config.graphiques || []);
    setEditingGraphiques(true);
  };

  const handleAddGraphique = () => {
    setCurrentGraphique(null);
    setCurrentGraphiqueIndex(-1);
    setShowConfigurator(true);
  };

  const handleEditGraphique = (graphique: GraphiqueConfig, index: number) => {
    setCurrentGraphique(graphique);
    setCurrentGraphiqueIndex(index);
    setShowConfigurator(true);
  };

  const handleRemoveGraphique = (index: number) => {
    setTempGraphiques(tempGraphiques.filter((_, i) => i !== index));
  };

  const handleSaveGraphique = (graphiqueConfig: GraphiqueConfig) => {
    if (currentGraphiqueIndex === -1) {
      setTempGraphiques([...tempGraphiques, graphiqueConfig]);
    } else {
      const newGraphiques = [...tempGraphiques];
      newGraphiques[currentGraphiqueIndex] = graphiqueConfig;
      setTempGraphiques(newGraphiques);
    }
    setShowConfigurator(false);
    setCurrentGraphique(null);
  };

  const handleSaveGraphiquesConfig = async () => {
    try {
      const newConfig = {
        tableaux: experience?.config.tableaux || [],
        graphiques: tempGraphiques
      };
      const { error } = await supabase.from('experiences').update({ config: newConfig }).eq('id', experienceId);
      if (error) throw error;
      setExperience(prev => prev ? { ...prev, config: { ...prev.config, graphiques: tempGraphiques } } : null);
      setEditingGraphiques(false);
    } catch (error) {
      console.error('Erreur sauvegarde graphiques:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const supprimerExperience = async () => {
    if (userType !== 'employee') return;
    if (!confirm('Voulez-vous vraiment supprimer cette expérience ? Toutes les données seront perdues.')) return;
    try {
      const { error } = await supabase.from('experiences').delete().eq('id', experienceId);
      if (error) throw error;
      router.push('/tools/sciences');
    } catch (error) {
      console.error('Erreur suppression expérience:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // ── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-500">Chargement de l'expérience...</div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Expérience non trouvée</p>
      </div>
    );
  }

  const mesuresParTableau = mesures.reduce((acc, mesure) => {
    if (!acc[mesure.tableau_index]) acc[mesure.tableau_index] = [];
    acc[mesure.tableau_index].push(mesure);
    return acc;
  }, {} as Record<number, Mesure[]>);

  return (
    <div>
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{experience.nom}</h1>
            {experience.description && (
              <p className="text-gray-600 mt-2">{experience.description}</p>
            )}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
              <span>
                Destinataires : <span className="font-medium text-gray-700">{resumeCibles(experience)}</span>
              </span>
              <span>•</span>
              <span>Créée le {new Date(experience.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          {userType === 'employee' && (
            <button
              onClick={supprimerExperience}
              className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100"
            >
              Supprimer l'expérience
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { label: `Données (${mesures.length} mesures)`, index: 0 },
            { label: 'Graphiques', index: 1 },
            ...(userType === 'employee' ? [{ label: 'Configuration', index: 2 }] : []),
          ].map(({ label, index }) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === index
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Onglet Données */}
      {activeTab === 0 && (
        <div className="space-y-8">
          {experience.config.tableaux.map((tableau, index) => (
            <DataTable
              key={index}
              tableau={tableau}
              tableauIndex={index}
              mesures={mesuresParTableau[index] || []}
              userType={userType}
              userId={parseInt(userId)}
              userName={userName}
              onAjouterMesure={(valeurs) => ajouterMesure(index, valeurs)}
              onModifierMesure={modifierMesure}
              onSupprimerMesure={supprimerMesure}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      {/* Onglet Graphiques */}
      {activeTab === 1 && (
        <div className="space-y-8">
          {experience.config.graphiques.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4">Aucun graphique configuré pour cette expérience</p>
              {userType === 'employee' && (
                <button
                  onClick={() => setActiveTab(2)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Configurer les graphiques
                </button>
              )}
            </div>
          ) : (
            experience.config.graphiques.map((graphique, index) => (
              <GraphiqueIntelligent
                key={index}
                config={graphique}
                tableaux={experience.config.tableaux}
                mesuresParTableau={mesuresParTableau}
                userType={userType}
                userId={parseInt(userId)}
                onModifierMesure={modifierMesure}
                onSupprimerMesure={supprimerMesure}
              />
            ))
          )}
        </div>
      )}

      {/* Onglet Configuration */}
      {activeTab === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Configuration des graphiques</h2>
            {!editingGraphiques ? (
              <button onClick={handleEditGraphiques} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Modifier
              </button>
            ) : (
              <div className="space-x-2">
                <button onClick={handleSaveGraphiquesConfig} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  Sauvegarder
                </button>
                <button onClick={() => setEditingGraphiques(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                  Annuler
                </button>
              </div>
            )}
          </div>

          {!editingGraphiques ? (
            <div className="space-y-4">
              {experience.config.graphiques.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun graphique configuré</p>
              ) : (
                experience.config.graphiques.map((graphique, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{graphique.nom}</h3>
                    <p className="text-sm text-gray-600">
                      {graphique.axe_y} en fonction de {graphique.axe_x}
                      {graphique.groupe_par && ` (groupé par ${graphique.groupe_par})`}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : showConfigurator ? (
            <GraphiqueConfigurator
              tableaux={experience.config.tableaux}
              config={currentGraphique || undefined}
              onSave={handleSaveGraphique}
              onCancel={() => { setShowConfigurator(false); setCurrentGraphique(null); }}
            />
          ) : (
            <div className="space-y-6">
              <button onClick={handleAddGraphique} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                + Ajouter un graphique
              </button>

              {tempGraphiques.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun graphique configuré</p>
              ) : (
                tempGraphiques.map((graphique, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{graphique.nom}</h3>
                        <p className="text-sm text-gray-600">
                          {graphique.axe_y} en fonction de {graphique.axe_x}
                          {graphique.groupe_par && ` (groupé par ${graphique.groupe_par})`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditGraphique(graphique, index)} className="text-blue-600 hover:text-blue-800 text-sm">
                          Modifier
                        </button>
                        <button onClick={() => handleRemoveGraphique(index)} className="text-red-600 hover:text-red-800 text-sm">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}