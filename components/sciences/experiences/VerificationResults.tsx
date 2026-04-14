// components/sciences/experiences/VerificationResults.tsx
'use client';

import { useMemo, useState } from 'react';
import { ExpressionEvaluator } from '@/lib/sciences/expressionEvaluator';

interface VerificationConfig {
  tableau_index: number;
  nom: string;
  expression: string;
  variable_cible: string;
  tolerance: number;
  active: boolean;
}

interface Mesure {
  id: string;
  eleve_matricule: number;
  tableau_index: number;
  mesures: Record<string, number | null>;
  eleve?: {
    nom: string;
    prenom: string;
  };
}

interface EleveInfo {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
}

interface VerificationResultsProps {
  verifications: VerificationConfig[];
  tableaux: { nom: string; colonnes: { nom: string; unite: string; }[] }[];
  mesures: Mesure[];
  eleves: EleveInfo[];
}

interface EleveScore {
  eleve: EleveInfo;
  scoresParTableau: {
    tableauIndex: number;
    tableauNom: string;
    verificationNom: string;
    totalMesures: number;
    mesuresValides: number;
    pourcentage: number;
  }[];
  scoreGlobal: {
    totalMesures: number;
    mesuresValides: number;
    pourcentage: number;
  };
}

type ModeCalcul = 'standard' | 'pondere_median';

interface ModeCalculProps {
  mode: ModeCalcul;
  onChange: (mode: ModeCalcul) => void;
}

