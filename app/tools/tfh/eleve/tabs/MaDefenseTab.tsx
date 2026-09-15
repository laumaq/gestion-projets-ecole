// app/tools/tfh/eleve/tabs/MaDefenseTab.tsx
'use client';

import { Calendar, Clock, MapPin, Users, Printer } from 'lucide-react';
import { EleveInfo } from '../types';

interface MaDefenseTabProps {
  eleve: EleveInfo;
}

export default function MaDefenseTab({ eleve }: MaDefenseTabProps) {
  if (!eleve.defense || !eleve.defense.date) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-8 border border-gray-100 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Ta défense n'a pas encore été planifiée.</p>
        <p className="text-sm text-gray-400 mt-1">Les informations apparaîtront dès que ton coordinateur aura fixé une date.</p>
      </div>
    );
  }

  const calculerNombreImpressions = () => {
    let count = 0;
    if (eleve.guide_accepte_numerique !== true) count++;
    if (eleve.defense?.lecteur_interne_nom && eleve.defense.lecteur_interne_accepte_numerique !== true) count++;
    if (eleve.defense?.lecteur_externe_nom && eleve.defense.lecteur_externe_accepte_numerique !== true) count++;
    if (eleve.defense?.mediateur_nom && eleve.defense.mediateur_accepte_numerique !== true) count++;
    return count;
  };

  const nbImpressions = calculerNombreImpressions();

  return (
    <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-6 border border-indigo-100">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Calendar className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Ma défense TFH</h3>
        <span className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
          À venir
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {eleve.defense.date && (
          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
            <Calendar className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-indigo-600 font-medium">Date</p>
              <p className="text-sm text-gray-700 font-medium">
                {new Date(eleve.defense.date).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            </div>
          </div>
        )}
        {eleve.defense.heure && (
          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
            <Clock className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-indigo-600 font-medium">Heure</p>
              <p className="text-sm text-gray-700 font-medium">{eleve.defense.heure}</p>
            </div>
          </div>
        )}
        {eleve.defense.localisation && (
          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3 md:col-span-2">
            <MapPin className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-indigo-600 font-medium">Lieu</p>
              <p className="text-sm text-gray-700">{eleve.defense.localisation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-indigo-200">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-semibold text-indigo-800">Composition du jury</h4>
        </div>
        <div className="space-y-2">
          <JuryMember
            emoji="👨‍🏫"
            role="Guide"
            nom={`${eleve.guide_prenom} ${eleve.guide_nom} ${eleve.guide_initiale}.`}
            accepteNumerique={eleve.guide_accepte_numerique}
          />
          {eleve.defense.lecteur_interne_nom && (
            <JuryMember
              emoji="📖"
              role="Lecteur·rice interne"
              nom={`${eleve.defense.lecteur_interne_nom} ${eleve.defense.lecteur_interne_initiale}.`}
              accepteNumerique={eleve.defense.lecteur_interne_accepte_numerique}
            />
          )}
          {eleve.defense.lecteur_externe_nom && (
            <JuryMember
              emoji="👁️"
              role="Lecteur·rice externe"
              nom={`${eleve.defense.lecteur_externe_prenom} ${eleve.defense.lecteur_externe_nom}`}
              accepteNumerique={eleve.defense.lecteur_externe_accepte_numerique}
            />
          )}
          {eleve.defense.mediateur_nom && (
            <JuryMember
              emoji="⚖️"
              role="Médiateur·trice"
              nom={`${eleve.defense.mediateur_prenom} ${eleve.defense.mediateur_nom}`}
              accepteNumerique={eleve.defense.mediateur_accepte_numerique}
            />
          )}
        </div>
      </div>

      {nbImpressions > 0 && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Exemplaires papier à fournir</p>
              <p className="text-xs text-amber-600">Membres du jury qui préfèrent le papier</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-amber-700">{nbImpressions}</span>
        </div>
      )}
    </div>
  );
}

function JuryMember({ emoji, role, nom, accepteNumerique }: { 
  emoji: string; 
  role: string; 
  nom: string; 
  accepteNumerique?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-lg">{emoji}</span>
        <div>
          <p className="text-sm font-medium text-gray-800">{role}</p>
          <p className="text-xs text-gray-500">{nom}</p>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
        accepteNumerique ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
      }`}>
        {accepteNumerique ? (
          <><span>💻</span><span>Numérique</span></>
        ) : (
          <><span>📄</span><span>Papier</span></>
        )}
      </div>
    </div>
  );
}