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
  onEdit?: (item: PlanningItem) => void;
  onDelete?: (item: PlanningItem) => void;
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

  // 1. Calculer le planning compressé SANS pauses
  const planningSansPauses: PlanningItem[] = [];
  let currentMinutes = heureToMinutes(config.heure_debut);
  
  for (const intervention of sortedInterventions) {
    const tempsAjuste = Math.max(1, Math.round(intervention.temps_demande * ratio));
    const debut = currentMinutes;
    const fin = debut + tempsAjuste;
    
    planningSansPauses.push({
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
      heure_debut: minutesToHeure(debut),
      heure_fin: minutesToHeure(fin),
      debutMinutes: debut,
      finMinutes: fin
    });
    
    currentMinutes = fin;
  }
  
  // 2. Insérer les pauses au bon endroit
  const planningFinal: PlanningItem[] = [];
  const pausesTriees = [...pauses].sort((a, b) => 
    heureToMinutes(a.heure_debut) - heureToMinutes(b.heure_debut)
  );
  
  let pauseIndex = 0;
  
  for (let i = 0; i < planningSansPauses.length; i++) {
    const intervention = planningSansPauses[i];
    
    // Vérifier s'il y a une pause qui devrait avoir lieu avant cette intervention
    while (pauseIndex < pausesTriees.length) {
      const pause = pausesTriees[pauseIndex];
      const heurePause = heureToMinutes(pause.heure_debut);
      
      // Si l'heure de la pause est avant la fin de cette intervention
      if (heurePause < intervention.finMinutes) {
        // Insérer la pause MAINTENANT
        const debutPause = intervention.debutMinutes;
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
        
        // Décaler toutes les interventions suivantes
        for (let j = i; j < planningSansPauses.length; j++) {
          planningSansPauses[j].debutMinutes += pause.duree;
          planningSansPauses[j].finMinutes += pause.duree;
          planningSansPauses[j].heure_debut = minutesToHeure(planningSansPauses[j].debutMinutes);
          planningSansPauses[j].heure_fin = minutesToHeure(planningSansPauses[j].finMinutes);
        }
        
        pauseIndex++;
      } else {
        break;
      }
    }
    
    // Ajouter l'intervention courante
    planningFinal.push(intervention);
  }
  
  // Ajouter les pauses restantes à la fin
  while (pauseIndex < pausesTriees.length) {
    const pause = pausesTriees[pauseIndex];
    const debutPause = currentMinutes;
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
    
    currentMinutes = finPause;
    pauseIndex++;
  }
  
  setPlanning(planningFinal);
  }, [config, toutesInterventions, pauses, currentTime]);

  
  const handleDragEnd = async (result: any) => {
    if (!result.destination || !onReorder) return;
  
    // 1. Mise à jour OPTIMISTE de l'UI
    const items = Array.from(planning);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Sauvegarder l'état avant modification
    const previousPlanning = planning;
    
    // Mettre à jour l'UI immédiatement
    setPlanning(items);
  
    // 2. Préparer les données pour le backend
    const newOrder = items
      .filter(item => item.type !== 'pause')
      .map((item, index) => ({
        id: item.id,
        position: index + 1,
        type: item.type_intervention || 'gt'
      }));
  
    try {
      // 3. Envoyer au backend (en arrière-plan)
      await onReorder(newOrder);
    } catch (error) {
      // 4. En cas d'erreur, restaurer l'état précédent
      console.error('Erreur lors du réordonnancement:', error);
      setPlanning(previousPlanning);
    }
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
                                
                                <p 
                                  className={`text-sm text-gray-600 mt-1 ml-[60px] ${
                                    item.resume && item.resume.length > 100 
                                      ? 'line-clamp-2 hover:line-clamp-none hover:bg-white hover:shadow-lg hover:p-2 hover:rounded hover:absolute hover:z-10 hover:w-full hover:left-0 transition-all'
                                      : ''
                                  }`}
                                >
                                  {item.resume}
                                </p>

                                // Dans l'affichage de chaque intervention, après le résumé
                                {isEditable && item.type !== 'pause' && (
                                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.(item);
                                      }}
                                      className="p-1 bg-white rounded-md shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600"
                                      title="Modifier"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.(item);
                                      }}
                                      className="p-1 bg-white rounded-md shadow-sm border border-gray-200 text-gray-600 hover:text-red-600"
                                      title="Supprimer"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                                
                                // Ajouter group-hover sur l'élément parent
                                <div className={`relative ml-20 p-3 rounded-lg border ... group`}>
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
