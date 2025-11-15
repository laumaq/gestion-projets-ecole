import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Users, AlertCircle, CheckCircle, AlertTriangle, Search, Plus, X } from 'lucide-react';

const SUPABASE_URL = 'https://bjbxatevbcrybsrkgdzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnhhdGV2YmNyeWJzcmtnZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg3ODQsImV4cCI6MjA3NTgyNDc4NH0.PTmREL0Nw1FZTgYDsJk72ABObuOabA7eoaztMPdupPE';

const HEURES = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const ANNEES = [1, 2, 3, 4, 5, 6];
const TYPES = ['classe', 'option', 'atelier', 'autre'];

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers,
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }
  return response.json();
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginNom, setLoginNom] = useState('');
  const [loginInitiale, setLoginInitiale] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [typeActivite, setTypeActivite] = useState('projet');
  const [motsCles, setMotsCles] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [recurrence, setRecurrence] = useState('ponctuel');
  const [recurrenceJour, setRecurrenceJour] = useState('');
  const [recurrenceNbSemaines, setRecurrenceNbSemaines] = useState('');
  const [recurrenceDateFin, setRecurrenceDateFin] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [filterAnnee, setFilterAnnee] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [showImpactDetail, setShowImpactDetail] = useState(false);

  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [studentGroups, setStudentGroups] = useState([]);
  const [existingActivities, setExistingActivities] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [groupsData, coursesData, scheduleData, studentsData, activitiesData] = await Promise.all([
        supabaseRequest('groups?select=*'),
        supabaseRequest('courses?select=*'),
        supabaseRequest('schedule?select=*'),
        supabaseRequest('student_groups?select=group_id'),
        supabaseRequest('project_instances?select=*'),
      ]);
      
      setGroups(groupsData);
      setCourses(coursesData);
      setSchedule(scheduleData);
      setExistingActivities(activitiesData);
      
      const groupCounts = {};
      studentsData.forEach(sg => {
        groupCounts[sg.group_id] = (groupCounts[sg.group_id] || 0) + 1;
      });
      setStudentGroups(Object.entries(groupCounts).map(([group_id, count]) => ({ group_id, student_count: count })));
      
      setLoading(false);
    } catch (err) {
      setError('Erreur de chargement: ' + err.message);
      setLoading(false);
    }
  }

  const impactAnalysis = useMemo(() => {
    if (!date || !heureDebut || !heureFin || selectedGroups.length === 0) {
      return null;
    }

    const jourSemaine = new Date(date).getDay();
    if (jourSemaine === 0 || jourSemaine === 6) return null;

    const impacts = [];
    
    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      const groupSchedule = schedule.filter(s => s.group_id === groupId && s.jour_semaine === jourSemaine);
      const studentCount = studentGroups.find(sg => sg.group_id === groupId)?.student_count || 20;

      groupSchedule.forEach(scheduleItem => {
        if (heureDebut < scheduleItem.heure_fin && heureFin > scheduleItem.heure_debut) {
          const course = courses.find(c => c.id === scheduleItem.course_id);
          
          const existingLosses = existingActivities.filter(act => {
            if (!act.groups_concernes || !Array.isArray(act.groups_concernes)) return false;
            const actJour = new Date(act.date).getDay();
            return act.groups_concernes.includes(groupId) &&
                   actJour === jourSemaine &&
                   act.heure_debut < scheduleItem.heure_fin &&
                   act.heure_fin > scheduleItem.heure_debut;
          }).length;

          const totalCoursAnnee = 30;
          const pourcentagePerdu = ((existingLosses + 1) / totalCoursAnnee) * 100;

          let severity = 'green';
          if (pourcentagePerdu >= 30) severity = 'red';
          else if (pourcentagePerdu >= 15) severity = 'orange';

          impacts.push({
            groupId,
            groupName: group ? group.nom_groupe : groupId,
            courseId: scheduleItem.course_id,
            courseName: course ? course.nom_cours : 'Cours inconnu',
            heureDebut: scheduleItem.heure_debut,
            heureFin: scheduleItem.heure_fin,
            pourcentagePerdu: pourcentagePerdu.toFixed(1),
            severity,
          });
        }
      });
    });

    let globalSeverity = 'green';
    if (impacts.some(i => i.severity === 'red')) globalSeverity = 'red';
    else if (impacts.some(i => i.severity === 'orange')) globalSeverity = 'orange';

    return { impacts, globalSeverity };
  }, [date, heureDebut, heureFin, selectedGroups, groups, courses, schedule, studentGroups, existingActivities]);

  const handleLogin = async () => {
    if (!loginNom || !loginInitiale) return;
    
    setLoading(true);
    try {
      const users = await supabaseRequest(
        `users?nom=eq.${encodeURIComponent(loginNom)}&prenom_initiale=eq.${encodeURIComponent(loginInitiale)}`
      );
      
      let user;
      if (users.length === 0) {
        const [newUser] = await supabaseRequest('users', {
          method: 'POST',
          body: JSON.stringify({
            nom: loginNom,
            prenom_initiale: loginInitiale,
            role: 'prof',
          }),
        });
        user = newUser;
      } else {
        user = users[0];
      }
      
      setCurrentUser(user);
      setLoading(false);
    } catch (err) {
      setError('Erreur de connexion: ' + err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginNom('');
    setLoginInitiale('');
  };

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
      const motsClesArray = motsCles.split(',').map(m => m.trim()).filter(m => m);
      
      const [project] = await supabaseRequest('projects', {
        method: 'POST',
        body: JSON.stringify({
          titre,
          description,
          prof_meneur_id: currentUser.id,
          mots_cles: motsClesArray,
          type_activite: typeActivite,
          recurrence: recurrence,
          statut: 'en_attente',
        }),
      });

      const impactData = impactAnalysis ? {
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
        }),
      });

      alert('Projet soumis avec succès !');
      await loadData();
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
    setRecurrence('ponctuel');
    setRecurrenceJour('');
    setRecurrenceNbSemaines('');
    setRecurrenceDateFin('');
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Gestion des Projets
          </h1>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={loginNom}
                onChange={(e) => setLoginNom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initiale du prénom
              </label>
              <input
                type="text"
                value={loginInitiale}
                onChange={(e) => setLoginInitiale(e.target.value.toUpperCase())}
                maxLength={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="M"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Gestion des Projets
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {currentUser.nom} {currentUser.prenom_initiale}.
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouvelle activité / projet
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre
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
                  <option value="projet">Projet pédagogique</option>
                  <option value="sortie">Sortie</option>
                  <option value="animation">Animation</option>
                  <option value="conseil_classe">Conseil de classe</option>
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
                  placeholder="sciences, expérimentation, musée"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Groupes concernés
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
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
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
              Date et horaires
            </label>
            <div className="space-y-3">
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
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">MM</option>
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Récurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                >
                  <option value="ponctuel">Ponctuel (une seule fois)</option>
                  <option value="hebdomadaire_nombre">Hebdomadaire (nombre de semaines)</option>
                  <option value="hebdomadaire_date">Hebdomadaire (jusqu'à une date)</option>
                </select>

                {recurrence === 'hebdomadaire_nombre' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Jour de la semaine</label>
                      <select
                        value={recurrenceJour}
                        onChange={(e) => setRecurrenceJour(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choisir un jour</option>
                        {JOURS_SEMAINE.map((jour, idx) => (
                          <option key={idx} value={idx + 1}>{jour}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nombre de semaines</label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={recurrenceNbSemaines}
                        onChange={(e) => setRecurrenceNbSemaines(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 8"
                      />
                    </div>
                  </div>
                )}

                {recurrence === 'hebdomadaire_date' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Jour de la semaine</label>
                      <select
                        value={recurrenceJour}
                        onChange={(e) => setRecurrenceJour(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choisir un jour</option>
                        {JOURS_SEMAINE.map((jour, idx) => (
                          <option key={idx} value={idx + 1}>{jour}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date de fin</label>
                      <input
                        type="date"
                        value={recurrenceDateFin}
                        onChange={(e) => setRecurrenceDateFin(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {impactAnalysis && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Impact sur les cours
                </h3>
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
                        <th className="px-4 py-2 text-left font-medium text-gray-700">% cours perdus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {impactAnalysis.impacts.map((impact, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{impact.groupName}</td>
                          <td className="px-4 py-2">{impact.courseName}</td>
                          <td className="px-4 py-2">{impact.heureDebut} - {impact.heureFin}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              impact.severity === 'green' ? 'bg-green-100 text-green-800' :
                              impact.severity === 'orange' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
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

              {impactAnalysis.impacts.length === 0 && (
                <p className="text-sm text-gray-600">
                  Aucun cours impacté détecté (hors horaire ou weekend)
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
      </div>
    </div>
  );
}

export default App;
