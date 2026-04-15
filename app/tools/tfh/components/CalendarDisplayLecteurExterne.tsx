// app/tools/tfh/components/CalendarDisplayLecteurExterne.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve } from '../coordination/types';

interface DefenseEvent {
  id: string;
  eleveId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  eleveNom: string;
  elevePrenom: string;
  guideNom: string;
  guidePrenom: string;
  lecteurInterneNom: string;
  lecteurInternePrenom: string;
  lecteurExterneNom: string;
  lecteurExternePrenom: string;
  mediateurNom: string;
  mediateurPrenom: string;
  categorie: string;
  problematique: string;
}

interface DayDefenses {
  date: string;
  displayDate: string;
  locations: string[];
  defenses: DefenseEvent[];
}

interface CalendarDisplayProps {
  eleves: Eleve[];
  selectedCategory: string;
  selectedDates: string[];
  selectedLocations: string[];
  onEventClick: (event: DefenseEvent) => void;
  selectedEventIds: string[];
  busyEventIds: string[];
  userLecteurExterneId: string;
  displaySettings?: {
    lecteur_externe_voir_eleves: boolean;
    lecteur_externe_voir_guides: boolean;
    lecteur_externe_voir_lecteurs_internes: boolean;
    lecteur_externe_voir_mediateurs: boolean;
  };
}

