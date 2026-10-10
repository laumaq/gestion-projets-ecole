// /components/cahier-cotes/ItineraireCompetences.tsx

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
  deleteItineraireForPeriode,
} from '@/lib/cahier-cotes/queries';
import {
  computeAllJurisprudences,
  propagerJurisprudence,
  JurisprudenceResult,
} from '@/lib/cahier-cotes/jurisprudence';
import { CelluleNote } from './CelluleNote';
import { HistoriqueMenu } from './HistoriqueMenu';
import { ModalRecapJurisprudence } from './ModalRecapJurisprudence';
import { useIsMobile } from '@/hooks/useIsMobile';
import { COTE_COLORS, coteToLabel } from '@/lib/cahier-cotes/constants';

type PeriodeOuRecap = Periode | 'RECAP';

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

  const [periode, setPeriode] = useState<PeriodeOuRecap>('P1');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [resultats, setResultats] = useState<EvaluationResultat[]>([]);
  const [itineraire, setItineraire] = useState<Map<string, Cote>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  const [recapResult, setRecapResult] = useState<JurisprudenceResult | null>(null);
  const [filtreCompetence, setFiltreCompetence] = useState<string | null>(null);
  const [eleveSurbrillance, setEleveSurbrillance] = useState<number | null>(null);

  // ─── Compétences utilisées dans cette période (union) ───
  const competencesUtilisees = useMemo(() => {
    const codes = new Set<string>();
    evaluations.forEach(ev => ev.competences.forEach(c => codes.add(c)));
    return initialData.competences
      .filter(c => codes.has(c.code))
      .sort((a, b) => a.ordre - b.ordre);
  }, [evaluations, initialData.competences]);

  // ─── Compétences affichées (filtrées) ───
  const competencesAffichees = useMemo(() => {
    if (filtreCompetence) {
      return competencesUtilisees.filter(c => c.code === filtreCompetence);
    }
    return competencesUtilisees;
  }, [competencesUtilisees, filtreCompetence]);

  // ─── Index rapide des résultats d'évals ───
  const resultatsMap = useMemo(() => {
    const map = new Map<string, EvaluationResultat>();
    resultats.forEach(r => map.set(`${r.evaluation_id}::${r.eleve_matricule}`, r));
    return map;
  }, [resultats]);

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
        setFiltreCompetence(null);
      } catch (e) {
        console.error('Erreur chargement itinéraire :', e);
      } finally {
        setIsLoading(false);
      }
    },
    [initialData.coursLogique.id, anneeScolaire, initialData.competences]
  );

  useEffect(() => {
    if (periode !== 'RECAP') {
      loadPeriode(periode as Periode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodeChange = (p: PeriodeOuRecap) => {
    if (p === periode) return;
    setPeriode(p);
    setFiltreCompetence(null);
    if (p !== 'RECAP') {
      loadPeriode(p as Periode);
    }
  };

  // ─── Mise à jour manuelle d'une cote + propagation ───
  const handleCoteChange = async (
    matricule: number,
    competenceCode: string,
    newCote: Cote
  ) => {
    const key = `${matricule}::${competenceCode}`;

    const itineraireAjour = new Map(itineraire);
    if (newCote === null) itineraireAjour.delete(key);
    else itineraireAjour.set(key, newCote);
    setItineraire(itineraireAjour);

    try {
      await upsertItineraireCote({
        eleveMatricule: matricule,
        coursLogiqueId: initialData.coursLogique.id,
        periode: periode as Periode,
        anneeScolaire,
        competenceCode,
        cote: newCote,
        updatedBy: employeeId,
        isManuel: true,
      });

      const propagation = propagerJurisprudence({
        evaluations,
        resultats,
        elevesMatricules: initialData.eleves.map(e => e.matricule),
        competenceCode,
        matriculeSource: matricule,
        nouvelleCote: newCote,
        itineraireActuel: itineraireAjour,
      });

      if (propagation.length > 0) {
        for (const p of propagation) {
          await upsertItineraireCote({
            eleveMatricule: p.eleveMatricule,
            coursLogiqueId: initialData.coursLogique.id,
            periode: periode as Periode,
            anneeScolaire,
            competenceCode: p.competenceCode,
            cote: p.cote,
            updatedBy: employeeId,
            isManuel: false,
            isJurisprudence: true,
          });
        }

        setItineraire(prev => {
          const next = new Map(prev);
          for (const p of propagation) {
            next.set(`${p.eleveMatricule}::${p.competenceCode}`, p.cote);
          }
          return next;
        });

        setToast({
          message: `📋 Jurisprudence : ${propagation.length} élève(s) mis à jour.`,
          type: 'success',
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      console.error('Erreur sauvegarde itinéraire :', e);
    }
  };

  // ─── Appliquer toutes les jurisprudences ───
  const handleAppliquerJurisprudences = async () => {
    const result = computeAllJurisprudences({
      evaluations,
      resultats,
      elevesMatricules: initialData.eleves.map(e => e.matricule),
      competencesCodes: competencesUtilisees.map(c => c.code),
      itineraireActuel: itineraire,
    });

    for (const d of result.deduced) {
      try {
        await upsertItineraireCote({
          eleveMatricule: d.eleveMatricule,
          coursLogiqueId: initialData.coursLogique.id,
          periode: periode as Periode,
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

    setItineraire(prev => {
      const next = new Map(prev);
      for (const d of result.deduced) {
        next.set(`${d.eleveMatricule}::${d.competenceCode}`, d.cote);
      }
      return next;
    });

    setRecapResult(result);
  };

  // ─── Effacer la période ───
  const handleEffacerPeriode = async () => {
    if (periode === 'RECAP') return;
    const confirmed = confirm(
      `Effacer TOUTES les cotes d'itinéraire de la période ${periode} ?\n\n` +
      `Cette action est irréversible.\n` +
      `Les évaluations et les notes des évaluations ne sont PAS touchées.`
    );
    if (!confirmed) return;

    try {
      await deleteItineraireForPeriode({
        coursLogiqueId: initialData.coursLogique.id,
        periode: periode as Periode,
        anneeScolaire,
      });
      setItineraire(new Map());
      setToast({
        message: `🗑️ Cotes de la période ${periode} effacées.`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error('Erreur effacement itinéraire :', e);
      setToast({
        message: `❌ Erreur lors de l'effacement.`,
        type: 'warning',
      });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // ─── Calcul du nombre de colonnes d'évals (pour colSpan) ───
  const nbColonnesEvals = useMemo(() => {
    return evaluations.reduce((acc, ev) => {
      const nbComps = competencesAffichees.filter(c =>
        ev.competences.includes(c.code)
      ).length;
      return acc + nbComps;
    }, 0);
  }, [evaluations, competencesAffichees]);

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
          {periode !== 'RECAP' && (
            <>
              <button
                onClick={handleEffacerPeriode}
                disabled={isLoading || itineraire.size === 0}
                className="px-3 py-1.5 rounded border border-red-300 bg-white text-red-700 hover:bg-red-50 text-sm disabled:opacity-50 whitespace-nowrap"
              >
                🗑️ Effacer {periode}
              </button>
              <button
                onClick={handleAppliquerJurisprudences}
                disabled={isLoading || competencesUtilisees.length === 0}
                className="px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm disabled:opacity-50 whitespace-nowrap"
              >
                ✨ Appliquer les jurisprudences
              </button>
            </>
          )}
        </div>
      </div>

      {/* Onglets période + Récap */}
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
        <button
          onClick={() => handlePeriodeChange('RECAP')}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            periode === 'RECAP'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Récap
        </button>

        {/* Filtre actif */}
        {filtreCompetence && (
          <div className="ml-4 flex items-center gap-2 text-xs text-blue-800 bg-blue-50 px-3 py-1.5 rounded">
            <span>
              🔍 Filtre : <strong>{filtreCompetence}</strong>
            </span>
            <button
              onClick={() => setFiltreCompetence(null)}
              className="text-blue-600 hover:underline"
            >
              retirer
            </button>
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-auto flex-1">
        {periode === 'RECAP' ? (
          <RecapPeriodes
            coursLogiqueId={initialData.coursLogique.id}
            anneeScolaire={anneeScolaire}
            eleves={initialData.eleves}
            competences={initialData.competences}
            eleveSurbrillance={eleveSurbrillance}
            setEleveSurbrillance={setEleveSurbrillance}
          />
        ) : isLoading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : competencesUtilisees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune compétence évaluée dans cette période.
          </div>
        ) : (
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              {/* Ligne 1 : titres évals + "Itinéraire" */}
              <tr>
                <th
                  rowSpan={3}
                  className="border border-gray-300 px-3 py-2 bg-gray-100 sticky left-0 z-20 text-left min-w-[180px]"
                >
                  Élève
                </th>

                {/* Colonnes évals */}
                {evaluations.map(ev => {
                  const nbComps = competencesAffichees.filter(c =>
                    ev.competences.includes(c.code)
                  ).length;
                  if (nbComps === 0) return null;
                  return (
                    <th
                      key={`ev-${ev.id}`}
                      colSpan={nbComps}
                      className="border border-gray-300 px-2 py-1 bg-blue-50 text-xs font-semibold text-center"
                    >
                      <div className="truncate" title={ev.nom}>{ev.nom}</div>
                    </th>
                  );
                })}

                {/* Colonne "Itinéraire" */}
                {competencesAffichees.length > 0 && (
                  <th
                    colSpan={competencesAffichees.length}
                    className="border border-gray-300 px-2 py-1 bg-green-100 text-xs font-semibold text-center border-l-4 border-l-green-500"
                  >
                    🎯 Itinéraire (synthèse)
                  </th>
                )}
              </tr>

              {/* Ligne 2 : dates évals + vide pour itinéraire */}
              <tr>
                {evaluations.map(ev => {
                  const nbComps = competencesAffichees.filter(c =>
                    ev.competences.includes(c.code)
                  ).length;
                  if (nbComps === 0) return null;
                  return (
                    <th
                      key={`date-${ev.id}`}
                      colSpan={nbComps}
                      className="border border-gray-300 px-2 py-0.5 bg-blue-50/50 text-[10px] text-gray-600 text-center"
                    >
                      {new Date(ev.date_eval).toLocaleDateString('fr-BE', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </th>
                  );
                })}
                {competencesAffichees.length > 0 && (
                  <th
                    colSpan={competencesAffichees.length}
                    className="border border-gray-300 px-2 py-0.5 bg-green-50/50 border-l-4 border-l-green-500"
                  />
                )}
              </tr>

              {/* Ligne 3 : compétences */}
              <tr>
                {evaluations.map(ev => {
                  const compsForEval = competencesAffichees.filter(c =>
                    ev.competences.includes(c.code)
                  );
                  return compsForEval.map(comp => (
                    <th
                      key={`comp-ev-${ev.id}-${comp.code}`}
                      className="border border-gray-300 px-1 py-0.5 bg-blue-50 text-[10px] font-medium text-center w-[50px]"
                      title={comp.libelle}
                    >
                      {comp.code}
                    </th>
                  ));
                })}
                {competencesAffichees.map(comp => {
                  const estFiltre = filtreCompetence === comp.code;
                  const aUnFiltre = filtreCompetence !== null;
                  return (
                    <th
                      key={`comp-itin-${comp.code}`}
                      onClick={() =>
                        setFiltreCompetence(estFiltre ? null : comp.code)
                      }
                      className={`border border-gray-300 px-1 py-1 text-[11px] font-semibold text-center w-[60px] cursor-pointer select-none transition border-l-4 border-l-green-500 ${
                        estFiltre
                          ? 'bg-green-600 text-white'
                          : aUnFiltre
                          ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          : 'bg-green-100 hover:bg-green-200'
                      }`}
                      title={`${comp.libelle} — Cliquer pour filtrer`}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {estFiltre && <span className="text-[10px]">🔍</span>}
                        {comp.code}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {initialData.eleves.map((eleve, idx) => {
                const prec = idx > 0 ? initialData.eleves[idx - 1] : null;
                const changementClasse = prec && prec.classe !== eleve.classe;
                const estSurbrillance = eleveSurbrillance === eleve.matricule;

                return (
                  <Fragment key={eleve.matricule}>
                    {changementClasse && (
                      <tr>
                        <td
                          colSpan={1 + nbColonnesEvals + competencesAffichees.length}
                          className="bg-gray-200 h-[3px] p-0 border-0"
                        />
                      </tr>
                    )}
                    <tr
                      className={`transition ${
                        estSurbrillance
                          ? 'bg-yellow-100 hover:bg-yellow-100'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      <td
                        onClick={() =>
                          setEleveSurbrillance(
                            estSurbrillance ? null : eleve.matricule
                          )
                        }
                        className={`border border-gray-300 px-3 py-1 sticky left-0 z-10 whitespace-nowrap cursor-pointer select-none ${
                          estSurbrillance ? 'bg-yellow-200' : 'bg-white'
                        }`}
                      >
                        <span className="text-gray-500 text-[10px] mr-1">
                          {eleve.classe}
                        </span>
                        {eleve.prenom} {eleve.nom}
                      </td>

                      {/* Section évals — lecture seule */}
                      {evaluations.map(ev => {
                        const compsForEval = competencesAffichees.filter(c =>
                          ev.competences.includes(c.code)
                        );
                        const res = resultatsMap.get(
                          `${ev.id}::${eleve.matricule}`
                        );
                        return compsForEval.map(comp => {
                          const compKey = comp.code.toLowerCase() as keyof EvaluationResultat;
                          const value = res ? (res[compKey] as Cote) : null;
                          const colorClass =
                            COTE_COLORS[value ?? 'null'] ?? COTE_COLORS['null'];
                          return (
                            <td
                              key={`ev-${ev.id}-${comp.code}`}
                              className={`border border-gray-300 p-0 w-[50px] h-[28px] text-center text-xs ${colorClass}`}
                            >
                              {coteToLabel(value)}
                            </td>
                          );
                        });
                      })}

                      {/* Section itinéraire — éditable */}
                      {competencesAffichees.map(comp => {
                        const cote =
                          itineraire.get(`${eleve.matricule}::${comp.code}`) ?? null;
                        return (
                          <td
                            key={`itin-${comp.code}`}
                            className="border border-gray-300 p-0 w-[60px] h-[28px] border-l-4 border-l-green-500"
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

      {/* Modal récap jurisprudence */}
      {recapResult && (
        <ModalRecapJurisprudence
          result={recapResult}
          eleves={initialData.eleves}
          periode={periode as string}
          onClose={() => setRecapResult(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant interne : vue Récap de toutes les périodes
// ─────────────────────────────────────────────────────────────

interface RecapPeriodesProps {
  coursLogiqueId: string;
  anneeScolaire: string;
  eleves: CahierCotesData['eleves'];
  competences: CahierCotesData['competences'];
  eleveSurbrillance: number | null;
  setEleveSurbrillance: (m: number | null) => void;
}

function RecapPeriodes({
  coursLogiqueId,
  anneeScolaire,
  eleves,
  competences,
  eleveSurbrillance,
  setEleveSurbrillance,
}: RecapPeriodesProps) {
  const [data, setData] = useState<Map<string, Cote>>(new Map());
  const [competencesUtilisees, setCompetencesUtilisees] = useState<
    CahierCotesData['competences']
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const periodes: Periode[] = ['P1', 'P2', 'P3'];
        const allData = new Map<string, Cote>();
        const codesTrouves = new Set<string>();

        for (const p of periodes) {
          const itin = await getItineraireForPeriod(
            coursLogiqueId,
            p,
            anneeScolaire
          );
          itin.forEach((row: any) => {
            competences.forEach(comp => {
              const compKey = comp.code.toLowerCase() as keyof typeof row;
              const cote = row[compKey] as Cote;
              if (cote !== null && cote !== undefined) {
                allData.set(`${p}::${row.eleve_matricule}::${comp.code}`, cote);
                codesTrouves.add(comp.code);
              }
            });
          });
        }

        setData(allData);
        setCompetencesUtilisees(
          competences
            .filter(c => codesTrouves.has(c.code))
            .sort((a, b) => a.ordre - b.ordre)
        );
      } catch (e) {
        console.error('Erreur chargement récap :', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [coursLogiqueId, anneeScolaire, competences]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  }

  if (competencesUtilisees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucune cote d'itinéraire pour cette année.
      </div>
    );
  }

  const periodes: Periode[] = ['P1', 'P2', 'P3'];

  return (
    <table className="border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-white">
        <tr>
          <th
            rowSpan={2}
            className="border border-gray-300 px-3 py-2 bg-gray-100 sticky left-0 z-20 text-left min-w-[180px]"
          >
            Élève
          </th>
          {periodes.map(p => (
            <th
              key={p}
              colSpan={competencesUtilisees.length}
              className="border border-gray-300 px-3 py-2 bg-blue-100 text-center font-semibold"
            >
              {p}
            </th>
          ))}
        </tr>
        <tr>
          {periodes.map(p =>
            competencesUtilisees.map(comp => (
              <th
                key={`${p}-${comp.code}`}
                className="border border-gray-300 px-2 py-1 bg-blue-50 text-center text-xs font-medium w-[60px]"
                title={comp.libelle}
              >
                {comp.code}
              </th>
            ))
          )}
        </tr>
      </thead>
      <tbody>
        {eleves.map((eleve, idx) => {
          const prec = idx > 0 ? eleves[idx - 1] : null;
          const changementClasse = prec && prec.classe !== eleve.classe;
          const estSurbrillance = eleveSurbrillance === eleve.matricule;

          return (
            <Fragment key={eleve.matricule}>
              {changementClasse && (
                <tr>
                  <td
                    colSpan={1 + competencesUtilisees.length * periodes.length}
                    className="bg-gray-200 h-[3px] p-0 border-0"
                  />
                </tr>
              )}
              <tr
                className={`transition ${
                  estSurbrillance ? 'bg-yellow-100' : 'hover:bg-blue-50/30'
                }`}
              >
                <td
                  onClick={() =>
                    setEleveSurbrillance(
                      estSurbrillance ? null : eleve.matricule
                    )
                  }
                  className={`border border-gray-300 px-3 py-1 sticky left-0 z-10 whitespace-nowrap cursor-pointer select-none ${
                    estSurbrillance ? 'bg-yellow-200' : 'bg-white'
                  }`}
                >
                  <span className="text-gray-500 text-[10px] mr-1">
                    {eleve.classe}
                  </span>
                  {eleve.prenom} {eleve.nom}
                </td>
                {periodes.map(p =>
                  competencesUtilisees.map(comp => {
                    const cote =
                      data.get(`${p}::${eleve.matricule}::${comp.code}`) ?? null;
                    return (
                      <td
                        key={`${p}-${comp.code}`}
                        className="border border-gray-300 px-2 py-1 text-center w-[60px]"
                      >
                        {coteToLabel(cote)}
                      </td>
                    );
                  })
                )}
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}