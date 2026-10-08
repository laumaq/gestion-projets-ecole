'use client';

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  CahierCotesData,
  Cote,
  Evaluation,
  EvaluationResultat,
  Periode,
} from '@/lib/cahier-cotes/types';
import {
  getEvaluations,
  getResultatsForEvaluations,
  upsertItineraireCote,
  getItineraireForPeriod,
} from '@/lib/cahier-cotes/queries';
import {
  computeAllJurisprudences,
  JurisprudenceResult,
} from '@/lib/cahier-cotes/jurisprudence';
import { CelluleNote } from '@/components/cahier-cotes/CelluleNote';
import { HistoriqueMenu } from '@/components/cahier-cotes/HistoriqueMenu';
import { useIsMobile } from '@/hooks/useIsMobile';
import { coteToLabel } from '@/lib/cahier-cotes/constants';

interface ItineraireCompetencesProps {
  initialData: CahierCotesData;
  anneeScolaire: string;
  employeeId: string;
}

export function ItineraireCompetences({
  initialData,
  anneeScolaire,
  employeeId,
}: ItineraireCompetencesProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [periode, setPeriode] = useState<Periode>('P1');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [resultats, setResultats] = useState<EvaluationResultat[]>([]);
  const [itineraire, setItineraire] = useState<Map<string, Cote>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [warnings, setWarnings] = useState<JurisprudenceResult['warnings']>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  // ─── Compétences utilisées (union des compétences des évals) ───
  const competencesUtilisees = useMemo(() => {
    const codes = new Set<string>();
    evaluations.forEach(ev => ev.competences.forEach(c => codes.add(c)));
    return initialData.competences
      .filter(c => codes.has(c.code))
      .sort((a, b) => a.ordre - b.ordre);
  }, [evaluations, initialData.competences]);

  // ─── Chargement d'une période ───
  const loadPeriode = useCallback(
    async (p: Periode) => {
      setIsLoading(true);
      try {
        const [evals, itin] = await Promise.all([
          getEvaluations(initialData.coursLogique.id, p, anneeScolaire),
          getItineraireForPeriod(initialData.coursLogique.id, p, anneeScolaire),
        ]);
        const res = await getResultatsForEvaluations(evals.map(e => e.id));

        setEvaluations(evals);
        setResultats(res);

        const newMap = new Map<string, Cote>();
        itin.forEach((row: any) => {
          initialData.competences.forEach(comp => {
            const compKey = comp.code.toLowerCase() as keyof typeof row;
            const cote = row[compKey] as Cote;
            if (cote !== null && cote !== undefined) {
              newMap.set(`${row.eleve_matricule}::${comp.code}`, cote);
            }
          });
        });
        setItineraire(newMap);
        setWarnings([]);
        setShowWarnings(false);
      } catch (e) {
        console.error('Erreur chargement itinéraire :', e);
      } finally {
        setIsLoading(false);
      }
    },
    [initialData.coursLogique.id, anneeScolaire, initialData.competences]
  );

  // Charger P1 au mount
  useEffect(() => {
    loadPeriode('P1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodeChange = (p: Periode) => {
    if (p === periode) return;
    setPeriode(p);
    loadPeriode(p);
  };

  // ─── Mise à jour manuelle d'une cote ───
  const handleCoteChange = async (
    matricule: number,
    competenceCode: string,
    newCote: Cote
  ) => {
    const key = `${matricule}::${competenceCode}`;
    setItineraire(prev => {
      const next = new Map(prev);
      if (newCote === null) next.delete(key);
      else next.set(key, newCote);
      return next;
    });

    try {
      await upsertItineraireCote({
        eleveMatricule: matricule,
        coursLogiqueId: initialData.coursLogique.id,
        periode,
        anneeScolaire,
        competenceCode,
        cote: newCote,
        updatedBy: employeeId,
        isManuel: true,
      });
    } catch (e) {
      console.error('Erreur sauvegarde itinéraire :', e);
    }
  };

  // ─── Appliquer les jurisprudences ───
  const handleAppliquerJurisprudences = async () => {
    const result = computeAllJurisprudences({
      evaluations,
      resultats,
      elevesMatricules: initialData.eleves.map(e => e.matricule),
      competencesCodes: competencesUtilisees.map(c => c.code),
      itineraireActuel: itineraire,
    });

    // Sauvegarder les déductions (une par une, ou en batch si tu veux optimiser)
    for (const d of result.deduced) {
      try {
        await upsertItineraireCote({
          eleveMatricule: d.eleveMatricule,
          coursLogiqueId: initialData.coursLogique.id,
          periode,
          anneeScolaire,
          competenceCode: d.competenceCode,
          cote: d.cote,
          updatedBy: employeeId,
          isManuel: false,
          isJurisprudence: true,
        });
      } catch (e) {
        console.error('Erreur sauvegarde jurisprudence :', e);
      }
    }

    // Mettre à jour l'état local
    setItineraire(prev => {
      const next = new Map(prev);
      for (const d of result.deduced) {
        next.set(`${d.eleveMatricule}::${d.competenceCode}`, d.cote);
      }
      return next;
    });

    setWarnings(result.warnings);
    setShowWarnings(result.warnings.length > 0);

    setToast({
      message:
        result.deduced.length === 0
          ? 'Aucune cote à compléter automatiquement.'
          : `${result.deduced.length} cote(s) complétée(s) automatiquement.`,
      type: 'success',
    });

    setTimeout(() => setToast(null), 4000);
  };

  // ─── Rendu ───
  return (
    <div className="flex flex-col h-full">
      {/* Barre supérieure */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="min-w-0">
          <button
            onClick={() =>
              router.push(
                `/tools/cahier-cotes/${initialData.coursLogique.id}?annee=${anneeScolaire}`
              )
            }
            className="text-xs text-blue-600 hover:underline mb-0.5 block"
          >
            ← Retour au cahier de cotes
          </button>
          <h1 className="text-lg font-semibold truncate">
            Itinéraire des compétences — {initialData.coursLogique.matiere}
          </h1>
          <p className="text-xs text-gray-500">
            {initialData.coursLogique.groupe_pedagogique}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HistoriqueMenu
            anneeCourante={anneeScolaire}
            coursLogiqueId={initialData.coursLogique.id}
          />
          <button
            onClick={handleAppliquerJurisprudences}
            disabled={isLoading || competencesUtilisees.length === 0}
            className="px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm disabled:opacity-50 whitespace-nowrap"
          >
            ✨ Appliquer les jurisprudences
          </button>
        </div>
      </div>

      {/* Onglets période */}
      <div className="flex items-center gap-1 p-3 border-b bg-white shrink-0">
        {(['P1', 'P2', 'P3'] as Periode[]).map(p => (
          <button
            key={p}
            onClick={() => handlePeriodeChange(p)}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded text-sm font-medium ${
              periode === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="overflow-auto flex-1">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : competencesUtilisees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune compétence évaluée dans cette période.
          </div>
        ) : (
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="border border-gray-300 px-3 py-2 bg-gray-100 sticky left-0 z-20 text-left min-w-[180px]">
                  Élève
                </th>
                {competencesUtilisees.map(comp => (
                  <th
                    key={comp.code}
                    className="border border-gray-300 px-3 py-2 bg-blue-50 min-w-[80px] text-center"
                    title={comp.libelle}
                  >
                    {comp.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialData.eleves.map((eleve, idx) => {
                const prec = idx > 0 ? initialData.eleves[idx - 1] : null;
                const changementClasse = prec && prec.classe !== eleve.classe;

                return (
                  <Fragment key={eleve.matricule}>
                    {changementClasse && (
                      <tr>
                        <td
                          colSpan={1 + competencesUtilisees.length}
                          className="bg-gray-200 h-[3px] p-0 border-0"
                        />
                      </tr>
                    )}
                    <tr className="hover:bg-blue-50/30">
                      <td className="border border-gray-300 px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                        <span className="text-gray-500 text-[10px] mr-1">
                          {eleve.classe}
                        </span>
                        {eleve.prenom} {eleve.nom}
                      </td>
                      {competencesUtilisees.map(comp => {
                        const cote =
                          itineraire.get(`${eleve.matricule}::${comp.code}`) ?? null;
                        return (
                          <td
                            key={comp.code}
                            className="border border-gray-300 p-0 w-[80px] h-[30px]"
                          >
                            <CelluleNote
                              value={cote}
                              onChange={newCote =>
                                handleCoteChange(eleve.matricule, comp.code, newCote)
                              }
                              isMobile={isMobile}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white z-50 ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-orange-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Warnings */}
      {showWarnings && warnings.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-orange-700">
                ⚠️ {warnings.length} avertissement(s)
              </h2>
              <button
                onClick={() => setShowWarnings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto p-4 space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                Ces élèves ont une cote de période différente de celle suggérée par
                les jurisprudences / l'homogénéité.{' '}
                <strong>Aucune modification n'a été appliquée.</strong>
              </p>
              {warnings.map((w, i) => {
                const eleve = initialData.eleves.find(
                  e => e.matricule === w.eleveMatricule
                );
                return (
                  <div
                    key={i}
                    className="border border-orange-200 rounded p-3 bg-orange-50 text-sm"
                  >
                    <div className="font-medium">
                      {eleve?.prenom} {eleve?.nom} — {w.competenceCode}
                    </div>
                    <div className="text-gray-600 mt-1">
                      Cote actuelle : <strong>{coteToLabel(w.coteActuelle)}</strong> •
                      Suggérée : <strong>{coteToLabel(w.coteSuggeree)}</strong>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      Pattern : {w.pattern}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t flex justify-end">
              <button
                onClick={() => setShowWarnings(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}