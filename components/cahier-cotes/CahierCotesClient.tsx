'use client';

import { useState, useMemo, useRef, useCallback, useEffect, Fragment } from 'react';
import {
  CahierCotesData,
  Cote,
  Evaluation,
  EvaluationResultat,
  Periode,
} from '@/lib/cahier-cotes/types';
import {
  updateCote,
  updateEvaluation,
  deleteEvaluation,
  createEvaluation,
  getEvaluations,
  getResultatsForEvaluations,
} from '@/lib/cahier-cotes/queries';
import { CelluleNote, CelluleNoteHandle } from './CelluleNote';
import { EnTeteEvaluation } from './EnTeteEvaluation';
import { ModalNouvelleEval } from '@/components/cahier-cotes/ModalNouvelleEval';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CahierCotesClientProps {
  initialData: CahierCotesData;
  anneeScolaire: string;
  employeeId: string;
  employeeName: string;
}

export function CahierCotesClient({
  initialData,
  anneeScolaire,
  employeeId,
}: CahierCotesClientProps) {
  const isMobile = useIsMobile();

  const [periode, setPeriode] = useState<Periode>('P1');
  const [evaluations, setEvaluations] = useState<Evaluation[]>(initialData.evaluations);
  const [resultats, setResultats] = useState<EvaluationResultat[]>(initialData.resultats);
  const [competences] = useState(initialData.competences);
  const [editModeEvalId, setEditModeEvalId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingPeriode, setIsLoadingPeriode] = useState(false);

  // ─── Grille de refs pour la navigation ───
  // cellRefs.current[rowIdx][evalIdx][compIdx]
  const cellRefs = useRef<(CelluleNoteHandle | null)[][][]>([]);

  // ─── Compétences utilisées dans cette période (union des compétences des évals) ───
  const competencesUtilisees = useMemo(() => {
    const codes = new Set<string>();
    evaluations.forEach(ev => ev.competences.forEach(c => codes.add(c)));
    return competences
      .filter(c => codes.has(c.code))
      .sort((a, b) => a.ordre - b.ordre);
  }, [evaluations, competences]);

  // ─── Calcul du nombre total de colonnes (pour les colSpan) ───
  const totalColonnes = useMemo(() => {
    return evaluations.reduce((acc, ev) => {
      const nbComps = competencesUtilisees.filter(c =>
        ev.competences.includes(c.code)
      ).length;
      return acc + nbComps;
    }, 0);
  }, [evaluations, competencesUtilisees]);

  // ─── Reset de la grille de refs quand la structure change ───
  useEffect(() => {
    cellRefs.current = initialData.eleves.map(() =>
      evaluations.map(() => competencesUtilisees.map(() => null))
    );
  }, [evaluations.length, competencesUtilisees.length, initialData.eleves.length]);

  // ─── Index rapide des résultats ───
  const resultatsMap = useMemo(() => {
    const map = new Map<string, EvaluationResultat>();
    resultats.forEach(r => map.set(`${r.evaluation_id}::${r.eleve_matricule}`, r));
    return map;
  }, [resultats]);

  // ─── Charger une période ───
  const loadPeriode = useCallback(async (p: Periode) => {
    setIsLoadingPeriode(true);
    try {
      const evals = await getEvaluations(initialData.coursLogique.id, p, anneeScolaire);  // ⭐
      const res = await getResultatsForEvaluations(evals.map(e => e.id));
      setEvaluations(evals);
      setResultats(res);
    } catch (e) {
      console.error('Erreur chargement période :', e);
    } finally {
      setIsLoadingPeriode(false);
    }
  }, [initialData.coursLogique.id, anneeScolaire]);   // ⭐

  // ─── Changement de période ───
  const handlePeriodeChange = (p: Periode) => {
    if (p === periode) return;
    setPeriode(p);
    setEditModeEvalId(null);
    loadPeriode(p);
  };

  // ─── Mise à jour locale d'une note ───
  const handleCoteChange = useCallback(
    async (evaluationId: string, matricule: number, competenceCode: string, newCote: Cote) => {
      // Update optimiste
      setResultats(prev => {
        const key = `${evaluationId}::${matricule}`;
        const existing = prev.find(r => `${r.evaluation_id}::${r.eleve_matricule}` === key);
        const compKey = competenceCode.toLowerCase() as keyof EvaluationResultat;

        if (existing) {
          return prev.map(r =>
            r === existing ? { ...r, [compKey]: newCote } : r
          );
        } else {
          const newRes: EvaluationResultat = {
            id: crypto.randomUUID(),
            evaluation_id: evaluationId,
            eleve_matricule: matricule,
            c1: null, c2: null, c3: null, c4: null, c5: null,
            c6: null, c7: null, c8: null, c9: null, c10: null,
            updated_at: new Date().toISOString(),
          };
          (newRes as any)[compKey] = newCote;
          return [...prev, newRes];
        }
      });

      // Persistance
      try {
        await updateCote({
          evaluationId,
          eleveMatricule: matricule,
          competenceCode,
          cote: newCote,
        });
      } catch (e) {
        console.error('Erreur sauvegarde note :', e);
      }
    },
    []
  );

  // ─── Navigation clavier ───
  const focusCell = useCallback((row: number, evalIdx: number, compIdx: number) => {
    const handle = cellRefs.current[row]?.[evalIdx]?.[compIdx];
    handle?.focus();
  }, []);

  const handleTabForward = useCallback(
    (row: number, evalIdx: number, compIdx: number) => {
      // 1. Compétence suivante dans la même éval
      const nbCompsCurrentEval = competencesUtilisees.filter(c =>
        evaluations[evalIdx]?.competences.includes(c.code)
      ).length;

      if (compIdx + 1 < nbCompsCurrentEval) {
        focusCell(row, evalIdx, compIdx + 1);
        return;
      }
      // 2. Éval suivante (même élève) → première compétence de l'éval suivante
      if (evalIdx + 1 < evaluations.length) {
        focusCell(row, evalIdx + 1, 0);
        return;
      }
      // 3. Élève suivant, première éval, première compétence
      if (row + 1 < initialData.eleves.length) {
        focusCell(row + 1, 0, 0);
        return;
      }
      // 4. Fin du tableau
    },
    [competencesUtilisees, evaluations, initialData.eleves.length, focusCell]
  );

  const handleEnterNextRow = useCallback(
    (row: number, evalIdx: number, compIdx: number) => {
      // Enter : même éval, même compétence, élève suivant
      if (row + 1 < initialData.eleves.length) {
        focusCell(row + 1, evalIdx, compIdx);
      }
    },
    [initialData.eleves.length, focusCell]
  );

  // ─── Mise à jour évaluation (nom / date) ───
  const handleUpdateEvaluation = async (
    evalId: string,
    updates: Partial<Pick<Evaluation, 'nom' | 'date_eval'>>
  ) => {
    setEvaluations(prev =>
      prev.map(ev => (ev.id === evalId ? { ...ev, ...updates } : ev))
    );
    try {
      await updateEvaluation(evalId, updates);
    } catch (e) {
      console.error('Erreur mise à jour éval :', e);
    }
  };

  // ─── Suppression évaluation ───
  const handleDeleteEvaluation = async (evalId: string) => {
    setEvaluations(prev => prev.filter(ev => ev.id !== evalId));
    setResultats(prev => prev.filter(r => r.evaluation_id !== evalId));
    setEditModeEvalId(null);
    try {
      await deleteEvaluation(evalId);
    } catch (e) {
      console.error('Erreur suppression éval :', e);
    }
  };

  // ─── Création évaluation ───
  const handleCreateEvaluation = async (params: {
    nom: string;
    dateEval: string;
    competences: string[];
  }) => {
    const newEval = await createEvaluation({
      coursLogiqueId: initialData.coursLogique.id,   // ⭐
      periode,
      anneeScolaire,
      nom: params.nom,
      dateEval: params.dateEval,
      competences: params.competences,
      eleveMatricules: initialData.eleves.map(e => e.matricule),
      createdBy: employeeId,
    });

    setEvaluations(prev => [...prev, newEval]);
    const newResultats: EvaluationResultat[] = initialData.eleves.map(e => ({
      id: crypto.randomUUID(),
      evaluation_id: newEval.id,
      eleve_matricule: e.matricule,
      c1: null, c2: null, c3: null, c4: null, c5: null,
      c6: null, c7: null, c8: null, c9: null, c10: null,
      updated_at: new Date().toISOString(),
    }));
    setResultats(prev => [...prev, ...newResultats]);
    setShowModal(false);
  };

  // ─── Rendu ───
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Onglets P1/P2/P3 + bouton nouvelle éval */}
      <div className="flex items-center justify-between p-3 border-b bg-white shrink-0">
        <div className="flex gap-1">
          {(['P1', 'P2', 'P3'] as Periode[]).map(p => (
            <button
              key={p}
              onClick={() => handlePeriodeChange(p)}
              disabled={isLoadingPeriode}
              className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                periode === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isLoadingPeriode ? 'opacity-60 cursor-wait' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
        >
          + Nouvelle évaluation
        </button>
      </div>

      {/* Tableau */}
      <div className="overflow-auto flex-1 min-h-0">
        {evaluations.length === 0 && !isLoadingPeriode ? (
          <div className="text-center py-12 text-gray-500">
            Aucune évaluation pour cette période.
            <br />
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Créer la première évaluation
            </button>
          </div>
        ) : (
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                {/* Colonne élève */}
                <th className="border border-gray-300 px-2 py-1 bg-gray-100 sticky left-0 z-20 text-left min-w-[180px]">
                  Élève
                </th>

                {/* Une colonne par évaluation */}
                {evaluations.map(ev => (
                  <EnTeteEvaluation
                    key={ev.id}
                    evaluation={ev}
                    competences={competencesUtilisees.filter(c =>
                      ev.competences.includes(c.code)
                    )}
                    isEditMode={editModeEvalId === ev.id}
                    onToggleEditMode={() =>
                      setEditModeEvalId(editModeEvalId === ev.id ? null : ev.id)
                    }
                    onUpdate={updates => handleUpdateEvaluation(ev.id, updates)}
                    onDelete={() => handleDeleteEvaluation(ev.id)}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {initialData.eleves.map((eleve, rowIdx) => {
                const elevePrecedent = rowIdx > 0 ? initialData.eleves[rowIdx - 1] : null;
                const changementClasse =
                  elevePrecedent && elevePrecedent.classe !== eleve.classe;

                return (
                  <Fragment key={eleve.matricule}>
                    {/* Démarcation entre classes */}
                    {changementClasse && (
                      <tr>
                        <td
                          colSpan={1 + totalColonnes}
                          className="bg-gray-200 h-[3px] p-0 border-0"
                        />
                      </tr>
                    )}
                    <tr className="hover:bg-blue-50/30">
                      <td className="border border-gray-300 px-2 py-1 sticky left-0 bg-white z-10 font-medium whitespace-nowrap">
                        <span className="text-gray-500 text-[10px] mr-1">
                          {eleve.classe}
                        </span>
                        {eleve.prenom} {eleve.nom}
                      </td>

                      {evaluations.map((ev, evalIdx) => {
                        const compsForEval = competencesUtilisees.filter(c =>
                          ev.competences.includes(c.code)
                        );
                        const res = resultatsMap.get(
                          `${ev.id}::${eleve.matricule}`
                        );

                        return compsForEval.map((comp, compIdx) => {
                          const compKey = comp.code.toLowerCase() as keyof EvaluationResultat;
                          const value = res ? (res[compKey] as Cote) : null;

                          return (
                            <td
                              key={`${ev.id}-${comp.code}`}
                              className="border border-gray-300 p-0 w-[50px] h-[28px]"
                            >
                              <CelluleNote
                                ref={handle => {
                                  if (!cellRefs.current[rowIdx])
                                    cellRefs.current[rowIdx] = [];
                                  if (!cellRefs.current[rowIdx][evalIdx])
                                    cellRefs.current[rowIdx][evalIdx] = [];
                                  cellRefs.current[rowIdx][evalIdx][compIdx] = handle;
                                }}
                                value={value}
                                onChange={newCote =>
                                  handleCoteChange(
                                    ev.id,
                                    eleve.matricule,
                                    comp.code,
                                    newCote
                                  )
                                }
                                onTabForward={() =>
                                  handleTabForward(rowIdx, evalIdx, compIdx)
                                }
                                onEnterNextRow={() =>
                                  handleEnterNextRow(rowIdx, evalIdx, compIdx)
                                }
                                isMobile={isMobile}
                              />
                            </td>
                          );
                        });
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ModalNouvelleEval
          competences={competences}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateEvaluation}
        />
      )}
    </div>
  );
}