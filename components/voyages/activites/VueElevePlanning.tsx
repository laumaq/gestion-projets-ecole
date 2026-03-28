//components/activites/VueElevePlanning.tsx
// 'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  voyageId: string;
  participantId: string;
  participantType: 'employee' | 'student';
}

interface ActiviteInscrite {
  id: string;
  titre: string;
  description: string;
  heure_debut: string;
  heure_fin: string;
  jour: string;
  groupe_nom: string;
  est_obligatoire: boolean;
}

export default function VueElevePlanning({ voyageId, participantId, participantType }: Props) {
  const [activites, setActivites] = useState<ActiviteInscrite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlanning();
  }, [voyageId]);


  const loadPlanning = async () => {
    if (!participantId) {
      setLoading(false);
      return;
    }

    // 1. Récupérer les inscriptions du participant
    const { data: inscriptionsData } = await supabase
      .from('inscriptions_activites')
      .select(`
        activite_id,
        activites!inner (
          id,
          titre,
          description,
          heure_debut,
          heure_fin,
          est_obligatoire,
          groupes_activites!inner (
            nom,
            planning_jours!inner (
              date
            )
          )
        )
      `)
      .eq('participant_id', participantId)
      .eq('participant_type', participantType);

    // 2. Récupérer TOUTES les activités obligatoires du voyage
    const { data: activitesObligatoiresData } = await supabase
      .from('activites')
      .select(`
        id,
        titre,
        description,
        heure_debut,
        heure_fin,
        est_obligatoire,
        groupes_activites!inner (
          nom,
          planning_jours!inner (
            date,
            voyage_id
          )
        )
      `)
      .eq('est_obligatoire', true)
      .eq('groupes_activites.planning_jours.voyage_id', voyageId);

    // 3. Formater les activités inscrites
    const inscrites = (inscriptionsData || []).map((item: any) => ({
      id: item.activites.id,
      titre: item.activites.titre,
      description: item.activites.description,
      heure_debut: item.activites.heure_debut,
      heure_fin: item.activites.heure_fin,
      jour: item.activites.groupes_activites.planning_jours.date,
      groupe_nom: item.activites.groupes_activites.nom,
      est_obligatoire: false
    }));

    // 4. Formater les activités obligatoires
    const obligatoires = (activitesObligatoiresData || []).map((item: any) => ({
      id: item.id,
      titre: item.titre,
      description: item.description,
      heure_debut: item.heure_debut,
      heure_fin: item.heure_fin,
      jour: item.groupes_activites.planning_jours.date,
      groupe_nom: item.groupes_activites.nom,
      est_obligatoire: true
    }));

    // 5. Fusionner et trier par date
    const formated = [...inscrites, ...obligatoires];
    formated.sort((a, b) => a.jour.localeCompare(b.jour));
    
    setActivites(formated);
    setLoading(false);
  };

  // Grouper les activités par jour
  const activitesParJour = activites.reduce((acc, act) => {
    if (!acc[act.jour]) acc[act.jour] = [];
    acc[act.jour].push(act);
    return acc;
  }, {} as Record<string, ActiviteInscrite[]>);

  if (loading) return <div className="text-center py-8">Chargement de votre planning...</div>;

  if (activites.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité inscrite</h3>
        <p className="text-gray-600">
          Rendez-vous dans l'onglet "Choisir mes activités" pour vous inscrire.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-4 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-900">📅 Mon planning personnel</h2>
        <p className="text-sm text-gray-600">
          {activites.length} activité{activites.length > 1 ? 's' : ''} inscrite{activites.length > 1 ? 's' : ''}
        </p>
      </div>

      {Object.entries(activitesParJour)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, activitesDuJour]) => {
          const dateObj = parseISO(date);
          const jourSemaine = format(dateObj, 'EEEE', { locale: fr });
          const dateStr = format(dateObj, 'dd MMMM yyyy', { locale: fr });
          
          return (
            <div key={date} className="bg-white rounded-lg border overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 capitalize">{jourSemaine}</span>
                  <span className="text-sm text-gray-500">{dateStr}</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {activitesDuJour
                  .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
                  .map((activite) => (
                    <div key={activite.id} className="border rounded-lg p-4 hover:shadow-sm transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">{activite.titre}</h3>
                            {activite.est_obligatoire && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                Obligatoire
                              </span>
                            )}
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {activite.groupe_nom}
                            </span>
                            <span className="text-xs text-gray-500">
                              ⏰ {activite.heure_debut.slice(0, 5)} - {activite.heure_fin.slice(0, 5)}
                            </span>
                          </div>
                          {activite.description && (
                            <p className="text-sm text-gray-500 mt-1">{activite.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

              </div>
            </div>
          );
        })}
    </div>
  );
}