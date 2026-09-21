// app/tools/tfh/coordination/components/StatCard.tsx
'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  count?: number;
  total?: number;
  pourcentage?: number;
  subtitle?: string;
  color?: 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'orange' | 'purple';
  /** Si défini, affiche une barre de progression */
  showProgress?: boolean;
  /** Message si vide */
  emptyMessage?: string;
  isCount?: boolean; // Affiche juste le count sans %
}

const COLOR_MAP: Record<string, {
  bg: string;
  iconBg: string;
  iconText: string;
  bar: string;
}> = {
  violet: { bg: 'bg-violet-50', iconBg: 'bg-violet-100', iconText: 'text-violet-600', bar: 'bg-violet-500' },
  blue:   { bg: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   bar: 'bg-blue-500' },
  green:  { bg: 'bg-green-50',  iconBg: 'bg-green-100',  iconText: 'text-green-600',  bar: 'bg-green-500' },
  amber:  { bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  iconText: 'text-amber-600',  bar: 'bg-amber-500' },
  red:    { bg: 'bg-red-50',    iconBg: 'bg-red-100',    iconText: 'text-red-600',    bar: 'bg-red-500' },
  gray:   { bg: 'bg-gray-50',   iconBg: 'bg-gray-100',   iconText: 'text-gray-600',   bar: 'bg-gray-500' },
  orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconText: 'text-orange-600', bar: 'bg-orange-500' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', bar: 'bg-purple-500' },
};

export default function StatCard({
  label,
  icon: Icon,
  count,
  total,
  pourcentage,
  subtitle,
  color = 'violet',
  showProgress = true,
  emptyMessage = 'Aucune donnée',
  isCount = false,
}: StatCardProps) {
  const c = COLOR_MAP[color];
  const isEmpty = isCount ? (count === undefined) : (total === 0);

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 ${c.iconBg} rounded-lg flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${c.iconText}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-medium text-gray-600 leading-tight">{label}</h3>
          {subtitle && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-gray-400 italic mt-auto">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            {isCount ? (
              <span className={`text-3xl font-bold ${c.iconText}`}>{count}</span>
            ) : (
              <>
                <span className={`text-3xl font-bold ${c.iconText}`}>{pourcentage}%</span>
                <span className="text-xs text-gray-500">
                  {count}/{total}
                </span>
              </>
            )}
          </div>

          {showProgress && !isCount && (
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${c.bar} transition-all`}
                style={{ width: `${pourcentage}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}