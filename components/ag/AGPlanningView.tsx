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
  duree?: number;
}

interface AGPlanningViewProps {
  config: any;
  communications: any[];
  pauses: any[];
  interventionsLibres: any[];
  onReorder?: (newOrder: string[]) => void;
  isEditable?: boolean;
}

export default function AGPlanningView({ 
  config, 
  communications, 
  pauses, 
  onReorder,
  isEditable = false 
}: AGPlanningViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [planning, setPlanning] = useState<PlanningItem[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!config || communications.length === 0) {
      setPlanning([]);
      return;
    }

    const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
    const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
    const tempsDispoReel = tempsDispo - pausesTotal;
    
    const tempsDemandeTotal = communications.reduce((acc, c) => acc + c.temps_demande, 0);
    const ratio = tempsDemandeTotal > 0 ? tempsDispoReel / tempsDemandeTotal : 1;

    const sortedComms = [...communications].sort((a, b) => {
      if (a.ordre && b.ordre) return a.ordre - b.ordre;
      return a.groupe_nom.localeCompare(b.groupe_nom);
    });

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

    const pausesRestantes = [...pauses];
    const planningFinal: PlanningItem[] = [];
    let minutesEcoulees = heureToMinutes(config.heure_debut);
    
    for (let i = 0; i < interventionsSansPauses.length; i++) {
      const intervention = interventionsSansPauses[i];
      
      const pauseAvantIndex = pausesRestantes.findIndex(p => {
        const heurePause = heureToMinutes(p.heure_debut);
        return heurePause >= minutesEcoulees && 
               heurePause < intervention.debutMinutes + (intervention.temps_ajuste / 2);
      });

      if (pauseAvantIndex !== -1) {
        const pauseAvant = pausesRestantes[pauseAvantIndex];
        
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
        pausesRestantes.splice(pauseAvantIndex, 1);
      }

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

    for (const pause of pausesRestantes) {
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

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return;
  
    const items = Array.from(planning);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
  
    // Créer un tableau avec les IDs et les types
    const newOrder = items.map(item => ({
      id: item.id,
      type: item.type // 'gt' ou 'libre'
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

  const tempsDispo = heureToMinutes(config.heure_fin) - heureToMinutes(config.heure_debut);
  const pausesTotal = pauses.reduce((acc, p) => acc + p.duree, 0);
  const tempsDemandeTotal = communications.reduce((acc, c) => acc + c.temps_demande, 0);
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
                    <Draggable key={item.id} draggableId={item.id} index={index}>
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
                            <h4 className="font-medium text-gray-900">{item.groupe_nom}</h4>
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
