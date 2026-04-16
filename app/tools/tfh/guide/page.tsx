// app/tools/tfh/guide/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '../coordination/utils/sessionUtils';
import { getConvocationColor, getConvocationLabelShort } from '../coordination/utils/convocationUtils';

interface Eleve {
  student_matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  categorie: string;
  guide_id: string;
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  lecteur_interne_id: string | null;
  lecteur_externe_id: string | null;
  mediateur_id: string | null;
  guide_nom?: string;
  guide_prenom?: string;
  guide_initiale?: string;
  lecteur_interne_nom?: string;
  lecteur_interne_prenom?: string;
  lecteur_interne_initiale?: string;
  lecteur_externe_nom?: string;
  lecteur_externe_prenom?: string;
  mediateur_nom?: string;
  mediateur_prenom?: string;
  objectif_particulier: string | null;
  // Sessions dynamiques
  session_1_convoque?: string;
  session_2_convoque?: string;
  session_3_convoque?: string;
  session_4_convoque?: string;
  session_5_convoque?: string;
  session_6_convoque?: string;
  session_7_convoque?: string;
  session_8_convoque?: string;
  session_9_convoque?: string;
  session_10_convoque?: string;
  session_11_convoque?: string;
  session_12_convoque?: string;
  session_13_convoque?: string;
  session_14_convoque?: string;
  session_15_convoque?: string;
  session_16_convoque?: string;
  session_17_convoque?: string;
  session_18_convoque?: string;
  session_19_convoque?: string;
  session_20_convoque?: string;
}

interface Guide {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
}

interface LecteurExterne {
  id: string;
  nom: string;
  prenom: string;
}

interface Mediateur {
  id: string;
  nom: string;
  prenom: string;
}

type TabType = 'guide' | 'lecteur-interne' | 'defenses';

