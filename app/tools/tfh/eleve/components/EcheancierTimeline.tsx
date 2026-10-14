// app/tools/tfh/eleve/components/EcheancierTimeline.tsx
'use client';

import { useMemo } from 'react';
import { Calendar, Check, Circle, BookOpen, GraduationCap } from 'lucide-react';
import { Echeance } from '../hooks/useEcheancier';

interface EcheancierTimelineProps {
  echeances: Echeance[];
  /** Classes Tailwind BDD, ex: "bg-purple-100 text-purple-800 border-purple-200" */
  typeColor?: string;
}

function extractTailwindColor(colorClasses: string | undefined): string {
  if (!colorClasses) return 'violet';
  const match = colorClasses.match(/\bbg-([a-z]+)-\d+\b/);
  return match ? match[1] : 'violet';
}

function buildColorClasses(baseColor: string) {
  return {
    // Passées — pâles et grisées
    past: {
      cardBg: `bg-${baseColor}-50`,
      cardBorder: `border-${baseColor}-100`,
      text: `text-${baseColor}-400`,
      dateText: `text-${baseColor}-300`,
      dotBg: `bg-${baseColor}-200`,
      iconText: 'text-white',
      labelText: `text-${baseColor}-400`,
    },
    // Prochaine — fond pâle + bordure vive
    next: {
      cardBg: `bg-${baseColor}-50`,
      cardBorder: `border-${baseColor}-400`,
      text: `text-${baseColor}-900`,
      dateText: `text-${baseColor}-600`,
      dotBg: `bg-${baseColor}-500`,
      iconText: 'text-white',
      labelText: `text-${baseColor}-700`,
    },
    // Futures — fond pâle + texte coloré, sans bordure
    future: {
      cardBg: `bg-${baseColor}-50`,
      cardBorder: 'border-transparent',
      text: `text-${baseColor}-700`,
      dateText: `text-${baseColor}-500`,
      dotBg: `bg-${baseColor}-200`,
      iconText: `text-${baseColor}-600`,
      labelText: `text-${baseColor}-500`,
    },
  };
}

export default function EcheancierTimeline({
  echeances,
  typeColor,
}: EcheancierTimelineProps) {
  const baseColor = extractTailwindColor(typeColor);
  const colors = useMemo(() => buildColorClasses(baseColor), [baseColor]);

  const nextEcheanceId = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = echeances.find(e => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    });
    return upcoming?.id ?? null;
  }, [echeances]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isPast = (dateString: string) => {
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gray-200" aria-hidden />

      <ul className="space-y-3 relative">
        {echeances.map((echeance) => {
          const past = isPast(echeance.date);
          const isNext = echeance.id === nextEcheanceId;
          const c = past ? colors.past : isNext ? colors.next : colors.future;

          return (
            <li key={echeance.id} className="relative flex gap-4">
              {/* Pastille */}
              <div className="flex-shrink-0 relative z-10 pt-3">
                <div
                  className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${c.dotBg}`}
                >
                  {past ? (
                    <Check className={`w-4 h-4 ${c.iconText}`} />
                  ) : isNext ? (
                    <Calendar className={`w-4 h-4 ${c.iconText}`} />
                  ) : (
                    <Circle className={`w-3 h-3 ${c.iconText}`} />
                  )}
                </div>
              </div>

              {/* Carte */}
              <div
                className={`flex-1 rounded-xl p-4 transition-all ${c.cardBg} ${
                  past || isNext ? 'border-2 ' + c.cardBorder : c.cardBorder
                } ${past ? 'opacity-70' : isNext ? 'shadow-md' : ''}`}
              >
                {/* Badge source — uniquement journee/defense */}
                {echeance.source === 'journee' && (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-gray-500">
                    <BookOpen className="w-3 h-3" />
                    Journée de travail TFH
                  </div>
                )}
                {echeance.source === 'defense' && (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-gray-500">
                    <GraduationCap className="w-3 h-3" />
                    Défense TFH
                  </div>
                )}

                {/* Badge "Prochaine échéance" */}
                {isNext && (
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${c.labelText}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dotBg} animate-pulse`} />
                    Prochaine échéance
                  </div>
                )}

                <div className={`text-xs font-medium capitalize mb-1 ${c.dateText} ${past ? 'line-through decoration-1' : ''}`}>
                  {formatDate(echeance.date)}
                </div>

                <div className={`text-sm font-medium ${c.text} ${past ? 'line-through decoration-1' : ''}`}>
                  {echeance.description}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}