// components/voyages/HebergementConfigs.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PlanChambres from './PlanChambres';
import PrisePresences from './PrisePresences';

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

// Composant à ajouter dans HebergementConfigs.tsx pour les responsables
const GestionCharte = ({ voyageId, isResponsable }: { voyageId: string; isResponsable: boolean }) => {
  const [contenu, setContenu] = useState('');
  const [editing, setEditing] = useState(false);

  const loadCharte = async () => {
    const { data } = await supabase
      .from('voyage_chartes')
      .select('contenu')
      .eq('voyage_id', voyageId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    if (data) setContenu(data.contenu);
  };

  const saveCharte = async () => {
    await supabase
      .from('voyage_chartes')
      .insert({
        voyage_id: voyageId,
        contenu: contenu,
        created_by: localStorage.getItem('userId')
      });
    setEditing(false);
  };

  if (!isResponsable) return null;

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h3 className="font-medium mb-3">📜 Charte du voyage</h3>
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            placeholder="Rédigez la charte... (HTML supporté)"
          />
          <div className="flex gap-2">
            <button
              onClick={saveCharte}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Publier
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {contenu ? (
            <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-gray-50">
              <div dangerouslySetInnerHTML={{ __html: contenu }} />
            </div>
          ) : (
            <p className="text-gray-500 italic">Aucune charte définie</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {contenu ? 'Modifier la charte' : 'Créer une charte'}
          </button>
        </div>
      )}
    </div>
  );
};

// Composant de configuration interne
const ConfigurationVoyage = ({ voyageId, isResponsable }: { voyageId: string; isResponsable: boolean }) => {
  const [config, setConfig] = useState({ auto_affectation_eleves: false, visibilite_restreinte_eleves: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [voyageId]);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('voyages')
      .select('auto_affectation_eleves, visibilite_restreinte_eleves')
      .eq('id', voyageId)
      .single();
    
    if (data) setConfig(data);
  };

  const updateConfig = async (key: string, value: boolean) => {
    setSaving(true);
    await supabase
      .from('voyages')
      .update({ [key]: value })
      .eq('id', voyageId);
    
    setConfig({ ...config, [key]: value });
    setSaving(false);
  };

  if (!isResponsable) return null;

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h3 className="font-medium mb-3">Configuration des chambres pour les élèves</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.auto_affectation_eleves}
            onChange={(e) => updateConfig('auto_affectation_eleves', e.target.checked)}
            disabled={saving}
            className="rounded"
          />
          <span className="text-sm">Permettre aux élèves de s'inscrire eux-mêmes dans les chambres</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.visibilite_restreinte_eleves}
            onChange={(e) => updateConfig('visibilite_restreinte_eleves', e.target.checked)}
            disabled={saving}
            className="rounded"
          />
          <span className="text-sm">Restreindre la visibilité : les élèves ne voient que leur chambre</span>
        </label>
      </div>
    </div>
  );
};

