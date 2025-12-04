/**
 * NOUVEAU CALCUL D'IMPACT - Approche par cours
 * Un cours est impacté si ≥33% de ses élèves sont absents
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
  studentGroups, // Nouveau : array de {student_id, group_id}
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

  // Projets pédagogiques = pas d'impact
  if (typeActivite === 'projet_pedagogique') {
    return {
      impacts: [],
      globalSeverity: 'green',
      needsValidation: false,
      isProjetPedagogique: true
    };
  }

  // 1. Trouver tous les élèves qui sortent
  const studentsGoingOut = new Set();
  selectedGroups.forEach(groupId => {
    studentGroups
      .filter(sg => sg.group_id === groupId)
      .forEach(sg => studentsGoingOut.add(sg.student_id));
  });

  console.log(`👥 ${studentsGoingOut.size} élèves sortent`);

  // 2. Trouver tous les cours pendant la tranche horaire ce jour-là
  const coursesInTimeSlot = schedule.filter(s => 
    s.jour_semaine === jourSemaine &&
    heureDebut < s.heure_fin && 
    heureFin > s.heure_debut
  );

  console.log(`📚 ${coursesInTimeSlot.length} cours pendant cette tranche horaire`);

  // 3. Pour chaque cours, calculer l'impact
  const impacts = [];
  const impactedCoursesSet = new Set(); // Pour éviter les doublons
  let impactsOtherProfs = false;

  coursesInTimeSlot.forEach(scheduleItem => {
    const course = courses.find(c => c.id === scheduleItem.course_id);
    if (!course) return;

    // Trouver tous les élèves de ce cours (via les groupes du cours)
    const studentsInCourse = studentGroups
      .filter(sg => sg.group_id === scheduleItem.group_id)
      .map(sg => sg.student_id);

    const totalStudentsInCourse = studentsInCourse.length;
    if (totalStudentsInCourse === 0) return;

    // Compter combien d'élèves du cours sortent
    const studentsGoingOutFromCourse = studentsInCourse.filter(
      studentId => studentsGoingOut.has(studentId)
    ).length;

    const impactPercentage = (studentsGoingOutFromCourse / totalStudentsInCourse) * 100;

    // Seuil : 33%
    if (impactPercentage < 33) return;

    // Vérifier si c'est un autre prof OU un groupe mixte
    const isOtherProf = course.prof_id && course.prof_id !== currentUserId;
    
    // Un groupe est mixte si tous les élèves du groupe ne sortent pas
    const isMixedGroup = studentsGoingOutFromCourse < totalStudentsInCourse;

    // Le cours est impacté si : autre prof OU groupe mixte
    if (!isOtherProf && !isMixedGroup) return;

    if (isOtherProf) {
      impactsOtherProfs = true;
    }

    // Éviter les doublons (même cours, même horaire)
    const courseKey = `${scheduleItem.course_id}-${scheduleItem.heure_debut}-${scheduleItem.heure_fin}`;
    if (impactedCoursesSet.has(courseKey)) return;
    impactedCoursesSet.add(courseKey);

    // Calculer l'impact sur l'année (comme avant)
    const occurrencesTotal = schoolCalendar.filter(cal => 
      new Date(cal.date).getDay() === jourSemaine
    ).length;

    const occurrencesUntilEvent = schoolCalendar.filter(cal => {
      const calDate = new Date(cal.date);
      return calDate.getDay() === jourSemaine && calDate <= eventDate;
    }).length;

    // Compter les pertes existantes pour ce cours
    const existingLossesTotal = existingActivities.filter(act => {
      if (!act.groups_concernes) return false;
      const actDate = new Date(act.date);
      
      // Vérifier si l'activité chevauche ce cours
      const overlaps = 
        actDate.getDay() === jourSemaine &&
        act.heure_debut < scheduleItem.heure_fin &&
        act.heure_fin > scheduleItem.heure_debut;
      
      if (!overlaps) return false;

      // Compter combien d'élèves de ce cours étaient concernés par cette activité
      const studentsInPastActivity = new Set();
      act.groups_concernes.forEach(gId => {
        studentGroups
          .filter(sg => sg.group_id === gId)
          .forEach(sg => studentsInPastActivity.add(sg.student_id));
      });

      const impactedInPast = studentsInCourse.filter(
        sId => studentsInPastActivity.has(sId)
      ).length;

      return (impactedInPast / totalStudentsInCourse) >= 0.33;
    }).length;

    const existingLossesUntilEvent = existingActivities.filter(act => {
      if (!act.groups_concernes) return false;
      const actDate = new Date(act.date);
      
      if (actDate >= eventDate) return false;

      const overlaps = 
        actDate.getDay() === jourSemaine &&
        act.heure_debut < scheduleItem.heure_fin &&
        act.heure_fin > scheduleItem.heure_debut;
      
      if (!overlaps) return false;

      const studentsInPastActivity = new Set();
      act.groups_concernes.forEach(gId => {
        studentGroups
          .filter(sg => sg.group_id === gId)
          .forEach(sg => studentsInPastActivity.add(sg.student_id));
      });

      const impactedInPast = studentsInCourse.filter(
        sId => studentsInPastActivity.has(sId)
      ).length;

      return (impactedInPast / totalStudentsInCourse) >= 0.33;
    }).length;

    // Calculs d'impact
    const impactImmediat = occurrencesUntilEvent > 0
      ? ((existingLossesUntilEvent + 1) / occurrencesUntilEvent) * 100
      : 0;

    const impactAnnuel = occurrencesTotal > 0
      ? ((existingLossesTotal + 1) / occurrencesTotal) * 100
      : 0;

    // Déterminer la sévérité
    let severity = 'green';
    if (impactImmediat >= 30) severity = 'red';
    else if (impactImmediat >= 15) severity = 'orange';

    const group = groups.find(g => g.id === scheduleItem.group_id);

    impacts.push({
      groupId: scheduleItem.group_id,
      groupName: group ? group.nom_groupe : 'Groupe inconnu',
      courseId: scheduleItem.course_id,
      courseName: course.nom_cours,
      profId: course.prof_id,
      heureDebut: scheduleItem.heure_debut,
      heureFin: scheduleItem.heure_fin,
      impactImmediat: impactImmediat.toFixed(1),
      impactAnnuel: impactAnnuel.toFixed(1),
      coursesUntilEvent: occurrencesUntilEvent,
      coursesTotal: occurrencesTotal,
      existingLossesUntilEvent,
      existingLossesTotal,
      severity,
      // Nouvelles infos
      studentsInCourse: totalStudentsInCourse,
      studentsGoingOut: studentsGoingOutFromCourse,
      impactPercentage: impactPercentage.toFixed(1)
    });
  });

  // Déterminer la sévérité globale
  let globalSeverity = 'green';
  if (impacts.some(i => i.severity === 'red')) globalSeverity = 'red';
  else if (impacts.some(i => i.severity === 'orange')) globalSeverity = 'orange';

  console.log(`⚠️ ${impacts.length} cours impactés`);

  return {
    impacts,
    globalSeverity,
    needsValidation: impactsOtherProfs,
    isProjetPedagogique: false
  };
}
