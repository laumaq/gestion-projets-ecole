// app/tools/tfh/coordination/components/EntreePreview.tsx
'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

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

// Dimensions estimées du tooltip pour le positionnement
const TOOLTIP_WIDTH = 320;   // w-80
const TOOLTIP_HEIGHT_EST = 240; // Estimation
const TOOLTIP_MARGIN = 8;

export default function EntreePreview({ journal }: EntreePreviewProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcul de la position au moment de l'ouverture + sur scroll/resize
  const computePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Est-ce qu'il y a la place en dessous ?
    const placeBelow = rect.bottom + TOOLTIP_HEIGHT_EST + TOOLTIP_MARGIN <= viewportHeight;
    const placement: 'top' | 'bottom' = placeBelow ? 'bottom' : 'top';

    // Position verticale
    const top = placement === 'bottom'
      ? rect.bottom + TOOLTIP_MARGIN
      : rect.top - TOOLTIP_HEIGHT_EST - TOOLTIP_MARGIN;

    // Position horizontale : aligné à droite du trigger, mais clampé dans le viewport
    let left = rect.right - TOOLTIP_WIDTH;
    if (left < TOOLTIP_MARGIN) left = TOOLTIP_MARGIN;
    if (left + TOOLTIP_WIDTH > viewportWidth - TOOLTIP_MARGIN) {
      left = viewportWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
    }

    setCoords({ top, left, placement });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();

    const onScrollOrResize = () => computePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
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

  const tooltipContent = (
    <div
      className="fixed z-[100] w-80 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-xl pointer-events-none"
      style={{
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
      }}
    >
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

      {/* Flèche */}
      {coords && (
        <div
          className={`absolute border-4 border-transparent ${
            coords.placement === 'bottom'
              ? 'bottom-full right-4 border-b-gray-900'
              : 'top-full right-4 border-t-gray-900'
          }`}
        />
      )}
    </div>
  );

  return (
    <div
      ref={triggerRef}
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

      {open && mounted && createPortal(tooltipContent, document.body)}
    </div>
  );
}