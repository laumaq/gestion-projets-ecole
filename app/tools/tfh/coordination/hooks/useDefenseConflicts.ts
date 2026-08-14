// hooks/useDefenseConflicts.ts
import { useMemo } from 'react';
import { Eleve, Guide, Externe } from '@/app/tools/tfh/coordination/types';

export function useDefenseConflicts(
  allEleves: Eleve[],
  guides: Guide[],
  externes: Externe[]
) {
  return useMemo(() => {
    const cache: Record<string, {
      occupiedGuideIds: Set<string>;
      occupiedExterneIds: Set<string>;
    }> = {};

    const elevesWithDefense = allEleves.filter(e => 
      e.date_defense?.trim() && e.heure_defense?.trim()
    );

    const slots = new Map<string, Eleve[]>();
    
    elevesWithDefense.forEach(e => {
      const key = `${e.date_defense}_${e.heure_defense}`;
      if (!slots.has(key)) {
        slots.set(key, []);
      }
      slots.get(key)!.push(e);
    });

    slots.forEach((eleves, slotKey) => {
      const [date, time] = slotKey.split('_');
      const timestamp = new Date(`${date}T${time}`).getTime();
      
      if (isNaN(timestamp)) return;

      const TIME_RANGE = 49 * 60 * 1000;
      const startRange = timestamp - TIME_RANGE;
      const endRange = timestamp + TIME_RANGE;

      const occupiedGuideIds = new Set<string>();
      const occupiedExterneIds = new Set<string>();

      // Comparer CHAQUE élève du créneau avec TOUS les autres élèves
      eleves.forEach(currentEleve => {
        elevesWithDefense.forEach(other => {
          if (currentEleve.student_matricule === other.student_matricule) return;

          const otherTimestamp = new Date(`${other.date_defense}T${other.heure_defense}`).getTime();
          if (isNaN(otherTimestamp)) return;
          
          const isConflict = otherTimestamp >= startRange && otherTimestamp <= endRange;
          
          if (isConflict) {
            if (other.guide_id) {
              occupiedGuideIds.add(other.guide_id);
            }
            
            if (other.lecteur_interne_id) {
              occupiedGuideIds.add(other.lecteur_interne_id);
            }
            
            if (other.lecteur_externe_id) {
              const externe = externes.find(e => e.lecteur_externe_id === other.lecteur_externe_id);
              if (externe) {
                occupiedExterneIds.add(externe.id);
              }
            }
            
            if (other.mediateur_id) {
              const externe = externes.find(e => e.mediateur_id === other.mediateur_id);
              if (externe) {
                occupiedExterneIds.add(externe.id);
              }
            }
          }
        });
      });

      cache[slotKey] = {
        occupiedGuideIds,
        occupiedExterneIds
      };
    });

    return cache;
  }, [allEleves, guides, externes]);
}