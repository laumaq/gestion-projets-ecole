// app/tools/tfh/eleve/tabs/MesInfosTab.tsx
'use client';

import { Target, Sparkles, Calendar, BookOpen } from 'lucide-react';
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

  const getMessagePourEleve = (statut: string): string => {
    if (!statut || statut === '' || statut === 'null' || statut === 'undefined') {
      return "Ton guide n'a pas encore rendu d'info sur ta convocation.";
    }
    switch (statut) {
      case "Oui, l'élève n'a pas communiqué":
        return "Tu es convoqué·e car tu n'as pas communiqué (ou pas assez) selon ton/ta guide.";
      case "Oui, l'élève n'a pas avancé":
        return "Tu es convoqué·e car tu n'as pas avancé (ou sensiblement pas) selon ton/ta guide.";
      case "Oui, l'élève n'atteint pas les objectifs":
        return "Tu es convoqué·e car tu as avancé mais n'atteins pas les objectifs.";
      case "Non, l'élève atteint bien les objectifs":
        return "Tu n'es pas convoqué·e.";
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

      {/* Convocations */}
      {eleve.sessions && eleve.sessions.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50/80 to-pink-50/80 rounded-xl p-5 border border-rose-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-semibold text-gray-800">Convocations aux journées TFH</h3>
          </div>
          <div className="space-y-3">
            {eleve.sessions.map(session => {
              const statut = session.statut || '';
              const estConvoque = statut.startsWith('Oui');
              const message = getMessagePourEleve(statut);

              return (
                <div key={session.index} className={`bg-white/60 rounded-lg p-4 border ${estConvoque ? 'border-rose-200' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{session.nom}</p>
                      <p className="text-xs text-gray-500">
                        {session.date_debut.toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      estConvoque 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {estConvoque ? 'Convoqué·e' : 'Non convoqué·e'}
                    </span>
                  </div>
                  {(estConvoque || !statut) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}