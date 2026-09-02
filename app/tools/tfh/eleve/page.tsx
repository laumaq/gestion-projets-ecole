// app/tools/tfh/eleve/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '../coordination/utils/sessionUtils';
import { 
  User, 
  GraduationCap, 
  BookOpen, 
  Target, 
  Sparkles,
  Link2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Printer,
  LogOut,
  FileText,
  Search,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  BookOpen as BookIcon,
  Users as UsersIcon,
  Palette,
  Hammer
} from 'lucide-react';

interface EleveInfo {
  student_matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  type: string;
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
  guide_accepte_numerique?: boolean;
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
    mediateur_accepte_numerique?: boolean;
    lecteur_interne_nom?: string;
    lecteur_interne_initiale?: string;
    lecteur_interne_accepte_numerique?: boolean;
    lecteur_externe_nom?: string;
    lecteur_externe_prenom?: string;
    lecteur_externe_accepte_numerique?: boolean;
  };
  displaySettings?: {
    eleves_voir_guides: boolean;
    eleves_voir_defenses: boolean;
  };
  url_tfh?: string;
}

// Types de TFH avec leurs icônes et couleurs
const TFH_TYPES = {
  mémoire: { icon: BookIcon, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Mémoire' },
  associatif: { icon: UsersIcon, color: 'bg-green-100 text-green-800 border-green-200', label: 'Associatif' },
  artistique: { icon: Palette, color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Artistique' },
  atelier: { icon: Hammer, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Atelier' },
};

export default function EleveDashboard() {
  const [eleve, setEleve] = useState<EleveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phasePreparatoire, setPhasePreparatoire] = useState(false);
  const [savingType, setSavingType] = useState(false);
  
  const [editingProblematique, setEditingProblematique] = useState(false);
  const [newProblematique, setNewProblematique] = useState('');
  
  const [editingThematique, setEditingThematique] = useState(false);
  const [newThematique, setNewThematique] = useState('');
  
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
  
  const [editingUrl, setEditingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  
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
      const { data, error } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          type,
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
          url_tfh,
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
      
      let guide_nom = '';
      let guide_prenom = '';
      let guide_initiale = '';
      let guide_accepte_numerique = false;
      
      if (data.guide_id) {
        const { data: guide } = await supabase
          .from('employees')
          .select('nom, prenom, initiale, tfh_accepte_numerique')
          .eq('id', data.guide_id)
          .single();
        
        if (guide) {
          guide_nom = guide.nom || '';
          guide_prenom = guide.prenom || '';
          guide_initiale = guide.initiale || '';
          guide_accepte_numerique = guide.tfh_accepte_numerique || false;
        }
      }
      
      let mediateur_nom = '';
      let mediateur_prenom = '';
      let mediateur_accepte_numerique = false;
      
      if (data.mediateur_id) {
        const { data: mediateur } = await supabase
          .from('tfh_externes')
          .select('nom, prenom, tfh_accepte_numerique')
          .eq('mediateur_id', data.mediateur_id)
          .single();
        
        if (mediateur) {
          mediateur_nom = mediateur.nom || '';
          mediateur_prenom = mediateur.prenom || '';
          mediateur_accepte_numerique = mediateur.tfh_accepte_numerique || false;
        }
      }
      
      let lecteur_interne_nom = '';
      let lecteur_interne_initiale = '';
      let lecteur_interne_accepte_numerique = false;
      
      if (data.lecteur_interne_id) {
        const { data: lecteurInterne } = await supabase
          .from('employees')
          .select('nom, initiale, tfh_accepte_numerique')
          .eq('id', data.lecteur_interne_id)
          .single();
        
        if (lecteurInterne) {
          lecteur_interne_nom = lecteurInterne.nom || '';
          lecteur_interne_initiale = lecteurInterne.initiale || '';
          lecteur_interne_accepte_numerique = lecteurInterne.tfh_accepte_numerique || false;
        }
      }
      
      let lecteur_externe_nom = '';
      let lecteur_externe_prenom = '';
      let lecteur_externe_accepte_numerique = false;
      
      if (data.lecteur_externe_id) {
        const { data: lecteurExterne } = await supabase
          .from('tfh_externes')
          .select('nom, prenom, tfh_accepte_numerique')
          .eq('lecteur_externe_id', data.lecteur_externe_id)
          .single();
        
        if (lecteurExterne) {
          lecteur_externe_nom = lecteurExterne.nom || '';
          lecteur_externe_prenom = lecteurExterne.prenom || '';
          lecteur_externe_accepte_numerique = lecteurExterne.tfh_accepte_numerique || false;
        }
      }
      
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
        mediateur_nom: mediateur_nom,
        mediateur_prenom: mediateur_prenom,
        mediateur_accepte_numerique: mediateur_accepte_numerique,
        lecteur_interne_nom: lecteur_interne_nom,
        lecteur_interne_initiale: lecteur_interne_initiale,
        lecteur_interne_accepte_numerique: lecteur_interne_accepte_numerique,
        lecteur_externe_nom: lecteur_externe_nom,
        lecteur_externe_prenom: lecteur_externe_prenom,
        lecteur_externe_accepte_numerique: lecteur_externe_accepte_numerique
      };
      
      const eleveFormate: EleveInfo = {
        student_matricule: data.student_matricule,
        nom: studentInfo?.nom || '',
        prenom: studentInfo?.prenom || '',
        classe: studentInfo?.classe || '',
        type: data.type || '',
        problematique: data.problematique || '',
        thematique: data.thematique || '',
        source_1: data.source_1 || '',
        source_2: data.source_2 || '',
        source_3: data.source_3 || '',
        source_4: data.source_4 || '',
        source_5: data.source_5 || '',
        categorie: data.categorie || '',
        guide_nom: guide_nom,
        guide_prenom: guide_prenom,
        guide_initiale: guide_initiale,
        guide_accepte_numerique: guide_accepte_numerique,
        sessions: sessionsAVenir,
        defense: defenseData,
        displaySettings: displaySettings,
        url_tfh: data.url_tfh || ''
      };
      
      setEleve(eleveFormate);
      setNewProblematique(data.problematique || '');
      setNewThematique(data.thematique || '');
      setNewSource1(data.source_1 || '');
      setNewSource2(data.source_2 || '');
      setNewSource3(data.source_3 || '');
      setNewSource4(data.source_4 || '');
      setNewSource5(data.source_5 || '');
      setNewUrl(data.url_tfh || '');
      
      const { data: objectifGeneralData } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .maybeSingle();
      
      if (objectifGeneralData) {
        setObjectifGeneral(objectifGeneralData.setting_value || '');
      }
      
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

  const handleSaveType = async (newType: string) => {
    if (!eleve || savingType) return;

    setSavingType(true);
    try {
      await supabase
        .from('tfh_eleves')
        .update({ type: newType || null })
        .eq('student_matricule', eleve.student_matricule);

      setEleve({ ...eleve, type: newType });
    } catch (err) {
      console.error('Erreur sauvegarde type:', err);
    } finally {
      setSavingType(false);
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

  const handleSaveUrl = async () => {
    if (!eleve) return;

    try {
      await supabase
        .from('tfh_eleves')
        .update({ url_tfh: newUrl || null })
        .eq('student_matricule', eleve.student_matricule);

      setEleve({ ...eleve, url_tfh: newUrl });
      setEditingUrl(false);
    } catch (err) {
      console.error('Erreur sauvegarde URL:', err);
    }
  };

  const getMessagePourEleve = (statut: string): string => {
    if (!statut || statut === '' || statut === 'null' || statut === 'undefined') {
      return 'Ton guide n\'a pas encore rendu d\'info sur ta convocation.';
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

  const calculerNombreImpressions = () => {
    if (!eleve?.defense) return 0;
    
    let count = 0;
    
    if (eleve.guide_accepte_numerique !== true) {
      count++;
    }
    
    if (eleve.defense.lecteur_interne_nom && eleve.defense.lecteur_interne_accepte_numerique !== true) {
      count++;
    }
    
    if (eleve.defense.lecteur_externe_nom && eleve.defense.lecteur_externe_accepte_numerique !== true) {
      count++;
    }
    
    if (eleve.defense.mediateur_nom && eleve.defense.mediateur_accepte_numerique !== true) {
      count++;
    }
    
    return count;
  };

  const DefenseSection = ({ eleve }: { eleve: EleveInfo }) => {
    if (!eleve.displaySettings?.eleves_voir_defenses) {
      return null;
    }
    
    if (!eleve.defense || !eleve.defense.date) {
      return null;
    }
  
    const nbImpressions = calculerNombreImpressions();
  
    return (
      <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-6 border border-indigo-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Ma défense TFH</h3>
          <span className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
            À venir
          </span>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {eleve.defense.date && (
            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
              <Calendar className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Date</p>
                <p className="text-sm text-gray-700 font-medium">
                  {new Date(eleve.defense.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
  
          {eleve.defense.heure && (
            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
              <Clock className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Heure</p>
                <p className="text-sm text-gray-700 font-medium">{eleve.defense.heure}</p>
              </div>
            </div>
          )}
  
          {eleve.defense.localisation && (
            <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Lieu</p>
                <p className="text-sm text-gray-700">{eleve.defense.localisation}</p>
              </div>
            </div>
          )}
        </div>
  
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-semibold text-indigo-800">Composition du jury</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">👨‍🏫</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Guide</p>
                  <p className="text-xs text-gray-500">{eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                eleve.guide_accepte_numerique 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {eleve.guide_accepte_numerique ? (
                  <>
                    <span>💻</span>
                    <span>Numérique</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>Papier</span>
                  </>
                )}
              </div>
            </div>
  
            {eleve.defense.lecteur_interne_nom && (
              <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📖</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Lecteur·rice interne</p>
                    <p className="text-xs text-gray-500">{eleve.defense.lecteur_interne_nom} {eleve.defense.lecteur_interne_initiale}.</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  eleve.defense.lecteur_interne_accepte_numerique 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {eleve.defense.lecteur_interne_accepte_numerique ? (
                    <>
                      <span>💻</span>
                      <span>Numérique</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Papier</span>
                    </>
                  )}
                </div>
              </div>
            )}
  
            {eleve.defense.lecteur_externe_nom && (
              <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-lg">👁️</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Lecteur·rice externe</p>
                    <p className="text-xs text-gray-500">{eleve.defense.lecteur_externe_prenom} {eleve.defense.lecteur_externe_nom}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  eleve.defense.lecteur_externe_accepte_numerique 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {eleve.defense.lecteur_externe_accepte_numerique ? (
                    <>
                      <span>💻</span>
                      <span>Numérique</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Papier</span>
                    </>
                  )}
                </div>
              </div>
            )}
  
            {eleve.defense.mediateur_nom && (
              <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚖️</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Médiateur·trice</p>
                    <p className="text-xs text-gray-500">{eleve.defense.mediateur_prenom} {eleve.defense.mediateur_nom}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  eleve.defense.mediateur_accepte_numerique 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {eleve.defense.mediateur_accepte_numerique ? (
                    <>
                      <span>💻</span>
                      <span>Numérique</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Papier</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
  
        {nbImpressions > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Exemplaires papier à fournir</p>
                <p className="text-xs text-amber-600">Membres du jury qui préfèrent le papier</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-amber-700">{nbImpressions}</span>
          </div>
        )}
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre espace TFH...</p>
        </div>
      </div>
    );
  }

  if (!eleve) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Élève non trouvé</p>
          <p className="text-gray-400 text-sm">Veuillez contacter votre coordinateur TFH.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mon TFH</h1>
            {phasePreparatoire && (
              <span className="ml-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                🚧 Phase préparatoire
              </span>
            )}
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 space-y-6 border border-white/50">
          {/* En-tête élève */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {eleve.prenom} {eleve.nom}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4" />
                    {eleve.classe}
                  </span>
                  {eleve.displaySettings?.eleves_voir_guides && eleve.guide_nom && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      Guide: {eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.
                    </span>
                  )}
                  {eleve.categorie && (
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {eleve.categorie}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Type de TFH - Visible en phase préparatoire */}
          {phasePreparatoire && (
            <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-semibold text-gray-800">Type de TFH</h3>
                </div>
                <span className="text-xs text-gray-500">
                  {savingType && <span className="text-indigo-600">💾 Sauvegarde...</span>}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(TFH_TYPES).map(([key, { icon: Icon, color, label }]) => {
                  const isSelected = eleve.type === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSaveType(key)}
                      disabled={savingType}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                        ${isSelected 
                          ? `${color} border-current shadow-md scale-[1.02]` 
                          : 'bg-white/60 border-gray-200 hover:border-indigo-300 hover:bg-white/80'}
                        ${savingType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-current' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-current' : 'text-gray-600'}`}>
                        {label}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-green-600">✅</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {eleve.type && (
                <div className="mt-3 text-xs text-gray-500 text-center">
                  Type actuel : <span className="font-medium text-gray-700">
                    {TFH_TYPES[eleve.type as keyof typeof TFH_TYPES]?.label || eleve.type}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Thématique */}
          {phasePreparatoire && (
            <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 rounded-xl p-5 border border-teal-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base font-semibold text-gray-800">Thématique</h3>
                </div>
                {!editingThematique && autorisationModification && (
                  <button
                    onClick={() => setEditingThematique(true)}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                  >
                    {eleve.thematique ? 'Modifier' : 'Ajouter'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {editingThematique ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newThematique}
                    onChange={(e) => setNewThematique(e.target.value)}
                    className="w-full border border-teal-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    placeholder="Ex: Transition écologique, Intelligence artificielle..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveThematique}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingThematique(false);
                        setNewThematique(eleve.thematique || '');
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/60 rounded-lg p-3 text-gray-700">
                  {eleve.thematique || <span className="text-gray-400 italic">Aucune thématique définie</span>}
                </div>
              )}
            </div>
          )}

          {/* Défense */}
          <DefenseSection eleve={eleve} />

          {/* Problématique */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-semibold text-gray-800">Problématique</h3>
              </div>
              {!editingProblematique && (
                autorisationModification ? (
                  <button
                    onClick={() => setEditingProblematique(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    {eleve.problematique ? 'Modifier' : 'Ajouter'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="text-xs">🔒</span>
                    Modifications bloquées
                  </span>
                )
              )}
            </div>
            
            {editingProblematique ? (
              <div className="space-y-3">
                <textarea
                  value={newProblematique}
                  onChange={(e) => setNewProblematique(e.target.value)}
                  className="w-full border border-indigo-200 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="Décrivez votre problématique..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProblematique}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setEditingProblematique(false);
                      setNewProblematique(eleve.problematique || '');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                {eleve.problematique || <span className="text-gray-400 italic">Aucune problématique définie</span>}
              </div>
            )}
          </div>

          {/* URL du TFH */}
          <div className="bg-gradient-to-r from-violet-50/80 to-purple-50/80 rounded-xl p-5 border border-violet-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-semibold text-gray-800">Lien vers mon TFH</h3>
              </div>
              {!editingUrl && (
                <button
                  onClick={() => setEditingUrl(true)}
                  className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                >
                  {eleve.url_tfh ? 'Modifier' : 'Ajouter'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          
            {editingUrl ? (
              <div className="space-y-3">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full border border-violet-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white"
                  placeholder="https://..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUrl}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setEditingUrl(false);
                      setNewUrl(eleve.url_tfh || '');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-lg p-3">
                {eleve.url_tfh ? (
                  <a
                    href={eleve.url_tfh}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-2 break-all"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    {eleve.url_tfh}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Aucun lien déposé</span>
                )}
              </div>
            )}
          </div>

          {/* Sources */}
          {phasePreparatoire && (
            <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-5 border border-amber-100">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-semibold text-gray-800">Sources documentaires</h3>
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((num) => {
                  const sourceField = `source_${num}` as keyof EleveInfo;
                  const editingState = num === 1 ? editingSource1 : num === 2 ? editingSource2 : num === 3 ? editingSource3 : num === 4 ? editingSource4 : editingSource5;
                  const setEditing = num === 1 ? setEditingSource1 : num === 2 ? setEditingSource2 : num === 3 ? setEditingSource3 : num === 4 ? setEditingSource4 : setEditingSource5;
                  const newValue = num === 1 ? newSource1 : num === 2 ? newSource2 : num === 3 ? newSource3 : num === 4 ? newSource4 : newSource5;
                  const setNewValue = num === 1 ? setNewSource1 : num === 2 ? setNewSource2 : num === 3 ? setNewSource3 : num === 4 ? setNewSource4 : setNewSource5;
                  const currentValue = eleve[sourceField] as string || '';
                  
                  return (
                    <div key={num} className="bg-white/60 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-600">Source {num}</label>
                        {!editingState && autorisationModification && (
                          <button
                            onClick={() => setEditing(true)}
                            className="text-xs text-amber-600 hover:text-amber-700"
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
                            className="w-full border border-amber-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                            placeholder="Titre de la source, lien, référence..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveSource(sourceField, newValue)}
                              className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => {
                                setEditing(false);
                                setNewValue(currentValue);
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700">
                          {currentValue || <span className="text-gray-400 italic">Aucune source</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Convocations */}
          {!phasePreparatoire && eleve.sessions && eleve.sessions.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50/80 to-pink-50/80 rounded-xl p-5 border border-rose-100">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-semibold text-gray-800">Convocations à venir</h3>
              </div>
              <div className="space-y-3">
                {eleve.sessions.map(session => {
                  const statut = session.statut || '';
                  const estConvoque = statut.startsWith('Oui');
                  const message = getMessagePourEleve(statut);
                  
                  return (
                    <div key={session.index} className={`bg-white/60 rounded-lg p-4 border ${estConvoque ? 'border-rose-200' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{session.nom}</p>
                          <p className="text-xs text-gray-500">
                            {session.date_debut.toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          estConvoque 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {estConvoque ? 'Convoqué·e' : 'Non convoqué·e'}
                        </span>
                      </div>
                      {(estConvoque || !statut) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600">{message}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Objectifs */}
          {objectifGeneral && (
            <div className="bg-gradient-to-r from-sky-50/80 to-blue-50/80 rounded-xl p-5 border border-sky-100">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-semibold text-gray-800">Objectif général du TFH</h3>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-gray-700">
                <p className="whitespace-pre-wrap leading-relaxed">{objectifGeneral}</p>
                <p className="text-xs text-sky-600 mt-2 font-medium">Cet objectif s'applique à tous les élèves.</p>
              </div>
            </div>
          )}
          
          {objectifParticulier && (
            <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 rounded-xl p-5 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-gray-800">Objectif particulier</h3>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-gray-700">
                <p className="whitespace-pre-wrap leading-relaxed">{objectifParticulier}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Défini par ton/ta guide
                  </span>
                  <span className="text-xs text-emerald-600">
                    {eleve.guide_prenom} {eleve.guide_nom} {eleve.guide_initiale}.
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {!objectifParticulier && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-700">Objectif particulier</h3>
              </div>
              <div className="text-center py-4">
                <p className="text-gray-500 mb-1">Ton/ta guide n'a pas encore défini d'objectif particulier pour toi.</p>
                <p className="text-sm text-gray-400">Cet objectif sera personnalisé selon tes besoins spécifiques.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}