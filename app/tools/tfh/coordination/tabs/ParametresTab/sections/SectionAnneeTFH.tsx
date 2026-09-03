// app/tools/tfh/coordination/tabs/ParametresTab/sections/SectionAnneeTFH.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, ChevronDown, ChevronUp, RefreshCw, 
  Save, Plus, Info, ChevronRight
} from 'lucide-react';

interface JourneeTFH {
  id: number;
  date: string;
  libelle: string;
}

interface SectionAnneeTFHProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function SectionAnneeTFH({ expanded, onToggle }: SectionAnneeTFHProps) {
  const [journeesTFH, setJourneesTFH] = useState<JourneeTFH[]>([]);
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
        .like('setting_key', 'Journee_%')
        .not('setting_key', 'like', 'Journee_defense_%') 
        .order('setting_key');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        const journees = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          date: '',
          libelle: `Journée ${i + 1}`
        }));
        setJourneesTFH(journees);
        setHasLoaded(true);
        return;
      }
      
      const existingIds = data.map(item => {
        const match = item.setting_key.match(/Journee_(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).filter(id => id > 0);
      
      const maxId = Math.max(...existingIds);
      
      const journees = Array.from({ length: Math.max(maxId, 10) }, (_, i) => {
        const journeeId = i + 1;
        const journeeData = data?.find(d => d.setting_key === `Journee_${journeeId}`);
        
        if (journeeData) {
          return {
            id: journeeId,
            date: journeeData.setting_value || '',
            libelle: journeeData.description || `Journée ${journeeId}`
          };
        }
        
        if (journeeId <= maxId) {
          return {
            id: journeeId,
            date: '',
            libelle: `Journée ${journeeId}`
          };
        }
        
        return null;
      }).filter((j): j is JourneeTFH => j !== null);
      
      setJourneesTFH(journees);
      setHasLoaded(true);
      
    } catch (err) {
      console.error('Erreur chargement journées TFH:', err);
      showMessage('error', 'Erreur lors du chargement des journées TFH');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      loadJournees();
    }
  }, [loadJournees, hasLoaded]);

  const detecterSessions = useCallback(() => {
    const joursAvecDates = journeesTFH
      .filter(j => j.date)
      .map(j => ({
        id: j.id,
        date: new Date(j.date),
        timestamp: new Date(j.date).getTime()
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (joursAvecDates.length < 2) return {};

    const sessions: Record<number, number> = {};
    let sessionId = 1;
    let derniereDate: Date | null = null;

    joursAvecDates.forEach((jour) => {
      if (!derniereDate) {
        sessions[jour.id] = sessionId;
      } else {
        const diffJours = Math.floor(
          (jour.timestamp - derniereDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (diffJours > 7) {
          sessionId++;
        }
        sessions[jour.id] = sessionId;
      }
      derniereDate = jour.date;
    });

    return sessions;
  }, [journeesTFH]);

  const getSessionColor = useCallback((journee: JourneeTFH) => {
    if (!journee.date) return 'bg-white';
    
    const sessions = detecterSessions();
    const sessionId = sessions[journee.id];
    
    if (!sessionId) return 'bg-white';
    
    const couleursSession = [
      'bg-blue-100 border-l-4 border-blue-400',
      'bg-green-100 border-l-4 border-green-400',
      'bg-purple-100 border-l-4 border-purple-400',
      'bg-yellow-100 border-l-4 border-yellow-400',
      'bg-pink-100 border-l-4 border-pink-400',
      'bg-indigo-100 border-l-4 border-indigo-400',
    ];
    
    const couleurIndex = (sessionId - 1) % couleursSession.length;
    return couleursSession[couleurIndex];
  }, [detecterSessions]);

  const getSessionName = useCallback((journeeId: number) => {
    const sessions = detecterSessions();
    const sessionId = sessions[journeeId];
    
    if (!sessionId) return '';
    
    const nomsSession = ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5', 'Session 6'];
    const nomIndex = (sessionId - 1) % nomsSession.length;
    return nomsSession[nomIndex];
  }, [detecterSessions]);

  const saveJourneeDate = async (journeeId: number, date: string) => {
    setSaving(true);
    try {
      if (date.trim() === '') {
        const { error } = await supabase
          .from('tfh_system_settings')
          .delete()
          .eq('setting_key', `Journee_${journeeId}`);
        
        if (error) throw error;
        
        setJourneesTFH(prev => prev.map(j => 
          j.id === journeeId ? { ...j, date: '' } : j
        ));
        
        showMessage('info', `Journée ${journeeId} supprimée`);
      } else {
        const { error } = await supabase
          .from('tfh_system_settings')
          .upsert({
            setting_key: `Journee_${journeeId}`,
            setting_value: date,
            description: `Journée ${journeeId}`,
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' });
        
        if (error) throw error;
        
        setJourneesTFH(prev => prev.map(j => 
          j.id === journeeId ? { ...j, date } : j
        ));
        
        showMessage('success', `Date de la journée ${journeeId} sauvegardée`);
      }
    } catch (err) {
      console.error('Erreur sauvegarde journée:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveAllJournees = async () => {
    setSaving(true);
    try {
      const upserts: any[] = [];
      const deletes: string[] = [];
      
      journeesTFH.forEach(journee => {
        if (journee.date.trim() === '') {
          deletes.push(`Journee_${journee.id}`);
        } else {
          upserts.push({
            setting_key: `Journee_${journee.id}`,
            setting_value: journee.date,
            description: `Journée ${journee.id}`,
            updated_at: new Date().toISOString()
          });
        }
      });
      
      if (deletes.length > 0) {
        const { error: deleteError } = await supabase
          .from('tfh_system_settings')
          .delete()
          .in('setting_key', deletes);
        
        if (deleteError) throw deleteError;
      }
      
      if (upserts.length > 0) {
        const { error: upsertError } = await supabase
          .from('tfh_system_settings')
          .upsert(upserts, { onConflict: 'setting_key' });
        
        if (upsertError) throw upsertError;
      }
      
      if (deletes.length > 0) {
        await loadJournees();
      }
      
      showMessage('success', `${upserts.length} journée(s) sauvegardée(s) et ${deletes.length} journée(s) supprimée(s)`);
    } catch (err) {
      console.error('Erreur sauvegarde globale:', err);
      showMessage('error', 'Erreur lors de la sauvegarde globale');
    } finally {
      setSaving(false);
    }
  };

  const addJournee = () => {
    const existingIds = journeesTFH.map(j => j.id);
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nouvelleJourneeId = maxId + 1;
    
    setJourneesTFH(prev => [
      ...prev,
      {
        id: nouvelleJourneeId,
        date: '',
        libelle: `Journée ${nouvelleJourneeId}`
      }
    ]);
  };

  const clearAllDates = () => {
    if (confirm('Voulez-vous effacer toutes les dates ? Cette action supprimera aussi les entrées de la base de données.')) {
      setJourneesTFH(prev => prev.map(j => ({ ...j, date: '' })));
      
      supabase
        .from('tfh_system_settings')
        .delete()
        .like('setting_key', 'Journee_%')
        .not('setting_key', 'like', 'Journee_defense_%')
        .then(({ error }) => {
          if (error) {
            console.error('Erreur suppression:', error);
            showMessage('error', 'Erreur lors de la suppression');
          } else {
            showMessage('info', 'Toutes les dates ont été effacées.');
          }
        });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Paramètres de l'année TFH</h3>
            <p className="text-sm text-gray-500">Configuration des journées TFH</p>
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
              Configurez les dates des journées TFH pour l'année scolaire en cours.
            </p>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {journeesTFH.filter(j => j.date).length} / {journeesTFH.length} dates définies
              </div>
              <button
                onClick={loadJournees}
                disabled={loading}
                className="text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Recharger
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">N°</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journée</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {journeesTFH.map((journee) => (
                      <tr key={journee.id} className={`hover:bg-gray-50 transition-colors ${getSessionColor(journee)}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <div className="w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-700 rounded-lg font-medium">
                              {journee.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">Journée {journee.id}</div>
                            <div className="text-xs text-gray-500">
                              {journee.libelle}
                              {getSessionName(journee.id) && (
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                  {getSessionName(journee.id)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <input
                              type="date"
                              value={journee.date}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setJourneesTFH(prev => prev.map(j => 
                                  j.id === journee.id ? { ...j, date: newDate } : j
                                ));
                              }}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                              onClick={() => saveJourneeDate(journee.id, journee.date)}
                              disabled={!journee.date || saving}
                              className={`px-3 py-1.5 rounded text-xs font-medium ${
                                journee.date && !saving
                                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {saving ? '...' : 'Sauvegarder'}
                            </button>
                            {journee.date && (
                              <button
                                onClick={() => {
                                  if (confirm(`Supprimer la date de la journée ${journee.id} ?`)) {
                                    setJourneesTFH(prev => prev.map(j => 
                                      j.id === journee.id ? { ...j, date: '' } : j
                                    ));
                                  }
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs font-medium"
                              >
                                Effacer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <button
                  onClick={addJournee}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter une journée supplémentaire
                </button>
              </div>			
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                <div className="flex gap-3">
                  <button
                    onClick={clearAllDates}
                    disabled={saving || journeesTFH.filter(j => j.date).length === 0}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Tout effacer
                  </button>
                  <button
                    onClick={saveAllJournees}
                    disabled={saving || journeesTFH.filter(j => j.date).length === 0}
                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                      journeesTFH.filter(j => j.date).length > 0 && !saving
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder toutes les dates'}
                  </button>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="text-sm font-medium text-orange-800 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Sessions détectées automatiquement
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const sessions = detecterSessions();
                      const sessionsUniques = Array.from(new Set(Object.values(sessions))).sort();
                      
                      return sessionsUniques.map(sessionId => {
                        const joursDansSession = Object.entries(sessions)
                          .filter(([_, sId]) => sId === sessionId)
                          .map(([jourId]) => parseInt(jourId));
                        
                        const dates = joursDansSession
                          .map(id => journeesTFH.find(j => j.id === id)?.date)
                          .filter(Boolean)
                          .map(date => new Date(date!));
                        
                        const couleursSession = [
                          { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
                          { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
                          { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
                          { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
                          { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
                          { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
                        ];
                        
                        const couleurIndex = (sessionId - 1) % couleursSession.length;
                        const couleur = couleursSession[couleurIndex];
                        
                        return (
                          <div key={sessionId} className="flex items-center gap-3 p-2 rounded-lg bg-white border">
                            <div className={`w-4 h-4 rounded ${couleur.bg} border ${couleur.border}`}></div>
                            <div className="text-sm">
                              <span className={`font-medium ${couleur.text}`}>Session {sessionId}</span>
                              <span className="ml-2 text-gray-700">
                                J{joursDansSession.join(', J')}
                                {dates.length > 0 && (
                                  <span className="text-gray-500 ml-2">
                                    ({dates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})
                                  </span>
                                )}
                              </span>
                              {dates.length > 1 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {dates.length} journées sur {
                                    Math.floor((dates[dates.length-1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)) + 1
                                  } jours
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {Object.keys(detecterSessions()).length === 0 && (
                      <div className="text-center py-3">
                        <p className="text-sm text-gray-600 italic">
                          Ajoutez des dates pour voir les sessions regroupées
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Les journées à moins de 7 jours d'écart forment une même session
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Règles de regroupement
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Les journées sont regroupées par session</li>
                    <li>• Une session = dates à moins de 7 jours d'écart</li>
                    <li>• Chaque session a une couleur distincte</li>
                    <li>• Les journées sans date restent neutres (blanc)</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}