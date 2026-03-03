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
  type: 'intervention' | 'pause'; // Ajout du type
  duree?: number; // Pour les pauses
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
      console.log('Mise à jour du planning:', new Date().toLocaleTimeString());
    }, 60000);
    
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

    // Créer un tableau mixte d'événements (interventions + pauses)
    const events: PlanningItem[] = [];
    
    // Ajouter toutes les interventions avec leurs heures non ajustées pour l'instant
    const interventions = communications.map(c => ({
      ...c,
      type: 'intervention' as const,
      temps_original: c.temps_demande
    }));

    // Ajouter toutes les pauses
    const pausesEvents = pauses.map(p => ({
      id: p.id,
      type: 'pause' as const,
      groupe_nom: 'PAUSE',
      type_communication: 'pause',
      temps_demande: p.duree,
      temps_ajuste: p.duree, // Les pauses ne sont pas ajustées par le ratio
      resume: '',
      heure_debut: p.heure_debut,
      heure_fin: '', // Sera calculé
      debutMinutes: heureToMinutes(p.heure_debut),
      finMinutes: heureToMinutes(p.heure_debut) + p.duree,
      duree: p.duree
    }));

    // Fusionner et trier par heure de début
    const allEvents = [...interventions, ...pausesEvents].sort((a, b) => {
      const heureA = 'heure_debut' in a ? heureToMinutes(a.heure_debut) : a.debutMinutes;
      const heureB = 'heure_debut' in b ? heureToMinutes(b.heure_debut) : b.debutMinutes;
      return heureA - heureB;
    });

    // Recalculer les heures en tenant compte du ratio pour les interventions
    let currentTimeMinutes = heureToMinutes(config.heure_debut);
    const finalPlanning: PlanningItem[] = [];

    for (const event of allEvents) {
      if (event.type === 'pause') {
        // Les pauses restent à leur heure fixe
        const pauseTime = heureToMinutes(event.heure_debut);
        if (pauseTime > currentTimeMinutes) {
          // S'il y a un trou avant la pause, on l'ignore (normalement pas)
          currentTimeMinutes = pauseTime;
        }
        
        const fin = pauseTime + event.duree!;
        finalPlanning.push({
          ...event,
          heure_debut: minutesToHeure(pauseTime),
          heure_fin: minutesToHeure(fin),
          debutMinutes: pauseTime,
          finMinutes: fin
        });
        
        currentTimeMinutes = fin;
      } else {
        // Les interventions sont ajustées et placées séquentiellement
        const debut = currentTimeMinutes;
        const tempsAjuste = Math.max(1, Math.round(event.temps_demande * ratio));
        const fin = debut + tempsAjuste;
        
        finalPlanning.push({
          ...event,
          temps_ajuste: tempsAjuste,
          heure_debut: minutesToHeure(debut),
          heure_fin: minutesToHeure(fin),
          debutMinutes: debut,
          finMinutes: fin
        });
        
        currentTimeMinutes = fin;
      }
    }

    setPlanning(finalPlanning);
  }, [config, communications, pauses, currentTime]);

  // Calculer le pourcentage de progression
  const getProgressPercentage = (debutMinutes: number, finMinutes: number) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    if (now < debutMinutes) return 0;
    if (now > finMinutes) return 100;
    
    return ((now - debutMinutes) / (finMinutes - debutMinutes)) * 100;
  };

  // Couleur de fond selon la progression
  const getBackgroundColor = (debutMinutes: number, finMinutes: number, type: string) => {
    if (type === 'pause') {
      return 'bg-purple-50'; // Couleur fixe pour les pauses
    }
    
    const progress = getProgressPercentage(debutMinutes, finMinutes);
    
    if (progress === 0) return 'bg-white';
    if (progress < 50) return 'bg-green-50';
    if (progress < 80) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  // Couleur de la barre de progression
  const getProgressBarColor = (progress: number, type: string) => {
    if (type === 'pause') return 'bg-purple-500';
    if (progress < 50) return 'bg-green-500';
    if (progress < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTypeBadge = (type: string, typeCom?: string) => {
    if (type === 'pause') {
      return <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">Pause</span>;
    }
    
    switch (typeCom) {
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

      {/* Timeline avec interventions ET pauses intégrées */}
      <div className="space-y-2">
        {planning.map((item) => {
          const progress = item.type !== 'pause' ? getProgressPercentage(item.debutMinutes, item.finMinutes) : 0;
          const bgColor = getBackgroundColor(item.debutMinutes, item.finMinutes, item.type);
          
          return (
            <div key={item.id} className="relative">
              {/* Ligne de temps verticale */}
              <div className="absolute left-16 top-0 bottom-0 w-px bg-gray-200"></div>
              
              {/* Événement (intervention ou pause) */}
              <div className={`relative ml-20 p-3 rounded-lg border ${
                item.type === 'pause' ? 'border-purple-200' : 'border-gray-200'
              } ${bgColor} transition-colors`}>
                
                {/* Barre de progression (sauf pour les pauses) */}
                {item.type !== 'pause' && progress > 0 && progress < 100 && (
                  <div 
                    className={`absolute left-0 top-0 bottom-0 rounded-l-lg ${getProgressBarColor(progress, item.type)} opacity-20`}
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
                      
                      {item.type === 'pause' ? (
                        <>
                          <h4 className="font-medium text-purple-600">
                            {item.groupe_nom}
                          </h4>
                          <div className="flex-shrink-0">
                            {getTypeBadge('pause')}
                          </div>
                          <span className="text-xs text-purple-400">
                            {item.duree}min
                          </span>
                        </>
                      ) : (
                        <>
                          <h4 className="font-medium text-gray-900">
                            {item.groupe_nom}
                          </h4>
                          <div className="flex-shrink-0">
                            {getTypeBadge('intervention', item.type_communication)}
                          </div>
                          <span className="text-xs text-gray-400">
                            {item.temps_ajuste}min
                            {item.temps_ajuste !== item.temps_demande && (
                              <span className="text-gray-300 ml-1">
                                (demandé: {item.temps_demande}min)
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {item.type !== 'pause' && item.resume && (
                      <p className="text-sm text-gray-600 mt-1 ml-[60px] line-clamp-2">
                        {item.resume}
                      </p>
                    )}
                  </div>
                  
                  {/* Heure de fin */}
                  <span className="text-xs text-gray-400">
                    {item.heure_fin}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
        <div className="flex items-center">
          <span className="w-3 h-3 bg-purple-100 rounded mr-1"></span>
          <span>Pause</span>
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
