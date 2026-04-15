// app/tools/tfh/coordination/tabs/PresencesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve } from '../types';
import { getPresenceStyles, cyclePresenceState } from '../utils/convocationUtils';
import * as XLSX from 'xlsx';

// Types pour les sessions
interface Session {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  journees: string[];
}

interface Journee {
  id: number;
  key: string;
  nom: string;
  date: string;
}

interface PresencesTabProps {
  eleves: Eleve[];
  editingMode: boolean;
  onSetEditingMode: (mode: boolean) => void;
  onPresenceUpdate: (
    eleveId: number,
    field: string, 
    currentValue: boolean | null,
    onSuccess?: (newValue: boolean | null) => void
  ) => Promise<void>;
  onRefresh: () => void;
}

// Fonction pour charger les journées depuis la table tfh_system_settings
async function getJourneesFromSettings(): Promise<Journee[]> {
  const { data, error } = await supabase
    .from('tfh_system_settings')
    .select('setting_key, setting_value')
    .like('setting_key', 'journee_%');
  
  if (error) {
    console.error('Erreur chargement journées:', error);
    return [];
  }
  
  const journees: Journee[] = [];
  
  (data || []).forEach(setting => {
    const match = setting.setting_key.match(/journee_(\d+)_(nom|date)/);
    if (match) {
      const id = parseInt(match[1]);
      const field = match[2];
      
      let journee = journees.find(j => j.id === id);
      if (!journee) {
        journee = { id, key: `journee_${id}`, nom: '', date: '' };
        journees.push(journee);
      }
      
      if (field === 'nom') journee.nom = setting.setting_value;
      if (field === 'date') journee.date = setting.setting_value;
    }
  });
  
  return journees.sort((a, b) => a.id - b.id);
}

// Fonction pour détecter les sessions à partir des journées
function detecterSessions(journees: Journee[]): Session[] {
  // Sessions par défaut (à adapter selon vos besoins)
  // Dans l'ancien système, les sessions étaient basées sur les dates
  // Ici on crée des sessions simplifiées basées sur les journées
  
  const sessions: Session[] = [];
  
  // Grouper les journées par mois approximatif
  const journeesParMois = new Map<string, Journee[]>();
  
  journees.forEach(journee => {
    if (journee.date) {
      const mois = journee.date.substring(0, 7); // YYYY-MM
      if (!journeesParMois.has(mois)) {
        journeesParMois.set(mois, []);
      }
      journeesParMois.get(mois)!.push(journee);
    }
  });
  
  let sessionIndex = 1;
  journeesParMois.forEach((journeesMois, mois) => {
    const dateObj = new Date(mois + '-01');
    const nomMois = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    sessions.push({
      id: `session_${sessionIndex}`,
      nom: `Session ${nomMois}`,
      date_debut: mois + '-01',
      date_fin: mois + '-31',
      journees: journeesMois.map(j => j.key)
    });
    sessionIndex++;
  });
  
  // Si aucune date n'est définie, créer une session par défaut
  if (sessions.length === 0 && journees.length > 0) {
    sessions.push({
      id: 'session_1',
      nom: 'Session unique',
      date_debut: '2025-01-01',
      date_fin: '2025-12-31',
      journees: journees.map(j => j.key)
    });
  }
  
  return sessions;
}

