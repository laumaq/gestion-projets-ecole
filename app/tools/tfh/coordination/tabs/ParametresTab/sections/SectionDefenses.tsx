// app/tools/tfh/coordination/tabs/ParametresTab/sections/SectionDefenses.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  GraduationCap, ChevronDown, ChevronUp, RefreshCw, 
  Save, Plus, Info, Trash2
} from 'lucide-react';

interface JourneeDefense {
  id: number;
  date: string;
  libelle: string;
}

interface SectionDefensesProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function SectionDefenses({ expanded, onToggle }: SectionDefensesProps) {
  const [journeesDefense, setJourneesDefense] = useState<JourneeDefense[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [message, setMessage] = useState<{type: 'info' | 'error' | 'success', text: string} | null>(null);

  const showMessage = (type: 'info' | 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadJournees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tfh_system_settings')
        .select('*')
        .like('setting_key', 'Journee_defense_%')
        .order('setting_key');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setJourneesDefense([]);
        setHasLoaded(true);
        return;
      }
      
      const journees = data.map(item => {
        const match = item.setting_key.match(/Journee_defense_(\d+)/);
        if (match) {
          return {
            id: parseInt(match[1]),
            date: item.setting_value || '',
            libelle: item.description || `Défense TFH ${match[1]}`
          };
        }
        return null;
      })
      .filter((j): j is JourneeDefense => j !== null)
      .sort((a, b) => a.id - b.id);
      
      setJourneesDefense(journees);
      setHasLoaded(true);
    } catch (err) {
      console.error('Erreur chargement défenses:', err);
      showMessage('error', 'Erreur lors du chargement des défenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      loadJournees();
    }
  }, [loadJournees, hasLoaded]);

  const saveJourneeDefense = async (journeeId: number, date: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert({
          setting_key: `Journee_defense_${journeeId}`,
          setting_value: date,
          description: `Journée de défense des TFH ${journeeId}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      setJourneesDefense(prev => {
        const existing = prev.find(j => j.id === journeeId);
        if (existing) {
          return prev.map(j => j.id === journeeId ? { ...j, date } : j);
        } else {
          return [...prev, { id: journeeId, date, libelle: `Défense TFH ${journeeId}` }]
            .sort((a, b) => a.id - b.id);
        }
      });
      
      showMessage('success', `Date de la défense ${journeeId} sauvegardée`);
    } catch (err) {
      console.error('Erreur sauvegarde défense:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteJourneeDefense = async (journeeId: number) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement la défense ${journeeId} ?`)) {
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .delete()
        .eq('setting_key', `Journee_defense_${journeeId}`);
      
      if (error) throw error;
      
      setJourneesDefense(prev => prev.filter(j => j.id !== journeeId));
      showMessage('info', `Défense ${journeeId} supprimée`);
    } catch (err) {
      console.error('Erreur suppression défense:', err);
      showMessage('error', 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const saveAllDefenses = async () => {
    setSaving(true);
    try {
      const { data: existingDefenses, error: fetchError } = await supabase
        .from('tfh_system_settings')
        .select('setting_key')
        .like('setting_key', 'Journee_defense_%');
      
      if (fetchError) throw fetchError;
      
      const currentDefenseKeys = journeesDefense.map(j => `Journee_defense_${j.id}`);
      const defensesToDelete = existingDefenses
        ?.filter(def => !currentDefenseKeys.includes(def.setting_key))
        .map(def => def.setting_key) || [];
      
      if (defensesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tfh_system_settings')
          .delete()
          .in('setting_key', defensesToDelete);
        
        if (deleteError) throw deleteError;
      }
      
      const upserts = journeesDefense.map(journee => ({
        setting_key: `Journee_defense_${journee.id}`,
        setting_value: journee.date,
        description: `Journée de défense des TFH ${journee.id}`,
        updated_at: new Date().toISOString()
      }));
      
      if (upserts.length > 0) {
        const { error: upsertError } = await supabase
          .from('tfh_system_settings')
          .upsert(upserts, { onConflict: 'setting_key' });
        
        if (upsertError) throw upsertError;
      }
      
      await loadJournees();
      
      showMessage('success', 
        `${journeesDefense.filter(j => j.date.trim() !== '').length} défense(s) sauvegardée(s)`
      );
    } catch (err) {
      console.error('Erreur sauvegarde globale:', err);
      showMessage('error', 'Erreur lors de la sauvegarde globale');
    } finally {
      setSaving(false);
    }
  };

  const addJourneeDefense = () => {
    const nouvelleJourneeId = journeesDefense.length > 0 
      ? Math.max(...journeesDefense.map(j => j.id)) + 1 
      : 1;
    
    setJourneesDefense(prev => [
      ...prev,
      {
        id: nouvelleJourneeId,
        date: '',
        libelle: `Défense TFH ${nouvelleJourneeId}`
      }
    ]);
  };

  const clearAllDefenseDates = async () => {
    if (confirm('Voulez-vous effacer toutes les dates de défense ?')) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('tfh_system_settings')
          .delete()
          .like('setting_key', 'Journee_defense_%');
        
        if (error) throw error;
        
        setJourneesDefense([]);
        showMessage('info', 'Toutes les défenses ont été supprimées.');
      } catch (err) {
        console.error('Erreur suppression défenses:', err);
        showMessage('error', 'Erreur lors de la suppression');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Paramètres des défenses TFH</h3>
            <p className="text-sm text-gray-500">Configuration des journées de défense</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t">
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
              message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
              'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Configurez les dates des journées de défense des TFH.
            </p>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {journeesDefense.filter(j => j.date).length} défense(s) programmée(s)
              </div>
              <button
                onClick={loadJournees}
                disabled={loading}
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Recharger
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">N°</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Défense</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {journeesDefense.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Aucune défense programmée.
                        </td>
                      </tr>
                    ) : (
                      journeesDefense.map((journee) => (
                        <tr key={journee.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <div className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-lg font-medium">
                                {journee.id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Défense TFH {journee.id}
                              </div>
                              <div className="text-xs text-gray-500">{journee.libelle}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <input
                                type="date"
                                value={journee.date}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  setJourneesDefense(prev => prev.map(j => 
                                    j.id === journee.id ? { ...j, date: newDate } : j
                                  ));
                                }}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                              {journee.date && (
                                <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                                  {new Date(journee.date).toLocaleDateString('fr-FR', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveJourneeDefense(journee.id, journee.date)}
                                disabled={saving}
                                className={`px-3 py-1.5 rounded text-xs font-medium ${
                                  !saving
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {saving ? '...' : 'Sauvegarder'}
                              </button>
                              <button
                                onClick={() => deleteJourneeDefense(journee.id)}
                                disabled={saving}
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <button
                  onClick={addJourneeDefense}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter une journée de défense
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                <div className="flex gap-3">
                  <button
                    onClick={clearAllDefenseDates}
                    disabled={saving || journeesDefense.length === 0}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Tout effacer
                  </button>
                  <button
                    onClick={saveAllDefenses}
                    disabled={saving || journeesDefense.filter(j => j.date).length === 0}
                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                      journeesDefense.filter(j => j.date).length > 0 && !saving
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder toutes les défenses'}
                  </button>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Informations importantes
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Les journées de défense sont distinctes des journées de travail régulières</li>
                  <li>• Utilisez le bouton "Sauvegarder" sur chaque ligne pour valider individuellement</li>
                  <li>• Une suppression nécessite une sauvegarde pour être appliquée</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}