// app/tools/tfh/coordination/tabs/CalendrierTab.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CalendarDisplay from '@/app/tools/tfh/components/CalendarDisplay';
import ConflictDisplay from '../components/ConflictDisplay';
import { Eleve, DefenseEvent, Conflict, Guide, Externe } from '../types';
import { getCategoryColor } from '../utils/categoryUtils';
import jsPDF from 'jspdf';
import DefenseEditModal from '@/app/tools/tfh/components/DefenseEditModal';

interface CalendrierTabProps {
  eleves: Eleve[];
  guides: Guide[];
  externes: Externe[];
  categories: string[];
  onRefresh: () => void;
  onUpdate: (studentMatricule: number, field: string, value: string) => Promise<void>;
}

export default function CalendrierTab({
  eleves,
  guides,
  externes,
  categories,
  onRefresh,
  onUpdate,
}: CalendrierTabProps) {
  const allDates = useMemo(() => 
    Array.from(
      new Set(
        eleves
          .filter(e => e.date_defense)
          .map(e => e.date_defense!)
          .sort()
      )
    ), [eleves]);
  
  const allLocations = useMemo(() => 
    Array.from(
      new Set(
        eleves
          .filter(e => e.localisation_defense)
          .map(e => e.localisation_defense!)
          .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)))
      )
    ), [eleves]);

  const [selectedDates, setSelectedDates] = useState<string[]>(allDates);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(allLocations);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);
  
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  

  const getFilteredDefenses = () => {
    return eleves.filter(e => 
      e.date_defense && e.heure_defense && 
      (selectedDates.length === 0 || selectedDates.includes(e.date_defense!)) &&
      (selectedLocations.length === 0 || selectedLocations.includes(e.localisation_defense!)) &&
      (selectedCategories.length === 0 || selectedCategories.includes(e.categorie!))
    );
  };

  const generatePDFContent = (mode: 'full' | 'day-location') => {
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.backgroundColor = 'white';
    
    if (mode === 'full') {
      const calendarContent = calendarRef.current?.cloneNode(true) as HTMLElement;
      if (calendarContent) {
        calendarContent.querySelectorAll('button').forEach(btn => btn.remove());
        calendarContent.querySelectorAll('.animate-spin').forEach(el => el.remove());
        calendarContent.style.overflow = 'visible';
        container.appendChild(calendarContent);
      } else {
        container.innerHTML = '<p>Aucune donnée à afficher</p>';
      }
    } else {
      const defenses = getFilteredDefenses();
      const grouped: Record<string, Record<string, Eleve[]>> = {};
      
      defenses.forEach(defense => {
        const date = defense.date_defense!;
        const location = defense.localisation_defense || 'Non défini';
        if (!grouped[date]) grouped[date] = {};
        if (!grouped[date][location]) grouped[date][location] = [];
        grouped[date][location].push(defense);
      });
      
      const sortedDates = Object.keys(grouped).sort();
      
      for (const date of sortedDates) {
        const locations = grouped[date];
        const sortedLocations = Object.keys(locations).sort();
        
        for (const location of sortedLocations) {
          const dayDefenses = locations[location].sort((a, b) => 
            (a.heure_defense || '').localeCompare(b.heure_defense || '')
          );
          
          const pageDiv = document.createElement('div');
          pageDiv.style.pageBreakAfter = 'always';
          pageDiv.style.marginBottom = '20px';
          
          const header = document.createElement('div');
          header.style.textAlign = 'center';
          header.style.marginBottom = '20px';
          header.innerHTML = `
            <h2 style="margin: 0; color: #333;">${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            <p style="margin: 5px 0; color: #666;"><strong>Local :</strong> ${location}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Nombre de défenses :</strong> ${dayDefenses.length}</p>
          `;
          pageDiv.appendChild(header);
          
          const table = document.createElement('table');
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          table.style.marginBottom = '20px';
          
          const thead = document.createElement('thead');
          thead.innerHTML = `
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Horaire</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Élève</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Problématique</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Catégorie</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Guide</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lecteur interne</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lecteur externe</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Médiateur</th>
            </tr>
          `;
          table.appendChild(thead);
          
          const tbody = document.createElement('tbody');
          for (const defense of dayDefenses) {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${defense.heure_defense?.substring(0, 5) || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>${defense.prenom} ${defense.nom}</strong><br><small>${defense.classe}</small></td>
              <td style="border: 1px solid #ddd; padding: 8px; max-width: 300px;">${defense.problematique || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.categorie || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.guide_prenom || ''} ${defense.guide_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.lecteur_interne_prenom || ''} ${defense.lecteur_interne_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.lecteur_externe_prenom || ''} ${defense.lecteur_externe_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.mediateur_prenom || ''} ${defense.mediateur_nom || '-'}</td>
            `;
            tbody.appendChild(row);
          }
          table.appendChild(tbody);
          pageDiv.appendChild(table);
          
          container.appendChild(pageDiv);
        }
      }
      
      if (defenses.length === 0) {
        container.innerHTML = '<p style="text-align: center;">Aucune défense trouvée avec les filtres actuels.</p>';
      }
    }
    
    return container;
  };
  
  
  const handleExportByDayLocation = async () => {
    setIsExporting(true);
    setShowExportOptions(false);
    
    try {
      const defenses = getFilteredDefenses();
      
      if (defenses.length === 0) {
        alert('Aucune défense à exporter avec les filtres actuels.');
        setIsExporting(false);
        return;
      }
      
      const grouped: Record<string, Record<string, Eleve[]>> = {};
      
      defenses.forEach(defense => {
        const date = defense.date_defense!;
        const location = defense.localisation_defense || 'Non défini';
        if (!grouped[date]) grouped[date] = {};
        if (!grouped[date][location]) grouped[date][location] = [];
        grouped[date][location].push(defense);
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const colWidths = {
        horaire: 15,
        eleve: 28,
        problematique: 45,
        categorie: 20,
        guide: 18,
        lecteurInterne: 18,
        lecteurExterne: 18,
        mediateur: 18
      };
      
      let isFirstPage = true;
      const sortedDates = Object.keys(grouped).sort();
      
      for (const date of sortedDates) {
        const locations = grouped[date];
        const sortedLocations = Object.keys(locations).sort();
        
        for (const location of sortedLocations) {
          const dayDefenses = locations[location].sort((a, b) => 
            (a.heure_defense || '').localeCompare(b.heure_defense || '')
          );
          
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(new Date(date).toLocaleDateString('fr-FR', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }), 105, 15, { align: 'center' });
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Local : ${location}`, 105, 22, { align: 'center' });
          pdf.setFontSize(8);
          pdf.text(`${dayDefenses.length} défense(s)`, 105, 28, { align: 'center' });
          
          pdf.line(10, 32, 200, 32);
          
          let currentY = 38;
          const rowHeight = 8;
          
          pdf.setFillColor(230, 230, 230);
          pdf.rect(10, currentY, 190, rowHeight, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          
          let x = 10;
          pdf.text('Horaire', x + 1, currentY + 5);
          x += colWidths.horaire;
          pdf.text('Élève', x + 1, currentY + 5);
          x += colWidths.eleve;
          pdf.text('Problématique', x + 1, currentY + 5);
          x += colWidths.problematique;
          pdf.text('Cat.', x + 1, currentY + 5);
          x += colWidths.categorie;
          pdf.text('Guide', x + 1, currentY + 5);
          x += colWidths.guide;
          pdf.text('Int.', x + 1, currentY + 5);
          x += colWidths.lecteurInterne;
          pdf.text('Ext.', x + 1, currentY + 5);
          x += colWidths.lecteurExterne;
          pdf.text('Méd.', x + 1, currentY + 5);
          
          currentY += rowHeight;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          
          let rowIndex = 0;
          for (const defense of dayDefenses) {
            const eleveText = `${defense.prenom.substring(0, 10)} ${defense.nom.substring(0, 12)}\n${defense.classe}`;
            const eleveLines = pdf.splitTextToSize(eleveText, colWidths.eleve - 2);
            
            const problematique = (defense.problematique || '-').substring(0, 80);
            const probLines = pdf.splitTextToSize(problematique, colWidths.problematique - 2);
            
            const lineHeight = rowHeight * Math.max(1, eleveLines.length, probLines.length);
            
            if (currentY + lineHeight + 5 > 285) {
              pdf.addPage();
              currentY = 15;
              rowIndex = 0;
              
              pdf.setFillColor(230, 230, 230);
              pdf.rect(10, currentY, 190, rowHeight, 'F');
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(7);
              x = 10;
              pdf.text('Horaire', x + 1, currentY + 5);
              x += colWidths.horaire;
              pdf.text('Élève', x + 1, currentY + 5);
              x += colWidths.eleve;
              pdf.text('Problématique', x + 1, currentY + 5);
              x += colWidths.problematique;
              pdf.text('Cat.', x + 1, currentY + 5);
              x += colWidths.categorie;
              pdf.text('Guide', x + 1, currentY + 5);
              x += colWidths.guide;
              pdf.text('Int.', x + 1, currentY + 5);
              x += colWidths.lecteurInterne;
              pdf.text('Ext.', x + 1, currentY + 5);
              x += colWidths.lecteurExterne;
              pdf.text('Méd.', x + 1, currentY + 5);
              currentY += rowHeight;
              pdf.setFont('helvetica', 'normal');
            }
            
            if (rowIndex % 2 === 0) {
              pdf.setFillColor(245, 245, 245);
              pdf.rect(10, currentY, 190, lineHeight, 'F');
            }
            
            x = 10;
            pdf.text(defense.heure_defense?.substring(0, 5) || '-', x + 1, currentY + 4);
            x += colWidths.horaire;
            
            pdf.text(eleveLines, x + 1, currentY + 4);
            x += colWidths.eleve;
            
            pdf.text(probLines, x + 1, currentY + 4);
            x += colWidths.problematique;
            
            pdf.text((defense.categorie || '-').substring(0, 12), x + 1, currentY + 4);
            x += colWidths.categorie;
            
            pdf.text(`${defense.guide_prenom?.substring(0, 1) || ''} ${defense.guide_nom?.substring(0, 10) || '-'}`, x + 1, currentY + 4);
            x += colWidths.guide;
            
            pdf.text(`${defense.lecteur_interne_prenom?.substring(0, 1) || ''} ${defense.lecteur_interne_nom?.substring(0, 10) || '-'}`, x + 1, currentY + 4);
            x += colWidths.lecteurInterne;
            
            pdf.text(`${defense.lecteur_externe_prenom?.substring(0, 1) || ''} ${defense.lecteur_externe_nom?.substring(0, 10) || '-'}`, x + 1, currentY + 4);
            x += colWidths.lecteurExterne;
            
            pdf.text(`${defense.mediateur_prenom?.substring(0, 1) || ''} ${defense.mediateur_nom?.substring(0, 10) || '-'}`, x + 1, currentY + 4);
            
            currentY += lineHeight;
            rowIndex++;
          }
          
          pdf.line(10, currentY, 200, currentY);
        }
      }
      
      pdf.save(`calendrier_par_jour_local_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };
    
  const handleExportFull = async () => {
    setIsExporting(true);
    setShowExportOptions(false);
    
    try {
      const defenses = getFilteredDefenses();
      
      if (defenses.length === 0) {
        alert('Aucune défense à exporter avec les filtres actuels.');
        setIsExporting(false);
        return;
      }
      
      const groupedByDay: Record<string, Eleve[]> = {};
      defenses.forEach(defense => {
        const date = defense.date_defense!;
        if (!groupedByDay[date]) groupedByDay[date] = [];
        groupedByDay[date].push(defense);
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const colWidth = 52;
      
      const timeSlots = [
        { name: 'Matin (08h00 - 11h00)', startHour: 8, endHour: 11, startY: 28 },
        { name: 'Milieu de journée (11h00 - 13h55)', startHour: 11, endHour: 13.916, startY: 28 },
        { name: 'Après-midi (13h55 - 17h20)', startHour: 13.916, endHour: 17.333, startY: 28 }
      ];
      
      let isFirstPage = true;
      const sortedDates = Object.keys(groupedByDay).sort();
      
      for (const date of sortedDates) {
        const dayDefenses = groupedByDay[date];
        
        const locations = Array.from(new Set(dayDefenses.map(d => d.localisation_defense || 'Non défini'))).sort();
        
        for (const slot of timeSlots) {
          const slotDefenses = dayDefenses.filter(d => {
            const hour = parseFloat((d.heure_defense || '08:00').substring(0, 2));
            const minute = parseFloat((d.heure_defense || '08:00').substring(3, 5)) / 60;
            const time = hour + minute;
            return time >= slot.startHour && time < slot.endHour;
          });
          
          if (slotDefenses.length === 0 && slot !== timeSlots[1]) continue;
          
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;
          
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(new Date(date).toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }), pageWidth / 2, 12, { align: 'center' });
          
          pdf.setFontSize(9);
          pdf.text(slot.name, pageWidth / 2, 19, { align: 'center' });
          
          let startX = 35;
          let startY = slot.startY;
          const cellHeight = 48;
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Horaire', startX - 15, startY + 4);
          
          for (let i = 0; i < locations.length; i++) {
            const x = startX + i * colWidth;
            pdf.rect(x, startY, colWidth, 7, 'S');
            pdf.text(locations[i].substring(0, 25), x + 2, startY + 4.5);
          }
          
          startY += 7;
          
          const slotDuration = slot.endHour - slot.startHour;
          const totalHeight = slotDuration * cellHeight;
          
          for (let hour = Math.ceil(slot.startHour); hour <= Math.floor(slot.endHour); hour++) {
            const hourPos = (hour - slot.startHour) * cellHeight;
            const y = startY + hourPos;
            
            pdf.setLineWidth(0.3);
            pdf.line(startX - 15, y, startX + locations.length * colWidth, y);
            
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            
            let displayHour = `${hour}h00`;
            if (hour === 14) displayHour = '14h00';
            else if (hour === 17) displayHour = '17h00';
            pdf.text(displayHour, startX - 15, y + 3);
          }
          
          for (let i = 0; i <= locations.length; i++) {
            const x = startX + i * colWidth;
            pdf.line(x, startY - 7, x, startY + totalHeight);
          }
          
          for (const defense of slotDefenses) {
            const location = defense.localisation_defense || 'Non défini';
            const locIndex = locations.indexOf(location);
            if (locIndex === -1) continue;
            
            const [hours, minutes] = (defense.heure_defense || '08:00').split(':').map(Number);
            const timeInHours = hours + minutes / 60;
            const startYOffset = (timeInHours - slot.startHour) * cellHeight;
            const duration = 50;
            const height = (duration / 60) * cellHeight;
            
            const x = startX + locIndex * colWidth;
            const y = startY + startYOffset;
            
            const color = getCategoryColor(defense.categorie || '');
            
            pdf.setFillColor(parseInt(color.bg.slice(1, 3), 16), parseInt(color.bg.slice(3, 5), 16), parseInt(color.bg.slice(5, 7), 16));
            pdf.rect(x + 1, y + 1, colWidth - 2, Math.min(height - 1, totalHeight - startYOffset - 1), 'F');
            pdf.setDrawColor(parseInt(color.border.slice(1, 3), 16), parseInt(color.border.slice(3, 5), 16), parseInt(color.border.slice(5, 7), 16));
            pdf.rect(x + 1, y + 1, colWidth - 2, Math.min(height - 1, totalHeight - startYOffset - 1), 'S');
            
            pdf.setFontSize(6);
            pdf.setTextColor(0, 0, 0);
            
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${defense.heure_defense?.substring(0, 5)}`, x + 2, y + 3);
            
            pdf.setFont('helvetica', 'normal');
            let currentY = y + 7;
            const eleveText = `${defense.prenom} ${defense.nom}`;
            pdf.text(eleveText, x + 2, currentY);
            currentY += 4;
            
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(5);
            if (defense.problematique) {
              const probLines = pdf.splitTextToSize(defense.problematique.substring(0, 100), colWidth - 6);
              for (const line of probLines) {
                if (currentY + 3 > y + height - 12) break;
                pdf.text(line, x + 2, currentY);
                currentY += 3;
              }
            }
            currentY += 2;
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'normal');
            
            if (currentY + 2 < y + height - 8) {
              pdf.line(x + 2, currentY, x + colWidth - 4, currentY);
              currentY += 3;
            }
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('G:', x + 2, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${defense.guide_prenom?.substring(0, 1) || ''} ${defense.guide_nom?.substring(0, 10) || '-'}`, x + 8, currentY);
            currentY += 3.5;
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('LI:', x + 2, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${defense.lecteur_interne_prenom?.substring(0, 1) || ''} ${defense.lecteur_interne_nom?.substring(0, 10) || '-'}`, x + 10, currentY);
            currentY += 3.5;
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('LE:', x + 2, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${defense.lecteur_externe_prenom?.substring(0, 1) || ''} ${defense.lecteur_externe_nom?.substring(0, 10) || '-'}`, x + 10, currentY);
            currentY += 3.5;
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('M:', x + 2, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${defense.mediateur_prenom?.substring(0, 1) || ''} ${defense.mediateur_nom?.substring(0, 10) || '-'}`, x + 7, currentY);
            currentY += 3.5;
          }
        }
      }
      
      pdf.save(`calendrier_visuel_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'export: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleEventClick = (event: DefenseEvent) => {
    const eleve = eleves.find(e => String(e.student_matricule) === event.eleveId);
    if (eleve) {
      setSelectedEleve(eleve);
      setIsModalOpen(true);
    }
  };
  
  const handleSaveDefense = async (studentMatricule: number, updates: Partial<Eleve>) => {
    const updatePromises = Object.entries(updates).map(([field, value]) => {
      if (value !== undefined) {
        const stringValue = value === null || value === '' ? '' : String(value);
        return onUpdate(studentMatricule, field, stringValue);
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);
  };
  
  const detectConflicts = useCallback((defenses: DefenseEvent[]): Conflict[] => {
    const conflicts: Conflict[] = [];
    
    const defensesByDate = defenses.reduce((acc, defense) => {
      const key = `${defense.date}-${defense.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(defense);
      return acc;
    }, {} as Record<string, DefenseEvent[]>);
    
    const hasOverlap = (d1: DefenseEvent, d2: DefenseEvent): boolean => {
      if (d1.date !== d2.date) return false;
      
      const toMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const start1 = toMinutes(d1.startTime);
      const end1 = toMinutes(d1.endTime);
      const start2 = toMinutes(d2.startTime);
      const end2 = toMinutes(d2.endTime);
      
      return (start1 < end2 && start2 < end1);
    };
    
    const personDefensesMap = new Map<string, DefenseEvent[]>();
    
    defenses.forEach(defense => {
      const guideKey = `${defense.guidePrenom} ${defense.guideNom}`;
      if (guideKey.trim() !== '- -' && guideKey.trim()) {
        if (!personDefensesMap.has(guideKey)) {
          personDefensesMap.set(guideKey, []);
        }
        personDefensesMap.get(guideKey)!.push({
          ...defense,
          role: 'guide' as const
        });
      }
      
      const lecteurInterneKey = `${defense.lecteurInternePrenom} ${defense.lecteurInterneNom}`;
      if (lecteurInterneKey.trim() !== '- -' && lecteurInterneKey.trim() && lecteurInterneKey !== guideKey) {
        if (!personDefensesMap.has(lecteurInterneKey)) {
          personDefensesMap.set(lecteurInterneKey, []);
        }
        personDefensesMap.get(lecteurInterneKey)!.push({
          ...defense,
          role: 'lecteur_interne' as const
        });
      }
    });
    
    personDefensesMap.forEach((personDefenses, person) => {
      if (personDefenses.length < 2) return;
      
      personDefenses.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      
      for (let i = 0; i < personDefenses.length; i++) {
        const current = personDefenses[i];
        const overlapping: DefenseEvent[] = [current];
        
        for (let j = i + 1; j < personDefenses.length; j++) {
          const next = personDefenses[j];
          
          if (hasOverlap(current, next)) {
            overlapping.push(next);
          } else {
            break;
          }
        }
        
        if (overlapping.length >= 2) {
          const types = overlapping.map(d => {
            const isGuide = `${d.guidePrenom} ${d.guideNom}` === person;
            const isLecteurInterne = `${d.lecteurInternePrenom} ${d.lecteurInterneNom}` === person;
            
            if (isGuide && isLecteurInterne) return 'guide_et_lecteur_interne';
            if (isGuide) return 'guide';
            if (isLecteurInterne) return 'lecteur_interne';
            return 'autre';
          });
          
          let message = '';
          if (types.includes('guide') && types.includes('lecteur_interne')) {
            message = `🧑‍🏫📖 ${person} (guide & lecteur interne) a ${overlapping.length} TFH qui se chevauchent`;
          } else if (types.includes('guide')) {
            message = `🧑‍🏫 Guide ${person} a ${overlapping.length} TFH qui se chevauchent`;
          } else if (types.includes('lecteur_interne')) {
            message = `📖 Lecteur interne ${person} a ${overlapping.length} TFH qui se chevauchent`;
          } else {
            message = `${person} a ${overlapping.length} TFH qui se chevauchent`;
          }
          
          const existingConflict = conflicts.find(c => 
            c.personOrLocation === person &&
            c.conflictingDefenses.length === overlapping.length &&
            c.conflictingDefenses.every(d => overlapping.includes(d))
          );
          
          if (!existingConflict) {
            conflicts.push({
              type: 'guide',
              personOrLocation: person,
              conflictingDefenses: [...overlapping],
              message
            });
            
            i += overlapping.length - 1;
          }
        }
      }
    });
    
    const localDefensesMap = new Map<string, DefenseEvent[]>();
    
    defenses.forEach(defense => {
      if (defense.location && defense.location !== 'Non défini') {
        if (!localDefensesMap.has(defense.location)) {
          localDefensesMap.set(defense.location, []);
        }
        localDefensesMap.get(defense.location)!.push(defense);
      }
    });
    
    localDefensesMap.forEach((localDefenses, location) => {
      if (localDefenses.length < 2) return;
      
      localDefenses.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      
      for (let i = 0; i < localDefenses.length; i++) {
        const current = localDefenses[i];
        const overlapping: DefenseEvent[] = [current];
        
        for (let j = i + 1; j < localDefenses.length; j++) {
          const next = localDefenses[j];
          
          if (hasOverlap(current, next)) {
            overlapping.push(next);
          } else {
            break;
          }
        }
        
        if (overlapping.length >= 2) {
          const existingConflict = conflicts.find(c => 
            c.type === 'local' && 
            c.personOrLocation === location &&
            c.conflictingDefenses.length === overlapping.length &&
            c.conflictingDefenses.every(d => overlapping.includes(d))
          );
          
          if (!existingConflict) {
            conflicts.push({
              type: 'local',
              personOrLocation: location,
              conflictingDefenses: [...overlapping],
              message: `📍 Local "${location}" utilisé pour ${overlapping.length} TFH simultanément`
            });
            
            i += overlapping.length - 1;
          }
        }
      }
    });
    
    return conflicts.sort((a, b) => b.conflictingDefenses.length - a.conflictingDefenses.length);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    
    setTimeout(() => {
      const detectedConflicts = detectConflicts([]);
      setConflicts(detectedConflicts);
      setIsLoading(false);
    }, 500);
  }, [selectedDates, selectedLocations, selectedCategories, detectConflicts]);

  const toggleAllDates = () => {
    if (selectedDates.length === allDates.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates([...allDates]);
    }
  };

  const toggleAllLocations = () => {
    if (selectedLocations.length === allLocations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations([...allLocations]);
    }
  };

  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  const getCategoriesSummary = (): string => {
    if (selectedCategories.length === 0) return 'Aucune catégorie';
    if (selectedCategories.length === categories.length) return 'Toutes catégories';
    if (selectedCategories.length === 1) return `Catégorie: ${selectedCategories[0]}`;
    return `${selectedCategories.length} catégories`;
  };

  return (
    <>
      <div className="space-y-6">
        <ConflictDisplay conflicts={conflicts} />
        
        {/* Barre d'outils */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  showFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>🔍</span>
                Filtres
                <span className={`text-xs transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={isExporting || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? (
                    <><span className="animate-spin">⟳</span> Génération...</>
                  ) : (
                    <><span>📄</span> Exporter PDF</>
                  )}
                </button>
                
                {showExportOptions && !isExporting && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-10">
                    <div className="p-2">
                      <button
                        onClick={handleExportFull}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        📊 Export complet (vue actuelle)
                      </button>
                      <button
                        onClick={handleExportByDayLocation}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        📅 Export par jour et local
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Chargement...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Rafraîchir
                  </>
                )}
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              {allDates.length} jour{allDates.length > 1 ? 's' : ''} • 
              {selectedLocations.length > 0 
                ? ` ${selectedLocations.length} local${selectedLocations.length > 1 ? 'x' : ''}` 
                : ' Tous locaux'} • 
              {selectedCategories.length === 0 
                ? ' Toutes catégories' 
                : selectedCategories.length === 1 
                  ? ` ${selectedCategories[0]}` 
                  : ` ${selectedCategories.length} catégories`}
              {conflicts.length > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  ⚠️ {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Filtres du Calendrier</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner les jours
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {allDates.map(date => (
                    <div key={date} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        id={`date-${date}`}
                        checked={selectedDates.includes(date)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDates([...selectedDates, date]);
                          } else {
                            setSelectedDates(selectedDates.filter(d => d !== date));
                          }
                        }}
                        className="mr-2"
                        disabled={isLoading}
                      />
                      <label htmlFor={`date-${date}`} className="text-sm">
                        {new Date(date).toLocaleDateString('fr-FR', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </label>
                    </div>
                  ))}
                  {allDates.length === 0 && (
                    <p className="text-sm text-gray-500">Aucune date de défense programmée</p>
                  )}
                </div>
                <button
                  onClick={toggleAllDates}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  disabled={isLoading || allDates.length === 0}
                >
                  {selectedDates.length === allDates.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégories (sélection multiple)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {categories.map(cat => {
                    const color = getCategoryColor(cat);
                    const isSelected = selectedCategories.includes(cat);
                    
                    return (
                      <div key={cat} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          id={`cat-${cat}`}
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, cat]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== cat));
                            }
                          }}
                          className="mr-2"
                          disabled={isLoading}
                        />
                        <label 
                          htmlFor={`cat-${cat}`} 
                          className="text-sm cursor-pointer flex items-center group"
                        >
                          <div 
                            className="w-4 h-4 rounded mr-2 border group-hover:opacity-80 transition-opacity"
                            style={{ 
                              backgroundColor: color.bg,
                              borderColor: color.border
                            }}
                            title={cat}
                          ></div>
                          <span className="truncate">{cat}</span>
                        </label>
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <p className="text-sm text-gray-500">Aucune catégorie définie</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedCategories.length === categories.length) {
                      setSelectedCategories([]);
                    } else {
                      setSelectedCategories([...categories]);
                    }
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  disabled={isLoading || categories.length === 0}
                >
                  {selectedCategories.length === categories.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locaux
                </label>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {allLocations.map(location => (
                    <div key={location} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        id={`loc-${location}`}
                        checked={selectedLocations.includes(location)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations([...selectedLocations, location]);
                          } else {
                            setSelectedLocations(selectedLocations.filter(l => l !== location));
                          }
                        }}
                        className="mr-2"
                        disabled={isLoading}
                      />
                      <label htmlFor={`loc-${location}`} className="text-sm">
                        {location}
                      </label>
                    </div>
                  ))}
                  {allLocations.length === 0 && (
                    <p className="text-sm text-gray-500">Aucun local défini</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedLocations.length === allLocations.length) {
                      setSelectedLocations([]);
                    } else {
                      setSelectedLocations([...allLocations]);
                    }
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  disabled={isLoading || allLocations.length === 0}
                >
                  {selectedLocations.length === allLocations.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vue Calendrier</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Détection des conflits en cours...</p>
              </div>
            </div>
          ) : (
            <div ref={calendarRef} data-calendar-ref>
              <CalendarDisplay
                eleves={eleves}
                selectedCategories={
                  selectedCategories.length === 0 || selectedCategories.length === categories.length
                    ? ['toutes']
                    : selectedCategories
                }
                selectedDates={selectedDates}
                selectedLocations={selectedLocations}
                onEventClick={handleEventClick}
              />
            </div>
          )}
        </div>
      </div>
      
      <DefenseEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEleve(null);
        }}
        eleve={selectedEleve}
        guides={guides}
        externes={externes}
        allEleves={eleves}
        onSave={handleSaveDefense}
        onRefresh={onRefresh}
      />
    </>
  );
}