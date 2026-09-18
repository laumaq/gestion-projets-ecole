// app/tools/tfh/coordination/components/BadgeEquilibre.tsx
'use client';

import { useState } from 'react';
import { Niveau, NIVEAU_CONFIG } from '../utils/journalStats';

interface BadgeEquilibreProps {
  niveau: Niveau;
  ratio: number | null;
  parType: Record<string, number>;
  compact?: boolean;
}

export default function BadgeEquilibre({ niveau, ratio, parType, compact = false }: BadgeEquilibreProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = NIVEAU_CONFIG[niveau];

  const tooltip = (
    <div className="text-xs space-y-1">
      <div className="font-semibold mb-1">Répartition des entrées</div>
      {['Objectif', 'Déroulement', 'Réflexion'].map(t => (
        <div key={t} className="flex justify-between gap-3">
          <span>{t}</span>
          <span className="font-medium">{parType[t] || 0}</span>
        </div>
      ))}
      {ratio !== null && (
        <div className="pt-1 mt-1 border-t border-white/20 text-[10px] opacity-80">
          Ratio min/max : {Math.round(ratio)}%
        </div>
      )}
    </div>
  );

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
    >
      <span
        className={`inline-block px-2 py-1 rounded-md text-xs font-bold border cursor-help ${config.bg} ${config.text} ${config.border}`}
      >
        {config.emoji}
        {!compact && ratio !== null && (
          <span className="ml-1 font-medium">{Math.round(ratio)}%</span>
        )}
      </span>

      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-xl whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}