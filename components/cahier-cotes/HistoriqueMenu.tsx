'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAnneesScolairesDisponibles } from '@/lib/cahier-cotes/constants';

interface HistoriqueMenuProps {
  anneeCourante: string;
  coursLogiqueId: string;   // ⭐ renommé
}

export function HistoriqueMenu({ anneeCourante, coursLogiqueId }: HistoriqueMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const annees = getAnneesScolairesDisponibles();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (annee: string) => {
    setIsOpen(false);
    router.push(`/tools/cahier-cotes/${coursLogiqueId}?annee=${annee}`);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm"
      >
        <span className="text-lg leading-none">☰</span>
        <span className="hidden sm:inline">Historique</span>
        <span className="text-xs text-gray-500">({anneeCourante})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-30">
          <div className="px-3 py-2 text-xs text-gray-500 border-b">Année scolaire</div>
          {annees.map(annee => (
            <button
              key={annee}
              onClick={() => handleSelect(annee)}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                annee === anneeCourante ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              {annee}
              {annee === anneeCourante && (
                <span className="ml-2 text-xs text-blue-600">• actuelle</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}