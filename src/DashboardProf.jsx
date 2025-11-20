/**
 * Calcule l'impact d'un événement sur les cours
 * 
 * @param {Object} params - Paramètres du calcul
 * @param {string} params.date - Date de l'événement (format ISO)
 * @param {string} params.heureDebut - Heure de début (format HH:MM)
 * @param {string} params.heureFin - Heure de fin (format HH:MM)
 * @param {Array<string>} params.selectedGroups - IDs des groupes concernés
 * @param {string} params.typeActivite - Type d'activité
 * @param {string} params.currentUserId - ID de l'utilisateur actuel
 * @param {Array} params.groups - Liste des groupes
 * @param {Array} params.courses - Liste des cours
 * @param {Array} params.schedule - Horaires
 * @param {Array} params.existingActivities - Activités existantes (filtrées : pas de projets pédagogiques)
 * @param {Array} params.schoolCalendar - Calendrier scolaire
 * @param {Date} params.schoolYearStart - Date de début d'année scolaire
 * 
 * @returns {Object|null} Résultat du calcul d'impact
 */
export function calculateImpact({
  date,
  heureDebut,
  heureFin,
  selectedGroups,
  typeActivite,
  currentUserId,
  groups,
  courses,
  schedule,
  existingActivities,
  schoolCalendar,
  schoolYearStart
}) {
  // Validations de base
  if (!date || !heureDebut || !heureFin || !selectedGroups || selectedGroups.length === 0) {
    return null;
  }

  if (!schoolYearStart || !schoolCalendar || schoolCalendar.length === 0) {
    return null;
  }

  const eventDate = new Date(date);
  const jourSemaine = eventDate.getDay();

  // Weekend = pas d'impact
  if (jourSemaine === 0 || jourSemaine === 6) {
    return null;
  }

  // Projets pédagogiques = pas d'impact, pas de validation
  if (typeActivite === 'projet_pedagogique') {
    return {
      impacts: [],
      globalSeverity: 'green',
      needsValidation: false,
      isProjetPedagogique: true
    };
  }

  const impacts = [];
  let impactsOtherProfs = false;

  // Compter le nombre total de ce jour de la semaine dans l'année
  const occurrencesTotal = schoolCalendar.filter(cal => {
    const calDate = new Date(cal.date);
    return calDate.getDay() === jourSemaine;
  }).length;

  // Compter le nombre de ce jour de la semaine jusqu'à la date de l'événement (incluse)
  const occurrencesUntilEvent = schoolCalendar.filter(cal => {
    const calDate = new Date(cal.date);
    return calDate.getDay() === jourSemaine && calDate <= eventDate;
  }).length;

  // Pour chaque groupe sélectionné
  selectedGroups.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    
    // Trouver les cours de ce groupe pour ce jour de la semaine
    const groupSchedule = schedule.filter(s => 
      s.group_id === groupId && s.jour_semaine === jourSemaine
    );

    // Pour chaque cours dans l'horaire
    groupSchedule.forEach(scheduleItem => {
      // Vérifier si les horaires se chevauchent
      const hasOverlap = heureDebut < scheduleItem.heure_fin && heureFin > scheduleItem.heure_debut;
      
      if (!hasOverlap) return;

      const course = courses.find(c => c.id === scheduleItem.course_id);

      // Vérifier si ça impacte un autre prof
      if (course && course.prof_id && course.prof_id !== currentUserId) {
        impactsOtherProfs = true;
      }

      // Compter les pertes existantes pour CE cours spécifique (toute l'année)
      const existingLossesTotal = existingActivities.filter(act => {
        if (!act.groups_concernes || !Array.isArray(act.groups_concernes)) return false;
        
        const actDate = new Date(act.date);
        const actJour = actDate.getDay();

        return (
          act.groups_concernes.includes(groupId) &&
          actJour === jourSemaine &&
          act.heure_debut < scheduleItem.heure_fin &&
          act.heure_fin > scheduleItem.heure_debut
        );
      }).length;

      // Compter les pertes existantes AVANT la date de l'événement (exclu)
      const existingLossesUntilEvent = existingActivities.filter(act => {
        if (!act.groups_concernes || !Array.isArray(act.groups_concernes)) return false;
        
        const actDate = new Date(act.date);
        const actJour = actDate.getDay();

        return (
          act.groups_concernes.includes(groupId) &&
          actJour === jourSemaine &&
          act.heure_debut < scheduleItem.heure_fin &&
          act.heure_fin > scheduleItem.heure_debut &&
          actDate < eventDate
        );
      }).length;

      // Calcul de l'impact immédiat (jusqu'à la date, en comptant le nouvel événement)
      const impactImmediat = occurrencesUntilEvent > 0
        ? ((existingLossesUntilEvent + 1) / occurrencesUntilEvent) * 100
        : 0;

      // Calcul de l'impact annuel (toute l'année, en comptant le nouvel événement)
      const impactAnnuel = occurrencesTotal > 0
        ? ((existingLossesTotal + 1) / occurrencesTotal) * 100
        : 0;

      // Déterminer la sévérité basée sur l'impact immédiat
      let severity = 'green';
      if (impactImmediat >= 30) {
        severity = 'red';
      } else if (impactImmediat >= 15) {
        severity = 'orange';
      }

      impacts.push({
        groupId,
        groupName: group ? group.nom_groupe : groupId,
        courseId: scheduleItem.course_id,
        courseName: course ? course.nom_cours : 'Cours inconnu',
        profId: course?.prof_id,
        heureDebut: scheduleItem.heure_debut,
        heureFin: scheduleItem.heure_fin,
        impactImmediat: impactImmediat.toFixed(1),
        impactAnnuel: impactAnnuel.toFixed(1),
        coursesUntilEvent: occurrencesUntilEvent,
        coursesTotal: occurrencesTotal,
        existingLossesUntilEvent,
        existingLossesTotal,
        severity
      });
    });
  });

  // Déterminer la sévérité globale
  let globalSeverity = 'green';
  if (impacts.some(i => i.severity === 'red')) {
    globalSeverity = 'red';
  } else if (impacts.some(i => i.severity === 'orange')) {
    globalSeverity = 'orange';
  }

  return {
    impacts,
    globalSeverity,
    needsValidation: impactsOtherProfs,
    isProjetPedagogique: false
  };
}
