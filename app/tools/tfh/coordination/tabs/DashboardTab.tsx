// app/tools/tfh/coordination/tabs/DashboardTab.tsx
'use client';

import { Eleve, Guide, TabType } from '../types';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, ChevronRight, BookOpen 
} from 'lucide-react';

interface DashboardTabProps {
  eleves: Eleve[];
  guides: Guide[];
  onTabChange: (tab: TabType) => void;
  userName: string;
  coordinateurNom: string; 
  coordinateurPrenom: string;
}

// Types pour les sessions
interface Session {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
}

interface Journee {
  id: number;
  date: string;
  libelle: string;
}

export default function DashboardTab({ 
  eleves, 
  guides, 
  onTabChange,
  userName,
  coordinateurNom,
  coordinateurPrenom 
}: DashboardTabProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les sessions depuis system_settings ou config
  useEffect(() => {
    const loadSessions = async () => {
      try {
        // Charger les paramètres des sessions
        const { data, error } = await supabase
          .from('tfh_system_settings')
          .select('setting_key, setting_value')
          .like('setting_key', 'session_%');
        
        if (error) throw error;
        
        // Convertir les paramètres en sessions
        const sessionsMap = new Map<string, Session>();
        
        (data || []).forEach(setting => {
          const match = setting.setting_key.match(/session_(\d+)_(nom|date_debut|date_fin)/);
          if (match) {
            const sessionId = `session_${match[1]}`;
            const field = match[2];
            
            if (!sessionsMap.has(sessionId)) {
              sessionsMap.set(sessionId, {
                id: sessionId,
                nom: '',
                date_debut: '',
                date_fin: ''
              });
            }
            
            const session = sessionsMap.get(sessionId)!;
            if (field === 'nom') session.nom = setting.setting_value;
            if (field === 'date_debut') session.date_debut = setting.setting_value;
            if (field === 'date_fin') session.date_fin = setting.setting_value;
          }
        });
        
        setSessions(Array.from(sessionsMap.values()));
      } catch (error) {
        console.error('Erreur chargement sessions:', error);
        // Sessions par défaut si aucune config
        setSessions([
          { id: 'session_1', nom: 'Session 1 (mars)', date_debut: '2025-03-01', date_fin: '2025-03-31' },
          { id: 'session_2', nom: 'Session 2 (avril)', date_debut: '2025-04-01', date_fin: '2025-04-30' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadSessions();
  }, []);
  
  // Fonction pour trouver la prochaine session
  const getProchaineSession = () => {
    const maintenant = new Date();
    
    const prochaineSession = sessions.find(session => {
      const finSession = new Date(session.date_fin);
      finSession.setHours(23, 59, 59, 999);
      return finSession >= maintenant;
    });
    
    return prochaineSession;
  };
  
  // Calcul des statistiques pour l'aperçu du système
  const calculateSystemOverview = () => {
    // 1. Élèves connectés (ceux qui ont un mot de passe)
    const elevesConnected = eleves.filter(e => e.mot_de_passe && e.mot_de_passe !== '').length;
    const elevesTotal = eleves.length;
    
    // 2. Guides connectés (employees avec mot de passe)
    const guidesConnected = guides.filter(g => g.mot_de_passe && g.mot_de_passe !== '').length;
    const guidesTotal = guides.length;
    
    // 3. Défenses / Problématiques / Thématiques
    const defensesProgrammees = eleves.filter(e => e.date_defense).length;
    const avecProblematique = eleves.filter(e => e.problematique && e.problematique.trim() !== '').length;
    const avecThematique = eleves.filter(e => e.thematique && e.thematique.trim() !== '').length;
    
    // 4. Convoqués à la prochaine session
    const getProchainesConvocations = () => {
      const prochaineSession = getProchaineSession();
      
      if (!prochaineSession) {
        return null;
      }
      
      // Extraire l'index de la session (ex: "session_1" -> 1)
      const sessionMatch = prochaineSession.id.match(/session_(\d+)/);
      const sessionIndex = sessionMatch ? parseInt(sessionMatch[1]) : 0;
      
      // Compter les élèves convoqués à cette session
      const convocations = eleves.filter(e => {
        const sessionKey = `session_${sessionIndex}_convoque` as keyof Eleve;
        const valeur = e[sessionKey];
        return valeur && typeof valeur === 'string' && valeur.startsWith('Oui');
      });
      
      return {
        session: sessionIndex,
        sessionNom: prochaineSession.nom,
        count: convocations.length,
        totalSessions: sessions.length
      };
    };
    
    const prochainesConvocations = getProchainesConvocations();
    
    return {
      elevesConnected,
      elevesTotal,
      guidesConnected,
      guidesTotal,
      defensesProgrammees,
      avecProblematique,
      avecThematique,
      prochainesConvocations
    };
  };
  
  const stats = calculateSystemOverview();
  
  const getDefensesText = () => {
    if (stats.defensesProgrammees > 0) {
      return `${stats.defensesProgrammees} défenses programmées / ${stats.avecProblematique} problématiques`;
    } else if (stats.avecProblematique > 0) {
      return `${stats.avecProblematique} problématiques / ${stats.avecThematique} thématiques`;
    } else {
      return `${stats.avecThematique} thématiques / ${stats.elevesTotal} élèves`;
    }
  };
  
  const tabs = [
    {
      id: 'liste-tfh' as TabType,
      name: 'Liste des TFH',
      icon: <BookOpen className="w-5 h-5" />,
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200 hover:border-violet-300',
      iconBg: 'bg-violet-100 text-violet-600 group-hover:bg-violet-200',
      countColor: 'text-violet-600',
      chevronColor: 'bg-violet-50 text-violet-600',
      showCount: true,
      count: eleves.length,
      description: 'Vue complète des travaux par classe'
    },
    {
      id: 'convocations' as TabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
      countColor: 'text-purple-600',
      chevronColor: 'bg-purple-50 text-purple-600',
      showCount: true,
      count: eleves.length,
      description: 'Gestion des convocations'
    },
    {
      id: 'presences' as TabType,
      name: 'Présences',
      icon: <span className="font-bold">✓</span>,
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200 hover:border-fuchsia-300',
      iconBg: 'bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200',
      countColor: 'text-fuchsia-600',
      chevronColor: 'bg-fuchsia-50 text-fuchsia-600',
      showCount: false,
      description: 'Suivi des présences/absences'
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200 hover:border-green-300',
      iconBg: 'bg-green-100 text-green-600 group-hover:bg-green-200',
      countColor: 'text-green-600',
      chevronColor: 'bg-green-50 text-green-600',
      showCount: true,
      count: eleves.filter(e => e.date_defense).length,
      description: 'Planification des soutenances'
    },
    {
      id: 'calendrier' as TabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200 hover:border-orange-300',
      iconBg: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
      countColor: 'text-orange-600',
      chevronColor: 'bg-orange-50 text-orange-600',
      showCount: false,
      description: 'Planning & détection de conflits'
    },
    {
      id: 'gestion-utilisateurs' as TabType,
      name: 'Utilisateurs',
      icon: <Users className="w-5 h-5" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
      countColor: 'text-indigo-600',
      chevronColor: 'bg-indigo-50 text-indigo-600',
      showCount: true,
      count: eleves.length + guides.length,
      description: 'Gestion des comptes utilisateurs'
    },
    {
      id: 'parametres' as TabType,
      name: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200 hover:border-sky-300',
      iconBg: 'bg-sky-100 text-sky-600 group-hover:bg-sky-200',
      countColor: 'text-sky-600',
      chevronColor: 'bg-sky-50 text-sky-600',
      showCount: false,
      description: 'Configuration système'
    },
    {
      id: 'stats' as TabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
      countColor: 'text-emerald-600',
      chevronColor: 'bg-emerald-50 text-emerald-600',
      showCount: false,
      description: 'Analyses et métriques'
    },
    {
      id: 'controle' as TabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200 hover:border-red-300',
      iconBg: 'bg-red-100 text-red-600 group-hover:bg-red-200',
      countColor: 'text-red-600',
      chevronColor: 'bg-red-50 text-red-600',
      showCount: true,
      count: guides.length,
      description: 'Suivi des performances des guides'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord Coordination</h1>
        <p className="text-gray-600">Bienvenue {coordinateurPrenom} {coordinateurNom}. Voici votre panneau de gestion des TFH.</p>
      </div>

      {/* Aperçu du système */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-6 text-lg">Aperçu du système</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Élèves */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-700">
                {stats.elevesConnected}/{stats.elevesTotal}
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-blue-800 mb-1">Élèves connectés</div>
            <div className="text-xs text-blue-600">
              {stats.elevesConnected === stats.elevesTotal ? (
                <span className="text-green-600 font-medium">✓ Tous connectés</span>
              ) : (
                `${Math.round((stats.elevesConnected / stats.elevesTotal) * 100)}% ont accédé au portail`
              )}
            </div>
          </div>
          
          {/* Guides */}
          <div className="p-5 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-700">
                {stats.guidesConnected}/{stats.guidesTotal}
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-green-800 mb-1">Guides connectés</div>
            <div className="text-xs text-green-600">
              {stats.guidesConnected === stats.guidesTotal ? (
                <span className="text-green-600 font-medium">✓ Tous connectés</span>
              ) : (
                `${Math.round((stats.guidesConnected / stats.guidesTotal) * 100)}% ont accédé au portail`
              )}
            </div>
          </div>
          
          {/* Défenses/Problématiques/Thématiques */}
          <div className="p-5 bg-purple-50 rounded-xl border border-purple-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-purple-700">
                {stats.defensesProgrammees > 0 ? stats.defensesProgrammees : 
                 stats.avecProblematique > 0 ? stats.avecProblematique : 
                 stats.avecThematique}
                <span className="font-normal text-purple-600 mx-1">/</span>
                {stats.defensesProgrammees > 0 ? stats.avecProblematique : 
                 stats.avecProblematique > 0 ? stats.avecThematique : 
                 stats.elevesTotal}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {stats.defensesProgrammees > 0 ? 'défenses / problématiques' : 
                 stats.avecProblematique > 0 ? 'problématiques / thématiques' : 
                 'thématiques / élèves'}
              </div>
            </div>
            <div className="text-sm font-medium text-purple-800 mb-1 text-center">
              {stats.defensesProgrammees > 0 ? 'Défenses programmées' : 
               stats.avecProblematique > 0 ? 'Problématiques définies' : 
               'Thématiques définies'}
            </div>
            <div className="text-xs text-purple-600 text-center">
              {stats.defensesProgrammees > 0 ? (
                `${Math.round((stats.defensesProgrammees / stats.elevesTotal) * 100)}% des élèves`
              ) : stats.avecProblematique > 0 ? (
                `${Math.round((stats.avecProblematique / stats.elevesTotal) * 100)}% ont une problématique`
              ) : (
                `${Math.round((stats.avecThematique / stats.elevesTotal) * 100)}% ont une thématique`
              )}
            </div>
          </div>
          
          {/* Convoqués prochaine session */}
          <div className="p-5 bg-orange-50 rounded-xl border border-orange-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-orange-700">
                {stats.prochainesConvocations ? `${stats.prochainesConvocations.count}` : '0'}
                <span className="font-normal text-orange-600 mx-1">/</span>
                {stats.elevesTotal}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                convoqués / élèves total
              </div>
            </div>
            <div className="text-sm font-medium text-orange-800 mb-1 text-center">
              {stats.prochainesConvocations ? 
                `${stats.prochainesConvocations.sessionNom}` : 
                'Aucune convocation à venir'}
            </div>
            <div className="text-xs text-orange-600 text-center">
              {stats.prochainesConvocations ? (
                `${Math.round((stats.prochainesConvocations.count / stats.elevesTotal) * 100)}% des élèves`
              ) : (
                'Toutes les sessions sont terminées'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cartes de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              bg-white rounded-xl shadow-sm border p-6 cursor-pointer
              transition-all hover:shadow-md hover:-translate-y-1
              ${tab.borderColor}
              group
            `}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-lg ${tab.iconBg}`}>
                {tab.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{tab.name}</h3>
                <p className="text-sm text-gray-500">{tab.description}</p>
              </div>
              {tab.showCount && tab.count !== undefined && (
                <div className={`text-lg font-bold ${tab.countColor}`}>
                  {tab.count}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accéder à la section</span>
                <div className={`p-1 rounded-full ${tab.chevronColor}`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}