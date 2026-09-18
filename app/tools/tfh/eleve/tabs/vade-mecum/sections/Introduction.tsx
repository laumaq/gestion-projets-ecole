// app/tools/tfh/eleve/tabs/vade-mecum/sections/Introduction.tsx
'use client';

import { useTypesTFH } from '../../../hooks/useTypesTFH';

const GRADIENTS: Record<string, string> = {
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  green:   'bg-gradient-to-br from-green-500 to-green-600',
  rose:    'bg-gradient-to-br from-rose-500 to-rose-600',
  red:     'bg-gradient-to-br from-red-500 to-red-600',
  violet:  'bg-gradient-to-br from-violet-400 to-violet-500',
  purple:  'bg-gradient-to-br from-purple-500 to-purple-600',
  blue:    'bg-gradient-to-br from-blue-500 to-blue-600',
  indigo:  'bg-gradient-to-br from-indigo-500 to-indigo-600',
  sky:     'bg-gradient-to-br from-sky-500 to-sky-600',
  teal:    'bg-gradient-to-br from-teal-500 to-teal-600',
  cyan:    'bg-gradient-to-br from-cyan-500 to-cyan-600',
  amber:   'bg-gradient-to-br from-amber-500 to-amber-600',
  orange:  'bg-gradient-to-br from-orange-500 to-orange-600',
  lime:    'bg-gradient-to-br from-lime-500 to-lime-600',
  fuchsia: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
  pink:    'bg-gradient-to-br from-pink-500 to-pink-600',
};

const FALLBACK_GRADIENT = 'bg-gradient-to-br from-gray-400 to-gray-500';

const ORDER: Array<{ key: string; defaultLabel: string }> = [
  { key: 'traditionnel', defaultLabel: 'TRADI' },
  { key: 'atelier',      defaultLabel: 'ATELIER' },
  { key: 'stage',        defaultLabel: 'STAGE' },
  { key: 'chefdoeuvre',  defaultLabel: "CHEF-D'ŒUVRE" },
];

// `bg-emerald-100 text-emerald-700 border-emerald-200` → `emerald`
function extractColorFamily(colorClasses: string): string | null {
  const match = colorClasses.match(/\b(?:bg|text|border)-([a-z]+)-\d+/);
  return match ? match[1] : null;
}

export default function Introduction() {
  const { typesDisponibles } = useTypesTFH(true);

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {ORDER.map(({ key, defaultLabel }) => {
            const typeFromBdd = typesDisponibles.find(t => t.key === key);
            const family = typeFromBdd?.color
              ? extractColorFamily(typeFromBdd.color)
              : null;
            const gradientClasses =
              (family && GRADIENTS[family]) || FALLBACK_GRADIENT;

            return (
              <div
                key={key}
                className={`${gradientClasses} text-white rounded-xl p-4 text-center font-bold text-sm shadow-md`}
              >
                {typeFromBdd?.label?.toUpperCase() || defaultLabel}
              </div>
            );
          })}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            VADE-MECUM
          </h1>
          <p className="text-lg font-semibold text-indigo-600">
            Travaux de Fin d'Humanités
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Quatre formats, une seule pédagogie du travail d'inspiration Freinet
          </p>
        </div>

        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded">
          <p className="text-sm text-indigo-900 font-medium">
            Athénée communal Léonie de Waha
          </p>
          <p className="text-xs text-indigo-700">
            Pédagogie active type Freinet — Immersion précoce
          </p>
        </div>
      </div>
    </div>
  );
}