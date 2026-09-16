// app/tools/tfh/coordination/components/EleveDetailModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Eleve, TypeTFHDisplay } from '../types';
import { getIconComponent } from '../utils/constants';
import CarnetDeBordReadOnly from './CarnetDeBordReadOnly';
import {
  X, Info, BookOpen, User, GraduationCap, Users, Calendar,
  MapPin, Clock, ExternalLink, FileText, Target, NotebookPen
} from 'lucide-react';

interface EleveDetailModalProps {
  eleve: Eleve | null;
  types: TypeTFHDisplay[];
  onClose: () => void;
}

type ModalTab = 'infos' | 'carnet';

// Composant réutilisable : carte d'info avec label + valeur
function InfoCard({
  label,
  value,
  multiline = false,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  const isEmpty = !value || value.trim() === '';

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        {icon}
        {label}
      </label>
      {isEmpty ? (
        <p className="text-sm text-gray-400 italic">Non renseigné{label.endsWith('e') ? 'e' : ''}</p>
      ) : (
        <p className={`text-sm text-gray-800 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
          {value}
        </p>
      )}
    </div>
  );
}

// Composant réutilisable : membre du jury
function JuryMember({
  role,
  prenom,
  nom,
}: {
  role: string;
  prenom: string | null | undefined;
  nom: string | null | undefined;
}) {
  const isAssigned = prenom && prenom !== '-' && nom && nom !== '-';

  return (
    <div className="flex items-start gap-2">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isAssigned ? 'bg-green-400' : 'bg-gray-300'}`} />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{role}</p>
        <p className="text-sm font-medium text-gray-800 truncate">
          {isAssigned ? `${prenom} ${nom}` : <span className="text-gray-400 italic">Non assigné</span>}
        </p>
      </div>
    </div>
  );
}

export default function EleveDetailModal({ eleve, types, onClose }: EleveDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('infos');

  // Reset à l'ouverture
  useEffect(() => {
    if (eleve) setActiveTab('infos');
  }, [eleve]);

  // ESC pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (eleve) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eleve, onClose]);

  const shouldShowCarnet = useMemo(() => {
    if (!eleve) return false;
    return eleve.type && eleve.type !== 'traditionnel';
  }, [eleve]);

  const typeInfo = useMemo(() => {
    if (!eleve || !eleve.type) return null;
    return types.find(t => t.key === eleve.type) || null;
  }, [eleve, types]);

  const typeIcon = typeInfo ? getIconComponent(typeInfo.icon) : FileText;
  const TypeIcon = typeIcon;

  const labelProblematique = eleve?.type === 'traditionnel' ? 'Problématique' : 'Titre';

  const renderSources = () => {
    if (!eleve) return null;
    const sources = [eleve.source_1, eleve.source_2, eleve.source_3, eleve.source_4, eleve.source_5]
      .filter(s => s && s.trim() !== '');

    if (sources.length === 0) {
      return <p className="text-sm text-gray-400 italic">Aucune source renseignée</p>;
    }

    return (
      <ul className="space-y-1">
        {sources.map((src, idx) => {
          const isUrl = src!.startsWith('http://') || src!.startsWith('https://');
          return (
            <li key={idx} className="text-sm">
              {isUrl ? (
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {src}
                </a>
              ) : (
                <span className="text-gray-700">{src}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  if (!eleve) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {eleve.prenom} {eleve.nom}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <GraduationCap className="w-4 h-4" />
                  {eleve.classe}
                </span>
                {typeInfo && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                    <TypeIcon className="w-3 h-3" />
                    {typeInfo.label}
                  </span>
                )}
                {eleve.categorie && (
                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {eleve.categorie}
                  </span>
                )}
                {eleve.tfh_non_rendu && (
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    TFH non rendu
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle compact - uniquement si carnet dispo */}
        {shouldShowCarnet && (
          <div className="px-6 pt-4">
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('infos')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'infos'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                Infos TFH
              </button>
              <button
                onClick={() => setActiveTab('carnet')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'carnet'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <NotebookPen className="w-3.5 h-3.5" />
                Carnet de bord
                {eleve.journal && eleve.journal.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">
                    {eleve.journal.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'infos' && (
            <div className="space-y-5">
              {/* Ligne 1 : Thématique + Catégorie côte à côte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InfoCard label="Thématique" value={eleve.thematique} />
                <InfoCard label="Catégorie" value={eleve.categorie} />
              </div>

              {/* Titre / Problématique */}
              <InfoCard
                label={labelProblematique}
                value={eleve.problematique}
                multiline
              />

              {/* Description */}
              <InfoCard
                label="Description du projet"
                value={eleve.description}
                multiline
              />

              {/* Objectif particulier */}
              {eleve.objectif_particulier && (
                <InfoCard
                  label="Objectif particulier"
                  value={eleve.objectif_particulier}
                  icon={<Target className="w-3.5 h-3.5" />}
                  multiline
                />
              )}

              {/* Ligne : Sources + Lien côte à côte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    Sources
                  </label>
                  {renderSources()}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Lien vers le TFH
                  </label>
                  {eleve.url_tfh && eleve.url_tfh.trim() !== '' ? (
                    <a
                      href={eleve.url_tfh}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline inline-flex items-start gap-1 break-all"
                    >
                      <span className="truncate">{eleve.url_tfh}</span>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Aucun lien fourni</p>
                  )}
                </div>
              </div>

              {/* Jury en 2×2 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Users className="w-3.5 h-3.5" />
                  Composition du jury
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <JuryMember role="Guide" prenom={eleve.guide_prenom} nom={eleve.guide_nom} />
                  <JuryMember role="Lecteur interne" prenom={eleve.lecteur_interne_prenom} nom={eleve.lecteur_interne_nom} />
                  <JuryMember role="Lecteur externe" prenom={eleve.lecteur_externe_prenom} nom={eleve.lecteur_externe_nom} />
                  <JuryMember role="Médiateur" prenom={eleve.mediateur_prenom} nom={eleve.mediateur_nom} />
                </div>
              </div>

              {/* Défense */}
              {(eleve.date_defense || eleve.heure_defense || eleve.localisation_defense) && (
                <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                  <label className="text-xs font-semibold text-violet-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    Défense
                  </label>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {eleve.date_defense && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-violet-500" />
                        {new Date(eleve.date_defense).toLocaleDateString('fr-FR', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </div>
                    )}
                    {eleve.heure_defense && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-violet-500" />
                        {eleve.heure_defense}
                      </div>
                    )}
                    {eleve.localisation_defense && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-violet-500" />
                        {eleve.localisation_defense}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'carnet' && shouldShowCarnet && (
            <CarnetDeBordReadOnly
              journal={eleve.journal}
              eleveNom={eleve.nom}
              elevePrenom={eleve.prenom}
            />
          )}
        </div>
      </div>
    </div>
  );
}