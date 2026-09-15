// app/tools/tfh/eleve/tabs/MesInfosTab.tsx
'use client';

import { useState } from 'react';
import { 
  Search, Link2, Target, Sparkles, ChevronRight, ExternalLink 
} from 'lucide-react';
import { EleveInfo } from '../types';

interface MesInfosTabProps {
  eleve: EleveInfo;
  objectifGeneral: string;
  objectifParticulier: string;
  autorisationModification: boolean;
  onSaveField: (field: string, value: any) => void;
}

export default function MesInfosTab({
  eleve,
  objectifGeneral,
  objectifParticulier,
  autorisationModification,
  onSaveField,
}: MesInfosTabProps) {
  const [editingProblematique, setEditingProblematique] = useState(false);
  const [newProblematique, setNewProblematique] = useState(eleve.problematique || '');
  const [editingUrl, setEditingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState(eleve.url_tfh || '');

  const handleSaveProblematique = async () => {
    await onSaveField('problematique', newProblematique);
    setEditingProblematique(false);
  };

  const handleSaveUrl = async () => {
    await onSaveField('url_tfh', newUrl || null);
    setEditingUrl(false);
  };

  const shouldShowProblematique = eleve.type === 'traditionnel';

  return (
    <div className="space-y-6">
      {/* Problématique (uniquement si type = traditionnel) */}
      {shouldShowProblematique && (
        <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-gray-800">Problématique</h3>
            </div>
            {!editingProblematique && (
              autorisationModification ? (
                <button
                  onClick={() => setEditingProblematique(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  {eleve.problematique ? 'Modifier' : 'Ajouter'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  🔒 Modifications bloquées
                </span>
              )
            )}
          </div>
          {editingProblematique ? (
            <div className="space-y-3">
              <textarea
                value={newProblematique}
                onChange={(e) => setNewProblematique(e.target.value)}
                className="w-full border border-indigo-200 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                placeholder="Décrivez votre problématique..."
              />
              <div className="flex gap-2">
                <button onClick={handleSaveProblematique} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Enregistrer
                </button>
                <button
                  onClick={() => { setEditingProblematique(false); setNewProblematique(eleve.problematique || ''); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/60 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
              {eleve.problematique || <span className="text-gray-400 italic">Aucune problématique définie</span>}
            </div>
          )}
        </div>
      )}

      {/* URL du TFH */}
      <div className="bg-gradient-to-r from-violet-50/80 to-purple-50/80 rounded-xl p-5 border border-violet-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-violet-600" />
            <h3 className="text-base font-semibold text-gray-800">Lien vers mon TFH</h3>
          </div>
          {!editingUrl && (
            <button
              onClick={() => setEditingUrl(true)}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              {eleve.url_tfh ? 'Modifier' : 'Ajouter'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {editingUrl ? (
          <div className="space-y-3">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full border border-violet-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white"
              placeholder="https://..."
            />
            <div className="flex gap-2">
              <button onClick={handleSaveUrl} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                Enregistrer
              </button>
              <button
                onClick={() => { setEditingUrl(false); setNewUrl(eleve.url_tfh || ''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 rounded-lg p-3">
            {eleve.url_tfh ? (
              <a
                href={eleve.url_tfh}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-2 break-all"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {eleve.url_tfh}
              </a>
            ) : (
              <span className="text-gray-400 italic">Aucun lien déposé</span>
            )}
          </div>
        )}
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
    </div>
  );
}