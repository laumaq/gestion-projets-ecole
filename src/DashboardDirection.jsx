import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageSquare, AlertCircle, Clock, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

function DashboardDirection({ user, onLogout, supabaseRequest }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('validation');
  const [pendingProjects, setPendingProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  
  // Pour le formulaire d'ajout d'événement admin
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitre, setEventTitre] = useState('');
  const [eventType, setEventType] = useState('greve');
  const [eventDate, setEventDate] = useState('');
  const [eventHeureDebut, setEventHeureDebut] = useState('');
  const [eventHeureFin, setEventHeureFin] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const HEURES = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
  const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  useEffect(() => {
    loadPendingProjects();
    loadAllProjects();
  }, []);

  async function loadPendingProjects() {
    try {
      setLoading(true);
      const projects = await supabaseRequest(
        `projects?statut=eq.en_attente&select=*,project_instances(*),users!projects_prof_meneur_id_fkey(nom,prenom_initiale)`
      );
      setPendingProjects(projects);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setLoading(false);
    }
  }

  async function loadAllProjects() {
    try {
      const projects = await supabaseRequest(
        `projects?statut=eq.valide&select=*,project_instances(*),users!projects_prof_meneur_id_fkey(nom,prenom_initiale)&order=created_at.desc`
      );
      setAllProjects(projects);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    }
  }

  async function handleValidation(projectId, instanceIds, action) {
    const newStatut = action === 'valider' ? 'valide' : 'refuse';
    
    try {
      setLoading(true);
      
      await supabaseRequest(`projects?id=eq.${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: newStatut }),
      });

      for (const instanceId of instanceIds) {
        await supabaseRequest(`project_instances?id=eq.${instanceId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            validation_direction_id: user.id,
            validation_date: new Date().toISOString(),
            commentaire_validation: action === 'refuser' ? commentaire : null,
          }),
        });
      }

      alert(`Projet ${action === 'valider' ? 'validé' : 'refusé'} avec succès !`);
      setSelectedProject(null);
      setCommentaire('');
      await loadPendingProjects();
      await loadAllProjects();
      setLoading(false);
    } catch (err) {
      alert('Erreur: ' + err.message);
      setLoading(false);
    }
  }

  async function handleAddEvent() {
    if (!eventTitre || !eventDate || !eventHeureDebut || !eventHeureFin) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      
      const [project] = await supabaseRequest('projects', {
        method: 'POST',
        body: JSON.stringify({
          titre: eventTitre,
          description: eventDescription,
          prof_meneur_id: user.id,
          mots_cles: [],
          type_activite: eventType,
          recurrence: 'ponctuel',
          statut: 'valide',
        }),
      });

      await supabaseRequest('project_instances', {
        method: 'POST',
        body: JSON.stringify({
          project_id: project.id,
          date: eventDate,
          heure_debut: eventHeureDebut,
          heure_fin: eventHeureFin,
          groups_concernes: [],
          validation_direction_id: user.id,
        }),
      });

      alert('Événement ajouté avec succès !');
      setShowAddEvent(false);
      resetEventForm();
      await loadAllProjects();
      setLoading(false);
    } catch (err) {
      alert('Erreur: ' + err.message);
      setLoading(false);
    }
  }

  function resetEventForm() {
    setEventTitre('');
    setEventType('greve');
    setEventDate('');
    setEventHeureDebut('');
    setEventHeureFin('');
    setEventDescription('');
  }

  const getSeverityColor = (severity) => {
    if (severity === 'green') return 'bg-green-100 text-green-800';
    if (severity === 'orange') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getTypeLabel = (type) => {
    const labels = {
      sortie_pedagogique: 'Sortie pédagogique',
      projet_pedagogique: 'Projet pédagogique',
      greve: 'Grève',
      animations: 'Animations',
      conseil_classe: 'Conseil de classe',
      intemperies: 'Intempéries',
      formation_pedagogique: 'Formation pédagogique',
      autre: 'Autre'
    };
    return labels[type] || type;
  };

  const getWeekDates = (offset) => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));
    
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeekOffset);
  const filteredProjects = allProjects.filter(p => 
    filterType === 'all' || p.type_activite === filterType
  );

  const projectsByDate = {};
  filteredProjects.forEach(project => {
    project.project_instances?.forEach(instance => {
      const dateKey = instance.date;
      if (!projectsByDate[dateKey]) {
        projectsByDate[dateKey] = [];
      }
      projectsByDate[dateKey].push({ ...project, instance });
    });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard Direction
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.nom} {user.prenom_initiale}.
            </span>
            <button onClick={onLogout} className="text-sm text-blue-600 hover:text-blue-800">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'validation'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Validation ({pendingProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('calendrier')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'calendrier'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Calendrier
            </button>
          </nav>
        </div>

        {activeTab === 'validation' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Projets en attente de validation
              </h2>
              <p className="text-gray-600">
                {pendingProjects.length} projet{pendingProjects.length > 1 ? 's' : ''} à valider
              </p>
            </div>

            {loading && <div className="text-center text-gray-600">Chargement...</div>}

            {!loading && pendingProjects.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>Aucun projet en attente de validation</p>
              </div>
            )}

            <div className="space-y-4">
              {pendingProjects.map(project => (
                <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{project.titre}</h3>
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Par : {project.users?.nom} {project.users?.prenom_initiale}. | 
                        Type : {getTypeLabel(project.type_activite)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      En attente
                    </span>
                  </div>

                  {project.project_instances && project.project_instances.map(instance => (
                    <div key={instance.id} className="mt-4 border-t pt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(instance.date).toLocaleDateString('fr-FR')} - 
                          {instance.heure_debut} à {instance.heure_fin}
                        </span>
                      </div>

                      {instance.impact_report && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-700">Impact global :</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              getSeverityColor(instance.impact_report.globalSeverity)
                            }`}>
                              {instance.impact_report.globalSeverity === 'green' && 'Faible'}
                              {instance.impact_report.globalSeverity === 'orange' && 'Modéré'}
                              {instance.impact_report.globalSeverity === 'red' && 'Élevé'}
                            </span>
                          </div>

                          {instance.impact_report.impacts && instance.impact_report.impacts.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm mt-2">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">Groupe</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">Cours</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">% perdu</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {instance.impact_report.impacts.map((impact, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2">{impact.groupName}</td>
                                      <td className="px-3 py-2">{impact.courseName}</td>
                                      <td className="px-3 py-2">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          getSeverityColor(impact.severity)
                                        }`}>
                                          {impact.pourcentagePerdu}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleValidation(project.id, [instance.id], 'valider')}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Valider
                        </button>
                        
                        <button
                          onClick={() => setSelectedProject({ project, instance })}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'calendrier' && (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Calendrier des activités
              </h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Ajouter un événement
              </button>
            </div>

            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="sortie_pedagogique">Sorties pédagogiques</option>
                  <option value="projet_pedagogique">Projets pédagogiques</option>
                  <option value="greve">Grèves</option>
                  <option value="animations">Animations</option>
                  <option value="conseil_classe">Conseils de classe</option>
                  <option value="intemperies">Intempéries</option>
                  <option value="formation_pedagogique">Formations pédagogiques</option>
                  <option value="autre">Autres</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Semaine du {weekDates[0].toLocaleDateString('fr-FR')} au {weekDates[4].toLocaleDateString('fr-FR')}
                </span>
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Aujourd'hui
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {weekDates.map((date, idx) => {
                const dateKey = date.toISOString().split('T')[0];
                const dayProjects = projectsByDate[dateKey] || [];
                const dayName = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][idx];

                return (
                  <div key={dateKey} className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">
                      {dayName} {date.toLocaleDateString('fr-FR')}
                    </h3>
                    
                    {dayProjects.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune activité</p>
                    ) : (
                      <div className="space-y-2">
                        {dayProjects.map((proj, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => setSelectedProject({ project: proj, instance: proj.instance, viewOnly: true })}
                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {proj.instance.heure_debut} - {proj.instance.heure_fin}
                                  </span>
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                    {getTypeLabel(proj.type_activite)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{proj.titre}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Par {proj.users?.nom} {proj.users?.prenom_initiale}.
                                </p>
                              </div>
                              {proj.instance.impact_report && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  getSeverityColor(proj.instance.impact_report.globalSeverity)
                                }`}>
                                  {proj.instance.impact_report.globalSeverity === 'green' && '🟢'}
                                  {proj.instance.impact_report.globalSeverity === 'orange' && '🟠'}
                                  {proj.instance.impact_report.globalSeverity === 'red' && '🔴'}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Modal refus/détails */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {selectedProject.viewOnly ? (
                <>
                  <h3 className="text-lg font-semibold mb-4">Détails du projet</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Titre</p>
                      <p className="text-sm text-gray-900">{selectedProject.project.titre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Description</p>
                      <p className="text-sm text-gray-900">{selectedProject.project.description || 'Aucune description'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Type</p>
                      <p className="text-sm text-gray-900">{getTypeLabel(selectedProject.project.type_activite)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Date et horaires</p>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedProject.instance.date).toLocaleDateString('fr-FR')} - 
                        {selectedProject.instance.heure_debut} à {selectedProject.instance.heure_fin}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Créé par</p>
                      <p className="text-sm text-gray-900">
                        {selectedProject.project.users?.nom} {selectedProject.project.users?.prenom_initiale}.
                      </p>
                    </div>
                    {selectedProject.project.mots_cles && selectedProject.project.mots_cles.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Mots-clés</p>
                        <p className="text-sm text-gray-900">{selectedProject.project.mots_cles.join(', ')}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Fermer
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-4">Refuser le projet</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Projet : {selectedProject.project.titre}
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commentaire (optionnel)
                    </label>
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Expliquez pourquoi le projet est refusé..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedProject(null);
                        setCommentaire('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleValidation(
                        selectedProject.project.id,
                        [selectedProject.instance.id],
                        'refuser'
                      )}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Confirmer le refus
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal ajout événement */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Ajouter un événement</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={eventTitre}
                    onChange={(e) => setEventTitre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: Grève générale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="greve">Grève</option>
                    <option value="animations">Animations</option>
                    <option value="conseil_classe">Conseil de classe</option>
                    <option value="intemperies">Intempéries</option>
                    <option value="formation_pedagogique">Formation pédagogique</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure début *</label>
                    <div className="flex gap-1">
                      <select
                        value={eventHeureDebut.split(':')[0] || ''}
                        onChange={(e) => {
                          const min = eventHeureDebut.split(':')[1] || '00';
                          setEventHeureDebut(e.target.value + ':' + min);
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">HH</option>
                        {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={eventHeureDebut.split(':')[1] || ''}
                        onChange={(e) => {
                          const h = eventHeureDebut.split(':')[0] || '08';
                          setEventHeureDebut(h + ':' + e.target.value);
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">MM</option>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin *</label>
                    <div className="flex gap-1">
                      <select
                        value={eventHeureFin.split(':')[0] || ''}
                        onChange={(e) => {
                          const min = eventHeureFin.split(':')[1] || '00';
                          setEventHeureFin(e.target.value + ':' + min);
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">HH</option>
                        {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={eventHeureFin.split(':')[1] || ''}
                        onChange={(e) => {
                          const h = eventHeureFin.split(':')[0] || '08';
                          setEventHeureFin(h + ':' + e.target.value);
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">MM</option>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Détails de l'événement..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddEvent(false);
                    resetEventForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardDirection;
