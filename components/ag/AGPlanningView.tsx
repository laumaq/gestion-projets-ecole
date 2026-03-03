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
}

interface AGPlanningViewProps {
  config: any;
  communications: any[];
  pauses: any[];
}

export default function AGPlanningView({ config, communications, pauses }: AGPlanningViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [planning, setPlanning] = useState<PlanningItem[]>([]);

  // Mettre à jour l'heure toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      console.log('Mise à jour du planning:', new Date().toLocaleTimeString()); // Debug
    }, 60000); // Toutes les minutes
    
    return () => clearInterval(timer);
  }, []);

  // Recalculer le planning quand les données changent
  useEffect(() => {
    if (!config || communications.length === 0) {
      setPlanning([]);
      return;
    }

    console.log('Recalcul du planning avec', communications.length, 'communications');

    // Calculer le ratio temps disponible / temps demandé
    const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
    const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
    const tempsDispoReel = tempsDispo - pausesTotal;
    
    const tempsDemandeTotal = communications.reduce((acc, c) => acc + c.temps_demande, 0);
    const ratio = tempsDemandeTotal > 0 ? tempsDispoReel / tempsDemandeTotal : 1;

    console.log('Ratio calculé:', ratio, 'Temps dispo:', tempsDispoReel, 'Demandé:', tempsDemandeTotal);

    // Calculer le planning avec les heures ajustées
    const newPlanning: PlanningItem[] = [];
    let currentTimeMinutes = heureToMinutes(config.heure_debut);

    // Trier les communications par ordre (si ordre défini) ou par groupe
    const sortedComms = [...communications].sort((a, b) => {
      if (a.ordre && b.ordre) return a.ordre - b.ordre;
      return a.groupe_nom.localeCompare(b.groupe_nom);
    });

    // Créer un tableau de pauses triées par heure
    const sortedPauses = [...pauses].sort((a, b) => 
      heureToMinutes(a.heure_debut) - heureToMinutes(b.heure_debut)
    );
    let pauseIndex = 0;

    for (let i = 0; i < sortedComms.length; i++) {
      const comm = sortedComms[i];
      
      // Vérifier s'il y a une pause avant cette intervention
      while (pauseIndex < sortedPauses.length && 
             heureToMinutes(sortedPauses[pauseIndex].heure_debut) <= currentTimeMinutes) {
        currentTimeMinutes += sortedPauses[pauseIndex].duree;
        pauseIndex++;
      }

      const debut = currentTimeMinutes;
      // Appliquer le ratio au temps demandé
      const tempsAjuste = Math.max(1, Math.round(comm.temps_demande * ratio));
      const fin = currentTimeMinutes + tempsAjuste;
      
      newPlanning.push({
        id: comm.id,
        groupe_nom: comm.groupe_nom,
        type_communication: comm.type_communication,
        temps_demande: comm.temps_demande,
        temps_ajuste: tempsAjuste,
        resume: comm.resume,
        heure_debut: minutesToHeure(debut),
        heure_fin: minutesToHeure(fin),
        debutMinutes: debut,
        finMinutes: fin,
        ordre: comm.ordre
      });
      
      currentTimeMinutes = fin;
    }

    setPlanning(newPlanning);
  }, [config, communications, pauses, currentTime]); // Dépend de currentTime pour le rafraîchissement

  if (!config) {
    return <p className="text-gray-500">Aucune configuration AG</p>;
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune communication n'a encore été enregistrée.</p>
      </div>
    );
  }

  // Calculer le pourcentage de progression pour une intervention
  const getProgressPercentage = (debutMinutes: number, finMinutes: number) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    if (now < debutMinutes) return 0;
    if (now > finMinutes) return 100;
    
    return ((now - debutMinutes) / (finMinutes - debutMinutes)) * 100;
  };

  // ... reste du composant identique
