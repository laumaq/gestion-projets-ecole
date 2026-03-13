// app/tools/sciences/experiences/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DataTable from '@/components/sciences/experiences/DataTable';
import CollaborativeChart from '@/components/sciences/experiences/CollaborativeChart';

interface Experience {
  id: string;
  nom: string;
  description: string;
  classe: string;
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
    graphiques: {
      nom: string;
      type: 'scatter' | 'line' | 'bar' | 'pie';
      tableau_source: number;
      series: {
        nom: string;
        x_colonne: string;
        y_colonne: string;
      }[];
    }[];
  };
}

interface Mesure {
  id: string;
  eleve_matricule: number;
  tableau_index: number;
  mesures: Record<string, number | null>;
  created_at: string;
  updated_at: string;
  eleve?: {
    nom: string;
    prenom: string;
  };
}

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
  const [activeTab, setActiveTab] = useState(0); // 0: données, 1: graphiques
  const [submitting, setSubmitting] = useState(false);

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
    chargerExperience();
  }, [router, experienceId]);

  const chargerExperience = async () => {
    try {
      setLoading(true);

      // Charger les détails de l'expérience
      const { data: expData, error: expError } = await supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .single();

      if (expError) throw expError;
      setExperience(expData);

      // Vérifier les permissions
      if (userType === 'student' && expData.classe !== localStorage.getItem('userClass')) {
        router.push('/tools/sciences');
        return;
      }

      // Charger toutes les mesures
      const { data: mesuresData, error: mesuresError } = await supabase
        .from('experience_mesures')
        .select(`
          *,
          eleve:students!experience_mesures_eleve_matricule_fkey (
            nom,
            prenom
          )
        `)
        .eq('experience_id', experienceId)
        .order('created_at', { ascending: false });

      if (mesuresError) throw mesuresError;
      setMesures(mesuresData || []);

      // S'abonner aux nouvelles mesures en temps réel
      const subscription = supabase
        .channel(`experience-${experienceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'experience_mesures',
            filter: `experience_id=eq.${experienceId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMesures(prev => [payload.new as Mesure, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setMesures(prev => prev.map(m => 
                m.id === payload.new.id ? payload.new as Mesure : m
              ));
            } else if (payload.eventType === 'DELETE') {
              setMesures(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };

    } catch (error) {
      console.error('Erreur chargement expérience:', error);
      router.push('/tools/sciences');
    } finally {
      setLoading(false);
    }
  };

  const ajouterMesure = async (tableauIndex: number, valeurs: Record<string, number | null>) => {
    if (userType !== 'student') return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('experience_mesures')
        .insert([
          {
            experience_id: experienceId,
            eleve_matricule: parseInt(userId),
            tableau_index: tableauIndex,
            mesures: valeurs
          }
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur ajout mesure:', error);
      alert('Erreur lors de l\'ajout de la mesure');
    } finally {
      setSubmitting(false);
    }
  };

  const modifierMesure = async (mesureId: string, valeurs: Record<string, number | null>) => {
    if (userType !== 'student') return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('experience_mesures')
        .update({ mesures: valeurs, updated_at: new Date().toISOString() })
        .eq('id', mesureId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur modification mesure:', error);
      alert('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerMesure = async (mesureId: string) => {
    if (userType !== 'student') return;

    if (!confirm('Voulez-vous vraiment supprimer cette mesure ?')) return;

    try {
      const { error } = await supabase
        .from('experience_mesures')
        .delete()
        .eq('id', mesureId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur suppression mesure:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const supprimerExperience = async () => {
    if (userType !== 'employee') return;

    if (!confirm('Voulez-vous vraiment supprimer cette expérience ? Toutes les données seront perdues.')) return;

    try {
      const { error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', experienceId);

      if (error) throw error;
      router.push('/tools/sciences');
    } catch (error) {
      console.error('Erreur suppression expérience:', error);
      alert('Erreur lors de la suppression');
    }
  };

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
    if (!acc[mesure.tableau_index]) {
      acc[mesure.tableau_index] = [];
    }
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
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Classe: {experience.classe}</span>
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
          <button
            onClick={() => setActiveTab(0)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 0
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Données ({mesures.length} mesures)
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 1
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Graphiques
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 0 ? (
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
      ) : (
        <div className="space-y-8">
          {experience.config.graphiques.map((graphique, index) => (
            <CollaborativeChart
              key={index}
              graphique={graphique}
              tableau={experience.config.tableaux[graphique.tableau_source]}
              mesures={mesuresParTableau[graphique.tableau_source] || []}
            />
          ))}
          {experience.config.graphiques.length === 0 && (
            <p className="text-center text-gray-500 py-12">
              Aucun graphique configuré pour cette expérience
            </p>
          )}
        </div>
      )}
    </div>
  );
}