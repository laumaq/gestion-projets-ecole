// app/dashboard/conseils-de-la-classe-multiples/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Layers, FileText, ChevronRight, Copy, CheckCircle, Settings, Edit2, X } from 'lucide-react';

interface ClasseInfo {
  classe_nom: string;
  nb_eleves: number;
  niveau: string;
  titulaire_nom?: string;
  co_titulaire_nom?: string;
}

interface TemplateVote {
  titre: string;
  description: string;
  question: string;
  type_scrutin: string;
  options: string[];
  anonymous: boolean;
  anonymous_vote: boolean;
  show_results: string;
  candidates_source: 'custom' | 'employees' | 'eleves';
}

export default function ConseilsMultiplesPage() {
  const router = useRouter();
  const [annee, setAnnee] = useState<string>('');
  const [classes, setClasses] = useState<ClasseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  
  // États pour les formulaires
  const [showUniqueVoteForm, setShowUniqueVoteForm] = useState(false);
  const [showTemplateVoteForm, setShowTemplateVoteForm] = useState(false);
  const [customizingClass, setCustomizingClass] = useState<string | null>(null);
  const [customizingOptions, setCustomizingOptions] = useState<Record<string, string[]>>({});
  
  // Template de vote
  const [template, setTemplate] = useState<TemplateVote>({
    titre: '',
    description: '',
    question: '',
    type_scrutin: 'plurinominal',
    options: ['', ''],
    anonymous: true,
    anonymous_vote: false,
    show_results: 'after_close',
    candidates_source: 'custom'
  });

  useEffect(() => {
    chargerDonnees();
    verifierAcces();
  }, []);

  const verifierAcces = async () => {
    const userJob = localStorage.getItem('userJob');
    if (userJob !== 'educ') {
      router.push('/dashboard/main');
    }
  };

  const chargerDonnees = async () => {
    try {
      setLoading(true);

      const { data: anneeData } = await supabase
        .from('conseil_classes_config')
        .select('annee_scolaire')
        .order('annee_scolaire', { ascending: false })
        .limit(1)
        .maybeSingle();

      const anneeCourante = anneeData?.annee_scolaire || '2025-2026';
      setAnnee(anneeCourante);

      const userId = localStorage.getItem('userId');

      const { data: niveaux } = await supabase
        .from('conseil_annee_educateurs')
        .select('niveau')
        .eq('annee_scolaire', anneeCourante)
        .eq('educateur_id', userId);

      if (niveaux && niveaux.length > 0) {
        const niveauxListe = niveaux.map(n => n.niveau);
        const classesList: ClasseInfo[] = [];

        for (const niveau of niveauxListe) {
          const { data: classesData } = await supabase
            .from('students')
            .select('classe')
            .like('classe', `${niveau}%`)
            .not('classe', 'is', null)
            .not('classe', 'eq', '');

          if (classesData) {
            const classesUniques = [...new Set(classesData.map(c => c.classe))];
            
            for (const classeNom of classesUniques) {
              const { count } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('classe', classeNom);

              classesList.push({
                classe_nom: classeNom,
                nb_eleves: count || 0,
                niveau
              });
            }
          }
        }

        classesList.sort((a, b) => a.classe_nom.localeCompare(b.classe_nom));
        setClasses(classesList);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClasseSelection = (classeNom: string) => {
    const newSelected = new Set(selectedClasses);
    if (newSelected.has(classeNom)) {
      newSelected.delete(classeNom);
    } else {
      newSelected.add(classeNom);
    }
    setSelectedClasses(newSelected);
  };

  const toggleAllClasses = () => {
    if (selectedClasses.size === classes.length) {
      setSelectedClasses(new Set());
    } else {
      setSelectedClasses(new Set(classes.map(c => c.classe_nom)));
    }
  };

  // Gestion des options du template
  const addTemplateOption = () => {
    setTemplate(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeTemplateOption = (index: number) => {
    if (template.options.length <= 2) return;
    setTemplate(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateTemplateOption = (index: number, value: string) => {
    const newOptions = [...template.options];
    newOptions[index] = value;
    setTemplate(prev => ({ ...prev, options: newOptions }));
  };

  // Création d'une votation unique pour toutes les classes sélectionnées
  const creerVoteUnique = async () => {
    if (selectedClasses.size === 0) {
      alert('Veuillez sélectionner au moins une classe');
      return;
    }

    const finalOptions = template.options.filter(opt => opt.trim() !== '');
    if (finalOptions.length < 2) {
      alert('Veuillez ajouter au moins 2 options');
      return;
    }

    if (!template.titre.trim()) {
      alert('Veuillez saisir un titre');
      return;
    }

    if (!template.question.trim()) {
      alert('Veuillez saisir une question');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const classeNom of selectedClasses) {
        const { error } = await supabase
          .from('votes')
          .insert({
            titre: template.titre,
            description: template.description || null,
            question: template.question,
            options: finalOptions,
            type_scrutin: template.type_scrutin,
            parametres: {
              anonymous: template.anonymous,
              show_results: template.show_results
            },
            anonymous_vote: template.anonymous_vote,
            candidates_source: template.candidates_source,
            module_contexte: 'conseil_classe',
            // ⚠️ NE PAS inclure 'module_id' - c'est un UUID !
            conseil_classe_classe_nom: classeNom,  // ← Stocker le nom de la classe ici
            conseil_classe_annee: annee,
            statut: 'brouillon',
            created_by: localStorage.getItem('userId'),
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error(`Erreur pour ${classeNom}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        alert(`Vote créé pour ${successCount} classe(s)${errorCount > 0 ? ` (${errorCount} erreurs)` : ''}`);
        setShowUniqueVoteForm(false);
        resetTemplate();
      } else {
        alert('Erreur lors de la création du vote');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du vote');
    }
  };

  // Création de votations multiples avec template (chaque classe peut avoir ses propres options)
  const ouvrirTemplateMultiples = () => {
    if (selectedClasses.size === 0) {
      alert('Veuillez sélectionner au moins une classe');
      return;
    }
    setShowTemplateVoteForm(true);
  };

  const commencerPersonnalisation = (classeNom: string) => {
    setCustomizingClass(classeNom);
    // Initialiser les options personnalisées si besoin
    if (!customizingOptions[classeNom]) {
      setCustomizingOptions(prev => ({
        ...prev,
        [classeNom]: [...template.options]
      }));
    }
  };

  const updateClasseOption = (classeNom: string, index: number, value: string) => {
    const newOptions = [...(customizingOptions[classeNom] || template.options)];
    newOptions[index] = value;
    setCustomizingOptions(prev => ({
      ...prev,
      [classeNom]: newOptions
    }));
  };

  const addClasseOption = (classeNom: string) => {
    const currentOptions = customizingOptions[classeNom] || template.options;
    setCustomizingOptions(prev => ({
      ...prev,
      [classeNom]: [...currentOptions, '']
    }));
  };

  const removeClasseOption = (classeNom: string, index: number) => {
    const currentOptions = customizingOptions[classeNom] || template.options;
    if (currentOptions.length <= 2) return;
    setCustomizingOptions(prev => ({
      ...prev,
      [classeNom]: currentOptions.filter((_, i) => i !== index)
    }));
  };

  const validerPersonnalisation = (classeNom: string) => {
    setCustomizingClass(null);
  };

  const annulerPersonnalisation = (classeNom: string) => {
    setCustomizingOptions(prev => {
      const newOptions = { ...prev };
      delete newOptions[classeNom];
      return newOptions;
    });
    setCustomizingClass(null);
  };

  const creerVotesMultiples = async () => {
    if (selectedClasses.size === 0) {
      alert('Veuillez sélectionner au moins une classe');
      return;
    }

    if (!template.titre.trim()) {
      alert('Veuillez saisir un titre');
      return;
    }

    if (!template.question.trim()) {
      alert('Veuillez saisir une question');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const classeNom of selectedClasses) {
        const optionsForClass = customizingOptions[classeNom] || template.options;
        const finalOptions = optionsForClass.filter(opt => opt.trim() !== '');
        
        if (finalOptions.length < 2) {
          console.warn(`Classe ${classeNom}: options insuffisantes, vote ignoré`);
          continue;
        }

        const { error } = await supabase
          .from('votes')
          .insert({
            titre: template.titre,
            description: template.description || null,
            question: template.question,
            options: finalOptions,
            type_scrutin: template.type_scrutin,
            parametres: {
              anonymous: template.anonymous,
              show_results: template.show_results
            },
            anonymous_vote: template.anonymous_vote,
            candidates_source: template.candidates_source,
            module_contexte: 'conseil_classe',
            // ⚠️ NE PAS inclure 'module_id' - c'est un UUID !
            conseil_classe_classe_nom: classeNom,  // ← Stocker le nom de la classe ici
            conseil_classe_annee: annee,
            statut: 'brouillon',
            created_by: localStorage.getItem('userId'),
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error(`Erreur pour ${classeNom}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        alert(`Votes créés pour ${successCount} classe(s)${errorCount > 0 ? ` (${errorCount} erreurs)` : ''}`);
        setShowTemplateVoteForm(false);
        setCustomizingOptions({});
        resetTemplate();
      } else {
        alert('Erreur lors de la création des votes');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création des votes');
    }
  };

  const resetTemplate = () => {
    setTemplate({
      titre: '',
      description: '',
      question: '',
      type_scrutin: 'plurinominal',
      options: ['', ''],
      anonymous: true,
      anonymous_vote: false,
      show_results: 'after_close',
      candidates_source: 'custom'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Gestion multi-classes</h1>
          <p className="text-amber-100">Gérez les conseils de classe de toutes vos classes</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              🧑‍🏫 Éducateur - {classes.length} classe(s)
            </span>
          </div>
        </div>
      </div>

      {/* Actions principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Carte Votation unique */}
        <div
          onClick={() => {
            if (selectedClasses.size === 0) {
              alert('Veuillez d\'abord sélectionner au moins une classe');
              return;
            }
            setShowUniqueVoteForm(true);
          }}
          className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer ${
            selectedClasses.size === 0 ? 'border-gray-300 opacity-50 cursor-not-allowed' : 'border-amber-400'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Votation unique</h2>
              <p className="text-sm text-gray-500">
                {selectedClasses.size === 0 ? 'Sélectionnez des classes d\'abord' : `Pour ${selectedClasses.size} classe(s)`}
              </p>
            </div>
          </div>
          <p className="text-gray-600">Une même votation pour toutes les classes sélectionnées.</p>
        </div>

        {/* Carte Votations multiples avec template */}
        <div
          onClick={() => {
            if (selectedClasses.size === 0) {
              alert('Veuillez d\'abord sélectionner au moins une classe');
              return;
            }
            ouvrirTemplateMultiples();
          }}
          className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer ${
            selectedClasses.size === 0 ? 'border-gray-300 opacity-50 cursor-not-allowed' : 'border-amber-400'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Votations multiples</h2>
              <p className="text-sm text-gray-500">
                {selectedClasses.size === 0 ? 'Sélectionnez des classes d\'abord' : `Pour ${selectedClasses.size} classe(s)`}
              </p>
            </div>
          </div>
          <p className="text-gray-600">Un modèle de vote, personnalisable par classe.</p>
        </div>
      </div>

      {/* Sélection des classes */}
      {classes.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Mes classes ({classes.length})</h2>
            <button onClick={toggleAllClasses} className="text-sm text-amber-600 hover:text-amber-700">
              {selectedClasses.size === classes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classe) => (
              <div
                key={classe.classe_nom}
                onClick={() => toggleClasseSelection(classe.classe_nom)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition cursor-pointer ${
                  selectedClasses.has(classe.classe_nom) ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{classe.classe_nom}</h3>
                    <p className="text-sm text-gray-500">{classe.nb_eleves} élèves</p>
                  </div>
                  {selectedClasses.has(classe.classe_nom) && (
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/conseil-de-la-classe/${encodeURIComponent(classe.classe_nom)}`);
                  }}
                  className="mt-3 flex items-center gap-1 text-amber-600 text-sm hover:text-amber-700"
                >
                  Accéder au conseil <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {classes.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Vous n'êtes assigné à aucune classe</p>
          <p className="text-sm text-gray-400 mt-2">Contactez la direction pour être affecté à des niveaux</p>
        </div>
      )}

      {/* Modal Votation unique */}
      {showUniqueVoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Votation unique pour {selectedClasses.size} classe(s)</h2>
              <button onClick={() => setShowUniqueVoteForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {renderVoteForm(template, setTemplate, addTemplateOption, removeTemplateOption, updateTemplateOption)}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowUniqueVoteForm(false)} className="px-4 py-2 text-gray-700 hover:text-gray-900">
                  Annuler
                </button>
                <button onClick={creerVoteUnique} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  Créer pour {selectedClasses.size} classe(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Votations multiples avec template */}
      {showTemplateVoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Votations multiples pour {selectedClasses.size} classe(s)</h2>
              <button onClick={() => setShowTemplateVoteForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Template commun */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-4">Modèle de vote</h3>
                {renderVoteForm(template, setTemplate, addTemplateOption, removeTemplateOption, updateTemplateOption)}
              </div>

              {/* Personnalisation par classe */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Personnalisation par classe</h3>
                <div className="space-y-4">
                  {Array.from(selectedClasses).map((classeNom) => (
                    <div key={classeNom} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">Classe {classeNom}</h4>
                        {customizingClass === classeNom ? (
                          <div className="flex gap-2">
                            <button onClick={() => validerPersonnalisation(classeNom)} className="text-green-600 text-sm">
                              ✓ Valider
                            </button>
                            <button onClick={() => annulerPersonnalisation(classeNom)} className="text-red-600 text-sm">
                              ✗ Annuler
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => commencerPersonnalisation(classeNom)} className="flex items-center gap-1 text-amber-600 text-sm">
                            <Settings className="w-4 h-4" /> Personnaliser les options
                          </button>
                        )}
                      </div>

                      {customizingClass === classeNom ? (
                        <div className="space-y-3 pl-4">
                          <p className="text-sm text-gray-500 mb-2">Options personnalisées :</p>
                          {(customizingOptions[classeNom] || template.options).map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateClasseOption(classeNom, idx, e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                placeholder={`Option ${idx + 1}`}
                              />
                              {(customizingOptions[classeNom] || template.options).length > 2 && (
                                <button onClick={() => removeClasseOption(classeNom, idx)} className="text-red-500">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addClasseOption(classeNom)} className="text-sm text-amber-600">
                            + Ajouter une option
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          Options : {(customizingOptions[classeNom] || template.options).filter(o => o.trim()).join(' • ')}
                          {customizingOptions[classeNom] && <span className="ml-2 text-xs text-green-600">(personnalisé)</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowTemplateVoteForm(false)} className="px-4 py-2 text-gray-700 hover:text-gray-900">
                  Annuler
                </button>
                <button onClick={creerVotesMultiples} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  Créer pour {selectedClasses.size} classe(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant réutilisable pour le formulaire de vote
function renderVoteForm(
  template: TemplateVote,
  setTemplate: React.Dispatch<React.SetStateAction<TemplateVote>>,
  addOption: () => void,
  removeOption: (index: number) => void,
  updateOption: (index: number, value: string) => void
) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titre du vote *</label>
        <input
          type="text"
          value={template.titre}
          onChange={(e) => setTemplate(prev => ({ ...prev, titre: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
          placeholder="Ex: Élection des délégués"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={template.description}
          onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
          rows={2}
          placeholder="Contexte, explications..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Question posée *</label>
        <input
          type="text"
          value={template.question}
          onChange={(e) => setTemplate(prev => ({ ...prev, question: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
          placeholder="Ex: Qui souhaitez-vous comme délégué·e ?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type de scrutin</label>
        <select
          value={template.type_scrutin}
          onChange={(e) => setTemplate(prev => ({ ...prev, type_scrutin: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="plurinominal">Plurinominal (choix multiples)</option>
          <option value="uninominal">Uninominal (un seul choix)</option>
          <option value="approbation">Approbation (OUI/NON/Neutre)</option>
          <option value="jugement">Jugement majoritaire (mentions)</option>
          <option value="rang">Classement (ordre de préférence)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Options de réponse</label>
        <div className="space-y-2">
          {template.options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder={`Option ${index + 1}`}
              />
              {template.options.length > 2 && (
                <button onClick={() => removeOption(index)} className="text-red-500 hover:text-red-700">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addOption} className="text-sm text-amber-600 hover:text-amber-700">
            + Ajouter une option
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={template.anonymous}
            onChange={(e) => setTemplate(prev => ({ ...prev, anonymous: e.target.checked }))}
            className="rounded text-amber-600"
          />
          <span className="text-sm">Afficher comme vote anonyme (icône)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={template.anonymous_vote}
            onChange={(e) => setTemplate(prev => ({ ...prev, anonymous_vote: e.target.checked }))}
            className="rounded text-amber-600"
          />
          <span className="text-sm">🔒 Vote anonyme avec vérification par hash</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Affichage des résultats</label>
          <select
            value={template.show_results}
            onChange={(e) => setTemplate(prev => ({ ...prev, show_results: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
          >
            <option value="after_close">Après la clôture</option>
            <option value="after_vote">Après avoir voté</option>
            <option value="always">Toujours visibles</option>
          </select>
        </div>
      </div>
    </div>
  );
}