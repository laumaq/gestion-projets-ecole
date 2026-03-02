// components/ag/TimeCalculator.ts
interface Communication {
  id: string;
  temps_demande: number;
  groupe_nom: string;
  employee_nom: string;
}

interface Pause {
  duree: number;
  position?: number; // Optionnel, peut être placé automatiquement
}

interface PlanningResult {
  interventions: Array<{
    communication_id: string;
    temps_calcule: number;
    position: number;
    heure_debut: string;
    heure_fin: string;
  }>;
  pauses: Array<{
    duree: number;
    position: number;
    heure_debut: string;
    heure_fin: string;
  }>;
}

export function calculerPlanning(
  communications: Communication[],
  pauses: Pause[],
  heureDebut: string,
  heureFin: string
): PlanningResult {
  // 1. Calculer le temps total disponible en minutes
  const [debutH, debutM] = heureDebut.split(':').map(Number);
  const [finH, finM] = heureFin.split(':').map(Number);
  
  const debutTotal = debutH * 60 + debutM;
  const finTotal = finH * 60 + finM;
  const tempsDisponible = finTotal - debutTotal;
  
  // 2. Calculer le temps total demandé
  const tempsDemandeTotal = communications.reduce((sum, com) => sum + com.temps_demande, 0);
  
  // 3. Calculer le ratio
  const ratio = tempsDisponible / tempsDemandeTotal;
  
  // 4. Ajuster les temps des communications
  const interventions = communications.map((com, index) => ({
    communication_id: com.id,
    temps_calcule: Math.round(com.temps_demande * ratio),
    position: index + 1,
    heure_debut: '',
    heure_fin: ''
  }));
  
  // 5. Placer les interventions et les pauses
  let currentTime = debutTotal;
  const result: PlanningResult = {
    interventions: [],
    pauses: []
  };
  
  // Trier les interventions par position
  const sortedInterventions = [...interventions].sort((a, b) => a.position - b.position);
  
  // Créer un tableau mixte interventions + pauses
  const events: Array<{
    type: 'intervention' | 'pause';
    duree: number;
    position?: number;
    communication_id?: string;
  }> = [];
  
  // Insérer les interventions
  sortedInterventions.forEach((intervention, index) => {
    events.push({
      type: 'intervention',
      duree: intervention.temps_calcule,
      position: intervention.position,
      communication_id: intervention.communication_id
    });
    
    // Vérifier s'il y a une pause après cette intervention
    const pauseAfter = pauses.find(p => p.position === index + 1);
    if (pauseAfter) {
      events.push({
        type: 'pause',
        duree: pauseAfter.duree
      });
    }
  });
  
  // Calculer les heures pour chaque événement
  events.forEach(event => {
    const heureDebutStr = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;
    
    if (event.type === 'intervention') {
      result.interventions.push({
        communication_id: event.communication_id!,
        temps_calcule: event.duree,
        position: event.position!,
        heure_debut: heureDebutStr,
        heure_fin: ''
      });
    } else {
      result.pauses.push({
        duree: event.duree,
        position: result.interventions.length, // Après la dernière intervention
        heure_debut: heureDebutStr,
        heure_fin: ''
      });
    }
    
    currentTime += event.duree;
    
    // Mettre à jour l'heure de fin
    if (event.type === 'intervention') {
      const lastIntervention = result.interventions[result.interventions.length - 1];
      lastIntervention.heure_fin = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;
    } else {
      const lastPause = result.pauses[result.pauses.length - 1];
      lastPause.heure_fin = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;
    }
  });
  
  return result;
}
