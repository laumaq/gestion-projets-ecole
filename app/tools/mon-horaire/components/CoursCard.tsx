
// app/tools/mon-horaire/components/CoursCard.tsx
'use client';

import type { Cours } from '../types';
import { extraireGroupe, formatHeureCourte, heightPx, topPx } from '../utils/horaire';

interface CoursCardProps {
  cours: Cours;
  heureMinRef: number;
  onClick?: () => void;
  /** Style additionnel (ex: largeur en vue semaine) */
  style?: React.CSSProperties;
  /** Compact (vue semaine) ou étendu (vue jour) */
  compact?: boolean;
}

export default function CoursCard({
  cours,
  heureMinRef,
  onClick,
  style,
  compact = false,
}: CoursCardProps) {
  const isExterne = cours.type_pattern === 'externe';
  const groupe = extraireGroupe(cours.raw_pattern);

  const top = topPx(cours.heure_debut, heureMinRef);
  const height = heightPx(cours.heure_debut, cours.heure_fin);

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top,
    height: Math.max(height - 2, 20), // -2 : petit gap entre blocs
    left: 4,
    right: 4,
    ...style,
  };

  const colorClass = isExterne
    ? 'bg-gray-100 border-gray-300 text-gray-400 italic cursor-default'
    : 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100 cursor-pointer';

  return (
    <div
      style={baseStyle}
      onClick={isExterne ? undefined : onClick}
      className={`rounded border-l-4 px-2 py-1 overflow-hidden shadow-sm transition-colors ${colorClass}`}
      title={`${cours.matiere || '—'} · ${cours.salle || ''}`}
    >
      <div className="text-xs font-semibold truncate">
        {cours.matiere || <span className="text-gray-400">—</span>}
      </div>
      <div className="text-[11px] truncate opacity-80">
        {formatHeureCourte(cours.heure_debut)}–{formatHeureCourte(cours.heure_fin)}
      </div>
      {!compact && cours.salle && (
        <div className="text-[11px] truncate opacity-70">📍 {cours.salle}</div>
      )}
      {groupe && (
        <div className="text-[10px] truncate mt-0.5">
          <span className="inline-block px-1 py-0 rounded bg-white/60 text-blue-800">
            {isExterne ? 'autre école' : groupe}
          </span>
        </div>
      )}
    </div>
  );
}