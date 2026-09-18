// app/tools/tfh/coordination/components/BadgeFraicheur.tsx
'use client';

import { Niveau, NIVEAU_CONFIG, formatJoursDepuis } from '../utils/journalStats';

interface BadgeFraicheurProps {
  niveau: Niveau;
  joursDepuisDerniere: number | null;
  compact?: boolean;
}

export default function BadgeFraicheur({ niveau, joursDepuisDerniere, compact = false }: BadgeFraicheurProps) {
  const config = NIVEAU_CONFIG[niveau];

  if (compact) {
    return (
      <span
        className={`inline-block px-2 py-1 rounded-md text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}
        title={formatJoursDepuis(joursDepuisDerniere)}
      >
        {config.emoji}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <span>{config.emoji}</span>
      <span>{formatJoursDepuis(joursDepuisDerniere)}</span>
    </span>
  );
}