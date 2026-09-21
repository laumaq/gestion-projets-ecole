// app/tools/tfh/coordination/components/TypeRepartitionCard.tsx
'use client';

import { TypeRepartition } from '../utils/dashboardStats';
import { PieChart } from 'lucide-react';

interface TypeRepartitionCardProps {
  repartition: TypeRepartition[];
  total: number;
}

// Palette de couleurs "dures" pour la barre (indépendante des classes BDD)
const BAR_COLORS: Record<string, string> = {
  traditionnel: 'bg-blue-500',
  stage:        'bg-purple-500',
  atelier:      'bg-orange-500',
  chefdoeuvre:  'bg-emerald-500',
  non_defini:   'bg-gray-400',
};

export default function TypeRepartitionCard({ repartition, total }: TypeRepartitionCardProps) {
  if (total === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-gray-800">Répartition par type</h3>
        </div>
        <p className="text-sm text-gray-400 italic">Aucun élève</p>
      </div>
    );
  }

  // Filtrer les types avec au moins 1 élève
  const nonVides = repartition.filter(r => r.count > 0);

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-gray-800">Répartition par type</h3>
        </div>
        <span className="text-xs text-gray-500">{total} élève{total > 1 ? 's' : ''}</span>
      </div>

      {/* Barre proportionnelle */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-gray-100">
        {nonVides.map((r) => (
          <div
            key={r.key}
            className={`${BAR_COLORS[r.key] || 'bg-gray-400'} transition-all`}
            style={{ width: `${r.pourcentage}%` }}
            title={`${r.label} : ${r.count} (${r.pourcentage}%)`}
          />
        ))}
      </div>

      {/* Légende détaillée */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {nonVides.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${BAR_COLORS[r.key] || 'bg-gray-400'}`} />
              <span className="text-xs text-gray-700 truncate">{r.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5 flex-shrink-0">
              <span className="text-xs font-bold text-gray-800">{r.pourcentage}%</span>
              <span className="text-[10px] text-gray-400">({r.count})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}