// /components/cahier-cotes/ModalRecapJurisprudence.tsx

'use client';

import { CahierCotesData, Cote } from '@/lib/cahier-cotes/types';
import { coteToLabel } from '@/lib/cahier-cotes/constants';
import { JurisprudenceResult } from '@/lib/cahier-cotes/jurisprudence';

interface ModalRecapJurisprudenceProps {
  result: JurisprudenceResult;
  eleves: CahierCotesData['eleves'];
  periode: string;
  onClose: () => void;
}

export function ModalRecapJurisprudence({
  result,
  eleves,
  periode,
  onClose,
}: ModalRecapJurisprudenceProps) {
  const elevesMap = new Map(eleves.map(e => [e.matricule, e]));

  const deduced = result.deduced;
  const warnings = result.warnings;

  const nbHomogenes = deduced.filter(d => d.reason === 'homogene').length;
  const nbJurisprudences = deduced.filter(d => d.reason === 'jurisprudence').length;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold">Récapitulatif des jurisprudences</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Période {periode} — {deduced.length} cote(s) complétée(s)
              {warnings.length > 0 && ` • ${warnings.length} avertissement(s)`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-4 space-y-6">
          {/* Section 1 : cotes complétées */}
          {deduced.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                ✨ Cotes complétées
                <span className="text-xs font-normal text-gray-500">
                  ({nbHomogenes} homogénéité{nbHomogenes > 1 ? 's' : ''}, {nbJurisprudences} jurisprudence{nbJurisprudences > 1 ? 's' : ''})
                </span>
              </h3>
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-2 py-1 text-left">Élève</th>
                    <th className="border border-gray-200 px-2 py-1 text-center w-[60px]">Comp.</th>
                    <th className="border border-gray-200 px-2 py-1 text-center w-[60px]">Cote</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {deduced.map((d, i) => {
                    const eleve = elevesMap.get(d.eleveMatricule);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-2 py-1">
                          <span className="text-gray-500 text-[10px] mr-1">
                            {eleve?.classe}
                          </span>
                          {eleve?.prenom} {eleve?.nom}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center font-mono text-xs">
                          {d.competenceCode}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center font-semibold">
                          {coteToLabel(d.cote)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-xs text-gray-600">
                          {d.reason === 'homogene'
                            ? 'Homogénéité (toutes les évals identiques)'
                            : `Jurisprudence (pattern identique à ${d.referenceEleves.length} autre(s) élève(s))`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 2 : warnings */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-orange-700">
                ⚠️ Avertissements (aucune modification appliquée)
              </h3>
              <table className="w-full border-collapse text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="border border-orange-200 px-2 py-1 text-left">Élève</th>
                    <th className="border border-orange-200 px-2 py-1 text-center w-[60px]">Comp.</th>
                    <th className="border border-orange-200 px-2 py-1 text-center w-[80px]">Actuelle</th>
                    <th className="border border-orange-200 px-2 py-1 text-center w-[80px]">Suggérée</th>
                    <th className="border border-orange-200 px-2 py-1 text-left">Pattern</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings.map((w, i) => {
                    const eleve = elevesMap.get(w.eleveMatricule);
                    return (
                      <tr key={i} className="hover:bg-orange-50/50">
                        <td className="border border-orange-200 px-2 py-1">
                          <span className="text-gray-500 text-[10px] mr-1">
                            {eleve?.classe}
                          </span>
                          {eleve?.prenom} {eleve?.nom}
                        </td>
                        <td className="border border-orange-200 px-2 py-1 text-center font-mono text-xs">
                          {w.competenceCode}
                        </td>
                        <td className="border border-orange-200 px-2 py-1 text-center">
                          {coteToLabel(w.coteActuelle)}
                        </td>
                        <td className="border border-orange-200 px-2 py-1 text-center font-semibold">
                          {coteToLabel(w.coteSuggeree)}
                        </td>
                        <td className="border border-orange-200 px-2 py-1 font-mono text-[10px] text-gray-600">
                          {w.pattern}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Aucun résultat */}
          {deduced.length === 0 && warnings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ✅ Aucune cote à compléter automatiquement.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}