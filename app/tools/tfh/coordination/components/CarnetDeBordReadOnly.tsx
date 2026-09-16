// app/tools/tfh/coordination/components/CarnetDeBordReadOnly.tsx
'use client';

import { useMemo } from 'react';
import { Target, ClipboardList, MessageSquare, Calendar } from 'lucide-react';

interface JournalEntry {
  type: string;
  titre: string;
  contenu: string;
  date: string;
}

interface CarnetDeBordReadOnlyProps {
  journal: JournalEntry[] | null | undefined;
  eleveNom: string;
  elevePrenom: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Target; color: string; label: string }> = {
  'Objectif':    { icon: Target,        color: 'bg-blue-50 text-blue-700 border-blue-200',     label: 'Objectif' },
  'Déroulement': { icon: ClipboardList, color: 'bg-green-50 text-green-700 border-green-200', label: 'Déroulement' },
  'Réflexion':   { icon: MessageSquare, color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Réflexion' },
};

export default function CarnetDeBordReadOnly({ journal, eleveNom, elevePrenom }: CarnetDeBordReadOnlyProps) {
  const groupedByMonth = useMemo(() => {
    if (!journal || journal.length === 0) return {};

    const sorted = [...journal].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sorted.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
      const date = new Date(entry.date);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const capitalized = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);

      if (!acc[capitalized]) acc[capitalized] = [];
      acc[capitalized].push(entry);
      return acc;
    }, {});
  }, [journal]);

  if (!journal || journal.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          Aucune entrée dans le carnet de bord de {elevePrenom} {eleveNom}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          Carnet de bord de {elevePrenom} {eleveNom}
        </h3>
        <span className="text-xs text-gray-500">
          {journal.length} entrée{journal.length > 1 ? 's' : ''}
        </span>
      </div>

      {Object.entries(groupedByMonth).map(([month, entries]) => (
        <div key={month} className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur py-1">
            {month}
          </h4>

          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG['Réflexion'];
              const Icon = config.icon;

              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${config.color}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] opacity-75">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  </div>

                  {entry.titre && (
                    <h5 className="text-sm font-semibold mb-1">{entry.titre}</h5>
                  )}

                  <p className="text-sm whitespace-pre-wrap leading-relaxed opacity-90">
                    {entry.contenu}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}