export default function PresencesTab({
  eleves,
  editingMode,
  onSetEditingMode,
  onPresenceUpdate,
  onRefresh
}: PresencesTabProps) {
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [showConvoquesOnly, setShowConvoquesOnly] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [journees, setJournees] = useState<Journee[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);

  // Synchroniser localEleves avec eleves parent
  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  // Charger les journées et sessions
  useEffect(() => {
    const chargerSessions = async () => {
      setLoadingSessions(true);
      try {
        const journeesData = await getJourneesFromSettings();
        setJournees(journeesData);
        
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

  // Fonction pour vérifier si un élève est convoqué à une session
  const estConvoquePourSession = (eleve: Eleve, session: Session): boolean => {
    const sessionNum = parseInt(session.id.split('_')[1]);
    const columnName = `session_${sessionNum}_convoque` as keyof Eleve;
    const valeur = eleve[columnName];
    
    // Convoqué si la valeur commence par "Oui"
    return typeof valeur === 'string' && valeur.startsWith('Oui');
  };

  // Fonction pour gérer le clic sur une présence
  const handlePresenceClick = async (eleve: Eleve, journeeIndex: number) => {
    if (!editingMode || isProcessing) return;
    
    const field = `journee_${journeeIndex}_present`;
    const currentValue = eleve[field as keyof Eleve] as boolean | null | undefined;
    
    setIsProcessing(true);
    try {
      await onPresenceUpdate(eleve.student_matricule, field, currentValue ?? null, (newValue) => {
        // Mise à jour locale immédiate
        setLocalEleves(prev => prev.map(e => {
          if (e.student_matricule !== eleve.student_matricule) return e;
          return { ...e, [field]: newValue };
        }));
      });
    } catch (err) {
      console.error('Erreur mise à jour présence:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrer les élèves
  const filteredEleves = localEleves.filter(eleve => {
    if (showConvoquesOnly && selectedSession !== 'all') {
      const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
      if (!session) return false;
      return estConvoquePourSession(eleve, session);
    }
    return true;
  });

  // Obtenir les journées à afficher selon la session sélectionnée
  const getJourneesToDisplay = () => {
    if (selectedSession === 'all' || loadingSessions || sessions.length === 0) {
      return journees;
    }
    
    const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
    if (!session) return journees;
    
    return journees.filter(journee => 
      session.journees.includes(journee.key)
    );
  };

  const getSessionDisplayName = (session: Session) => {
    return session.nom.replace('Session ', '');
  };
  
  const getElevesToExport = () => {
    return localEleves.filter(eleve => {
      if (showConvoquesOnly && selectedSession !== 'all') {
        const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
        if (!session) return false;
        return estConvoquePourSession(eleve, session);
      }
      return true;
    });
  };
  
  const exportToTSV = () => {
    const elevesToExport = getElevesToExport();
    const headers = ['Classe', 'Nom', 'Prénom', ...getJourneesToDisplay().map(j => j.nom)];
    
    const data = elevesToExport.map(eleve => {
      const row = [
        eleve.classe,
        eleve.nom,
        eleve.prenom,
        ...getJourneesToDisplay().map(journee => {
          const journeeNum = parseInt(journee.key.split('_')[1]);
          const field = `journee_${journeeNum}_present` as keyof Eleve;
          const present = eleve[field];
          
          if (present === true) return '✓';
          if (present === false) return '✗';
          return '?';
        })
      ];
      return row;
    });
  
    const tsvContent = [
      headers.join('\t'),
      ...data.map(row => row.join('\t'))
    ].join('\n');
  
    const blob = new Blob(['\ufeff' + tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presences_${selectedSession === 'all' ? 'toutes_sessions' : `session_${selectedSession}`}_${new Date().toISOString().split('T')[0]}.tsv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const exportToXLSX = () => {
    const elevesToExport = getElevesToExport();
    const headers = ['Classe', 'Nom', 'Prénom', ...getJourneesToDisplay().map(j => j.nom)];
    
    const data = elevesToExport.map(eleve => {
      return [
        eleve.classe,
        eleve.nom,
        eleve.prenom,
        ...getJourneesToDisplay().map(journee => {
          const journeeNum = parseInt(journee.key.split('_')[1]);
          const field = `journee_${journeeNum}_present` as keyof Eleve;
          const present = eleve[field];
          
          if (present === true) return '✓';
          if (present === false) return '✗';
          return '?';
        })
      ];
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Présences');
    
    const max_width = headers.reduce((w, r) => Math.max(w, r.length), 10);
    worksheet['!cols'] = headers.map(() => ({ wch: max_width }));
  
    XLSX.writeFile(workbook, `presences_${selectedSession === 'all' ? 'toutes_sessions' : `session_${selectedSession}`}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  const handleExport = (format: 'tsv' | 'xlsx') => {
    if (format === 'tsv') {
      exportToTSV();
    } else {
      exportToXLSX();
    }
  };
  
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
                checked={showConvoquesOnly}
                onChange={(e) => setShowConvoquesOnly(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing || selectedSession === 'all'}
              />
              <span className="text-sm font-medium">Afficher uniquement les convoqués</span>
            </label>
        
            <div className="relative group">
              <button
                onClick={() => handleExport('xlsx')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                disabled={filteredEleves.length === 0 || isProcessing}
              >
                📊 Exporter
              </button>
              
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-green-600">📗</span>
                  <div>
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-xs text-gray-500">Format recommandé</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('tsv')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-t"
                >
                  <span className="text-blue-600">📄</span>
                  <div>
                    <div className="font-medium">TSV (.tsv)</div>
                    <div className="text-xs text-gray-500">Pour Excel/Google Sheets</div>
                  </div>
                </button>
              </div>
            </div>
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
          <p className="text-sm font-medium text-gray-700 mb-2">Légende de présence :</p>
          <div className="flex flex-wrap gap-2">
            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200">?</span>
              Non défini
            </div>
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-200">✓</span>
              Présent
            </div>
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-200">✗</span>
              Absent
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {editingMode ? 'Cliquez sur une case pour faire tourner: ? → ✓ → ✗ → ?' : 'Activez le mode édition pour modifier'}
          </p>
          {showConvoquesOnly && selectedSession !== 'all' && (
            <p className="text-xs text-blue-600 mt-2">
              ※ Affichage filtré : uniquement les élèves convoqués à cette session
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loadingSessions ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Chargement des sessions...</p>
          </div>
        ) : (
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
                  
                  {getJourneesToDisplay().map(journee => {
                    const session = sessions.find(s => 
                      s.journees.includes(journee.key)
                    );
                    
                    return (
                      <th 
                        key={journee.key} 
                        className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap border-l"
                      >
                        <div className="flex flex-col">
                          <span>{journee.nom}</span>
                          {session && (
                            <span className="text-xs font-normal text-gray-500">
                              {getSessionDisplayName(session)}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEleves.map(eleve => {
                  const isConvoque = selectedSession === 'all' || 
                    (() => {
                      const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
                      return session ? estConvoquePourSession(eleve, session) : true;
                    })();
                  
                  return (
                    <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.classe}
                      </td>
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap font-medium">
                        {eleve.nom} {eleve.prenom}
                      </td>
                      
                      {getJourneesToDisplay().map(journee => {
                        const journeeNum = parseInt(journee.key.split('_')[1]);
                        const field = `journee_${journeeNum}_present` as keyof Eleve;
                        const present = eleve[field] as boolean | null | undefined;
                        const presenceStyles = getPresenceStyles(present ?? null);
                        
                        return (
                          <td key={`${eleve.student_matricule}-${journee.key}`} className="px-3 py-3 text-center border-l">
                            {editingMode && isConvoque ? (
                              <button
                                onClick={() => handlePresenceClick(eleve, journeeNum)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${
                                  presenceStyles.bgColor
                                } ${presenceStyles.hoverColor} ${
                                  presenceStyles.textColor
                                } font-bold text-lg ${
                                  isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={`${presenceStyles.title} (cliquer pour changer)`}
                                disabled={isProcessing}
                              >
                                {presenceStyles.icon}
                              </button>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                                presenceStyles.bgColor
                              } ${presenceStyles.textColor} font-bold text-lg ${
                                !isConvoque ? 'opacity-40' : ''
                              }`}>
                                {presenceStyles.icon}
                              </div>
                            )}
                           </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}