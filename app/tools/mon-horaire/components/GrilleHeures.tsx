// app/tools/mon-horaire/components/GrilleHeures.tsx
'use client';

import { PX_PAR_HEURE } from '../utils/horaire';

interface GrilleHeuresProps {
  heureMin: number;
  heureMax: number;
  /** largeur de la colonne des labels d'heure */
  widthLabel?: number;
}

/**
 * Colonne de gauche avec les labels d'heure + lignes horizontales.
 * Rendu dans un conteneur position:relative de hauteur (max-min)*PX_PAR_HEURE.
 */
export function GrilleHeures({
  heureMin,
  heureMax,
  widthLabel = 56,
}: GrilleHeuresProps) {
  const heures = Array.from(
    { length: heureMax - heureMin + 1 },
    (_, i) => heureMin + i
  );

  return (
    <div
      className="relative flex-shrink-0 border-r border-gray-200 bg-gray-50"
      style={{
        width: widthLabel,
        height: (heureMax - heureMin) * PX_PAR_HEURE,
      }}
    >
      {heures.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0"
          style={{ top: (h - heureMin) * PX_PAR_HEURE }}
        >
          {/* Label */}
          <span className="absolute -top-2 left-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-1">
            {h}h00
          </span>
          {/* Ligne heure pleine */}
          <div className="absolute left-0 right-0 border-t border-gray-200" />
          {/* Demi-heure (pointillés légers) */}
          {h < heureMax && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ top: PX_PAR_HEURE / 2 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Calque des lignes horizontales seules, à superposer à une zone de colonnes.
 * (Réutilisé dans VueSemaine et VueJour)
 */
export function LignesHoraires({
  heureMin,
  heureMax,
}: {
  heureMin: number;
  heureMax: number;
}) {
  const heures = Array.from(
    { length: heureMax - heureMin + 1 },
    (_, i) => heureMin + i
  );
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ height: (heureMax - heureMin) * PX_PAR_HEURE }}
    >
      {heures.map((h) => (
        <div key={h}>
          <div
            className="absolute left-0 right-0 border-t border-gray-200"
            style={{ top: (h - heureMin) * PX_PAR_HEURE }}
          />
          {h < heureMax && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ top: (h - heureMin) * PX_PAR_HEURE + PX_PAR_HEURE / 2 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}