// app/tools/tfh/eleve/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '../coordination/utils/sessionUtils';

interface EleveInfo {
  student_matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  thematique: string;
  source_1: string;
  source_2: string;
  source_3: string;
  source_4: string;
  source_5: string;
  categorie: string;
  guide_nom: string;
  guide_prenom: string;
  guide_initiale: string;
  sessions?: Array<{
    index: number;
    nom: string;
    date_debut: Date;
    statut: string;
  }>;
  defense?: {
    date: string;
    heure: string;
    localisation: string;
    mediateur_nom?: string;
    mediateur_prenom?: string;
    lecteur_interne_nom?: string;
    lecteur_interne_initiale?: string;
    lecteur_externe_nom?: string;
    lecteur_externe_prenom?: string;
  };
  displaySettings?: {
    eleves_voir_guides: boolean;
    eleves_voir_defenses: boolean;
  };
}

export default function EleveDashboard() {
  const [eleve, setEleve] = useState<EleveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phasePreparatoire, setPhasePreparatoire] = useState(false);
  
  // États pour la problématique
  const [editingProblematique, setEditingProblematique] = useState(false);
  const [newProblematique, setNewProblematique] = useState('');
  
  // États pour la thématique
  const [editingThematique, setEditingThematique] = useState(false);
  const [newThematique, setNewThematique] = useState('');
  
  // États pour les sources
  const [editingSource1, setEditingSource1] = useState(false);
  const [newSource1, setNewSource1] = useState('');
  const [editingSource2, setEditingSource2] = useState(false);
  const [newSource2, setNewSource2] = useState('');
  const [editingSource3, setEditingSource3] = useState(false);
  const [newSource3, setNewSource3] = useState('');
  const [editingSource4, setEditingSource4] = useState(false);
  const [newSource4, setNewSource4] = useState('');
  const [editingSource5, setEditingSource5] = useState(false);
  const [newSource5, setNewSource5] = useState('');
  
  // Objectifs
  const [objectifGeneral, setObjectifGeneral] = useState('');
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [autorisationModification, setAutorisationModification] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      
      if (userType !== 'student' || !userId) {
        router.push('/');
        return;
      }
      
      loadPhasePreparatoire();
      loadEleve(parseInt(userId));
    }
  }, [router]);

  const loadPhasePreparatoire = async () => {
    try {
      const { data, error } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'phase_preparatoire')
        .maybeSingle();
      
      if (data) {
        setPhasePreparatoire(data.setting_value === 'true');
      }
    } catch (err) {
      console.error('Erreur chargement phase préparatoire:', err);
    }
  };

  const loadEleve = async (matricule: number) => {
    try {
      // Charger les données TFH de l'élève avec les relations
      const { data, error } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          problematique,
          thematique,
          categorie,
          source_1,
          source_2,
          source_3,
          source_4,
          source_5,
          objectif_particulier,
          date_defense,
          heure_defense,
          localisation_defense,
          guide_id,
          mediateur_id,
          lecteur_interne_id,
          lecteur_externe_id,
          session_1_convoque,
          session_2_convoque,
          session_3_convoque,
          session_4_convoque,
          session_5_convoque,
          session_6_convoque,
          session_7_convoque,
          session_8_convoque,
          session_9_convoque,
          session_10_convoque,
          session_11_convoque,
          session_12_convoque,
          session_13_convoque,
          session_14_convoque,
          session_15_convoque,
          session_16_convoque,
          session_17_convoque,
          session_18_convoque,
          session_19_convoque,
          session_20_convoque,
          students!inner (nom, prenom, classe)
        `)
        .eq('student_matricule', matricule)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setLoading(false);
        return;
      }

      const studentInfo = (data as any).students;
      
      // Charger les infos du guide
      let guide_nom = null;
      let guide_prenom = null;
      let guide_initiale = null;
      
      if (data.guide_id) {
        const { data: guide } = await supabase
          .from('employees')
          .select('nom, prenom, initiale')
          .eq('id', data.guide_id)
          .single();
        
        if (guide) {
          guide_nom = guide.nom;
          guide_prenom = guide.prenom;
          guide_initiale = guide.initiale;
        }
      }
      
      // Charger les infos du médiateur
      let mediateur_nom = null;
      let mediateur_prenom = null;
      
      if (data.mediateur_id) {
        const { data: mediateur } = await supabase
          .from('tfh_mediateurs')
          .select('nom, prenom')
          .eq('id', data.mediateur_id)
          .single();
        
        if (mediateur) {
          mediateur_nom = mediateur.nom;
          mediateur_prenom = mediateur.prenom;
        }
      }
      
      // Charger les infos du lecteur interne
      let lecteur_interne_nom = null;
      let lecteur_interne_initiale = null;
      
      if (data.lecteur_interne_id) {
        const { data: lecteurInterne } = await supabase
          .from('employees')
          .select('nom, initiale')
          .eq('id', data.lecteur_interne_id)
          .single();
        
        if (lecteurInterne) {
          lecteur_interne_nom = lecteurInterne.nom;
          lecteur_interne_initiale = lecteurInterne.initiale;
        }
      }
      
      // Charger les infos du lecteur externe
      let lecteur_externe_nom = null;
      let lecteur_externe_prenom = null;
      
      if (data.lecteur_externe_id) {
        const { data: lecteurExterne } = await supabase
          .from('tfh_lecteurs_externes')
          .select('nom, prenom')
          .eq('id', data.lecteur_externe_id)
          .single();
        
        if (lecteurExterne) {
          lecteur_externe_nom = lecteurExterne.nom;
          lecteur_externe_prenom = lecteurExterne.prenom;
        }
      }
      
      // Charger les sessions
      const journeesData = await getJourneesFromSupabase();
      const sessionsDetectees = detecterSessions(journeesData);
      
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      
      const sessionsAvecDates = sessionsDetectees.map(session => {
        const match = session.id.match(/session_(\d+)/);
        const index = match ? parseInt(match[1]) : 0;
        const columnName = `session_${index}_convoque` as keyof typeof data;
        const statut = data[columnName] as string || '';
        
        const dateDebut = session.date_debut instanceof Date 
          ? session.date_debut 
          : new Date(session.date_debut);
        
        return {
          index: index,
          nom: session.nom,
          date_debut: dateDebut,
          statut: statut
        };
      });
      
      const sessionsAVenir = sessionsAvecDates.filter(session => 
        session.date_debut >= aujourdhui
      );
      
      // Charger les paramètres d'affichage
      const { data: settingsData } = await supabase
        .from('tfh_system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['eleves_voir_guides', 'eleves_voir_defenses']);
      
      const displaySettings: any = {};
      if (settingsData) {
        settingsData.forEach(setting => {
          displaySettings[setting.setting_key] = setting.setting_value === 'true';
        });
      }
      
      // Formater l'heure
      const formatHeure = (heure: string): string => {
        if (!heure) return '';
        const match = heure.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          const heures = match[1];
          const minutes = match[2];
          return `${heures}h${minutes}`;
        }
        return heure;
      };
      
      const defenseData = {
        date: data.date_defense || '',
        heure: data.heure_defense ? formatHeure(data.heure_defense) : '',
        localisation: data.localisation_defense || '',
        mediateur_nom: mediateur_nom || '',
        mediateur_prenom: mediateur_prenom || '',
        lecteur_interne_nom: lecteur_interne_nom || '',
        lecteur_interne_initiale: lecteur_interne_initiale || '',
        lecteur_externe_nom: lecteur_externe_nom || '',
        lecteur_externe_prenom: lecteur_externe_prenom || ''
      };
      
      const eleveFormate: EleveInfo = {
        student_matricule: data.student_matricule,
        nom: studentInfo?.nom || '',
        prenom: studentInfo?.prenom || '',
        classe: studentInfo?.classe || '',
        problematique: data.problematique || '',
        thematique: data.thematique || '',
        source_1: data.source_1 || '',
        source_2: data.source_2 || '',
        source_3: data.source_3 || '',
        source_4: data.source_4 || '',
        source_5: data.source_5 || '',
        categorie: data.categorie || '',
        guide_nom: guide_nom || '-',
        guide_prenom: guide_prenom || '',
        guide_initiale: guide_initiale || '-',
        sessions: sessionsAVenir,
        defense: defenseData,
        displaySettings: displaySettings
      };
      
      setEleve(eleveFormate);
      setNewProblematique(data.problematique || '');
      setNewThematique(data.thematique || '');
      setNewSource1(data.source_1 || '');
      setNewSource2(data.source_2 || '');
      setNewSource3(data.source_3 || '');
      setNewSource4(data.source_4 || '');
      setNewSource5(data.source_5 || '');
      
      // Charger l'objectif général
      const { data: objectifGeneralData } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .maybeSingle();
      
      if (objectifGeneralData) {
        setObjectifGeneral(objectifGeneralData.setting_value || '');
      }
      
      // Charger l'autorisation de modification
      const { data: autorisationData } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'autorisation_modification_problematique')
        .maybeSingle();
      
      if (autorisationData) {
        setAutorisationModification(autorisationData.setting_value === 'true');
      }
      
      setObjectifParticulier(data.objectif_particulier || '');
      
    } catch (err) {
      console.error('Erreur chargement élève:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProblematique = async () => {
    if (!eleve) return;

    try {
      await supabase
        .from('tfh_eleves')
        .update({ problematique: newProblematique })
        .eq('student_matricule', eleve.student_matricule);

      setEleve({ ...eleve, problematique: newProblematique });
      setEditingProblematique(false);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleSaveThematique = async () => {
    if (!eleve) return;

    try {
      await supabase
        .from('tfh_eleves')
        .update({ thematique: newThematique })
        .eq('student_matricule', eleve.student_matricule);

      setEleve({ ...eleve, thematique: newThematique });
      setEditingThematique(false);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleSaveSource = async (sourceField: string, value: string) => {
    if (!eleve) return;

    try {
      await supabase
        .from('tfh_eleves')
        .update({ [sourceField]: value })
        .eq('student_matricule', eleve.student_matricule);

      setEleve({ ...eleve, [sourceField]: value });
      
      switch(sourceField) {
        case 'source_1': setEditingSource1(false); break;
        case 'source_2': setEditingSource2(false); break;
        case 'source_3': setEditingSource3(false); break;
        case 'source_4': setEditingSource4(false); break;
        case 'source_5': setEditingSource5(false); break;
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const getMessagePourEleve = (statut: string): string => {
    // Gérer les cas NULL, undefined ou chaîne vide
    if (!statut || statut === '' || statut === 'null' || statut === 'undefined') {
      return 'Ton guide n\'a pas encore rendu d\'info sur ta convocation. Nous considérons donc actuellement que tu n\'es pas convoqué·e.';
    }
    
    switch (statut) {
      case 'Oui, l\'élève n\'a pas communiqué':
        return 'Tu es convoqué·e car tu n\'as pas communiqué (ou pas assez) selon ton/ta guide.';
      case 'Oui, l\'élève n\'a pas avancé':
        return 'Tu es convoqué·e car tu n\'as pas avancé (ou sensiblement pas) selon ton/ta guide.';
      case 'Oui, l\'élève n\'atteint pas les objectifs':
        return 'Tu es convoqué·e car tu as avancé mais n\'atteins pas les objectifs.';
      case 'Non, l\'élève atteint bien les objectifs':
        return 'Tu n\'es pas convoqué·e.';
      default:
        return statut;
    }
  };

  const DefenseSection = ({ eleve }: { eleve: EleveInfo }) => {
    if (!eleve.displaySettings?.eleves_voir_defenses) {
      return null;
    }
    
    if (!eleve.defense || !eleve.defense.date) {
      return null;
    }
  
    return (
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚖️</span>
          <h3 className="text-lg font-semibold text-gray-700">Ma défense TFH</h3>
          {eleve.defense.date && (
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              À venir
            </span>
          )}
        </div>
  
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eleve.defense.date && (
              <div className="flex items-start gap-3">
                <div className="mt-1"><span className="text-purple-500 text-xl">📅</span></div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Date et heure</p>
                  <p className="text-gray-800">
                    {new Date(eleve.defense.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {eleve.defense.heure && ` à ${eleve.defense.heure}`}
                  </p>
                </div>
              </div>
            )}
  
            {eleve.defense.localisation && (
              <div className="flex items-start gap-3">
                <div className="mt-1"><span className="text-purple-500 text-xl">📍</span></div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Lieu</p>
                  <p className="text-gray-800">{eleve.defense.localisation}</p>
                </div>
              </div>
            )}
  
            {eleve.displaySettings?.eleves_voir_guides && eleve.defense.mediateur_nom && (
              <div className="flex items-start gap-3">
                <div className="mt-1"><span className="text-purple-500 text-xl">⚖️</span></div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Médiateur·trice</p>
                  <p className="text-gray-800">
                    {eleve.defense.mediateur_prenom} {eleve.defense.mediateur_nom}
                  </p>
                </div>
              </div>
            )}
  
            {eleve.defense.lecteur_interne_nom && (
              <div className="flex items-start gap-3">
                <div className="mt-1"><span className="text-purple-500 text-xl">📖</span></div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Lecteur·rice interne</p>
                  <p className="text-gray-800">
                    {eleve.defense.lecteur_interne_nom} {eleve.defense.lecteur_interne_initiale}.
                  </p>
                </div>
              </div>
            )}
  
            {eleve.defense.lecteur_externe_nom && (
              <div className="flex items-start gap-3">
                <div className="mt-1"><span className="text-purple-500 text-xl">👁️</span></div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Lecteur·rice externe</p>
                  <p className="text-gray-800">
                    {eleve.defense.lecteur_externe_prenom} {eleve.defense.lecteur_externe_nom}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    router.push('/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!eleve) {
    return <div className="min-h-screen flex items-center justify-center">Élève non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Mon TFH</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {eleve.prenom} {eleve.nom}
            </h2>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Classe:</span> {eleve.classe}</p>
              
              {eleve.displaySettings?.eleves_voir_guides && (
                <p><span className="font-medium">Guide:</span> {eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.</p>
              )}
              
              {eleve.categorie && (
                <p><span className="font-medium">Catégorie:</span> {eleve.categorie}</p>
              )}
              {phasePreparatoire && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🚧 Phase préparatoire
                  </span>
                </div>
              )}
            </div>
          </div>

          {phasePreparatoire && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-700">Thématique</h3>
                {!editingThematique && autorisationModification && (
                  <button
                    onClick={() => setEditingThematique(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {eleve.thematique ? 'Modifier' : 'Ajouter'}
                  </button>
                )}
              </div>
              
              {editingThematique ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newThematique}
                    onChange={(e) => setNewThematique(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Transition écologique, Intelligence artificielle, Inégalités sociales..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveThematique}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingThematique(false);
                        setNewThematique(eleve.thematique || '');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  {eleve.thematique || <span className="text-gray-400 italic">Aucune thématique définie</span>}
                </div>
              )}
            </div>
          )}

          <DefenseSection eleve={eleve} />

          <div className={`${phasePreparatoire ? '' : 'border-t'} pt-6`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Problématique</h3>
              {!editingProblematique && (
                autorisationModification ? (
                  <button
                    onClick={() => setEditingProblematique(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {eleve.problematique ? 'Modifier' : 'Ajouter'}
                  </button>
                ) : (
                  <span className="text-sm text-gray-400 italic flex items-center gap-1">
                    <span className="text-xs">🔒</span>
                    Demandez à un coordinateur pour modifier
                  </span>
                )
              )}
            </div>
            
            {editingProblematique ? (
              <div className="space-y-3">
                <textarea
                  value={newProblematique}
                  onChange={(e) => setNewProblematique(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[150px] focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez votre problématique..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProblematique}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setEditingProblematique(false);
                      setNewProblematique(eleve.problematique || '');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                {eleve.problematique || 'Aucune problématique définie'}
              </div>
            )}
          </div>

          {phasePreparatoire && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Sources documentaires</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((num) => {
                  const sourceField = `source_${num}` as keyof EleveInfo;
                  const editingState = num === 1 ? editingSource1 : num === 2 ? editingSource2 : num === 3 ? editingSource3 : num === 4 ? editingSource4 : editingSource5;
                  const setEditing = num === 1 ? setEditingSource1 : num === 2 ? setEditingSource2 : num === 3 ? setEditingSource3 : num === 4 ? setEditingSource4 : setEditingSource5;
                  const newValue = num === 1 ? newSource1 : num === 2 ? newSource2 : num === 3 ? newSource3 : num === 4 ? newSource4 : newSource5;
                  const setNewValue = num === 1 ? setNewSource1 : num === 2 ? setNewSource2 : num === 3 ? setNewSource3 : num === 4 ? setNewSource4 : setNewSource5;
                  const currentValue = eleve[sourceField] as string || '';
                  
                  return (
                    <div key={num}>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-600">Source {num}</label>
                        {!editingState && autorisationModification && (
                          <button
                            onClick={() => setEditing(true)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {currentValue ? 'Modifier' : 'Ajouter'}
                          </button>
                        )}
                      </div>
                      {editingState ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Titre de la source, lien, référence..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveSource(sourceField, newValue)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => {
                                setEditing(false);
                                setNewValue(currentValue);
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          {currentValue || <span className="text-gray-400 italic">Aucune source</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!phasePreparatoire && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Convocations à venir</h3>
              <div className="space-y-4">
                {eleve.sessions && eleve.sessions.length > 0 ? (
                  eleve.sessions.map(session => {
                    const statut = session.statut || '';
                    const estConvoque = statut.startsWith('Oui');
                    const message = getMessagePourEleve(statut);
                    
                    return (
                      <div key={session.index} className="border rounded-lg overflow-hidden">
                        <div className={`flex justify-between items-center p-3 ${estConvoque ? 'bg-orange-50' : 'bg-gray-50'}`}>
                          <div>
                            <span className="font-medium">{session.nom}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({session.date_debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })})
                            </span>
                          </div>
                        <span className={
                          estConvoque ? 'text-orange-600 font-medium' : 
                          (!statut || statut === '' || statut.startsWith('Non')) ? 'text-green-600 font-medium' : 
                          'text-gray-500'
                        }>
                          {estConvoque ? 'Convoqué·e' : 
                          (!statut || statut === '') ? 'Non convoqué·e' :
                          statut.startsWith('Non') ? 'Non convoqué·e' : '—'}
                        </span>
                        </div>
                        
                      {(!statut || statut === '' || (statut && !statut.startsWith('Non'))) && (
                        <div className="p-3 border-t bg-white">
                          <p className="text-sm text-gray-700">{message}</p>
                        </div>
                      )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <p className="mb-2">Aucune session à venir planifiée.</p>
                    <p className="text-sm">Tes prochaines convocations apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {objectifGeneral && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h3 className="text-lg font-semibold text-gray-700">Objectif général du TFH</h3>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1"><span className="text-blue-500 text-xl">📋</span></div>
                  <div className="flex-1">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{objectifGeneral}</p>
                    <p className="text-sm text-blue-600 mt-3 font-medium">Cet objectif s'applique à tous les élèves.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {objectifParticulier && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⭐</span>
                <h3 className="text-lg font-semibold text-gray-700">Objectif particulier pour vous</h3>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1"><span className="text-green-500 text-xl">✨</span></div>
                  <div className="flex-1">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{objectifParticulier}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Défini par ton/ta guide
                      </span>
                      <span className="text-xs text-green-600">
                        {eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!objectifParticulier && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⭐</span>
                <h3 className="text-lg font-semibold text-gray-700">Objectif particulier</h3>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-5 border border-gray-100">
                <div className="text-center py-4">
                  <span className="text-3xl mb-3 block">🤔</span>
                  <p className="text-gray-600 mb-2">Ton/ta guide n'a pas encore défini d'objectif particulier pour toi.</p>
                  <p className="text-sm text-gray-500">Cet objectif sera personnalisé selon tes besoins spécifiques.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}