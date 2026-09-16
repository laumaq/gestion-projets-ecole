// app/tools/tfh/coordination/components/TypeToggle.tsx
'use client';

import { TypeTFHDisplay } from '../types';
import { getIconComponent } from '../utils/constants';
import { Check } from 'lucide-react';

interface TypeToggleProps {
  types: TypeTFHDisplay[];
  selected: string; // 'all' ou la key d'un type
  onSelect: (key: string) => void;
  counts: Record<string, number>; // { all: 179, traditionnel: 45, ... }
}

export default function TypeToggle({ types, selected, onSelect, counts }: TypeToggleProps) {
  if (types.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700 hidden sm:block">Type:</span>

      {/* Bouton "Tous" */}
      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          selected === 'all'
            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
            : 'bg-white text-gray-700 border-gray-300 hover:border-violet-400 hover:bg-violet-50'
        }`}
      >
        {selected === 'all' && <Check className="w-3 h-3" />}
        Tous
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          selected === 'all' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {counts.all ?? 0}
        </span>
      </button>

      {/* Boutons dynamiques */}
      {types.map((type) => {
        const Icon = getIconComponent(type.icon);
        const isActive = selected === type.key;
        const count = counts[type.key] ?? 0;

        return (
          <button
            key={type.key}
            type="button"
            onClick={() => onSelect(type.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isActive
                ? `${type.color} shadow-sm ring-2 ring-offset-1 ring-violet-400`
                : 'bg-white text-gray-700 border-gray-300 hover:border-violet-400 hover:bg-violet-50'
            }`}
          >
            {isActive ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
            {type.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              isActive ? 'bg-white/40' : 'bg-gray-100 text-gray-600'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}