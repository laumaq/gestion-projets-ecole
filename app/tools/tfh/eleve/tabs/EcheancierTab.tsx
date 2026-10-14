// app/tools/tfh/eleve/tabs/EcheancierTab.tsx
'use client';

import { CalendarDays, AlertCircle } from 'lucide-react';
import { useEcheancier } from '../hooks/useEcheancier';
import EcheancierTimeline from '../components/EcheancierTimeline';
import { EleveInfo, TypeTFHDisplay } from '../types';

interface EcheancierTabProps {
  eleve: EleveInfo;
  typesDisponibles: TypeTFHDisplay[];
}

export default function EcheancierTab({ eleve, typesDisponibles }: EcheancierTabProps) {
  const { echeances, loading } = useEcheancier(eleve.type);

  const typeInfo = typesDisponibles.find(t => t.key === eleve.type);

  // Cas 1 : pas de type choisi
  if (!eleve.type || eleve.type.trim() === '') {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          Choisis d'abord ton format de TFH
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Ton échéancier de travail s'affichera ici une fois que tu auras défini ton format
          dans l'onglet <strong>Mes choix</strong>.
        </p>
      </div>
    );
  }

  // Cas 2 : chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  // Cas 3 : aucune échéance définie pour ce format
  if (echeances.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          Aucune échéance pour le moment
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          L'échéancier de ton format ({typeInfo?.label || eleve.type}) n'a pas encore été
          défini par les coordinateurs.
        </p>
      </div>
    );
  }

  // Cas 4 : affichage normal
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-lg">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Échéancier de travail</h2>
            <p className="text-xs text-gray-500">
              {echeances.length} échéance{echeances.length > 1 ? 's' : ''} pour ton parcours
            </p>
          </div>
        </div>

        {typeInfo && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
        )}
      </div>

      <EcheancierTimeline
        echeances={echeances}
        typeColor={typeInfo?.color}
      />
    </div>
  );
}