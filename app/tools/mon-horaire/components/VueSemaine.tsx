// app/tools/mon-horaire/components/VueSemaine.tsx
'use client';

import type { Cours } from '../types';
import { joursOuvresDeLaSemaine, formatJourCourt, nomJourFr, memeJour } from '../utils/dates';
import { coursDuJour, PX_PAR_HEURE } from '../utils/horaire';
import CoursCard from './CoursCard';
import { GrilleHeures, LignesHoraires } from './GrilleHeures';

interface VueSemaineProps {
  cours: Cours[];
  dateRef: Date;
  heureMin: number;
  heureMax: number;
  onCoursClick: (c: Cours) => void;
}

const LARGEUR_LABEL = 56;

export default function VueSemaine({
  cours,
  dateRef,
  heureMin,
  heureMax,
  onCoursClick,
}: VueSemaineProps) {
  const jours = joursOuvresDeLaSemaine(dateRef);
  const aujourdhui = new Date();
  const hauteur = (heureMax - heureMin) * PX_PAR_HEURE;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* En-tête des jours */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <div className="flex-shrink-0" style={{ width: LARGEUR_LABEL }} />
        {jours.map((j) => {
          const estAujourdhui = memeJour(j, aujourdhui);
          return (
            <div
              key={j.toISOString()}
              className={`flex-1 px-2 py-2 text-center text-sm font-medium border-l border-gray-200 ${
                estAujourdhui ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
              }`}
            >
              {formatJourCourt(j)}
            </div>
          );
        })}
      </div>

      {/* Grille scrollable */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <div className="flex" style={{ height: hauteur }}>
          <GrilleHeures heureMin={heureMin} heureMax={heureMax} widthLabel={LARGEUR_LABEL} />
          <div className="relative flex-1">
            <LignesHoraires heureMin={heureMin} heureMax={heureMax} />
            <div className="absolute inset-0 flex">
              {jours.map((j) => {
                const nomJour = nomJourFr(j);
                const coursJour = coursDuJour(cours, nomJour);
                const estAujourdhui = memeJour(j, aujourdhui);
                return (
                  <div
                    key={j.toISOString()}
                    className={`relative flex-1 border-l border-gray-200 ${
                      estAujourdhui ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {coursJour.map((c) => (
                      <CoursCard
                        key={c.cours_id}
                        cours={c}
                        heureMinRef={heureMin}
                        compact
                        onClick={() => onCoursClick(c)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}