function ModeSelector({ mode, onChange }: ModeCalculProps) {
  const [isOpen, setIsOpen] = useState(false);

  
  const modes = [
    { value: 'standard', label: 'Standard', description: 'Pourcentage brut de mesures correctes' },
    { value: 'pondere_median', label: 'Pondéré (médiane)', description: 'Pondéré par rapport à la médiane des réponses' }
  ];
  
  const currentMode = modes.find(m => m.value === mode);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {currentMode?.label}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-[200px]">
          {modes.map(m => (
            <button
              key={m.value}
              onClick={() => {
                onChange(m.value as ModeCalcul);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                mode === m.value ? 'bg-green-50 text-green-700' : 'text-gray-700'
              }`}
            >
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-xs text-gray-400">{m.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Couleurs pour les différents tableaux
const COULEURS_TABLEAUX = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
];

export default function VerificationResults({ verifications, tableaux, mesures, eleves }: VerificationResultsProps) {
  // Seuils
  const [seuilRouge, setSeuilRouge] = useState(70);
  const [seuilJaune, setSeuilJaune] = useState(85);
  
  // Mode de calcul par vérification (une map pour stocker le mode de chaque colonne)
  const [modesCalcul, setModesCalcul] = useState<Record<string, ModeCalcul>>({});
  const [modeCalculGlobal, setModeCalculGlobal] = useState<ModeCalcul>('standard');

  const handleModeChange = (key: string, mode: ModeCalcul) => {
    setModesCalcul(prev => ({ ...prev, [key]: mode }));
  };

  // Fonction pour calculer la médiane des nombres de réponses par élève
  const calculerMedianReponses = (scoresParEleve: EleveScore[], verifKey: string) => {
    const reponsesParEleve = scoresParEleve
      .map(s => {
        const score = s.scoresParTableau.find(st => `${st.tableauNom} - ${st.verificationNom}` === verifKey);
        return score?.totalMesures || 0;
      })
      .filter(n => n > 0);
    
    if (reponsesParEleve.length === 0) return 0;
    
    reponsesParEleve.sort((a, b) => a - b);
    const milieu = Math.floor(reponsesParEleve.length / 2);
    
    if (reponsesParEleve.length % 2 === 0) {
      return (reponsesParEleve[milieu - 1] + reponsesParEleve[milieu]) / 2;
    } else {
      return reponsesParEleve[milieu];
    }
  };

  // Calcul des scores (version corrigée)
  const scores = useMemo(() => {
    const verificationsActives = verifications.filter(v => v.active && v.expression.trim());
    
    if (verificationsActives.length === 0) return [];

    const scoresParEleve: Map<number, EleveScore> = new Map();

    // Initialiser tous les élèves
    eleves.forEach(eleve => {
      scoresParEleve.set(eleve.matricule, {
        eleve,
        scoresParTableau: [],
        scoreGlobal: { totalMesures: 0, mesuresValides: 0, pourcentage: 0 }
      });
    });

    // Pour chaque vérification active
    for (const verif of verificationsActives) {
      const tableau = tableaux[verif.tableau_index];
      if (!tableau) continue;
      
      const verifKey = `${tableau.nom} - ${verif.nom}`;
      const mode = modesCalcul[verifKey] || 'standard';

      // Filtrer les mesures de ce tableau
      const mesuresTableau = mesures.filter(m => m.tableau_index === verif.tableau_index);
      
      // Grouper les mesures par élève
      const mesuresParEleve = new Map<number, typeof mesuresTableau>();
      for (const mesure of mesuresTableau) {
        if (!mesuresParEleve.has(mesure.eleve_matricule)) {
          mesuresParEleve.set(mesure.eleve_matricule, []);
        }
        mesuresParEleve.get(mesure.eleve_matricule)!.push(mesure);
      }

      // Première passe : collecter les scores bruts pour TOUS les élèves
      const scoresBruts: { eleveId: number; total: number; valides: number; pourcentage: number }[] = [];

      // Pour chaque élève (même ceux sans mesures)
      for (const eleve of eleves) {
        const mesuresEleve = mesuresParEleve.get(eleve.matricule) || [];
        
        let total = 0;
        let valides = 0;

        for (const mesure of mesuresEleve) {
          const resultat = ExpressionEvaluator.verifierMesure(
            verif.expression,
            mesure.mesures,
            verif.variable_cible,
            verif.tolerance
          );
          
          if (resultat.valeurCalculee !== null) {
            total++;
            if (resultat.estValide) valides++;
          }
        }

        const pourcentage = total > 0 ? (valides / total) * 100 : 0;
        
        scoresBruts.push({
          eleveId: eleve.matricule,
          total,
          valides,
          pourcentage
        });
      }

      // Calculer la médiane des nombres de réponses pour ce tableau (uniquement ceux qui ont répondu)
      let medianReponses = 0;
      if (mode === 'pondere_median') {
        const reponses = scoresBruts.map(s => s.total).filter(n => n > 0);
        if (reponses.length > 0) {
          reponses.sort((a, b) => a - b);
          const milieu = Math.floor(reponses.length / 2);
          medianReponses = reponses.length % 2 === 0 
            ? (reponses[milieu - 1] + reponses[milieu]) / 2 
            : reponses[milieu];
        }
      }

      // Deuxième passe : stocker les scores (avec ou sans pondération)
      for (const brut of scoresBruts) {
        let pourcentageFinal = brut.pourcentage;
        
        // Pour le mode pondéré, on applique le facteur (plafonné à 1)
        if (mode === 'pondere_median' && medianReponses > 0 && brut.total > 0) {
          let facteur = brut.total / medianReponses;
          facteur = Math.min(1, facteur);
          pourcentageFinal = brut.pourcentage * facteur;
        }
        // Si l'élève n'a pas de mesures (total === 0), pourcentageFinal reste 0

        const score = {
          tableauIndex: verif.tableau_index,
          tableauNom: tableau.nom,
          verificationNom: verif.nom,
          totalMesures: brut.total,
          mesuresValides: brut.valides,
          pourcentage: pourcentageFinal
        };

        const eleveScore = scoresParEleve.get(brut.eleveId);
        if (eleveScore) {
          eleveScore.scoresParTableau.push(score);
        }
      }
    }

    // Calculer les scores globaux (selon le mode sélectionné)
    for (const eleveScore of Array.from(scoresParEleve.values())) {
      const scoresTableaux = eleveScore.scoresParTableau;
      
      // Vérifier si l'élève a au moins une mesure dans UN des tableaux
      const aDesMesures = scoresTableaux.some(st => st.totalMesures > 0);
      
      if (!aDesMesures) {
        // Élève absent : score global = null (pas 0)
        eleveScore.scoreGlobal.pourcentage = -1; // Valeur spéciale pour "absent"
        eleveScore.scoreGlobal.totalMesures = 0;
        eleveScore.scoreGlobal.mesuresValides = 0;
        continue;
      }
      
      let totalMesuresGlobal = 0;
      let validesGlobal = 0;
      let sommePourcentages = 0;
      let compteurTableauxAvecMesures = 0;
      
      for (const st of scoresTableaux) {
        if (st.totalMesures === 0) continue; // Ignorer les tableaux sans mesures
        
        // Pourcentage BRUT du tableau
        const pourcentageBrut = (st.mesuresValides / st.totalMesures) * 100;
        sommePourcentages += pourcentageBrut;
        compteurTableauxAvecMesures++;
        totalMesuresGlobal += st.totalMesures;
        validesGlobal += st.mesuresValides;
      }
      
      if (modeCalculGlobal === 'standard') {
        // Moyenne arithmétique simple des pourcentages bruts (uniquement sur les tableaux avec mesures)
        eleveScore.scoreGlobal.pourcentage = compteurTableauxAvecMesures > 0 
          ? sommePourcentages / compteurTableauxAvecMesures 
          : 0;
      } else {
        // Mode pondéré (à implémenter selon vos besoins)
        eleveScore.scoreGlobal.pourcentage = compteurTableauxAvecMesures > 0 
          ? sommePourcentages / compteurTableauxAvecMesures 
          : 0;
      }
      
      eleveScore.scoreGlobal.totalMesures = totalMesuresGlobal;
      eleveScore.scoreGlobal.mesuresValides = validesGlobal;
    }

    return Array.from(scoresParEleve.values());
  }, [verifications, tableaux, mesures, eleves, modesCalcul]);

  // Fonction pour obtenir la classe de couleur selon le pourcentage
  const getPourcentageColor = (pourcentage: number) => {
    if (pourcentage < seuilRouge) return 'text-red-600';
    if (pourcentage < seuilJaune) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Fonction pour obtenir la pastille de couleur
  const getBadgeColor = (pourcentage: number) => {
    if (pourcentage < seuilRouge) return 'bg-red-100 text-red-800';
    if (pourcentage < seuilJaune) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  // Déterminer les colonnes à afficher (une par vérification active)
  const colonnes = verifications.filter(v => v.active && v.expression.trim());
  
  // Créer une map de couleurs par (tableauNom, verificationNom)
  const couleurMap = new Map<string, string>();
  let colorIndex = 0;
  colonnes.forEach(verif => {
    const tableau = tableaux[verif.tableau_index];
    const key = `${tableau?.nom} - ${verif.nom}`;
    if (!couleurMap.has(key)) {
      couleurMap.set(key, COULEURS_TABLEAUX[colorIndex % COULEURS_TABLEAUX.length]);
      colorIndex++;
    }
  });

  if (colonnes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune vérification active</h3>
        <p className="text-gray-500">
          Configurez des relations mathématiques dans l'onglet "Configuration" pour évaluer les élèves.
        </p>
      </div>
    );
  }

  // Calcul des stats globales
  const totalGlobal = scores.reduce((sum, s) => sum + s.scoreGlobal.totalMesures, 0);
  const validesGlobal = scores.reduce((sum, s) => sum + s.scoreGlobal.mesuresValides, 0);
  const pourcentageGlobal = totalGlobal > 0 ? (validesGlobal / totalGlobal) * 100 : 0;

  return (
    <div className="space-y-6">

    {/* En-tête avec scores globaux */}
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
      <h3 className="text-lg font-semibold mb-2">Résultats globaux</h3>
      <div className="flex items-center justify-between">
        <div>
          {/* Moyenne des scores globaux des élèves QUI ONT PARTICIPÉ (exclure les absents) */}
          <p className="text-3xl font-bold">
            {(() => {
              const elevesAvecScore = scores.filter(s => s.scoreGlobal.pourcentage !== -1);
              const moyenne = elevesAvecScore.reduce((sum, s) => sum + s.scoreGlobal.pourcentage, 0) / (elevesAvecScore.length || 1);
              return moyenne.toFixed(1);
            })()}%
          </p>
          <p className="text-sm opacity-90">
            Moyenne des scores globaux des élèves ayant participé
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm opacity-90">
            {scores.filter(s => s.scoreGlobal.pourcentage !== -1).length} / {scores.length} élèves ont participé
          </p>
        </div>
      </div>
    </div>

      {/* Double slider pour les seuils */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Seuils de couleur</h4>
        
        <div className="relative pt-6 pb-2">
          {/* Barre de fond avec les trois couleurs */}
          <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full">
            <div className="absolute left-0 top-0 h-full rounded-l-full" style={{ width: `${seuilRouge}%`, backgroundColor: '#f87171' }} />
            <div className="absolute top-0 h-full" style={{ left: `${seuilRouge}%`, width: `${seuilJaune - seuilRouge}%`, backgroundColor: '#fbbf24' }} />
            <div className="absolute top-0 right-0 h-full rounded-r-full" style={{ width: `${100 - seuilJaune}%`, backgroundColor: '#4ade80' }} />
          </div>
          
          {/* Poignée rouge (seuil bas) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform z-10"
            style={{ left: `${seuilRouge}%` }}
            onMouseDown={(e) => {
              const onMouseMove = (moveEvent: MouseEvent) => {
                const rect = (moveEvent.target as HTMLElement).parentElement?.getBoundingClientRect();
                if (rect) {
                  let newValue = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                  newValue = Math.min(Math.max(0, newValue), seuilJaune - 1);
                  setSeuilRouge(Math.round(newValue));
                }
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-red-600 whitespace-nowrap">
              {seuilRouge}%
            </div>
          </div>
          
          {/* Poignée jaune (seuil haut) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-600 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform z-10"
            style={{ left: `${seuilJaune}%` }}
            onMouseDown={(e) => {
              const onMouseMove = (moveEvent: MouseEvent) => {
                const rect = (moveEvent.target as HTMLElement).parentElement?.getBoundingClientRect();
                if (rect) {
                  let newValue = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                  newValue = Math.min(Math.max(seuilRouge + 1, newValue), 100);
                  setSeuilJaune(Math.round(newValue));
                }
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-yellow-600 whitespace-nowrap">
              {seuilJaune}%
            </div>
          </div>
        </div>

      </div>

      {/* Tableau des résultats par élève */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Élève
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classe
                </th>
                {colonnes.map((verif, idx) => {
                  const tableau = tableaux[verif.tableau_index];
                  const key = `${tableau?.nom} - ${verif.nom}`;
                  const couleur = couleurMap.get(key) || '';
                  
                  return (
                    <th key={idx} className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      <div className={`inline-block px-2 py-1 rounded-full ${couleur}`}>
                        {tableau?.nom}<br />
                        <span className="text-xs font-normal">{verif.nom}</span>
                      </div>
                      {/* PLUS DE ModeSelector ici */}
                    </th>
                  );
                })}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                  <div className="flex flex-col items-center gap-1">
                    <span>Score global</span>
                    <ModeSelector 
                      mode={modeCalculGlobal}
                      onChange={(mode) => setModeCalculGlobal(mode)}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scores
                .sort((a, b) => a.eleve.nom.localeCompare(b.eleve.nom))
                .map((score) => {
                  const eleve = score.eleve;
                  // Utiliser le score global déjà calculé (moyenne pondérée)
                  const globalPourcentage = score.scoreGlobal.pourcentage;
                  const globalColor = getPourcentageColor(globalPourcentage);
                  const globalBadge = getBadgeColor(globalPourcentage);
                  
                  return (
                    <tr key={eleve.matricule} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {eleve.prenom} {eleve.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {eleve.classe}
                      </td>
                      {colonnes.map((verif, idx) => {
                        const tableau = tableaux[verif.tableau_index];
                        const key = `${tableau?.nom} - ${verif.nom}`;
                        const couleur = couleurMap.get(key) || '';
                        const scoreTableau = score.scoresParTableau.find(
                          (s: { tableauNom: string; verificationNom: string }) => 
                            s.tableauNom === tableau?.nom && s.verificationNom === verif.nom
                        );
                        
                        // Si l'élève n'a aucune mesure pour ce tableau
                        if (!scoreTableau || scoreTableau.totalMesures === 0) {
                          return (
                            <td key={idx} className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-gray-400 text-sm">—</span>
                            </td>
                          );
                        }
                        
                        const pourcentage = scoreTableau.pourcentage;
                        const total = scoreTableau.totalMesures;
                        const valides = scoreTableau.mesuresValides;
                        
                        return (
                          <td key={idx} className="px-6 py-4 whitespace-nowrap text-center">
                            <div className={`inline-flex flex-col items-center px-3 py-1 rounded-full ${couleur}`}>
                              <span className="text-sm font-medium">{pourcentage.toFixed(0)}%</span>
                              <span className="text-xs opacity-75">
                                {valides}/{total}
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      {/* Score global */}
                      <td className="px-6 py-4 whitespace-nowrap text-center bg-gray-50">
                        {score.scoreGlobal.pourcentage === -1 ? (
                          <span className="text-gray-400 text-sm">—</span>
                        ) : (
                          <div className={`inline-flex flex-col items-center px-3 py-1 rounded-full ${globalBadge}`}>
                            <span className={`text-sm font-bold ${globalColor}`}>{score.scoreGlobal.pourcentage.toFixed(0)}%</span>
                            <span className="text-xs opacity-75">
                              {score.scoreGlobal.mesuresValides}/{score.scoreGlobal.totalMesures}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}