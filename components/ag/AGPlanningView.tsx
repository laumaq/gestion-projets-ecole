// components/ag/AGPlanningView.tsx
'use client';

import { useEffect, useState } from 'react';

interface PlanningItem {
  id: string;
  groupe_nom: string;
  type_communication: string;
  temps_demande: number;
  temps_ajuste: number;
  resume: string;
  heure_debut: string;
  heure_fin: string;
  debutMinutes: number;
  finMinutes: number;
  ordre?: number;
  type: 'intervention' | 'pause';
  duree?: number;
}

interface AGPlanningViewProps {
  config: any;
  communications: any[];
  pauses: any[];
}

export default function AGPlanningView({ config, communications, pauses }: AGPlanningViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [planning, setPlanning] = useState<PlanningItem[]>([]);

  // Mettre à jour l'heure toutes les SECONDES
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recalculer le planning
  useEffect(() => {
    if (!config || communications.length === 0) {
      setPlanning([]);
      return;
    }

    // 1. Calculer le ratio
    const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
    const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
    const tempsDispoReel = tempsDispo - pausesTotal;
    
    const tempsDemandeTotal = communications.reduce((acc, c) => acc + c.temps_demande, 0);
    const ratio = tempsDemandeTotal > 0 ? tempsDispoReel / tempsDemandeTotal : 1;

    // 2. Trier les communications
    const sortedComms = [...communications].sort((a, b) => {
      if (a.ordre && b.ordre) return a.ordre - b.ordre;
      return a.groupe_nom.localeCompare(b.groupe_nom);
    });

    // 3. Calculer les heures des interventions sans pauses d'abord
    const interventionsSansPauses: PlanningItem[] = [];
    let currentMinutes = heureToMinutes(config.heure_debut);
    
    for (const comm of sortedComms) {
      const debut = currentMinutes;
      const tempsAjuste = Math.max(1, Math.round(comm.temps_demande * ratio));
      const fin = debut + tempsAjuste;
      
      interventionsSansPauses.push({
        id: comm.id,
        type: 'intervention',
        groupe_nom: comm.groupe_nom,
        type_communication: comm.type_communication,
        temps_demande: comm.temps_demande,
        temps_ajuste: tempsAjuste,
        resume: comm.resume,
        heure_debut: minutesToHeure(debut),
        heure_fin: minutesToHeure(fin),
        debutMinutes: debut,
        finMinutes: fin
      });
      
      currentMinutes = fin;
    }

    // 4. Maintenant, insérer les pauses au plus proche de leur heure idéale
    const planningFinal: PlanningItem[] = [];
    let minutesEcoulees = heureToMinutes(config.heure_debut);
    
    for (let i = 0; i < interventionsSansPauses.length; i++) {
      const intervention = interventionsSansPauses[i];
      
      // Chercher une pause qui devrait avoir lieu AVANT cette intervention
      const pauseAvant = pauses.find(p => {
        const heurePause = heureToMinutes(p.heure_debut);
        return heurePause >= minutesEcoulees && 
               heurePause < intervention.debutMinutes + (intervention.temps_ajuste / 2);
      });

      if (pauseAvant) {
        // Insérer la pause
        const debutPause = minutesEcoulees;
        const finPause = debutPause + pauseAvant.duree;
        
        planningFinal.push({
          id: pauseAvant.id,
          type: 'pause',
          groupe_nom: 'PAUSE',
          type_communication: 'pause',
          temps_demande: pauseAvant.duree,
          temps_ajuste: pauseAvant.duree,
          resume: '',
          heure_debut: minutesToHeure(debutPause),
          heure_fin: minutesToHeure(finPause),
          debutMinutes: debutPause,
          finMinutes: finPause,
          duree: pauseAvant.duree
        });
        
        minutesEcoulees = finPause;
        
        // Retirer la pause de la liste pour ne pas la traiter deux fois
        pauses = pauses.filter(p => p.id !== pauseAvant.id);
      }

      // Ajouter l'intervention
      const decalage = intervention.debutMinutes - minutesEcoulees;
      const debutIntervention = minutesEcoulees;
      const finIntervention = debutIntervention + intervention.temps_ajuste;
      
      planningFinal.push({
        ...intervention,
        heure_debut: minutesToHeure(debutIntervention),
        heure_fin: minutesToHeure(finIntervention),
        debutMinutes: debutIntervention,
        finMinutes: finIntervention
      });
      
      minutesEcoulees = finIntervention;
    }

    // 5. Ajouter les pauses restantes à la fin
    for (const pause of pauses) {
      const debutPause = minutesEcoulees;
      const finPause = debutPause + pause.duree;
      
      planningFinal.push({
        id: pause.id,
        type: 'pause',
        groupe_nom: 'PAUSE',
        type_communication: 'pause',
        temps_demande: pause.duree,
        temps_ajuste: pause.duree,
        resume: '',
        heure_debut: minutesToHeure(debutPause),
        heure_fin: minutesToHeure(finPause),
        debutMinutes: debutPause,
        finMinutes: finPause,
        duree: pause.duree
      });
      
      minutesEcoulees = finPause;
    }

    setPlanning(planningFinal);
  }, [config, communications, pauses, currentTime]);

  // ... le reste du composant (getProgressPercentage, getBackgroundColor, etc.) identique
