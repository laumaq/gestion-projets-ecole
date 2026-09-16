// app/tools/tfh/eleve/tabs/MesInfosTab.tsx
'use client';

import { Target, Sparkles, Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { EleveInfo, TypeTFHDisplay } from '../types';
import { getIconComponent } from '../utils/constants';

interface MesInfosTabProps {
  eleve: EleveInfo;
  objectifGeneral: string;
  objectifParticulier: string;
  typesDisponibles: TypeTFHDisplay[];
}

export default function MesInfosTab({
  eleve,
  objectifGeneral,
  objectifParticulier,
  typesDisponibles,
}: MesInfosTabProps) {
  const isTraditionnel = eleve.type === 'traditionnel';
  const problematiqueLabel = isTraditionnel ? 'Problématique' : 'Titre';

  const typeInfo = typesDisponibles.find(t => t.key === eleve.type);
  const TypeIcon = typeInfo ? getIconComponent(typeInfo.icon) : BookOpen;

  // Trouver la prochaine session (la première dans le futur, déjà filtrée par le hook)
  // On garde celle qui a un statut "Oui, ..." (convoqué·e)
  const prochaineConvocation = (eleve.sessions || [])
    .filter(s => s.statut.startsWith('Oui'))
    .sort((a, b) => a.date_debut.getTime() - b.date_debut.getTime())[0];

  const getMessagePourEleve = (statut: string): string => {
    switch (statut) {
      case "Oui, l'élève n'a pas communiqué":
        return "Tu es convoqué·e car tu n'as pas communiqué (ou pas assez) selon ton/ta guide.";
      case "Oui, l'élève n'a pas avancé":
        return "Tu es convoqué·e car tu n'as pas avancé (ou sensiblement pas) selon ton/ta guide.";
      case "Oui, l'élève n'atteint pas les objectifs":
        return "Tu es convoqué·e car tu as avancé mais n'atteins pas les objectifs.";
      default:
        return statut;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête récapitulatif (non-modifiable) */}
      <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-800">Mon projet en un coup d'œil</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Type de TFH */}
          <div className="bg-white/70 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TypeIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Type de TFH</p>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {typeInfo?.label || eleve.type || <span className="italic text-gray-400 font-normal">Non défini</span>}
              </p>
            </div>
          </div>

          {/* Titre / Problématique */}
          <div className="bg-white/70 rounded-lg p-4">
            <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-1">
              {problematiqueLabel}
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {eleve.problematique || <span className="text-gray-400 italic">Non défini</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Prochaine convocation (affichée uniquement si convoqué·e à une prochaine session) */}
      {prochaineConvocation && (
        <div className="bg-gradient-to-r from-rose-50/80 to-pink-50/80 rounded-xl p-5 border border-rose-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-lg flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <h3 className="text-base font-semibold text-rose-900">
                  Tu es convoqué·e à la prochaine journée TFH
                </h3>
                <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                  Convocation
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-rose-800 mb-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{prochaineConvocation.nom}</span>
                <span className="text-rose-500">·</span>
                <span>
                  {prochaineConvocation.date_debut.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-rose-700 leading-relaxed">
                {getMessagePourEleve(prochaineConvocation.statut)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Objectif général */}
      {objectifGeneral && (
        <div className="bg-gradient-to-r from-sky-50/80 to-blue-50/80 rounded-xl p-5 border border-sky-100">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-semibold text-gray-800">Objectif général du TFH</h3>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-gray-700">
            <p className="whitespace-pre-wrap leading-relaxed">{objectifGeneral}</p>
            <p className="text-xs text-sky-600 mt-2 font-medium">Cet objectif s'applique à tous les élèves.</p>
          </div>
        </div>
      )}

      {/* Objectif particulier */}
      {objectifParticulier ? (
        <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 rounded-xl p-5 border border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-gray-800">Objectif particulier</h3>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-gray-700">
            <p className="whitespace-pre-wrap leading-relaxed">{objectifParticulier}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Défini par ton/ta guide
              </span>
              <span className="text-xs text-emerald-600">
                {eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-700">Objectif particulier</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-gray-500 mb-1">Ton/ta guide n'a pas encore défini d'objectif particulier pour toi.</p>
            <p className="text-sm text-gray-400">Cet objectif sera personnalisé selon tes besoins spécifiques.</p>
          </div>
        </div>
      )}
    </div>
  );
}