const CONVOCATION_OPTIONS = [
  { value: '', label: '-', color: 'bg-gray-100' },
  { 
    value: 'Non, l\'élève atteint bien les objectifs', 
    label: 'Non, l\'élève atteint bien les objectifs',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    value: 'Oui, l\'élève n\'atteint pas les objectifs', 
    label: 'Oui, l\'élève n\'atteint pas les objectifs',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  { 
    value: 'Oui, l\'élève n\'a pas avancé', 
    label: 'Oui, l\'élève n\'a pas avancé',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  { 
    value: 'Oui, l\'élève n\'a pas communiqué', 
    label: 'Oui, l\'élève n\'a pas communiqué',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
];

export default function GuideDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [defensesProgrammees, setDefensesProgrammees] = useState<Eleve[]>([]);
  const [defensesNonProgrammees, setDefensesNonProgrammees] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDefenses, setLoadingDefenses] = useState(false);
  const [userName, setUserName] = useState('');
  const [userGuideId, setUserGuideId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [selectedEleves, setSelectedEleves] = useState<number[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [categories, setCategories] = useState<string[]>([]);
  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [objectifGeneral, setObjectifGeneral] = useState<string>('');
  const [showObjectifModal, setShowObjectifModal] = useState(false);
  const [selectedEleveForObjectif, setSelectedEleveForObjectif] = useState<Eleve | null>(null);
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [savingObjectif, setSavingObjectif] = useState(false);
  const [sessions, setSessions] = useState<Array<{ index: number; nom: string }>>([]);
  const [displaySettings, setDisplaySettings] = useState({
    lecteur_interne_voir_eleves: true,
    lecteur_interne_voir_guides: true,
    lecteur_interne_voir_lecteurs_externes: true,
    lecteur_interne_voir_mediateurs: true,
  });
  
  const router = useRouter();

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');
    const userJob = localStorage.getItem('userJob');

    if (userType !== 'employee' || !userId || userJob !== 'prof') {
      router.push('/');
      return;
    }

    setUserName(name || '');
    setUserGuideId(userId);
    loadData(userId);
    loadSystemSettings();
  }, [router]);

  useEffect(() => {
    const chargerSessions = async () => {
      try {
        const journeesData = await getJourneesFromSupabase();
        const sessionsDetectees = detecterSessions(journeesData);
        
        const toutesSessions = sessionsDetectees.map(session => {
          const match = session.id.match(/session_(\d+)/);
          const index = match ? parseInt(match[1]) : 0;
          return {
            index: index,
            nom: session.nom
          };
        });
        
        setSessions(toutesSessions);
      } catch (error) {
        console.error('Erreur chargement des sessions:', error);
      }
    };
    
    chargerSessions();
  }, []);

  const loadData = async (guideId: string) => {
    try {
      setLoading(true);
      
      const { data: guidesData } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale')
        .eq('job', 'prof');
      setGuides(guidesData || []);

      const { data: lecteursExternesData } = await supabase
        .from('tfh_lecteurs_externes')
        .select('id, nom, prenom');
      setLecteursExternes(lecteursExternesData || []);

      const { data: mediateursData } = await supabase
        .from('tfh_mediateurs')
        .select('id, nom, prenom');
      setMediateurs(mediateursData || []);

      // Charger les élèves assignés à ce guide
      const { data: elevesData, error: elevesError } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          lecteur_interne_id,
          lecteur_externe_id,
          mediateur_id,
          problematique,
          categorie,
          objectif_particulier,
          date_defense,
          heure_defense,
          localisation_defense,
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
        .eq('guide_id', guideId)
        .order('students(classe)', { ascending: true })
        .order('students(nom)', { ascending: true });

      if (elevesError) throw elevesError;

      const elevesFormatted: Eleve[] = (elevesData || []).map(eleve => {
        const studentInfo = (eleve as any).students;
        const guideInfo = guidesData?.find(g => g.id === eleve.guide_id);
        const lecteurInterneInfo = guidesData?.find(g => g.id === eleve.lecteur_interne_id);
        const mediateurInfo = mediateursData?.find(m => m.id === eleve.mediateur_id);
        const lecteurExterneInfo = lecteursExternesData?.find(l => l.id === eleve.lecteur_externe_id);
        
        return {
          student_matricule: eleve.student_matricule,
          nom: studentInfo?.nom || '',
          prenom: studentInfo?.prenom || '',
          classe: studentInfo?.classe || '',
          guide_id: eleve.guide_id,
          lecteur_interne_id: eleve.lecteur_interne_id,
          lecteur_externe_id: eleve.lecteur_externe_id,
          mediateur_id: eleve.mediateur_id,
          problematique: eleve.problematique || '',
          categorie: eleve.categorie || '',
          objectif_particulier: eleve.objectif_particulier,
          date_defense: eleve.date_defense,
          heure_defense: eleve.heure_defense,
          localisation_defense: eleve.localisation_defense,
          guide_nom: guideInfo?.nom || '-',
          guide_prenom: guideInfo?.prenom || '',
          guide_initiale: guideInfo?.initiale || '-',
          lecteur_interne_nom: lecteurInterneInfo?.nom || '-',
          lecteur_interne_prenom: lecteurInterneInfo?.prenom || '',
          lecteur_interne_initiale: lecteurInterneInfo?.initiale || '-',
          lecteur_externe_nom: lecteurExterneInfo?.nom || '-',
          lecteur_externe_prenom: lecteurExterneInfo?.prenom || '-',
          mediateur_nom: mediateurInfo?.nom || '-',
          mediateur_prenom: mediateurInfo?.prenom || '-',
          session_1_convoque: eleve.session_1_convoque,
          session_2_convoque: eleve.session_2_convoque,
          session_3_convoque: eleve.session_3_convoque,
          session_4_convoque: eleve.session_4_convoque,
          session_5_convoque: eleve.session_5_convoque,
          session_6_convoque: eleve.session_6_convoque,
          session_7_convoque: eleve.session_7_convoque,
          session_8_convoque: eleve.session_8_convoque,
          session_9_convoque: eleve.session_9_convoque,
          session_10_convoque: eleve.session_10_convoque,
          session_11_convoque: eleve.session_11_convoque,
          session_12_convoque: eleve.session_12_convoque,
          session_13_convoque: eleve.session_13_convoque,
          session_14_convoque: eleve.session_14_convoque,
          session_15_convoque: eleve.session_15_convoque,
          session_16_convoque: eleve.session_16_convoque,
          session_17_convoque: eleve.session_17_convoque,
          session_18_convoque: eleve.session_18_convoque,
          session_19_convoque: eleve.session_19_convoque,
          session_20_convoque: eleve.session_20_convoque
        };
      });

      setEleves(elevesFormatted);

      // Charger les élèves disponibles pour lecteur interne
      const { data: elevesDispoData, error: elevesDispoError } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          problematique,
          categorie,
          date_defense,
          heure_defense,
          students!inner (nom, prenom, classe)
        `)
        .or(`lecteur_interne_id.is.null,lecteur_interne_id.eq.${guideId}`)
        .neq('guide_id', guideId)
        .not('categorie', 'is', null)
        .not('categorie', 'eq', '')
        .order('students(classe)', { ascending: true })
        .order('students(nom)', { ascending: true });

      if (elevesDispoError) throw elevesDispoError;

      const elevesDispoFormatted = (elevesDispoData || []).map(eleve => {
        const studentInfo = (eleve as any).students;
        const guideInfo = guidesData?.find(g => g.id === eleve.guide_id);
        
        return {
          student_matricule: eleve.student_matricule,
          nom: studentInfo?.nom || '',
          prenom: studentInfo?.prenom || '',
          classe: studentInfo?.classe || '',
          guide_id: eleve.guide_id,
          problematique: eleve.problematique || '',
          categorie: eleve.categorie || '',
          date_defense: eleve.date_defense,
          heure_defense: eleve.heure_defense,
          lecteur_interne_id: null,
          guide_nom: guideInfo?.nom || '-',
          guide_initiale: guideInfo?.initiale || '-'
        } as Eleve;
      });

      setElevesDisponibles(elevesDispoFormatted);

      const uniqueCategories = Array.from(
        new Set(elevesDispoFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      const preSelected = elevesDispoFormatted
        .filter(e => e.lecteur_interne_id === guideId)
        .map(e => e.student_matricule);
      setSelectedEleves(preSelected);

    } catch (err) {
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const { data: enabledData } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'guide_lecteur_interne_enabled')
        .maybeSingle();
      
      if (enabledData) {
        setLecteurInterneEnabled(enabledData.setting_value === 'true');
      }
  
      const { data: objectifData } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .maybeSingle();
      
      if (objectifData) {
        setObjectifGeneral(objectifData.setting_value || '');
      }
  
      const { data: displayData } = await supabase
        .from('tfh_system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'lecteur_interne_voir_eleves',
          'lecteur_interne_voir_guides',
          'lecteur_interne_voir_lecteurs_externes',
          'lecteur_interne_voir_mediateurs'
        ]);
    
      if (displayData) {
        const settings: any = {};
        displayData.forEach(setting => {
          settings[setting.setting_key] = setting.setting_value === 'true';
        });
        setDisplaySettings(prev => ({ ...prev, ...settings }));
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const loadDefenses = async (guideId: string) => {
    try {
      setLoadingDefenses(true);
      
      const { data: defensesData, error: defensesError } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          lecteur_interne_id,
          lecteur_externe_id,
          mediateur_id,
          problematique,
          categorie,
          date_defense,
          heure_defense,
          localisation_defense,
          students!inner (nom, prenom, classe)
        `)
        .or(`guide_id.eq.${guideId},lecteur_interne_id.eq.${guideId}`)
        .order('date_defense', { ascending: true, nullsFirst: false })
        .order('heure_defense', { ascending: true, nullsFirst: false })
        .order('students(classe)', { ascending: true })
        .order('students(nom)', { ascending: true });

      if (defensesError) throw defensesError;

      const { data: guidesData } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale');

      const { data: lecteursExternesData } = await supabase
        .from('tfh_lecteurs_externes')
        .select('id, nom, prenom');

      const { data: mediateursData } = await supabase
        .from('tfh_mediateurs')
        .select('id, nom, prenom');

      const defensesFormatted = (defensesData || []).map(eleve => {
        const studentInfo = (eleve as any).students;
        const guideInfo = guidesData?.find(g => g.id === eleve.guide_id);
        const lecteurInterneInfo = guidesData?.find(g => g.id === eleve.lecteur_interne_id);
        const mediateurInfo = mediateursData?.find(m => m.id === eleve.mediateur_id);
        const lecteurExterneInfo = lecteursExternesData?.find(l => l.id === eleve.lecteur_externe_id);
        
        return {
          student_matricule: eleve.student_matricule,
          nom: studentInfo?.nom || '',
          prenom: studentInfo?.prenom || '',
          classe: studentInfo?.classe || '',
          guide_id: eleve.guide_id,
          lecteur_interne_id: eleve.lecteur_interne_id,
          problematique: eleve.problematique || '',
          categorie: eleve.categorie || '',
          date_defense: eleve.date_defense,
          heure_defense: eleve.heure_defense,
          localisation_defense: eleve.localisation_defense,
          guide_nom: guideInfo?.nom || '-',
          guide_initiale: guideInfo?.initiale || '-',
          lecteur_interne_nom: lecteurInterneInfo?.nom || '-',
          lecteur_interne_initiale: lecteurInterneInfo?.initiale || '-',
          lecteur_externe_nom: lecteurExterneInfo?.nom || '-',
          lecteur_externe_prenom: lecteurExterneInfo?.prenom || '-',
          mediateur_nom: mediateurInfo?.nom || '-',
          mediateur_prenom: mediateurInfo?.prenom || '-'
        } as Eleve;
      });

      const programmees = defensesFormatted.filter(eleve => 
        eleve.date_defense && eleve.heure_defense
      );
      const nonProgrammees = defensesFormatted.filter(eleve => 
        !eleve.date_defense || !eleve.heure_defense
      );

      setDefensesProgrammees(programmees);
      setDefensesNonProgrammees(nonProgrammees);

    } catch (err) {
      console.error('Erreur chargement des défenses:', err);
    } finally {
      setLoadingDefenses(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'defenses' && userGuideId) {
      loadDefenses(userGuideId);
    }
  }, [activeTab, userGuideId]);

  const filteredElevesDisponibles = elevesDisponibles.filter(eleve => {
    if (selectedCategorie === 'toutes') return true;
    return eleve.categorie === selectedCategorie;
  });

  const handleToggleSelection = (eleveId: number) => {
    setSelectedEleves(prev => {
      if (prev.includes(eleveId)) {
        return prev.filter(id => id !== eleveId);
      } else {
        return [...prev, eleveId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEleves.length === filteredElevesDisponibles.length) {
      setSelectedEleves([]);
    } else {
      setSelectedEleves(filteredElevesDisponibles.map(e => e.student_matricule));
    }
  };

  const handleSaveLecteurInterne = async () => {
    try {
      const { error: clearError } = await supabase
        .from('tfh_eleves')
        .update({ lecteur_interne_id: null })
        .eq('lecteur_interne_id', userGuideId);

      if (clearError) throw clearError;

      if (selectedEleves.length > 0) {
        const { error: updateError } = await supabase
          .from('tfh_eleves')
          .update({ lecteur_interne_id: userGuideId })
          .in('student_matricule', selectedEleves);

        if (updateError) throw updateError;
      }

      await loadData(userGuideId);
      alert('Modifications enregistrées avec succès !');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleUpdateProblematique = async (eleveId: number, value: string) => {
    try {
      const { error } = await supabase
        .from('tfh_eleves')
        .update({ problematique: value })
        .eq('student_matricule', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => 
        eleve.student_matricule === eleveId ? { ...eleve, problematique: value } : eleve
      ));
    } catch (err) {
      console.error('Erreur mise à jour problématique:', err);
      loadData(userGuideId);
    }
  };

  const handleUpdateSessionConvocation = async (eleveId: number, sessionIndex: number, value: string) => {
    try {
      const columnName = `session_${sessionIndex}_convoque` as keyof Eleve;
      const updateData: any = {};
      updateData[columnName] = value;
  
      const { error } = await supabase
        .from('tfh_eleves')
        .update(updateData)
        .eq('student_matricule', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => {
        if (eleve.student_matricule === eleveId) {
          return { ...eleve, [columnName]: value };
        }
        return eleve;
      }));
    } catch (err) {
      console.error('Erreur mise à jour convocation:', err);
      loadData(userGuideId);
    }
  };

  const openObjectifModal = (eleve: Eleve) => {
    setSelectedEleveForObjectif(eleve);
    setObjectifParticulier(eleve.objectif_particulier || '');
    setShowObjectifModal(true);
  };

  const saveObjectifParticulier = async () => {
    if (!selectedEleveForObjectif) return;
  
    setSavingObjectif(true);
    try {
      const { error } = await supabase
        .from('tfh_eleves')
        .update({ objectif_particulier: objectifParticulier.trim() || null })
        .eq('student_matricule', selectedEleveForObjectif.student_matricule);
  
      if (error) throw error;
  
      const updatedEleves = eleves.map(eleve => 
        eleve.student_matricule === selectedEleveForObjectif.student_matricule 
          ? { ...eleve, objectif_particulier: objectifParticulier.trim() || null }
          : eleve
      );
      setEleves(updatedEleves);
  
      setShowObjectifModal(false);
      setSelectedEleveForObjectif(null);
      alert('Objectif sauvegardé avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde objectif:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSavingObjectif(false);
    }
  };

  const closeObjectifModal = () => {
    setShowObjectifModal(false);
    setSelectedEleveForObjectif(null);
    setObjectifParticulier('');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const calculateColspan = (isProgrammed: boolean) => {
    let count = 1;
    if (displaySettings.lecteur_interne_voir_eleves) count += 2;
    count += 2;
    if (displaySettings.lecteur_interne_voir_guides) count += 1;
    if (displaySettings.lecteur_interne_voir_lecteurs_externes) count += 1;
    if (displaySettings.lecteur_interne_voir_mediateurs) count += 1;
    return count;
  };

  if (loading && activeTab === 'guide') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement de vos élèves...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">TFH - Portail des internes</h1>
          </div>

        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'guide'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Guide ({eleves.length} élève(s))
          </button>
          
          {settingsLoaded && lecteurInterneEnabled && (
            <button
              onClick={() => setActiveTab('lecteur-interne')}
              className={`px-4 py-2 font-medium text-sm md:text-base ${
                activeTab === 'lecteur-interne'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lecteur interne
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('defenses')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'defenses'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Défenses programmées
          </button>
        </div>

        {activeTab === 'guide' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-blue-200 h-full">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <span className="text-xl">🎯</span>
                    Objectifs et échéances
                  </h2>
                  {objectifGeneral ? (
                    <>
                      <p className="text-sm text-gray-600 mb-3">
                        Tenez compte de ces objectifs pour décider des convocations à la prochaine session TFH.
                      </p>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-xs font-bold">!</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{objectifGeneral}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Les objectifs généraux seront définis par les coordinateurs.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-gray-200 h-full">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <span className="text-xl">📋</span>
                  Légende des convocations
                </h2>
                <div className="space-y-2">
                  {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
                    <div key={opt.value} className={`${opt.color} px-3 py-2 rounded-lg flex items-center gap-3`}>
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 rounded-full" style={{
                          backgroundColor: opt.color.includes('green') ? '#10B981' :
                                         opt.color.includes('yellow') ? '#F59E0B' :
                                         opt.color.includes('orange') ? '#F97316' :
                                         opt.color.includes('red') ? '#EF4444' : '#6B7280'
                        }}></div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{getConvocationLabelShort(opt.label)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Objectif particulier</th>
                    {sessions.map(session => (
                      <th key={session.index} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {session.nom}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eleves.map((eleve) => (
                    <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                      <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                      <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                      <td className="px-4 py-3 text-sm">
                        {editingCell?.id === eleve.student_matricule && editingCell?.field === 'problematique' ? (
                          <textarea
                            defaultValue={eleve.problematique}
                            onBlur={(e) => handleUpdateProblematique(eleve.student_matricule, e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({id: eleve.student_matricule, field: 'problematique'})}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start whitespace-pre-wrap break-words"
                          >
                            {eleve.problematique || '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          <button
                            onClick={() => openObjectifModal(eleve)}
                            className={`flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              eleve.objectif_particulier
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={eleve.objectif_particulier || "Cliquer pour définir un objectif"}
                          >
                            <span className={`text-lg ${eleve.objectif_particulier ? 'text-green-600' : 'text-gray-400'}`}>🎯</span>
                            <span className="text-xs">
                              {eleve.objectif_particulier 
                                ? (eleve.objectif_particulier.length > 20 
                                    ? eleve.objectif_particulier.substring(0, 20) + '...' 
                                    : eleve.objectif_particulier)
                                : 'Définir'}
                            </span>
                          </button>
                          {eleve.objectif_particulier && (
                            <div className="text-xs text-gray-500 text-center">
                              {eleve.objectif_particulier.length > 100 ? `${Math.ceil(eleve.objectif_particulier.length / 100)} paragraphe(s)` : 'Objectif défini'}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {sessions.map(session => {
                        const columnName = `session_${session.index}_convoque` as keyof Eleve;
                        const statut = eleve[columnName] as string || '';
                        
                        return (
                          <td key={session.index} className="px-4 py-3">
                            <div className="space-y-1">
                              <select
                                value={statut}
                                onChange={(e) => handleUpdateSessionConvocation(eleve.student_matricule, session.index, e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(statut)}`}
                                title={statut || 'Non défini'}
                              >
                                {CONVOCATION_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} className={opt.color}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <div className={`text-xs px-2 py-1 rounded truncate ${getConvocationColor(statut)}`}>
                                {getConvocationLabelShort(statut)}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'lecteur-interne' ? (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-800">Mode sélection lecteur interne</h3>
                  <p className="text-sm text-purple-600 mt-1">
                    Sélectionnez les élèves pour lesquels vous serez lecteur interne.
                  </p>
                </div>
                <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {selectedEleves.length} sélectionné(s)
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">Sélection des élèves comme lecteur interne</h2>
                  <p className="text-gray-600 mt-1">
                    Sélectionnez les élèves pour lesquels vous serez lecteur interne.
                    N'oubliez pas d'enregistrer si vous cochez des élèves dans la liste.
                  </p>
                </div>
                <div className="flex flex-col md:items-end gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filtrer par catégorie:</label>
                    <select
                      value={selectedCategorie}
                      onChange={(e) => setSelectedCategorie(e.target.value)}
                      className="border rounded px-3 py-1 text-sm"
                    >
                      <option value="toutes">Toutes les catégories</option>
                      {categories.map(categorie => (
                        <option key={categorie} value={categorie}>{categorie}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{selectedEleves.length} élève(s) sélectionné(s)</span>
                    <button
                      onClick={handleSaveLecteurInterne}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Enregistrer la sélection
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={selectedEleves.length === filteredElevesDisponibles.length && filteredElevesDisponibles.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </th>
                    {displaySettings.lecteur_interne_voir_eleves && (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date défense</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure défense</th>
                    {displaySettings.lecteur_interne_voir_guides && ( 
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredElevesDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={calculateColspan(true)} className="px-4 py-8 text-center text-gray-500">
                        {selectedCategorie === 'toutes' 
                          ? "Aucun élève disponible pour le moment."
                          : `Aucun élève trouvé dans la catégorie "${selectedCategorie}".`}
                       </td>
                    </tr>
                  ) : (
                    filteredElevesDisponibles.map((eleve) => (
                      <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedEleves.includes(eleve.student_matricule)}
                            onChange={() => handleToggleSelection(eleve.student_matricule)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                         </td>
                        
                        {displaySettings.lecteur_interne_voir_eleves && ( 
                          <>
                            <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium">{eleve.nom}</span>
                                <span>{eleve.prenom}</span>
                              </div>
                             </td>
                          </>
                        )}
                        
                        <td className="px-4 py-3 text-sm">
                          {eleve.categorie ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {eleve.categorie}
                            </span>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-xs whitespace-pre-wrap break-words min-h-[40px]">
                            {eleve.problematique || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          {eleve.date_defense ? formatDate(eleve.date_defense) : 'Non définie'}
                        </td>
                        
                        <td className="px-4 py-3 text-sm">
                          {eleve.heure_defense ? eleve.heure_defense.substring(0, 5) : 'Non définie'}
                        </td>
                        
                        {displaySettings.lecteur_interne_voir_guides && ( 
                          <td className="px-4 py-3 text-sm">
                            {eleve.guide_nom} {eleve.guide_initiale}.
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800">Défenses programmées</h2>
              <p className="text-gray-600 mt-1">Liste de tous vos élèves (en tant que guide ou lecteur interne).</p>
            </div>

            {loadingDefenses ? (
              <div className="text-center py-12"><div className="text-xl">Chargement des données...</div></div>
            ) : defensesProgrammees.length === 0 && defensesNonProgrammees.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun élève trouvé</h3>
                <p className="text-gray-500">Vous n'avez pas d'élèves assignés (en tant que guide ou lecteur interne).</p>
              </div>
            ) : (
              <div className="space-y-8">
                {defensesProgrammees.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Défenses programmées ({defensesProgrammees.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Défenses avec date, heure et localisation définies.</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Localisation</th>
                            {displaySettings.lecteur_interne_voir_eleves && (
                              <>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Élève</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-96">Problématique</th>
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                            )}
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                            )}
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>
                            )}
                            {displaySettings.lecteur_interne_voir_mediateurs && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {defensesProgrammees.map((eleve) => {
                            const isGuide = eleve.guide_id === userGuideId;
                            const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                            
                            return (
                              <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{formatDate(eleve.date_defense)}</td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">{eleve.heure_defense || '-'}</td>
                                <td className="px-4 py-3 text-sm">{eleve.localisation_defense || '-'}</td>

                                {displaySettings.lecteur_interne_voir_eleves && (
                                  <>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{eleve.nom}</span>
                                        <span className="truncate">{eleve.prenom}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                                  </>
                                )}
                                                   
                                <td className="px-4 py-3 text-sm">
                                  {eleve.categorie ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                      {eleve.categorie}
                                    </span>
                                  ) : '-'}
                                </td>
                        
                                <td className="px-4 py-3 text-sm">
                                  <div className="whitespace-pre-wrap break-words min-h-[40px] max-w-96">
                                    {eleve.problematique || '-'}
                                  </div>
                                </td>
                        
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.guide_nom} {eleve.guide_initiale}.
                                    {isGuide && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                  </td>
                                )}
                        
                                {displaySettings.lecteur_interne_voir_guides && ( 
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_interne_nom ? (
                                      <span>
                                        {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}
                                        {isLecteurInterne && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                      </span>
                                    ) : '-'}
                                  </td>
                                )}
                        
                                {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_externe_nom ? `${eleve.lecteur_externe_prenom} ${eleve.lecteur_externe_nom}` : '-'}
                                  </td>
                                )}
                        
                                {displaySettings.lecteur_interne_voir_mediateurs && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.mediateur_nom ? `${eleve.mediateur_prenom} ${eleve.mediateur_nom}` : '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {defensesNonProgrammees.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                        Défenses non programmées ({defensesNonProgrammees.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Défenses en attente de programmation.</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            {displaySettings.lecteur_interne_voir_eleves && (
                              <>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Élève</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-96">Problématique</th>
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                            )}
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                            )}
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>
                            )}
                            {displaySettings.lecteur_interne_voir_mediateurs && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {defensesNonProgrammees.map((eleve) => {
                            const isGuide = eleve.guide_id === userGuideId;
                            const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                            
                            return (
                              <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                                {displaySettings.lecteur_interne_voir_eleves && (
                                  <>
                                    <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{eleve.nom}</span>
                                        <span className="truncate">{eleve.prenom}</span>
                                      </div>
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3 text-sm">
                                  {eleve.categorie ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                      {eleve.categorie}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="whitespace-pre-wrap break-words min-h-[40px] max-w-96">
                                    {eleve.problematique || '-'}
                                  </div>
                                </td>
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.guide_nom} {eleve.guide_initiale}.
                                    {isGuide && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_interne_nom ? (
                                      <span>
                                        {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                                        {isLecteurInterne && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                      </span>
                                    ) : '-'}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_externe_nom ? `${eleve.lecteur_externe_prenom} ${eleve.lecteur_externe_nom}` : '-'}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_mediateurs && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.mediateur_nom ? `${eleve.mediateur_prenom} ${eleve.mediateur_nom}` : '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              {activeTab === 'guide' && 'Vous pouvez modifier la problématique en cliquant dessus, et les convocations via les menus déroulants.'}
              {activeTab === 'lecteur-interne' && 'Sélectionnez les élèves pour lesquels vous serez lecteur interne. Un élève ne peut avoir qu\'un seul lecteur interne.'}
              {activeTab === 'defenses' && 'Affichage séparé des défenses programmées et non programmées.'}
            </span>
          </p>
        </div>
      </div>

      {showObjectifModal && selectedEleveForObjectif && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">🎯 Objectif particulier</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEleveForObjectif.prenom} {selectedEleveForObjectif.nom} - {selectedEleveForObjectif.classe}
                  </p>
                </div>
                <button onClick={closeObjectifModal} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
      
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Objectif spécifique pour cet élève :</label>
                <textarea
                  value={objectifParticulier}
                  onChange={(e) => setObjectifParticulier(e.target.value)}
                  className="w-full h-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Définir un objectif pédagogique spécifique pour cet élève..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Cet objectif n'est visible que par vous (guide) et l'administration.</p>
              </div>
      
              {selectedEleveForObjectif.problematique && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Problématique de l'élève :</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedEleveForObjectif.problematique}</p>
                </div>
              )}
            </div>
      
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeObjectifModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={savingObjectif}
                >
                  Annuler
                </button>
                <button
                  onClick={saveObjectifParticulier}
                  disabled={savingObjectif}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    !savingObjectif
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-400 text-white cursor-not-allowed'
                  }`}
                >
                  {savingObjectif ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    'Sauvegarder l\'objectif'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}