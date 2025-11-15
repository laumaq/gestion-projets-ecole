import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageSquare, AlertCircle, Clock } from 'lucide-react';

function DashboardDirection({ user, onLogout, supabaseRequest }) {
  const [loading, setLoading] = useState(false);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [commentaire, setCommentaire] = useState('');

  useEffect(() => {
    loadPendingProjects();
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
      setLoading(false);
    } catch (err) {
      alert('Erreur: ' + err.message);
      setLoading(false);
    }
  }

  const getSeverityColor = (severity) => {
    if (severity === 'green') return 'bg-green-100 text-green-800';
    if (severity === 'orange') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

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
                    Par : {project.users?.nom} {project.users?.prenom_initiale}.
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

        {selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardDirection;
