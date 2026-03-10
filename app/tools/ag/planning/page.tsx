// app/tools/ag/planning/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import { supabase } from '@/lib/supabase';
import AGStatusBadge from '@/components/ag/AGStatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PlanningItem {
  position: number;
  groupe: string;
  type: string;
  temps: number;
  resume: string;
  heure_debut: string;
  heure_fin: string;
}

export default function AGPlanningPage() {
  const router = useRouter();
  const { agStatut, canViewPlanning, loading: permissionsLoading } = useAGPermissions();
  const [planning, setPlanning] = useState<PlanningItem[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsLoading && !canViewPlanning) {
      router.push('/dashboard');
    }
  }, [canViewPlanning, permissionsLoading, router]);

  useEffect(() => {
    if (canViewPlanning) {
      chargerPlanning();
    }
  }, [canViewPlanning]);

  const chargerPlanning = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer la config AG
      const { data: configData, error: configError } = await supabase
        .from('ag_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError) throw configError;
      setConfig(configData);

      // Récupérer l'ordre des interventions avec les communications et les groupes
      const { data: ordreData, error: ordreError } = await supabase
        .from('ag_ordre_interventions')
        .select(`
          position,
          temps_calcule,
          communication_id,
          ag_communications (
            temps_demande,
            type_communication,
            resume,
            groupe_id,
            ag_groupes (
              nom
            )
          )
        `)
        .eq('ag_id', configData.id)
        .order('position');

      if (ordreError) throw ordreError;

      // Calculer les heures de début/fin
      const planningItems = ordreData.map((item: any, index: number) => {
        const com = item.ag_communications;
        const heureDebut = calculerHeureDebut(configData.heure_debut, ordreData.slice(0, index));
        const heureFin = ajouterMinutes(heureDebut, item.temps_calcule);
        
        return {
          position: item.position,
          groupe: com.ag_groupes?.nom || 'Groupe inconnu',
          type: com.type_communication,
          temps: item.temps_calcule,
          resume: com.resume,
          heure_debut: heureDebut,
          heure_fin: heureFin
        };
      });

      setPlanning(planningItems);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
      setError('Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  };

  const calculerHeureDebut = (heureDebut: string, itemsPrecedents: any[]) => {
    let totalMinutes = itemsPrecedents.reduce((acc, item) => acc + item.temps_calcule, 0);
    const [heures, minutes] = heureDebut.split(':').map(Number);
    const date = new Date();
    date.setHours(heures, minutes + totalMinutes, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const ajouterMinutes = (heure: string, minutes: number) => {
    const [h, m] = heure.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'information': return 'bg-blue-100 text-blue-800';
      case 'consultation': return 'bg-purple-100 text-purple-800';
      case 'decision': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'information': return 'Info';
      case 'consultation': return 'Consultation';
      case 'decision': return 'Décision';
      default: return type;
    }
  };

  if (permissionsLoading || loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Planning de l'Assemblée Générale</h1>
          {config && <AGStatusBadge statut={config.statut} />}
        </div>
        {config && (
          <p className="text-sm text-gray-500 mt-1">
            {new Date(config.date_ag).toLocaleDateString('fr-FR')} • {config.heure_debut} - {config.heure_fin}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {planning.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Aucun planning n'a encore été établi.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          {/* Timeline */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4 text-sm">
              <span className="font-medium text-gray-700">Durée totale :</span>
              <span className="text-gray-900">
                {Math.floor(
                  planning.reduce((acc, item) => acc + item.temps, 0) / 60
                )}h{planning.reduce((acc, item) => acc + item.temps, 0) % 60}min
              </span>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-gray-700">Début :</span>
              <span className="text-gray-900">{config?.heure_debut}</span>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-gray-700">Fin :</span>
              <span className="text-gray-900">{config?.heure_fin}</span>
            </div>
          </div>

          {/* Liste des interventions */}
          <div className="divide-y divide-gray-200">
            {planning.map((item) => (
              <div key={item.position} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-4">
                  {/* Position et heure */}
                  <div className="flex-shrink-0 w-24 text-center">
                    <div className="text-lg font-bold text-gray-900">#{item.position}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.heure_debut} - {item.heure_fin}
                    </div>
                    <div className="text-xs font-medium text-gray-400 mt-1">
                      {item.temps} min
                    </div>
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.groupe}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    
                    {item.resume && (
                      <div className="text-sm text-gray-600 whitespace-pre-line">
                        {item.resume}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Légende */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-6 text-xs">
              <span className="font-medium text-gray-700">Types :</span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 bg-blue-100 rounded-full mr-1"></span>
                Information
              </span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 bg-purple-100 rounded-full mr-1"></span>
                Consultation
              </span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 bg-red-100 rounded-full mr-1"></span>
                Décision
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bouton retour si en configuration */}
      {canViewPlanning && (
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/tools/ag/configuration')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Retour à la configuration
          </button>
        </div>
      )}
    </main>
  );
}