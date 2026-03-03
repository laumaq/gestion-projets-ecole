// components/ag/AGPlanningView.tsx
'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
  titre?: string; 
  duree?: number;
  type_intervention?: 'gt' | 'libre'; // Pour distinguer GT et libre
}

interface AGPlanningViewProps {
  config: any;
  communications: any[];
  interventionsLibres: any[];
  pauses: any[];
  onReorder?: (newOrder: { id: string; type: 'gt' | 'libre' }[]) => void;
  isEditable?: boolean;
}

export default function AGPlanningView({ 
  config, 
  communications, 
  interventionsLibres,
  pauses, 
  onReorder,
  isEditable = false 
}: AGPlanningViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [planning, setPlanning] = useState<PlanningItem[]>([]);

  // Fusionner toutes les interventions (GT + libres)
  const toutesInterventions = [
    ...communications.map(c => ({ ...c, type: 'intervention', type_intervention: 'gt' as const })),
    ...interventionsLibres.map(i => ({ ...i, type: 'intervention', type_intervention: 'libre' as const }))
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!config || (communications.length === 0 && interventionsLibres.length === 0)) {
      setPlanning([]);
      return;
    }

    // Calculer le ratio
    const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
    const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
    const tempsDispoReel = tempsDispo - pausesTotal;
    
    const tempsDemandeTotal = [
      ...communications,
      ...interventionsLibres
    ].reduce((acc, c) => acc + c.temps_demande, 0);
    
    const ratio = tempsDemandeTotal > 0 ? tempsDispoReel / tempsDemandeTotal : 1;

    // Trier les interventions par ordre
    const sortedInterventions = [...toutesInterventions].sort((a, b) => {
      if (a.ordre && b.ordre) return a.ordre - b.ordre;
      if (a.ordre) return -1;
      if (b.ordre) return 1;
      return 0;
    });

    // Calculer les heures théoriques sans pauses
    const interventionsSansPauses: (PlanningItem & { debutTheorique: number; finTheorique: number })[] = [];
    let currentMinutes = heureToMinutes(config.heure_debut);
    
    for (const intervention of sortedInterventions) {
      const tempsAjuste = Math.max(1, Math.round(intervention.temps_demande * ratio));
      const debut = currentMinutes;
      const fin = debut + tempsAjuste;
      
      interventionsSansPauses.push({
        id: intervention.id,
        type: 'intervention',
        type_intervention: intervention.type_intervention,
        groupe_nom: intervention.type_intervention === 'gt' 
          ? intervention.groupe_nom 
          : `${intervention.employee_prenom} ${intervention.employee_nom}`,
        type_communication: intervention.type_communication,
        temps_demande: intervention.temps_demande,
        temps_ajuste: tempsAjuste,
        resume: intervention.resume,
        titre: intervention.titre,
        heure_debut: '',
        heure_fin: '',
        debutMinutes: 0,
        finMinutes: 0,
        debutTheorique: debut,
        finTheorique: fin
      });
      
      currentMinutes = fin;
    }

    // Construire le planning final en insérant les pauses
    const planningFinal: PlanningItem[] = [];
    let currentTimeMinutes = heureToMinutes(config.heure_debut);

    // Trier les pauses par heure
    const pausesTriees = [...pauses].sort((a, b) => 
      heureToMinutes(a.heure_debut) - heureToMinutes(b.heure_debut)
    );

    let pauseIndex = 0;
    let interIndex = 0;

    while (interIndex < interventionsSansPauses.length || pauseIndex < pausesTriees.length) {
      const prochainePause = pauseIndex < pausesTriees.length ? pausesTriees[pauseIndex] : null;
      const prochaineInter = interIndex < interventionsSansPauses.length ? interventionsSansPauses[interIndex] : null;
      
      // Si on a une pause et qu'elle devrait commencer maintenant
      if (prochainePause && heureToMinutes(prochainePause.heure_debut) <= currentTimeMinutes + 5) {
        // Insérer la pause
        const debutPause = currentTimeMinutes;
        const finPause = debutPause + prochainePause.duree;
        
        planningFinal.push({
          id: prochainePause.id,
          type: 'pause',
          groupe_nom: 'PAUSE',
          type_communication: 'pause',
          temps_demande: prochainePause.duree,
          temps_ajuste: prochainePause.duree,
          resume: '',
          heure_debut: minutesToHeure(debutPause),
          heure_fin: minutesToHeure(finPause),
          debutMinutes: debutPause,
          finMinutes: finPause,
          duree: prochainePause.duree
        });
        
        currentTimeMinutes = finPause;
        pauseIndex++;
      } 
      // Sinon, insérer l'intervention suivante
      else if (prochaineInter) {
        const debut = currentTimeMinutes;
        const fin = debut + prochaineInter.temps_ajuste;
        
        planningFinal.push({
          ...prochaineInter,
          heure_debut: minutesToHeure(debut),
          heure_fin: minutesToHeure(fin),
          debutMinutes: debut,
          finMinutes: fin
        });
        
        currentTimeMinutes = fin;
        interIndex++;
      } else {
        break;
      }
    }

    setPlanning(planningFinal);
  }, [config, toutesInterventions, pauses, currentTime]);

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return;

    const items = Array.from(planning);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Ne garder que les interventions et formater pour onReorder
    const newOrder = items
      .filter(item => item.type !== 'pause')
      .map(item => ({
        id: item.id,
        type: item.type_intervention || 'gt'
      }));
    
    onReorder(newOrder);
  };

  const getProgressPercentage = (debutMinutes: number, finMinutes: number) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    
    if (now < debutMinutes) return 0;
    if (now > finMinutes) return 100;
    
    return ((now - debutMinutes) / (finMinutes - debutMinutes)) * 100;
  };

  const getBackgroundColor = (debutMinutes: number, finMinutes: number, type: string) => {
    const progress = getProgressPercentage(debutMinutes, finMinutes);
    
    if (type === 'pause') {
      if (progress === 0) return 'bg-purple-50';
      if (progress < 50) return 'bg-purple-100';
      if (progress < 80) return 'bg-purple-200';
      return 'bg-purple-300';
    }
    
    if (progress === 0) return 'bg-white';
    if (progress < 50) return 'bg-green-50';
    if (progress < 80) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getProgressBarColor = (progress: number, type: string) => {
    if (type === 'pause') {
      if (progress < 50) return 'bg-purple-500';
      if (progress < 80) return 'bg-purple-600';
      return 'bg-purple-700';
    }
    if (progress < 50) return 'bg-green-500';
    if (progress < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTypeBadge = (type: string, typeCom?: string, typeIntervention?: string) => {
    if (type === 'pause') {
      return <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">Pause</span>;
    }
    
    if (typeIntervention === 'libre') {
      return <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">Libre</span>;
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

  if (communications.length === 0 && interventionsLibres.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune intervention n'a encore été enregistrée.</p>
      </div>
    );
  }

  const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
  const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
  const tempsDemandeTotal = [...communications, ...interventionsLibres].reduce((acc, c) => acc + c.temps_demande, 0);
  const ratio = (tempsDispo - pausesTotal) / tempsDemandeTotal;
  const ratioPercent = Math.round(ratio * 100);

  return (
    <div className="space-y-4">
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

      {isEditable ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="planning">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {planning.map((item, index) => {
                  const progress = getProgressPercentage(item.debutMinutes, item.finMinutes);
                  const bgColor = getBackgroundColor(item.debutMinutes, item.finMinutes, item.type);
                  
                  return (
                    <Draggable 
                      key={item.id} 
                      draggableId={item.id} 
                      index={index}
                      isDragDisabled={item.type === 'pause'} // Empêcher de draguer les pauses
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`relative ${snapshot.isDragging ? 'opacity-50' : ''}`}
                        >
                          <div className="absolute left-16 top-0 bottom-0 w-px bg-gray-200"></div>
                          
                          <div className={`relative ml-20 p-3 rounded-lg border ${
                            item.type === 'pause' ? 'border-purple-200' : 'border-gray-200'
                          } ${bgColor} transition-colors`}>
                            
                            {progress > 0 && progress < 100 && (
                              <div 
                                className={`absolute left-0 top-0 bottom-0 rounded-l-lg ${getProgressBarColor(progress, item.type)} opacity-20`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            )}
                            
                            <div className="relative flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs font-mono text-gray-400 w-12">
                                    {item.heure_debut}
                                  </span>
                                  
                                  {item.type === 'pause' ? (
                                    <>
                                      <h4 className="font-medium text-purple-600">PAUSE</h4>
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
                                        {getTypeBadge('intervention', item.type_communication, item.type_intervention)}
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
                              
                              <span className="text-xs text-gray-400">
                                {item.heure_fin}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="space-y-2">
          {planning.map((item) => {
            const progress = getProgressPercentage(item.debutMinutes, item.finMinutes);
            const bgColor = getBackgroundColor(item.debutMinutes, item.finMinutes, item.type);
            
            return (
              <div key={item.id} className="relative">
                <div className="absolute left-16 top-0 bottom-0 w-px bg-gray-200"></div>
                
                <div className={`relative ml-20 p-3 rounded-lg border ${
                  item.type === 'pause' ? 'border-purple-200' : 'border-gray-200'
                } ${bgColor} transition-colors`}>
                  
                  {progress > 0 && progress < 100 && (
                    <div 
                      className={`absolute left-0 top-0 bottom-0 rounded-l-lg ${getProgressBarColor(progress, item.type)} opacity-20`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  )}
                  
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-gray-400 w-12">
                          {item.heure_debut}
                        </span>
                        
                        {item.type === 'pause' ? (
                          <>
                            <h4 className="font-medium text-purple-600">PAUSE</h4>
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
                              {getTypeBadge('intervention', item.type_communication, item.type_intervention)}
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
                    
                    <span className="text-xs text-gray-400">{item.heure_fin}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        <div className="flex items-center">
          <span className="w-3 h-3 bg-orange-100 rounded mr-1"></span>
          <span>Libre</span>
        </div>
      </div>
    </div>
  );
}

function heureToMinutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
