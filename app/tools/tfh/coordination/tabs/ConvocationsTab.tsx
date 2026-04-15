// app/tools/tfh/coordination/tabs/ConvocationsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve, Guide } from '../types';
import { CONVOCATION_OPTIONS } from '../constants';
import { 
  getConvocationColor, 
  getConvocationLabelShort
} from '../utils/convocationUtils';
import { 
  getJourneesFromSupabase, 
  detecterSessions,
  type Session
} from '../utils/sessionUtils';

interface ConvocationsTabProps {
  eleves: Eleve[];
  guides: Guide[];
  editingMode: boolean;
  editingCell: {id: string, field: string} | null;
  onUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
  onSetEditingCell: (cell: {id: string, field: string} | null) => void;
  onSetEditingMode: (mode: boolean) => void;
}

export default function ConvocationsTab({
  eleves,
  guides,
  editingMode,
  editingCell,
  onUpdate,
  onSelectUpdate,
  onRefresh,
  onSetEditingCell,
  onSetEditingMode
}: ConvocationsTabProps) {
  const [showConvoques, setShowConvoques] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    const chargerSessions = async () => {
      setLoadingSessions(true);
      try {
        const journeesData = await getJourneesFromSupabase();
        const sessionsDetectees = detecterSessions(journeesData);
        setSessions(sessionsDetectees);
      } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
      } finally {
        setLoadingSessions(false);
      }
    };
  
    chargerSessions();
  }, []);

  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  const handleSaveConvocation = async (eleve: Eleve, sessionNum: number, value: string) => {
    setIsProcessing(true);
    try {
      const columnName = `session_${sessionNum}_convoque`;
      
      const { error } = await supabase
        .from('tfh_eleves')
        .update({ [columnName]: value })
        .eq('student_matricule', eleve.student_matricule);
  
      if (error) throw error;
      
      setLocalEleves(prev => prev.map(e => 
        e.student_matricule === eleve.student_matricule 
          ? { ...e, [columnName]: value } as Eleve
          : e
      ));
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGuideUpdate = async (eleve: Eleve, guideId: string) => {
    setIsProcessing(true);
    try {
      await onSelectUpdate(eleve.student_matricule, 'guide_id', guideId);
      
      setLocalEleves(prev => prev.map(e => 
        e.student_matricule === eleve.student_matricule 
          ? { ...e, guide_id: guideId || null } as Eleve
          : e
      ));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du guide:', error);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const estConvoquePourSession = (eleve: Eleve, session: Session): boolean => {
    const sessionNum = parseInt(session.id.split('_')[1]);
    const columnName = `session_${sessionNum}_convoque` as keyof Eleve;
    const valeur = eleve[columnName] as string | undefined;
    return valeur?.startsWith('Oui') === true;
  };

  const filteredEleves = localEleves.filter(eleve => {
    if (showConvoques) {
      if (selectedSession !== 'all') {
        const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
        return session ? estConvoquePourSession(eleve, session) : false;
      }
      return sessions.some(session => estConvoquePourSession(eleve, session));
    }
    return true;
  });

  const getSessionDisplayName = (session: Session) => {
    return session.nom.replace('Session ', '');
  };

  const getSessionsToDisplay = () => {
    if (selectedSession === 'all') {
      return sessions;
    }
    const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
    return session ? [session] : [];
  };

  const displayedSessions = getSessionsToDisplay();

  return (
    <>
      {isProcessing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          Mise à jour en cours...
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingMode}
                onChange={(e) => onSetEditingMode(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">Mode édition</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">Afficher uniquement les convoqués</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Session :</span>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              disabled={loadingSessions || isProcessing}
            >
              <option value="all">Toutes les sessions</option>
              {sessions.map(session => {
                const sessionNum = parseInt(session.id.split('_')[1]);
                return (
                  <option key={session.id} value={sessionNum.toString()}>
                    {getSessionDisplayName(session)}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-sm text-gray-500">
            ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
          </span>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Légende des convocations :</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
              <div key={opt.value} className={`${opt.color} px-3 py-2 rounded-lg text-xs font-medium flex items-start gap-2`}>
                <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{
                  backgroundColor: opt.color.includes('green') ? '#10B981' :
                                 opt.color.includes('yellow') ? '#F59E0B' :
                                 opt.color.includes('orange') ? '#F97316' :
                                 opt.color.includes('red') ? '#EF4444' : '#6B7280'
                }}></div>
                <span className="leading-tight">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[800px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Classe
                </th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Élève
                </th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Guide
                </th>
                {loadingSessions ? (
                  <th className="px-3 py-3 text-center">
                    <div className="animate-pulse">Chargement des sessions...</div>
                  </th>
                ) : (
                  displayedSessions.map((session) => (
                    <th 
                      key={session.id} 
                      className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap border-l"
                    >
                      <div className="flex flex-col">
                        <span>{getSessionDisplayName(session)}</span>
                        <span className="text-xs font-normal text-gray-500">
                          Convocation
                        </span>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEleves.map((eleve) => (
                <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                    {eleve.classe}
                  </td>
                  <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                    {eleve.nom} {eleve.prenom}
                  </td>
                  <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                    {editingMode ? (
                      <select
                        value={eleve.guide_id || ''}
                        onChange={(e) => handleGuideUpdate(eleve, e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        disabled={isProcessing}
                      >
                        <option value="">-</option>
                        {guides.map(guide => (
                          <option key={guide.id} value={guide.id}>
                            {guide.nom} {guide.prenom}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>
                        {eleve.guide_nom} {eleve.guide_prenom}
                      </span>
                    )}
                  </td>
                  {loadingSessions ? (
                    <td className="px-3 py-3 text-center">
                      <div className="animate-pulse">Chargement...</div>
                    </td>
                  ) : (
                    displayedSessions.map((session) => {
                      const sessionNum = parseInt(session.id.split('_')[1]);
                      const columnName = `session_${sessionNum}_convoque` as keyof Eleve;
                      const convocationValeur = eleve[columnName] as string | undefined;
                      
                      return (
                        <td key={`${eleve.student_matricule}-${session.id}`} className="px-3 py-3 border-l">
                          {editingMode ? (
                            <select
                              value={convocationValeur || ''}
                              onChange={(e) => {
                                handleSaveConvocation(eleve, sessionNum, e.target.value);
                              }}
                              className={`w-full border rounded px-2 py-1 text-xs md:text-sm text-center ${getConvocationColor(convocationValeur || '')}`}
                              disabled={isProcessing}
                            >
                              {CONVOCATION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className={opt.color}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={`px-2 py-1 rounded text-center font-medium ${getConvocationColor(convocationValeur || '')}`}>
                              {getConvocationLabelShort(convocationValeur || '')}
                            </div>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}