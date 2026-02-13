'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PlanChambres from './PlanChambres';

interface Props {
  voyageId: string;
  isResponsable: boolean;
  userType: 'employee' | 'student' | null;
  onConfigSelect?: (configId: string) => void; 
}

interface HebergementConfig {
  id: string;
  nom: string;
  lieu: string;
  date_debut: string;
  date_fin: string;
  ordre: number;
}

export default function HebergementConfigs({ voyageId, isResponsable, userType, onConfigSelect }: Props) {
  const [configs, setConfigs] = useState<HebergementConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  const canEdit = userType === 'employee' && isResponsable;

  useEffect(() => {
    loadConfigs();
  }, [voyageId]);

  const loadConfigs = async () => {
    const { data, error } = await supabase
      .from('hebergement_configs')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('ordre');

    if (!error && data) {
      setConfigs(data);
      if (data.length > 0 && !selectedConfig) {
        setSelectedConfig(data[0].id);
      }
    }
    setLoading(false);
  };
  
  const handleConfigClick = (configId: string) => {
    setSelectedConfig(configId);
    if (onConfigSelect) {
      onConfigSelect(configId);  // ← Notifier le parent
    }
  };

  const createConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { data, error } = await supabase
      .from('hebergement_configs')
      .insert({
        voyage_id: voyageId,
        nom: formData.get('nom'),
        lieu: formData.get('lieu'),
        date_debut: formData.get('date_debut'),
        date_fin: formData.get('date_fin'),
        ordre: configs.length
      })
      .select()
      .single();

    if (!error && data) {
      loadConfigs();
      setSelectedConfig(data.id);
      setShowNewConfig(false);
    }
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hébergement</h2>
          <p className="text-gray-600 mt-1">
            {configs.length} configuration{configs.length > 1 ? 's' : ''} d'hébergement
          </p>
        </div>
        <button
          onClick={() => setShowNewConfig(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nouvelle configuration
        </button>
      </div>

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            👋 Vous êtes en mode consultation. Vous pouvez voir les configurations d'hébergement, 
            mais vous ne pouvez pas les modifier.
          </p>
        </div>
      )}

      {/* Sélecteur de configuration */}
      {configs.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {configs.map((config) => (
              <button
                key={config.id}
                onClick={() => handleConfigClick(config.id)}
                className={`px-4 py-3 rounded-lg border-2 transition flex-shrink-0 ${
                  selectedConfig === config.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{config.nom}</div>
                <div className="text-sm text-gray-600">{config.lieu}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(config.date_debut).toLocaleDateString('fr-FR')}
                </div>
              </button>
            ))}
          </div>

          {/* Plan des chambres */}
          {selectedConfig && (
            <PlanChambres 
              configId={selectedConfig} 
              voyageId={voyageId}
              isResponsable={isResponsable}
              userType={userType}
            />
        )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🏨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune configuration d'hébergement
          </h3>
          <p className="text-gray-600 mb-4">
            Créez une première configuration pour commencer à organiser les chambres
          </p>
          {canEdit && (
            <button
              onClick={() => setShowNewConfig(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer une configuration
            </button>
          )}
        </div>
      )}

      {/* Modal nouvelle configuration */}
      {canEdit && showNewConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Nouvelle configuration</h3>
            <form onSubmit={createConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  name="nom"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Auberge de Nuremberg - Nuit 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lieu</label>
                <input
                  name="lieu"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Nuremberg Centre"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <input
                    name="date_debut"
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <input
                    name="date_fin"
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewConfig(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