export default function CalendarDisplayLecteurExterne({ 
  eleves, 
  selectedCategory, 
  selectedDates, 
  selectedLocations,
  onEventClick,
  selectedEventIds,
  busyEventIds,
  userLecteurExterneId,
  displaySettings = {
    lecteur_externe_voir_eleves: true,
    lecteur_externe_voir_guides: true,
    lecteur_externe_voir_lecteurs_internes: true,
    lecteur_externe_voir_mediateurs: true,
  }
}: CalendarDisplayProps) {
  const [dayDefenses, setDayDefenses] = useState<DayDefenses[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const PIXELS_PER_HOUR = 300;

  const add50Minutes = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes + 50;
    
    if (newMinutes >= 60) {
      newHours += Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (categorie: string) => {
    const colors = [
      { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
      { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
      { bg: '#D1FAE5', border: '#34D399', text: '#065F46' },
      { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
      { bg: '#E0E7FF', border: '#A5B4FC', text: '#3730A3' },
      { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
      { bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E' },
      { bg: '#F3E8FF', border: '#D8B4FE', text: '#6B21A8' },
      { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
      { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
      { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
      { bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },
      { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
      { bg: '#CCFBF1', border: '#5EEAD4', text: '#0F766E' },
      { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E' },
      { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' },
      { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
      { bg: '#ECFCCB', border: '#BEF264', text: '#3F6212' },
      { bg: '#FAF5FF', border: '#E9D5FF', text: '#7C3AED' },
      { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
    ];
    
    if (!categorie || categorie === 'Non catégorisé') {
      return { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
    }
    
    const hash = categorie.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % colors.length;
    
    return colors[index];
  };

  const prepareCalendarData = () => {
    const defensesWithSchedule = eleves.filter(e => 
      e.date_defense && e.heure_defense
    );
    
    setIsProcessing(true);

    const defenseEvents: DefenseEvent[] = defensesWithSchedule.map(eleve => {
      const startTime = eleve.heure_defense!.substring(0, 5);
      
      return {
        id: String(eleve.student_matricule),
        eleveId: String(eleve.student_matricule),
        date: eleve.date_defense!,
        startTime: startTime,
        endTime: add50Minutes(startTime),
        location: eleve.localisation_defense || 'Non défini',
        eleveNom: eleve.nom,
        elevePrenom: eleve.prenom,
        guideNom: eleve.guide_nom || '-',
        guidePrenom: eleve.guide_prenom || '-',
        lecteurInterneNom: eleve.lecteur_interne_nom || '-',
        lecteurInternePrenom: eleve.lecteur_interne_prenom || '-',
        lecteurExterneNom: eleve.lecteur_externe_nom || '-',
        lecteurExternePrenom: eleve.lecteur_externe_prenom || '-',
        mediateurNom: eleve.mediateur_nom || '-',
        mediateurPrenom: eleve.mediateur_prenom || '-',
        categorie: eleve.categorie || 'Non catégorisé',
        problematique: eleve.problematique || ''
      };
    });
    
    let filteredDefenses = defenseEvents;
    
    if (selectedCategory !== 'toutes') {
      filteredDefenses = filteredDefenses.filter(d => d.categorie === selectedCategory);
    }
    
    if (selectedDates.length > 0) {
      filteredDefenses = filteredDefenses.filter(d => selectedDates.includes(d.date));
    }
    
    if (selectedLocations.length > 0) {
      filteredDefenses = filteredDefenses.filter(d => selectedLocations.includes(d.location));
    }
    
    const uniqueDates = Array.from(new Set(filteredDefenses.map(d => d.date))).sort();
    
    const daysData: DayDefenses[] = uniqueDates.map(date => {
      const dateDefenses = filteredDefenses.filter(d => d.date === date);
      const uniqueLocations = Array.from(new Set(dateDefenses.map(d => d.location)))
        .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
      
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }),
        locations: uniqueLocations,
        defenses: dateDefenses.sort((a, b) => a.startTime.localeCompare(b.startTime))
      };
    });
    
    setDayDefenses(daysData);
    setIsProcessing(false);
  };

  useEffect(() => {
    prepareCalendarData();
  }, [eleves, selectedCategory, selectedDates, selectedLocations]);

  const isEventSelected = (eventId: string) => {
    return selectedEventIds.includes(eventId);
  };

  const isEventBusy = (eventId: string) => {
    return busyEventIds.includes(eventId);
  };

  const isEventAssignedToCurrentUser = (event: DefenseEvent) => {
    const eleve = eleves.find(e => String(e.student_matricule) === event.eleveId);
    return eleve?.lecteur_externe_id === userLecteurExterneId;
  };

  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  const handleEventClick = (event: DefenseEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isEventBusy(event.eleveId) || isEventAssignedToCurrentUser(event)) {
      onEventClick(event);
    }
  };

  const formatProblematique = (problematique: string, maxLength: number = 200) => {
    if (!problematique || problematique.trim() === '') return '';
    
    if (problematique.length <= maxLength) return problematique;
    
    return problematique.substring(0, maxLength) + '...';
  };

  if (isProcessing) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Mise à jour du calendrier...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {dayDefenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Aucune défense ne correspond aux filtres sélectionnés</p>
        </div>
      ) : (
        dayDefenses.map(day => {
          const totalHours = 18 - 8;
          const totalHeight = totalHours * PIXELS_PER_HOUR;
          
          return (
            <div key={day.date} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  {day.displayDate}
                </h3>
                <p className="text-sm text-gray-600">
                  {day.defenses.length} {pluralize(day.defenses.length, 'défense', 'défenses')} •  
                  {day.locations.length} {pluralize(day.locations.length, 'local', 'locaux')}
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="flex border-t border-gray-200">
                    <div className="w-24 bg-gray-50"></div>
                    {day.locations.map(location => (
                      <div
                        key={`header-${location}`}
                        className="flex-1 min-w-[200px] px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b bg-gray-100"
                      >
                        {location}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex border-b border-gray-200">
                    <div className="w-24 bg-gray-50 border-r border-gray-200">
                      {Array.from({ length: totalHours }).map((_, i) => {
                        const hour = 8 + i;
                        return (
                          <div 
                            key={`hour-${hour}`} 
                            className="border-b border-gray-200"
                            style={{ height: `${PIXELS_PER_HOUR}px` }}
                          >
                            <div className="h-full flex items-center justify-center">
                              <div className="text-sm font-medium text-gray-700">
                                {hour}h00
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex-1 relative" style={{ height: `${totalHeight}px` }}>
                      {Array.from({ length: totalHours + 1 }).map((_, i) => (
                        <div
                          key={`line-${i}`}
                          className="absolute left-0 right-0 border-t border-gray-100"
                          style={{ top: `${i * PIXELS_PER_HOUR}px` }}
                        />
                      ))}
                      
                      <div className="absolute inset-0 flex">
                        {day.locations.map((location) => (
                          <div
                            key={`col-${location}`}
                            className="flex-1 border-r relative"
                            style={{ minWidth: '200px' }}
                          >
                            {day.defenses
                              .filter(defense => defense.location === location)
                              .map(defense => {
                                const [startHours, startMinutes] = defense.startTime.split(':').map(Number);
                                
                                const hoursFrom8 = startHours - 8;
                                const minutesFraction = startMinutes / 60;
                                const top = (hoursFrom8 + minutesFraction) * PIXELS_PER_HOUR;
                                
                                const DEFENSE_DURATION_MINUTES = 50;
                                const baseHeight = (DEFENSE_DURATION_MINUTES / 60) * PIXELS_PER_HOUR;
                                const isExpanded = expandedEventId === defense.id;
                                const height = isExpanded ? Math.max(baseHeight * 2, 150) : baseHeight;
                                
                                const color = getCategoryColor(defense.categorie);
                                const selected = isEventSelected(defense.eleveId);
                                const busy = isEventBusy(defense.eleveId);
                                const assignedToCurrentUser = isEventAssignedToCurrentUser(defense);
                                const clickable = !busy || assignedToCurrentUser;
                                
                                return (
                                  <div
                                    key={defense.id}
                                    className={`absolute left-1 right-1 rounded p-2 overflow-hidden border shadow-sm hover:shadow-md transition-all ${
                                      clickable ? 'cursor-pointer' : 'cursor-not-allowed'
                                    } ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${
                                      busy && !assignedToCurrentUser ? 'opacity-50' : ''
                                    }`}
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      backgroundColor: selected ? '#E0F2FE' : color.bg,
                                      borderColor: selected ? '#7DD3FC' : color.border,
                                      color: selected ? '#0C4A6E' : color.text,
                                      zIndex: 10,
                                      fontSize: '13px'
                                    }}
                                    onClick={(e) => handleEventClick(defense, e)}
                                  >
                                    <div className="font-bold mb-1 flex justify-between items-start">
                                      <span>{defense.startTime} - {defense.endTime}</span>
                                      <div className="flex gap-1">
                                        {selected && (
                                          <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded">✓</span>
                                        )}
                                        {busy && !assignedToCurrentUser && (
                                          <span className="text-xs bg-red-500 text-white px-1 py-0.5 rounded">Occupé</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-1 overflow-hidden h-full">
                                      {displaySettings.lecteur_externe_voir_eleves && (
                                        <div className="font-semibold">
                                          {defense.elevePrenom} {defense.eleveNom}
                                        </div>
                                      )}
                                      
                                      <div className="text-xs opacity-75 mt-1">
                                        {defense.categorie}
                                      </div>
                                      
                                      {defense.problematique && defense.problematique.trim() !== '' && (
                                        <div className="mt-1">
                                          <div className="text-xs opacity-90 whitespace-pre-wrap overflow-y-auto max-h-[100px]">
                                            {formatProblematique(defense.problematique, 200)}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {displaySettings.lecteur_externe_voir_guides && defense.guideNom !== '-' && (
                                        <div className="text-xs mt-1">
                                          <span className="font-medium">Guide:</span> {defense.guidePrenom} {defense.guideNom}
                                        </div>
                                      )}
                                      
                                      {displaySettings.lecteur_externe_voir_lecteurs_internes && defense.lecteurInterneNom !== '-' && (
                                        <div className="text-xs">
                                          <span className="font-medium">Lecteur interne:</span> {defense.lecteurInternePrenom} {defense.lecteurInterneNom}
                                        </div>
                                      )}
                                      
                                      {displaySettings.lecteur_externe_voir_mediateurs && defense.mediateurNom !== '-' && (
                                        <div className="text-xs">
                                          <span className="font-medium">Médiateur:</span> {defense.mediateurPrenom} {defense.mediateurNom}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}