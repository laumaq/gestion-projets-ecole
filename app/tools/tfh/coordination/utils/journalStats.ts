// app/tools/tfh/coordination/components/IndicatorCard.tsx
'use client';

import { Niveau } from '../utils/journalStats';
import { Check } from 'lucide-react';

interface IndicatorCardProps {
  title: string;
  icon: React.ReactNode;
  counts: Record<Niveau, number>;
  active: boolean;
  onClick: () => void;
  description?: string;
}

const NIVEAU_STYLES: Record<Niveau, { bg: string; text: string; label: string }> = {
  rouge: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', label: '🟠' },
  jaune: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🟡' },
  vert: { bg: 'bg-green-100', text: 'text-green-700', label: '🟢' },
  indetermine: { bg: 'bg-gray-100', text: 'text-gray-500', label: '—' },
};

export default function IndicatorCard({
  title,
  icon,
  counts,
  active,
  onClick,
  description,
}: IndicatorCardProps) {
  const nbPreoccupants = (counts.rouge || 0) + (counts.orange || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left bg-white rounded-xl border-2 p-4 transition-all hover:shadow-md ${
        active
          ? 'border-violet-500 ring-2 ring-violet-200 shadow-md'
          : 'border-gray-200 hover:border-violet-300'
      }`}
      title={description}
    >
      {active && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-sm">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-violet-50 rounded-lg text-violet-600">
          {icon}
        </div>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {(['rouge', 'orange', 'jaune', 'vert'] as const).map((niveau) => {
          const style = NIVEAU_STYLES[niveau];
          const count = counts[niveau] || 0;
          return (
            <div
              key={niveau}
              className={`rounded-lg px-1.5 py-1 text-center ${style.bg}`}
            >
              <div className="text-[10px] opacity-70">{style.label}</div>
              <div className={`text-sm font-bold ${style.text}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {counts.indetermine > 0 && (
        <div className="mt-2 text-[10px] text-gray-500 text-center">
          {counts.indetermine} non évaluable{counts.indetermine > 1 ? 's' : ''}
        </div>
      )}

      {active && (
        <div className="mt-2 text-[10px] text-violet-600 text-center font-medium">
          Filtre actif : 🔴 + 🟠 ({nbPreoccupants})
        </div>
      )}
    </button>
  );
}