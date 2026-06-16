// app/dashboard/conseil-de-la-classe/titulariat/page.tsx

// app/dashboard/conseil-de-la-classe/titulariat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Users, Save, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';

interface AnneeInfo {
  niveau: string;
  nom: string;  // ex: "1ère année", "2ème année", etc.
  educateur_id: string | null;
  educateur_nom?: string;
}

interface ClasseInfo {
  classe_nom: string;
  nb_eleves: number;
  niveau: string;
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  job: string;
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
}

interface RolesClasse {
  titulaire_id: string | null;
  co_titulaire_id: string | null;
  president_matricule: number | null;
  secretaire_matricule: number | null;
  delegue_voyage_matricule: number | null;
  titulaire_nom?: string;
  co_titulaire_nom?: string;
  president_nom?: string;
  secretaire_nom?: string;
  delegue_voyage_nom?: string;
}

// Niveaux avec leur libellé
const NIVEAUX = [
  { niveau: '1', nom: '1ère année' },
  { niveau: '2', nom: '2ème année' },
  { niveau: '3', nom: '3ème année' },
  { niveau: '4', nom: '4ème année' },
  { niveau: '5', nom: '5ème année' },
  { niveau: '6', nom: '6ème année' }
];

export default function TitulariatPage() {
  const router = useRouter();
  const [annee, setAnnee] = useState<string>('');
  const [anneesExpanded, setAnneesExpanded] = useState<Record<string, boolean>>({});
  const [anneesData, setAnneesData] = useState<AnneeInfo[]>([]);
  const [classesByNiveau, setClassesByNiveau] = useState<Record<string, ClasseInfo[]>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [educateurs, setEducateurs] = useState<Employee[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null);
  const [roles, setRoles] = useState<RolesClasse>({
    titulaire_id: null,
    co_titulaire_id: null,
    president_matricule: null,
    secretaire_matricule: null,
    delegue_voyage_matricule: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEducateur, setSavingEducateur] = useState(false);

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    if (selectedClasse) {
      chargerRolesClasse(selectedClasse);
      chargerElevesClasse(selectedClasse);
    }
  }, [selectedClasse]);

  const chargerDonnees = async () => {
    try {
      setLoading(true);

      // Récupérer l'année scolaire
      const { data: anneeData } = await supabase
        .from('conseil_classes_config')
        .select('annee_scolaire')
        .order('annee_scolaire', { ascending: false })
        .limit(1)
        .maybeSingle();

      const anneeCourante = anneeData?.annee_scolaire || '2025-2026';
      setAnnee(anneeCourante);

      // Initialiser l'état d'expansion des années (toutes fermées par défaut)
      const initialExpanded: Record<string, boolean> = {};
      NIVEAUX.forEach(n => { initialExpanded[n.niveau] = false; });
      setAnneesExpanded(initialExpanded);

      // Récupérer toutes les classes depuis students
      const { data: studentsData } = await supabase
        .from('students')
        .select('classe')
        .not('classe', 'is', null)
        .not('classe', 'eq', '');

      // Grouper les classes par niveau
      const classesMapByNiveau: Record<string, ClasseInfo[]> = {};
      const classeCountMap = new Map<string, number>();
      
      studentsData?.forEach(s => {
        if (s.classe) {
          classeCountMap.set(s.classe, (classeCountMap.get(s.classe) || 0) + 1);
        }
      });

      // Extraire le niveau depuis le nom de la classe (ex: "5PAV" -> niveau "5")
      const classesUniques = new Map<string, { classe_nom: string; niveau: string }>();
      studentsData?.forEach(s => {
        if (s.classe && !classesUniques.has(s.classe)) {
          const niveauMatch = s.classe.match(/^(\d+)/);
          const niveau = niveauMatch ? niveauMatch[1] : '0';
          classesUniques.set(s.classe, { classe_nom: s.classe, niveau });
        }
      });

      classesUniques.forEach(({ classe_nom, niveau }) => {
        if (!classesMapByNiveau[niveau]) {
          classesMapByNiveau[niveau] = [];
        }
        classesMapByNiveau[niveau].push({
          classe_nom,
          nb_eleves: classeCountMap.get(classe_nom) || 0,
          niveau
        });
      });

      // Trier les classes par nom
      Object.keys(classesMapByNiveau).forEach(niveau => {
        classesMapByNiveau[niveau].sort((a, b) => a.classe_nom.localeCompare(b.classe_nom));
      });
      setClassesByNiveau(classesMapByNiveau);

      // Récupérer les éducateurs par année
      const { data: educateursData } = await supabase
        .from('conseil_annee_educateurs')
        .select(`
          niveau,
          educateur_id,
          employees:educateur_id (nom, prenom)
        `)
        .eq('annee_scolaire', anneeCourante);

      const anneesList: AnneeInfo[] = NIVEAUX.map(n => {
        const educ = educateursData?.find(e => e.niveau === n.niveau);
        const employe = educ?.employees;
        const employeData = Array.isArray(employe) ? employe[0] : employe;
        return {
          niveau: n.niveau,
          nom: n.nom,
          educateur_id: educ?.educateur_id || null,
          educateur_nom: employeData ? `${employeData.prenom} ${employeData.nom}` : undefined
        };
      });
      setAnneesData(anneesList);

      // Récupérer les employés (profs, éducs)
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, nom, prenom, job')
        .in('job', ['prof', 'educ'])
        .order('nom');

      setEmployees(employeesData || []);

      // Filtrer les éducateurs (job = 'educ')
      const educs = (employeesData || []).filter(emp => emp.job === 'educ');
      setEducateurs(educs);

    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const chargerElevesClasse = async (classeNom: string) => {
    const { data } = await supabase
      .from('students')
      .select('matricule, nom, prenom')
      .eq('classe', classeNom)
      .order('nom');

    setEleves(data || []);
  };

  const chargerRolesClasse = async (classeNom: string) => {
    const { data } = await supabase
      .from('conseil_classes_roles')
      .select(`
        titulaire_id,
        co_titulaire_id,
        president_matricule,
        secretaire_matricule,
        delegue_voyage_matricule,
        titulaire:titulaire_id (nom, prenom),
        co_titulaire:co_titulaire_id (nom, prenom),
        president:president_matricule (nom, prenom),
        secretaire:secretaire_matricule (nom, prenom),
        delegue_voyage:delegue_voyage_matricule (nom, prenom)
      `)
      .eq('annee_scolaire', annee)
      .eq('classe_nom', classeNom)
      .maybeSingle();

    if (data) {
      const titulaire = Array.isArray(data.titulaire) ? data.titulaire[0] : data.titulaire;
      const coTitulaire = Array.isArray(data.co_titulaire) ? data.co_titulaire[0] : data.co_titulaire;
      const president = Array.isArray(data.president) ? data.president[0] : data.president;
      const secretaire = Array.isArray(data.secretaire) ? data.secretaire[0] : data.secretaire;
      const delegue = Array.isArray(data.delegue_voyage) ? data.delegue_voyage[0] : data.delegue_voyage;

      setRoles({
        titulaire_id: data.titulaire_id,
        co_titulaire_id: data.co_titulaire_id,
        president_matricule: data.president_matricule,
        secretaire_matricule: data.secretaire_matricule,
        delegue_voyage_matricule: data.delegue_voyage_matricule,
        titulaire_nom: titulaire ? `${titulaire.prenom} ${titulaire.nom}` : undefined,
        co_titulaire_nom: coTitulaire ? `${coTitulaire.prenom} ${coTitulaire.nom}` : undefined,
        president_nom: president ? `${president.prenom} ${president.nom}` : undefined,
        secretaire_nom: secretaire ? `${secretaire.prenom} ${secretaire.nom}` : undefined,
        delegue_voyage_nom: delegue ? `${delegue.prenom} ${delegue.nom}` : undefined
      });
    } else {
      setRoles({
        titulaire_id: null,
        co_titulaire_id: null,
        president_matricule: null,
        secretaire_matricule: null,
        delegue_voyage_matricule: null
      });
    }
  };

  const sauvegarderRoles = async () => {
    if (!selectedClasse) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('conseil_classes_roles')
        .upsert({
          annee_scolaire: annee,
          classe_nom: selectedClasse,
          titulaire_id: roles.titulaire_id || null,
          co_titulaire_id: roles.co_titulaire_id || null,
          president_matricule: roles.president_matricule || null,
          secretaire_matricule: roles.secretaire_matricule || null,
          delegue_voyage_matricule: roles.delegue_voyage_matricule || null,
          updated_by: localStorage.getItem('userId'),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'annee_scolaire,classe_nom'
        });

      if (error) throw error;
      alert('Rôles mis à jour avec succès');
      await chargerRolesClasse(selectedClasse);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const sauvegarderEducateur = async (niveau: string, educateurId: string | null) => {
    setSavingEducateur(true);
    try {
      const { error } = await supabase
        .from('conseil_annee_educateurs')
        .upsert({
          annee_scolaire: annee,
          niveau: niveau,
          educateur_id: educateurId || null,
          updated_by: localStorage.getItem('userId'),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'annee_scolaire,niveau'
        });

      if (error) throw error;
      
      // Mettre à jour l'affichage
      const educateur = educateurId ? educateurs.find((e: Employee) => e.id === educateurId) : null;
      setAnneesData(prev => prev.map(a => 
        a.niveau === niveau 
          ? { 
              ...a, 
              educateur_id: educateurId,
              educateur_nom: educateur ? `${educateur.prenom} ${educateur.nom}` : undefined
            }
          : a
      ));
      
      alert('Éducateur assigné avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde éducateur:', error);
      alert('Erreur lors de l\'assignation');
    } finally {
      setSavingEducateur(false);
    }
  };

  const toggleAnnee = (niveau: string) => {
    setAnneesExpanded(prev => ({ ...prev, [niveau]: !prev[niveau] }));
  };

  const handleClasseClick = (classeNom: string) => {
    setSelectedClasse(classeNom);
    // Optionnel: trouver le niveau de la classe pour le mettre en évidence
    const niveauMatch = classeNom.match(/^(\d+)/);
    if (niveauMatch) {
      setSelectedNiveau(niveauMatch[1]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Bandeau orange */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestion des titulariats</h1>
            <p className="text-amber-100 mt-1">Année scolaire {annee}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/conseil-de-la-classe')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arborescence des années et classes */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <GraduationCap className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold">Années et classes</h2>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {NIVEAUX.map((niveauInfo) => {
                const classesDuNiveau = classesByNiveau[niveauInfo.niveau] || [];
                const anneeData = anneesData.find(a => a.niveau === niveauInfo.niveau);
                
                return (
                  <div key={niveauInfo.niveau} className="border rounded-lg overflow-hidden">
                    {/* En-tête de l'année */}
                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleAnnee(niveauInfo.niveau)}
                    >
                      <div className="flex items-center gap-2">
                        {anneesExpanded[niveauInfo.niveau] ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium">{niveauInfo.nom}</span>
                        <span className="text-xs text-gray-500">({classesDuNiveau.length} classes)</span>
                      </div>
                      {anneeData?.educateur_nom && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Éduc: {anneeData.educateur_nom}
                        </span>
                      )}
                    </div>
                    
                    {/* Contenu de l'année (classes) - visible si expansé */}
                    {anneesExpanded[niveauInfo.niveau] && (
                      <div className="p-2 space-y-1 border-t">
                        {/* Sélection de l'éducateur pour l'année */}
                        <div className="mb-3 p-2 bg-amber-50 rounded-lg">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            🧑‍🏫 Éducateur/trice de l'année
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={anneeData?.educateur_id || ''}
                              onChange={(e) => sauvegarderEducateur(niveauInfo.niveau, e.target.value || null)}
                              disabled={savingEducateur}
                              className="flex-1 px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">-- Non assigné --</option>
                              {educateurs.map(edu => (
                                <option key={edu.id} value={edu.id}>
                                  {edu.prenom} {edu.nom}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Liste des classes */}
                        {classesDuNiveau.length === 0 ? (
                          <p className="text-sm text-gray-400 italic p-2">Aucune classe</p>
                        ) : (
                          classesDuNiveau.map(classe => (
                            <button
                              key={classe.classe_nom}
                              onClick={() => handleClasseClick(classe.classe_nom)}
                              className={`w-full text-left p-2 rounded-lg transition flex justify-between items-center ${
                                selectedClasse === classe.classe_nom
                                  ? 'bg-amber-50 border-amber-500 border'
                                  : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium">{classe.classe_nom}</p>
                                <p className="text-xs text-gray-500">{classe.nb_eleves} élèves</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Formulaire d'édition des rôles d'une classe */}
        <div className="lg:col-span-2">
          {selectedClasse ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">
                Classe {selectedClasse}
              </h2>

              <div className="space-y-8">
                {/* Section Équipe pédagogique */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4 pb-2 border-b">Équipe pédagogique</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👨‍🏫 Titulaire
                      </label>
                      <select
                        value={roles.titulaire_id || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, titulaire_id: e.target.value || null }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Non assigné --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.prenom} {emp.nom} ({emp.job})
                          </option>
                        ))}
                      </select>
                      {roles.titulaire_nom && (
                        <p className="text-xs text-green-600 mt-1">✓ Actuellement : {roles.titulaire_nom}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👩‍🏫 Co-titulaire
                      </label>
                      <select
                        value={roles.co_titulaire_id || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, co_titulaire_id: e.target.value || null }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Non assigné --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.prenom} {emp.nom} ({emp.job})
                          </option>
                        ))}
                      </select>
                      {roles.co_titulaire_nom && (
                        <p className="text-xs text-green-600 mt-1">✓ Actuellement : {roles.co_titulaire_nom}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Rôles élèves */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4 pb-2 border-b">Rôles des élèves</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👑 Président
                      </label>
                      <select
                        value={roles.president_matricule || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, president_matricule: e.target.value ? parseInt(e.target.value) : null }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Non assigné --</option>
                        {eleves.map(eleve => (
                          <option key={eleve.matricule} value={eleve.matricule}>
                            {eleve.prenom} {eleve.nom}
                          </option>
                        ))}
                      </select>
                      {roles.president_nom && (
                        <p className="text-xs text-amber-600 mt-1">✓ {roles.president_nom}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Secrétaire
                      </label>
                      <select
                        value={roles.secretaire_matricule || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, secretaire_matricule: e.target.value ? parseInt(e.target.value) : null }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Non assigné --</option>
                        {eleves.map(eleve => (
                          <option key={eleve.matricule} value={eleve.matricule}>
                            {eleve.prenom} {eleve.nom}
                          </option>
                        ))}
                      </select>
                      {roles.secretaire_nom && (
                        <p className="text-xs text-amber-600 mt-1">✓ {roles.secretaire_nom}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ✈️ Délégué aux voyages
                      </label>
                      <select
                        value={roles.delegue_voyage_matricule || ''}
                        onChange={(e) => setRoles(prev => ({ ...prev, delegue_voyage_matricule: e.target.value ? parseInt(e.target.value) : null }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Non assigné --</option>
                        {eleves.map(eleve => (
                          <option key={eleve.matricule} value={eleve.matricule}>
                            {eleve.prenom} {eleve.nom}
                          </option>
                        ))}
                      </select>
                      {roles.delegue_voyage_nom && (
                        <p className="text-xs text-amber-600 mt-1">✓ {roles.delegue_voyage_nom}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bouton sauvegarder */}
                <div className="pt-6 border-t">
                  <button
                    onClick={sauvegarderRoles}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les rôles de la classe'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Sélectionnez une année puis une classe à gauche</p>
              <p className="text-sm text-gray-400 mt-2">pour assigner ou modifier les rôles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}