// app/tools/mon-horaire/components/VueJour.tsx
'use client';

import type { Cours } from '../types';
import { nomJourFr } from '../utils/dates';
import { coursDuJour, PX_PAR_HEURE } from '../utils/horaire';
import CoursCard from './CoursCard';
import { GrilleHeures, LignesHoraires } from './GrilleHeures';

interface VueJourProps {
  cours: Cours[];
  dateRef: Date;
  heureMin: number;
  heureMax: number;
  onCoursClick: (c: Cours) => void;
}

const LARGEUR_LABEL = 56;

export default function VueJour({
  cours,
  dateRef,
  heureMin,
  heureMax,
  onCoursClick,
}: VueJourProps) {
  const nomJour = nomJourFr(dateRef);
  const coursJour = coursDuJour(cours, nomJour);
  const hauteur = (heureMax - heureMin) * PX_PAR_HEURE;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <div className="flex" style={{ height: hauteur }}>
          <GrilleHeures heureMin={heureMin} heureMax={heureMax} widthLabel={LARGEUR_LABEL} />
          <div className="relative flex-1">
            <LignesHoraires heureMin={heureMin} heureMax={heureMax} />
            <div className="absolute inset-0">
              {coursJour.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Aucun cours ce jour-là.
                </div>
              ) : (
                coursJour.map((c) => (
                  <CoursCard
                    key={c.cours_id}
                    cours={c}
                    heureMinRef={heureMin}
                    onClick={() => onCoursClick(c)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}