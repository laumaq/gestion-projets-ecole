import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, CheckCircle, AlertTriangle, AlertCircle, Clock, Eye } from 'lucide-react';
import { calculateImpact } from './utils/impactCalculation.js';

const HEURES = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const ANNEES = [1, 2, 3, 4, 5, 6];
const TYPES = ['classe', 'option', 'atelier', 'autre'];

function DashboardProf({ user, onLogout, supabaseRequest }) {
  const [activeTab, setActiveTab] = useState('nouveau');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [typeActivite, setTypeActivite] = useState('projet_pedagogique');
  const [motsCles, setMotsCles] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [filterAnnee, setFilterAnnee] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [showImpactDetail, setShowImpactDetail] = useState(false);
  const [userEmail, setUserEmail] = useState(user.email || '');

  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [studentGroups, setStudentGroups] = useState([]);
  const [existingActivities, setExistingActivities] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [schoolYearStart, setSchoolYearStart] = useState(null);
  const [schoolCalendar, setSchoolCalendar] = useState([]);

  useEffect(() => {
    loadData();
    loadMyProjects();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [groupsData, coursesData, scheduleData, studentsData, activitiesData, calendarStartData, calendarAllData] = await Promise.all([
        supabaseRequest('groups?select=*'),
        supabaseRequest('courses?select=*'),
        supabaseRequest('schedule?select=*'),
        supabaseRequest('student_groups?select=group_id'),
        supabaseRequest('project_instances?select=*,projects!inner(type_activite)'),
        supabaseRequest('school_calendar?type=eq.cours_normal&order=date.asc&limit=1'),
        supabaseRequest('school_calendar?type=eq.cours_normal&order=date.asc'),
      ]);
      
      setGroups(groupsData);
      setCourses(coursesData);
      setSchedule(scheduleData);
      
      // Filtrer pour ne garder que les activités qui ne sont PAS des projets pédagogiques
      const filteredActivities = activitiesData.filter(act => 
        act.projects && act.projects.type_activite !== 'projet_pedagogique'
      );
      setExistingActivities(filteredActivities);
      
      setSchoolCalendar(calendarAllData);
      
      if (calendarStartData && calendarStartData.length > 0) {
        setSchoolYearStart(new Date(calendarStartData[0].date));
      }

      const [studentGroups, setStudentGroups] = useState([]);
      
      setStudentGroups(studentsData);  // Au lieu de groupCounts
      
      setLoading(false);
    } catch (err) {
      setError('Erreur de chargement: ' + err.message);
      setLoading(false);
    }
  }

  async function loadMyProjects() {
    try {
      const projects = await supabaseRequest(
        `projects?prof_meneur_id=eq.${user.id}&select=*,project_instances(*)`
      );
      setMyProjects(projects);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    }
  }

  const impactAnalysis = useMemo(() => {
    if (!date || !heureDebut || !heureFin || selectedGroups.length === 0 || !schoolYearStart || schoolCalendar.length === 0) {
      return null;
    }

    const jourSemaine = new Date(date).getDay();
    if (jourSemaine === 0 || jourSemaine === 6) return null;

    const eventDate = new Date(date);
    const impacts = [];
    
    // Pour les projets pédagogiques, pas d'impact ni de validation nécessaire
    const isProjetPedagogique = typeActivite === 'projet_pedagogique';
    
    if (isProjetPedagogique) {
      return { impacts: [], globalSeverity: 'green', needsValidation: false, isProjetPedagogique: true };
    }
    
    let impactsOtherProfs = false;
    
    // Compter le nombre d'occurrences de ce jour dans le calendrier
    const countOccurrences = (untilDate) => {
      return schoolCalendar.filter(cal => {
        const calDate = new Date(cal.date);
        return calDate.getDay() === jourSemaine && calDate <= untilDate;
      }).length;
    };
    
    const occurrencesUntilEvent = countOccurrences(eventDate);
    const occurrencesTotal = schoolCalendar.filter(cal => {
      const calDate = new Date(cal.date);
      return calDate.getDay() === jourSemaine;
    }).length;
    
    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      const groupSchedule = schedule.filter(s => s.group_id === groupId && s.jour_semaine === jourSemaine);

      groupSchedule.forEach(scheduleItem => {
        if (heureDebut < scheduleItem.heure_fin && heureFin > scheduleItem.heure_debut) {
          const course = courses.find(c => c.id === scheduleItem.course_id);
          
          if (course && course.prof_id && course.prof_id !== user.id) {
            impactsOtherProfs = true;
          }
          
          // Compter les pertes existantes UNIQUEMENT pour ce groupe ET ce cours spécifique
          const existingLosses = existingActivities.filter(act => {
            if (!act.groups_concernes || !Array.isArray(act.groups_concernes)) return false;
            const actDate = new Date(act.date);
            const actJour = actDate.getDay();
            
            // Vérifier que l'activité concerne ce groupe ET ce jour de la semaine ET chevauche cet horaire
            return act.groups_concernes.includes(groupId) &&
                   actJour === jourSemaine &&
                   act.heure_debut < scheduleItem.heure_fin &&
                   act.heure_fin > scheduleItem.heure_debut;
          }).length;
          
          // Compter combien de ces pertes ont eu lieu AVANT la date de l'événement
          const existingLossesUntilEvent = existingActivities.filter(act => {
            if (!act.groups_concernes || !Array.isArray(act.groups_concernes)) return false;
            const actDate = new Date(act.date);
            const actJour = actDate.getDay();
            
            return act.groups_concernes.includes(groupId) &&
                   actJour === jourSemaine &&
                   act.heure_debut < scheduleItem.heure_fin &&
                   act.heure_fin > scheduleItem.heure_debut &&
                   actDate < eventDate;
          }).length;

          // Impact immédiat (jusqu'à la date) - on ajoute +1 pour l'événement qu'on veut créer
          const impactImmediat = occurrencesUntilEvent > 0 
            ? ((existingLossesUntilEvent + 1) / occurrencesUntilEvent) * 100 
            : 0;
          
          // Impact annuel (sur toute l'année) - on ajoute +1 pour l'événement qu'on veut créer
          const impactAnnuel = occurrencesTotal > 0
            ? ((existingLosses + 1) / occurrencesTotal) * 100
            : 0;

          // Définir la sévérité basée sur l'impact immédiat
          let severity = 'green';
          if (impactImmediat >= 30) severity = 'red';
          else if (impactImmediat >= 15) severity = 'orange';

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
            existingLosses,
            severity,
          });
        }
      });
    });

    let globalSeverity = 'green';
    if (impacts.some(i => i.severity === 'red')) globalSeverity = 'red';
    else if (impacts.some(i => i.severity === 'orange')) globalSeverity = 'orange';

    return { impacts, globalSeverity, needsValidation: impactsOtherProfs, isProjetPedagogique: false };
  }, [date, heureDebut, heureFin, selectedGroups, groups, courses, schedule, existingActivities, user, schoolYearStart, schoolCalendar, typeActivite]);

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const filteredGroups = groups.filter(g => {
    const matchSearch = g.nom_groupe.toLowerCase().includes(searchGroup.toLowerCase());
    const matchAnnee = filterAnnee.length === 0 || (g.annee && filterAnnee.includes(g.annee));
    const matchType = filterType.length === 0 || filterType.includes(g.type);
    return matchSearch && matchAnnee && matchType;
  });

  const toggleFilterAnnee = (annee) => {
    setFilterAnnee(prev => 
      prev.includes(annee) ? prev.filter(a => a !== annee) : [...prev, annee]
    );
  };

  const toggleFilterType = (type) => {
    setFilterType(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async () => {
    if (!titre || !date || !heureDebut || !heureFin || selectedGroups.length === 0) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      if (userEmail && userEmail !== user.email) {
        await supabaseRequest(`users?id=eq.${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ email: userEmail }),
        });
      }

      const motsClesArray = motsCles.split(',').map(m => m.trim()).filter(m => m);
      const needsValidation = impactAnalysis?.needsValidation || false;
      const isProjetPedagogique = typeActivite === 'projet_pedagogique';
      
      const [project] = await supabaseRequest('projects', {
        method: 'POST',
        body: JSON.stringify({
          titre,
          description,
          prof_meneur_id: user.id,
          mots_cles: motsClesArray,
          type_activite: typeActivite,
          recurrence: 'ponctuel',
          statut: (isProjetPedagogique || !needsValidation) ? 'valide' : 'en_attente',
        }),
      });

      const impactData = impactAnalysis && !isProjetPedagogique ? {
        impacts: impactAnalysis.impacts,
        globalSeverity: impactAnalysis.globalSeverity,
      } : null;

      await supabaseRequest('project_instances', {
        method: 'POST',
        body: JSON.stringify({
          project_id: project.id,
          date,
          heure_debut: heureDebut,
          heure_fin: heureFin,
          groups_concernes: selectedGroups,
          impact_report: impactData,
          validation_direction_id: (isProjetPedagogique || !needsValidation) ? user.id : null,
        }),
      });

      let message = 'Projet enregistré avec succès !';
      if (isProjetPedagogique) {
        message = 'Projet pédagogique enregistré avec succès !';
      } else if (needsValidation) {
        message = 'Sortie soumise avec succès ! Elle est en attente de validation par la direction.';
      }
      
      alert(message);
      await loadData();
      await loadMyProjects();
      resetForm();
      setLoading(false);
    } catch (err) {
      setError('Erreur lors de la soumission: ' + err.message);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitre('');
    setDescription('');
    setMotsCles('');
    setSelectedGroups([]);
    setDate('');
    setHeureDebut('');
    setHeureFin('');
  };

  const getStatusBadge = (statut) => {
    if (statut === 'valide') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Validé</span>;
    }
    if (statut === 'en_attente') {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">En attente</span>;
    }
    if (statut === 'refuse') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Refusé</span>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Gestion des Projets
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.nom} {user.prenom_initiale}.
            </span>
            <button
              onClick={onLogout}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('nouveau')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'nouveau'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Nouveau projet
            </button>
            <button
              onClick={() => setActiveTab('mes-projets')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'mes-projets'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mes projets ({myProjects.length})
            </button>
          </nav>
        </div>

        {activeTab === 'nouveau' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nouvelle activité / projet
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optionnel - pour recevoir les notifications)
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="votre.email@ecole.be"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Sortie au musée des sciences"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Décrivez brièvement l'activité..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'activité
                  </label>
                  <select
                    value={typeActivite}
                    onChange={(e) => setTypeActivite(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="projet_pedagogique">Projet pédagogique (ne sort pas des cours)</option>
                    <option value="sortie_pedagogique">Sortie pédagogique (sort des cours)</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mots-clés
                  </label>
                  <input
                    type="text"
                    value={motsCles}
                    onChange={(e) => setMotsCles(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="sciences, expérimentation"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groupes concernés *
              </label>
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchGroup}
                      onChange={(e) => setSearchGroup(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Rechercher un groupe..."
                    />
                  </div>
                </div>

                <div className="mb-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Filtrer par année :</p>
                    <div className="flex flex-wrap gap-2">
                      {ANNEES.map(annee => (
                        <label key={annee} className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterAnnee.includes(annee)}
                            onChange={() => toggleFilterAnnee(annee)}
                            className="w-3 h-3 text-blue-600 rounded mr-1"
                          />
                          <span className="text-sm">{annee}ème</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Filtrer par type :</p>
                    <div className="flex flex-wrap gap-2">
                      {TYPES.map(type => (
                        <label key={type} className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterType.includes(type)}
                            onChange={() => toggleFilterType(type)}
                            className="w-3 h-3 text-blue-600 rounded mr-1"
                          />
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredGroups.map(group => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">
                        {group.nom_groupe}
                        <span className="text-gray-500 ml-2">({group.type})</span>
                      </span>
                    </label>
                  ))}
                </div>

                {selectedGroups.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Sélectionnés ({selectedGroups.length}) :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroups.map(gId => {
                        const group = groups.find(g => g.id === gId);
                        return (
                          <span
                            key={gId}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {group ? group.nom_groupe : gId}
                            <button
                              type="button"
                              onClick={() => toggleGroup(gId)}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date et horaires *
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Heure début</label>
                  <div className="flex gap-1">
                    <select
                      value={heureDebut.split(':')[0] || ''}
                      onChange={(e) => {
                        const min = heureDebut.split(':')[1] || '00';
                        setHeureDebut(e.target.value + ':' + min);
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">HH</option>
                      {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={heureDebut.split(':')[1] || ''}
                      onChange={(e) => {
                        const h = heureDebut.split(':')[0] || '08';
                        setHeureDebut(h + ':' + e.target.value);
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">MM</option>
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Heure fin</label>
                  <div className="flex gap-1">
                    <select
                      value={heureFin.split(':')[0] || ''}
                      onChange={(e) => {
                        const min = heureFin.split(':')[1] || '00';
                        setHeureFin(e.target.value + ':' + min);
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">HH</option>
                      {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={heureFin.split(':')[1] || ''}
                      onChange={(e) => {
                        const h = heureFin.split(':')[0] || '08';
                        setHeureFin(h + ':' + e.target.value);
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">MM</option>
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {impactAnalysis && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Impact sur les cours
                  </h3>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {impactAnalysis.globalSeverity === 'green' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Impact faible</span>
                        </div>
                      )}
                      {impactAnalysis.globalSeverity === 'orange' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-lg">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-medium">Impact modéré</span>
                        </div>
                      )}
                      {impactAnalysis.globalSeverity === 'red' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-medium">Impact élevé</span>
                        </div>
                      )}
                    </div>
                    {impactAnalysis.needsValidation && (
                      <div className="text-sm text-orange-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Nécessite validation direction</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowImpactDetail(!showImpactDetail)}
                  className="text-sm text-blue-600 hover:text-blue-800 mb-3"
                >
                  {showImpactDetail ? 'Masquer' : 'Afficher'} le détail
                </button>

                {showImpactDetail && impactAnalysis.impacts.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Groupe</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Cours impacté</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Horaire</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Impact immédiat</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Impact annuel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {impactAnalysis.impacts.map((impact, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{impact.groupName}</td>
                            <td className="px-4 py-2">{impact.courseName}</td>
                            <td className="px-4 py-2">{impact.heureDebut} - {impact.heureFin}</td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  impact.severity === 'green' ? 'bg-green-100 text-green-800' :
                                  impact.severity === 'orange' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {impact.impactImmediat}%
                                </span>
                                <span className="text-xs text-gray-500">
                                  {impact.existingLossesUntilEvent + 1}/{impact.coursesUntilEvent} cours
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm text-gray-700">
                                  {impact.impactAnnuel}%
                                </span>
                                <span className="text-xs text-gray-500">
                                  {impact.existingLosses + 1}/{impact.coursesTotal} cours
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {impactAnalysis.impacts.length === 0 && (
                  <p className="text-sm text-gray-600">
                    Aucun cours impacté détecté
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Soumission...' : 'Soumettre le projet'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'mes-projets' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Mes projets</h2>
            
            {myProjects.length === 0 ? (
              <p className="text-gray-600">Vous n'avez pas encore créé de projet.</p>
            ) : (
              <div className="space-y-4">
                {myProjects.map(project => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{project.titre}</h3>
                        <p className="text-sm text-gray-600">{project.description}</p>
                      </div>
                      {getStatusBadge(project.statut)}
                    </div>
                    
                    {project.project_instances && project.project_instances.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {project.project_instances.map(instance => (
                          <div key={instance.id} className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(instance.date).toLocaleDateString('fr-FR')} - {instance.heure_debut} à {instance.heure_fin}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {project.statut === 'refuse' && project.project_instances[0]?.commentaire_validation && (
                      <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-800">
                        <strong>Motif du refus :</strong> {project.project_instances[0].commentaire_validation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardProf;
