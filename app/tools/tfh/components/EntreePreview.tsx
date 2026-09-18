// app/tools/tfh/coordination/components/EntreePreview.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface JournalEntry {
  type: string;
  titre: string;
  contenu: string;
  date: string;
}

interface EntreePreviewProps {
  journal: JournalEntry[] | null | undefined;
}

const TYPE_COLORS: Record<string, { dot: string; label: string }> = {
  'Objectif':    { dot: 'bg-blue-400',    label: 'Objectif' },
  'Déroulement': { dot: 'bg-green-400',   label: 'Déroulement' },
  'Réflexion':   { dot: 'bg-purple-400',  label: 'Réflexion' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '?';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function EntreePreview({ journal }: EntreePreviewProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const entries = journal || [];

  if (entries.length === 0) {
    return <span className="text-xs text-gray-400 italic">—</span>;
  }

  // Les 3 dernières, triées par date décroissante
  const last3 = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
    >
      <div className="flex items-center gap-1 cursor-pointer">
        {last3.map((e, idx) => {
          const color = TYPE_COLORS[e.type]?.dot || 'bg-gray-400';
          return (
            <span
              key={idx}
              className={`w-3 h-3 rounded-full ${color} border border-white shadow-sm`}
            />
          );
        })}
        {entries.length > 3 && (
          <span className="text-[10px] text-gray-400 ml-0.5">
            +{entries.length - 3}
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-40 top-full right-0 mt-2 w-72 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-xl">
          <div className="text-[10px] uppercase tracking-wide opacity-60 mb-2">
            3 dernières entrées
          </div>
          <div className="space-y-2">
            {last3.map((e, idx) => {
              const color = TYPE_COLORS[e.type]?.dot || 'bg-gray-400';
              return (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="font-semibold">{e.type}</span>
                    <span className="opacity-60 ml-auto text-[10px]">{formatDate(e.date)}</span>
                  </div>
                  {e.titre && (
                    <div className="font-medium truncate">{e.titre}</div>
                  )}
                  <div className="opacity-80 line-clamp-2 text-[11px]">
                    {e.contenu}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-full right-4 mb-1 border-4 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
}