export default function HebergementConfigs({ voyageId, isResponsable, userType, onConfigSelect }: Props) {
  const [configs, setConfigs] = useState<HebergementConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hebergementTab, setHebergementTab] = useState<'presences' | 'composition'>('presences');
  const [editingConfig, setEditingConfig] = useState<HebergementConfig | null>(null);

  const isEmployee = userType === 'employee';
  const isEleve = userType === 'student';
  const canEdit = isEmployee && isResponsable;

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
        if (onConfigSelect) onConfigSelect(data[0].id);
      }
    }
    setLoading(false);
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
      if (onConfigSelect) onConfigSelect(data.id);
      setShowNewConfig(false);
    }
  };


  // Ajoutez ces fonctions après createConfig (vers ligne 150-160)
  const updateConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingConfig) return;
    
    const formData = new FormData(e.currentTarget);
    
    await supabase
      .from('hebergement_configs')
      .update({
        nom: formData.get('nom'),
        lieu: formData.get('lieu'),
        date_debut: formData.get('date_debut'),
        date_fin: formData.get('date_fin'),
      })
      .eq('id', editingConfig.id);

    loadConfigs();
    setEditingConfig(null);
  };

  const deleteConfig = async (configId: string) => {
    if (confirm('Supprimer cette configuration ? Toutes les chambres associées seront également supprimées.')) {
      await supabase
        .from('hebergement_configs')
        .delete()
        .eq('id', configId);
      
      loadConfigs();
      if (selectedConfig === configId) {
        setSelectedConfig(configs[0]?.id || null);
      }
    }
  };  

  const handleConfigClick = (configId: string) => {
    setSelectedConfig(configId);
    if (onConfigSelect) onConfigSelect(configId);
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* Configuration du voyage - visible uniquement pour les responsables */}
      <ConfigurationVoyage voyageId={voyageId} isResponsable={isResponsable} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hébergement</h2>
          <p className="text-gray-600 mt-1">
            {configs.length} configuration{configs.length > 1 ? 's' : ''} d'hébergement
          </p>
        </div>
        
        {canEdit && (
          <button
            onClick={() => setShowNewConfig(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Nouvelle configuration
          </button>
        )}
      </div>

      {/* Message pour les non-éditeurs */}
      {!canEdit && isEmployee && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            👋 Vous êtes en mode consultation. Vous pouvez voir les configurations d'hébergement, 
            mais vous ne pouvez pas les modifier.
          </p>
        </div>
      )}

      {/* Message pour les élèves */}
      {isEleve && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            👋 Vous pouvez voir les chambres et vous inscrire si les inscriptions sont ouvertes.
          </p>
        </div>
      )}

      {/* Sélecteur de configuration */}
      {configs.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {configs.map((config) => (
              <div key={config.id} className="relative group">
                <button
                  onClick={() => handleConfigClick(config.id)}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition ${
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
                
                {canEdit && (
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConfig(config);
                      }}
                      className="p-1 bg-white rounded shadow hover:bg-gray-100"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConfig(config.id);
                      }}
                      className="p-1 bg-white rounded shadow hover:bg-red-100 text-red-600"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sous-onglets pour l'hébergement */}
          {selectedConfig && (
            <div className="space-y-4">
              {/* Sous-onglets - différents selon le type d'utilisateur */}
              {isEmployee ? (
                // Employés : voient les deux onglets
                <>
                  <div className="border-b border-gray-200">
                    <nav className="flex gap-4" aria-label="Tabs">
                      <button
                        onClick={() => setHebergementTab('presences')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          hebergementTab === 'presences'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        📋 Présences
                      </button>
                      <button
                        onClick={() => setHebergementTab('composition')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          hebergementTab === 'composition'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        🛏️ Composition des chambres
                      </button>
                    </nav>
                  </div>

                  {/* Contenu des sous-onglets pour employés */}
                  {hebergementTab === 'composition' ? (
                    <PlanChambres 
                      configId={selectedConfig} 
                      voyageId={voyageId}
                      isResponsable={isResponsable}
                      userType={userType}
                    />
                  ) : (
                    <PrisePresences
                      configId={selectedConfig}
                      voyageId={voyageId}
                      isResponsable={isResponsable}
                      userType={userType}
                    />
                  )}
                </>
              ) : (
                // Élèves : voient directement la composition des chambres
                <PlanChambres 
                  configId={selectedConfig} 
                  voyageId={voyageId}
                  isResponsable={isResponsable}
                  userType={userType}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🏨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune configuration d'hébergement
          </h3>
          <p className="text-gray-600 mb-4">
            {isEmployee 
              ? "Créez une première configuration pour commencer à organiser les chambres"
              : "Les organisateurs du voyage n'ont pas encore créé de configurations d'hébergement"}
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

      {canEdit && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Modifier la configuration</h3>
            <form onSubmit={updateConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  name="nom"
                  type="text"
                  defaultValue={editingConfig.nom}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lieu</label>
                <input
                  name="lieu"
                  type="text"
                  defaultValue={editingConfig.lieu}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <input
                    name="date_debut"
                    type="date"
                    defaultValue={editingConfig.date_debut.split('T')[0]}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <input
                    name="date_fin"
                    type="date"
                    defaultValue={editingConfig.date_fin.split('T')[0]}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
