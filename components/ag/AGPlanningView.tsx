// components/ag/AGPlanningView.tsx
'use client';

import { useEffect, useState } from 'react';

interface PlanningItem {
  id: string;
  groupe_nom: string;
  type_communication: string;
  temps_demande: number;
  resume: string;
  heure_debut: string;
  heure_fin: string;
  temps_ajuste: number;
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
    }, 60000); // Toutes les minutes
    return () => clearInterval(timer);
  }, []);

  // Recalculer le planning quand les données changent
  useEffect(() => {
    if (!config || communications.length === 0) return;

    // Calculer le ratio temps disponible / temps demandé
    const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
    const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
    const tempsDispoReel = tempsDispo - pausesTotal;
    
    const tempsDemandeTotal = communications.reduce((acc, c) => acc + c.temps_demande, 0);
    const ratio = tempsDispoReel / tempsDemandeTotal;

    // Calculer le planning avec les heures ajustées
    const newPlanning: PlanningItem[] = [];
    let currentTimeMinutes = heureToMinutes(config.heure_debut);

    // Trier les communications par ordre (si ordre défini) ou par groupe
    const sortedComms = [...communications].sort((a, b) => {
      if (a.ordre && b.ordre) return a.ordre - b.ordre;
      return a.groupe_nom.localeCompare(b.groupe_nom);
    });

    for (let i = 0; i < sortedComms.length; i++) {
      const comm = sortedComms[i];
      
      // Vérifier si une pause est prévue avant cette intervention
      const pauseAvant = pauses.find(p => p.position === i);
      if (pauseAvant) {
        currentTimeMinutes += pauseAvant.duree;
      }

      const debut = currentTimeMinutes;
      // Appliquer le ratio au temps demandé
      const tempsAjuste = Math.round(comm.temps_demande * ratio);
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
  }, [config, communications, pauses, currentTime]); // Recalcul à chaque minute

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

  // Couleur de fond selon la progression
  const getBackgroundColor = (debutMinutes: number, finMinutes: number) => {
    const progress = getProgressPercentage(debutMinutes, finMinutes);
    
    if (progress === 0) return 'bg-white';
    if (progress < 50) return 'bg-green-50';
    if (progress < 80) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  // Couleur de la barre de progression
  const getProgressBarColor = (progress: number) => {
    if (progress < 50) return 'bg-green-500';
    if (progress < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'information':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">Info</span>;
      case 'consultation':
        return <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">Consultation</span>;
      case 'decision':
        return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">Décision</span>;
      default:
        return null;
    }
  };

  // Afficher le ratio
  const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
  const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
  const tempsDemandeTotal = communications.reduce((acc, c) => acc + c.temps_demande, 0);
  const ratio = (tempsDispo - pausesTotal) / tempsDemandeTotal;
  const ratioPercent = Math.round(ratio * 100);

  return (
    <div className="space-y-4">
      {/* En-tête avec horaires et ratio */}
      <div className="flex items-center justify-between text-sm border-b border-gray-200 pb-3">
        <div className="font-medium text-gray-700">
          {new Date(config.date_ag).toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">Début: {config.heure_debut}</span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-600">Fin: {config.heure_fin}</span>
          {ratio !== 1 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Ratio: {ratioPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Timeline compacte */}
      <div className="space-y-2">
        {planning.map((item, index) => {
          const progress = getProgressPercentage(item.debutMinutes, item.finMinutes);
          const bgColor = getBackgroundColor(item.debutMinutes, item.finMinutes);
          
          return (
            <div key={item.id} className="relative">
              {/* Ligne de temps verticale pour le contexte */}
              <div className="absolute left-16 top-0 bottom-0 w-px bg-gray-200"></div>
              
              {/* Intervention */}
              <div className={`relative ml-20 p-3 rounded-lg border border-gray-200 ${bgColor} transition-colors`}>
                {/* Barre de progression */}
                {progress > 0 && progress < 100 && (
                  <div 
                    className={`absolute left-0 top-0 bottom-0 rounded-l-lg ${getProgressBarColor(progress)} opacity-20`}
                    style={{ width: `${progress}%` }}
                  ></div>
                )}
                
                {/* Contenu */}
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono text-gray-400 w-12">
                        {item.heure_debut}
                      </span>
                      <h4 className="font-medium text-gray-900">
                        {item.groupe_nom}
                      </h4>
                      <div className="flex-shrink-0">
                        {getTypeBadge(item.type_communication)}
                      </div>
                      <span className="text-xs text-gray-400">
                        {item.temps_ajuste || item.temps_demande}min
                        {item.temps_ajuste && item.temps_ajuste !== item.temps_demande && (
                          <span className="text-gray-300 ml-1">
                            (demandé: {item.temps_demande}min)
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {item.resume && (
                      <p className="text-sm text-gray-600 mt-1 ml-[60px] line-clamp-2">
                        {item.resume}
                      </p>
                    )}
                  </div>
                  
                  {/* Heure de fin (petite) */}
                  <span className="text-xs text-gray-400">
                    {item.heure_fin}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pauses */}
      {pauses.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
            Pauses
          </h4>
          <div className="space-y-2 ml-20">
            {pauses.map((pause, index) => {
              // Trouver avant quelle intervention placer la pause
              const heurePause = pause.heure_debut;
              
              return (
                <div key={pause.id} className="flex items-center text-sm py-1 px-3 bg-purple-50 rounded-lg">
                  <span className="text-xs font-mono text-purple-400 w-12">
                    {pause.heure_debut}
                  </span>
                  <span className="text-purple-600 font-medium">Pause {index + 1}</span>
                  <span className="text-xs text-purple-400 ml-2">{pause.duree} min</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center space-x-4">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-green-100 rounded mr-1"></span>
          <span>&lt;50%</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-yellow-100 rounded mr-1"></span>
          <span>50-80%</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-red-100 rounded mr-1"></span>
          <span>&gt;80%</span>
        </div>
      </div>
    </div>
  );
}

// Fonctions utilitaires
function heureToMinutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
