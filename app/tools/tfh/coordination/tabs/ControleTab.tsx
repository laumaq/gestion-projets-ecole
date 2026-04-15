// app/tools/tfh/coordination/tabs/ControleTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, BookOpen, CheckCircle, XCircle, 
  AlertCircle, Filter, RefreshCw,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { Guide, Eleve } from '../types';

interface ControleTabProps {
  eleves: Eleve[];
  onRefresh: () => void;
}

interface GuideStats {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  elevesGuides: number;
  elevesLecteurInterne: number;
  sessionsStats: Array<{
    id: number;
    nom: string;
    convocationsRendues: number;
    pourcentage: number | null;
  }>;
  [key: `session_${number}_percentage`]: number | null;
  elevesDetails?: Eleve[];
}

interface SortConfig {
  key: keyof GuideStats;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  minElevesGuides: number;
  minConvocations: number;
}

// Sessions par défaut (à adapter selon vos besoins)
const DEFAULT_SESSIONS = [
  { id: 1, nom: 'Session 1' },
  { id: 2, nom: 'Session 2' },
  { id: 3, nom: 'Session 3' },
  { id: 4, nom: 'Session 4' },
  { id: 5, nom: 'Session 5' },
  { id: 6, nom: 'Session 6' },
  { id: 7, nom: 'Session 7' },
  { id: 8, nom: 'Session 8' },
  { id: 9, nom: 'Session 9' },
  { id: 10, nom: 'Session 10' },
  { id: 11, nom: 'Session 11' },
  { id: 12, nom: 'Session 12' },
  { id: 13, nom: 'Session 13' },
  { id: 14, nom: 'Session 14' },
  { id: 15, nom: 'Session 15' },
  { id: 16, nom: 'Session 16' },
  { id: 17, nom: 'Session 17' },
  { id: 18, nom: 'Session 18' },
  { id: 19, nom: 'Session 19' },
  { id: 20, nom: 'Session 20' }
];

export default function ControleTab({ eleves, onRefresh }: ControleTabProps) {
  const [guideStats, setGuideStats] = useState<GuideStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'nom', 
    direction: 'asc' 
  });
  const [filters, setFilters] = useState<FilterConfig>({
    minElevesGuides: 0,
    minConvocations: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<GuideStats | null>(null);
  const [guideDetailsOpen, setGuideDetailsOpen] = useState(false);

  const loadGuideStats = async () => {
    setLoading(true);
    try {
      // Charger les guides = employees (sauf direction et coordination)
      const { data: guides, error: guidesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale')
        .neq('job', 'direction')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
  
      // Charger les élèves TFH avec leurs relations
      const { data: eleves, error: elevesError } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          lecteur_interne_id,
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
          students!inner (nom, prenom, classe, niveau)
        `);
      
      if (elevesError) throw elevesError;
  
      // Formater les élèves
      const formattedEleves = (eleves || []).map(e => ({
        id: e.student_matricule,
        student_matricule: e.student_matricule,
        nom: (e.students as any)?.nom || '',
        prenom: (e.students as any)?.prenom || '',
        classe: (e.students as any)?.classe || '',
        niveau: (e.students as any)?.niveau || '',
        guide_id: e.guide_id,
        lecteur_interne_id: e.lecteur_interne_id,
        session_1_convoque: e.session_1_convoque,
        session_2_convoque: e.session_2_convoque,
        session_3_convoque: e.session_3_convoque,
        session_4_convoque: e.session_4_convoque,
        session_5_convoque: e.session_5_convoque,
        session_6_convoque: e.session_6_convoque,
        session_7_convoque: e.session_7_convoque,
        session_8_convoque: e.session_8_convoque,
        session_9_convoque: e.session_9_convoque,
        session_10_convoque: e.session_10_convoque,
        session_11_convoque: e.session_11_convoque,
        session_12_convoque: e.session_12_convoque,
        session_13_convoque: e.session_13_convoque,
        session_14_convoque: e.session_14_convoque,
        session_15_convoque: e.session_15_convoque,
        session_16_convoque: e.session_16_convoque,
        session_17_convoque: e.session_17_convoque,
        session_18_convoque: e.session_18_convoque,
        session_19_convoque: e.session_19_convoque,
        session_20_convoque: e.session_20_convoque
      }));
  
      const stats = (guides || []).map(guide => {
        const elevesDuGuide = formattedEleves.filter(e => e.guide_id === guide.id);
        const elevesLecteurInterne = formattedEleves.filter(e => e.lecteur_interne_id === guide.id);
        
        const sessionsStats = DEFAULT_SESSIONS.map(session => {
          const convocationsRendues = elevesDuGuide.filter(eleve => {
            const columnName = `session_${session.id}_convoque` as keyof typeof eleve;
            const valeur = eleve[columnName];
            return valeur && typeof valeur === 'string' && valeur.trim() !== '';
          }).length;
        
          const pourcentage = elevesDuGuide.length === 0 ? 
            null : 
            (convocationsRendues / elevesDuGuide.length) * 100;
        
          return {
            id: session.id,
            nom: session.nom,
            convocationsRendues,
            pourcentage
          };
        });
  
        // Créer un objet avec les propriétés dynamiques pour le tri
        const guideStatsObj: any = {
          id: guide.id,
          nom: guide.nom,
          prenom: guide.prenom,
          initiale: guide.initiale,
          elevesGuides: elevesDuGuide.length,
          elevesLecteurInterne: elevesLecteurInterne.length,
          sessionsStats,
          elevesDetails: []
        };
  
        // Ajouter les propriétés de pourcentage pour chaque session
        sessionsStats.forEach(session => {
          guideStatsObj[`session_${session.id}_percentage`] = session.pourcentage;
        });
  
        return guideStatsObj as GuideStats;
      });
  
      setGuideStats(stats);
    } catch (err) {
      console.error('Erreur chargement stats guides:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGuideDetails = async (guideId: string) => {
    try {
      const { data: eleves, error } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          lecteur_interne_id,
          categorie,
          classe,
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
        .order('students(nom)', { ascending: true });
      
      if (error) throw error;

      const formattedEleves: Eleve[] = (eleves || []).map(e => ({
        id: e.student_matricule,
        student_matricule: e.student_matricule,
        nom: (e.students as any)?.nom || '',
        prenom: (e.students as any)?.prenom || '',
        classe: (e.students as any)?.classe || '',
        categorie: e.categorie || '',
        guide_id: e.guide_id,
        lecteur_interne_id: e.lecteur_interne_id,
        session_1_convoque: e.session_1_convoque,
        session_2_convoque: e.session_2_convoque,
        session_3_convoque: e.session_3_convoque,
        session_4_convoque: e.session_4_convoque,
        session_5_convoque: e.session_5_convoque,
        session_6_convoque: e.session_6_convoque,
        session_7_convoque: e.session_7_convoque,
        session_8_convoque: e.session_8_convoque,
        session_9_convoque: e.session_9_convoque,
        session_10_convoque: e.session_10_convoque,
        session_11_convoque: e.session_11_convoque,
        session_12_convoque: e.session_12_convoque,
        session_13_convoque: e.session_13_convoque,
        session_14_convoque: e.session_14_convoque,
        session_15_convoque: e.session_15_convoque,
        session_16_convoque: e.session_16_convoque,
        session_17_convoque: e.session_17_convoque,
        session_18_convoque: e.session_18_convoque,
        session_19_convoque: e.session_19_convoque,
        session_20_convoque: e.session_20_convoque,
        problematique: '',
        thematique: '',
        convocation_mars: '',
        convocation_avril: '',
        presence_9_mars: null,
        presence_10_mars: null,
        presence_16_avril: null,
        presence_17_avril: null,
        date_defense: null,
        heure_defense: null,
        localisation_defense: null,
        mediateur_id: null,
        lecteur_externe_id: null
      }));

      const guide = guideStats.find(g => g.id === guideId);
      if (guide) {
        setSelectedGuide({
          ...guide,
          elevesDetails: formattedEleves
        });
        setGuideDetailsOpen(true);
      }
    } catch (err) {
      console.error('Erreur chargement détails guide:', err);
    }
  };

  useEffect(() => {
    loadGuideStats();
  }, []);

  const handleSort = (key: keyof GuideStats) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof GuideStats) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const filteredStats = guideStats.filter(guide => {
    if (guide.elevesGuides === 0) return true;
    
    const pourcentagesValides = guide.sessionsStats
      .map(s => s.pourcentage)
      .filter((p): p is number => p !== null);
    
    const pourcentageMinSession = pourcentagesValides.length > 0 
      ? Math.min(...pourcentagesValides)
      : 0;
    
    return (
      guide.elevesGuides >= filters.minElevesGuides &&
      pourcentageMinSession >= filters.minConvocations
    );
  });
  
  const sortedStats = [...filteredStats].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    const isSessionPercentage = sortConfig.key.toString().includes('session_') && 
                                sortConfig.key.toString().includes('_percentage');
    
    if (isSessionPercentage) {
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
    }
    
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  const getSessionPercentageValue = (guide: GuideStats, sessionId: number): number | null => {
    const dynamicKey = `session_${sessionId}_percentage` as keyof GuideStats;
    const value = guide[dynamicKey];
    
    if (typeof value === 'number' || value === null) {
      return value;
    }
    
    const sessionStat = guide.sessionsStats.find(s => s.id === sessionId);
    return sessionStat ? sessionStat.pourcentage : null;
  };
  
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="w-4 h-4" />;
    if (percentage >= 50) return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const calculateGlobalMetrics = () => {
    if (guideStats.length === 0) return null;
  
    const totalGuides = guideStats.length;
    const totalElevesGuides = guideStats.reduce((sum, g) => sum + g.elevesGuides, 0);
    const avgElevesPerGuide = totalElevesGuides / totalGuides;
    
    let sessionsAverages: Record<number, number> = {};
    let sessionCounts: Record<number, number> = {};
    
    guideStats.forEach(guide => {
      guide.sessionsStats.forEach(session => {
        if (session.pourcentage !== null) {
          if (!sessionsAverages[session.id]) {
            sessionsAverages[session.id] = 0;
            sessionCounts[session.id] = 0;
          }
          sessionsAverages[session.id] += session.pourcentage;
          sessionCounts[session.id]++;
        }
      });
    });
    
    Object.keys(sessionsAverages).forEach(key => {
      sessionsAverages[parseInt(key)] = sessionsAverages[parseInt(key)] / totalGuides;
    });
  
    const guidesWithHighLoad = guideStats.filter(g => g.elevesGuides > 5).length;
    const guidesWithLowConvocations = guideStats.filter(guide => 
      guide.sessionsStats.some(session => session.pourcentage !== null && session.pourcentage < 50)
    ).length;
  
    return {
      totalGuides,
      totalElevesGuides,
      avgElevesPerGuide: avgElevesPerGuide.toFixed(1),
      sessionsAverages,
      guidesWithHighLoad,
      guidesWithLowConvocations,
      loadDistribution: (guidesWithHighLoad / totalGuides * 100).toFixed(1)
    };
  };

  const globalMetrics = calculateGlobalMetrics();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">👥 Contrôle des guides</h2>
              <p className="text-gray-600">Suivi détaillé de l'activité</p>
            </div>
          </div>
          <button
            onClick={loadGuideStats}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Métriques globales */}
        {globalMetrics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 h-16 flex flex-col justify-center">
                <div className="text-xl font-bold text-blue-700">{globalMetrics.totalGuides}</div>
                <div className="text-xs text-blue-600">Guides actifs</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 h-16 flex flex-col justify-center">
                <div className="text-xl font-bold text-green-700">{globalMetrics.totalElevesGuides}</div>
                <div className="text-xs text-green-600">Élèves assignés</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 h-16 flex flex-col justify-center">
                <div className="text-xl font-bold text-purple-700">{globalMetrics.avgElevesPerGuide}</div>
                <div className="text-xs text-purple-600">Moyenne par guide</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">  
              {globalMetrics?.sessionsAverages && Object.entries(globalMetrics.sessionsAverages).slice(0, 4).map(([sessionId, moyenne]) => (
                <div key={sessionId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 h-16 flex flex-col justify-center">
                  <div className="text-xl font-bold text-yellow-700">{moyenne.toFixed(1)}%</div>
                  <div className="text-xs text-yellow-600">Session {sessionId}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Filtres */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
              <Filter className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">Filtres et tri</h3>
              <p className="text-sm text-gray-500">Affinez l'affichage selon vos critères</p>
            </div>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {showFilters && (
          <div className="px-6 pb-6 pt-2 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre minimum d'élèves guidés
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={filters.minElevesGuides}
                  onChange={(e) => setFilters({...filters, minElevesGuides: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {filters.minElevesGuides}+ élève(s)
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % minimum convocations (toutes sessions)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={filters.minConvocations}
                  onChange={(e) => setFilters({...filters, minConvocations: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {filters.minConvocations}% minimum
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {filteredStats.length} guide{filteredStats.length > 1 ? 's' : ''} correspondant aux critères
                </span>
                <button
                  onClick={() => setFilters({
                    minElevesGuides: 0,
                    minConvocations: 0
                  })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tableau des stats */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Liste des guides ({sortedStats.length})
            </h3>
            <div className="text-sm text-gray-600">
              Cliquez sur un nom pour les détails
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('nom')}
                >
                  <div className="flex items-center gap-1">
                    Nom {getSortIcon('nom')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('elevesGuides')}
                >
                  <div className="flex items-center gap-1">
                    TFH comme guide {getSortIcon('elevesGuides')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('elevesLecteurInterne')}
                >
                  <div className="flex items-center gap-1">
                    TFH lecteur interne {getSortIcon('elevesLecteurInterne')}
                  </div>
                </th>
                {guideStats.length > 0 && guideStats[0].sessionsStats.map((session) => (
                  <th 
                    key={session.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort(`session_${session.id}_percentage` as keyof GuideStats)}
                  >
                    <div className="flex items-center gap-1">
                      % {session.nom.split(' ')[1]}
                      {getSortIcon(`session_${session.id}_percentage` as keyof GuideStats)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedStats.map((guide) => (
                <tr 
                  key={guide.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadGuideDetails(guide.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold mr-3">
                        {guide.initiale}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {guide.nom} {guide.prenom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {guide.elevesGuides} élève{guide.elevesGuides > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{guide.elevesGuides}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        guide.elevesGuides > 2 ? 'bg-yellow-100 text-yellow-800' :
                        guide.elevesGuides > 0 ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guide.elevesGuides > 2 ? 'Charge élevée' :
                         guide.elevesGuides > 0 ? 'Charge normale' : 'Charge insuffisante'}
                      </div>
                    </div>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{guide.elevesLecteurInterne}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        guide.elevesLecteurInterne > 2 ? 'bg-yellow-100 text-yellow-800' :
                        guide.elevesLecteurInterne > 0 ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guide.elevesLecteurInterne > 2 ? 'Charge élevée' :
                         guide.elevesLecteurInterne > 0 ? 'Charge normale' : 'Charge insuffisante'}
                      </div>
                    </div>
                   </td>
                  {guide.sessionsStats.map((session) => (
                    <td key={session.id} className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {getSessionPercentageValue(guide, session.id) === null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className={`flex items-center gap-1 ${getPerformanceColor(getSessionPercentageValue(guide, session.id)!)} px-2 py-1 rounded`}>
                            {getPerformanceIcon(getSessionPercentageValue(guide, session.id)!)}
                            <span className="font-medium">
                              {getSessionPercentageValue(guide, session.id)!.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                     </td>
                  ))}
                 </tr>
              ))}
            </tbody>
           </table>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Guide d'interprétation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-600 mb-2">Charge de travail :</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></div>
                <span><strong>0 élèves</strong> : Charge insuffisante</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></div>
                <span><strong>1-2 élèves</strong> : Charge normale</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></div>
                <span><strong>3+ élèves</strong> : Charge élevée</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal détails guide */}
      {selectedGuide && guideDetailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Détails pour {selectedGuide.prenom} {selectedGuide.nom}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedGuide.elevesGuides} élève{selectedGuide.elevesGuides > 1 ? 's' : ''} guidé{selectedGuide.elevesGuides > 1 ? 's' : ''} • {selectedGuide.elevesLecteurInterne} lecteur{selectedGuide.elevesLecteurInterne > 1 ? 's' : ''} interne{selectedGuide.elevesLecteurInterne > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGuideDetailsOpen(false);
                    setSelectedGuide(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Récapitulatif</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Charge totale :</span>
                      <span className="font-medium">{selectedGuide.elevesGuides} TFH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lecteur interne :</span>
                      <span className="font-medium">{selectedGuide.elevesLecteurInterne} TFH</span>
                    </div>
                    
                    {selectedGuide.sessionsStats.map((session) => (
                      <div key={session.id} className="flex justify-between">
                        <span className="text-gray-600">{session.nom} :</span>
                        <span className={`font-medium ${
                          session.pourcentage === null ? 'text-gray-400' :
                          session.pourcentage >= 80 ? 'text-green-600' :
                          session.pourcentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {session.pourcentage === null ? '—' : `${session.pourcentage.toFixed(1)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedGuide.elevesDetails && selectedGuide.elevesDetails.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h4 className="font-medium text-gray-700">
                      Élèves guidés ({selectedGuide.elevesDetails.length})
                    </h4>
                  </div>
                  <div className="divide-y">
                    {selectedGuide.elevesDetails.map((eleve) => (
                      <div key={eleve.student_matricule} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {eleve.prenom} {eleve.nom}
                            </div>
                            <div className="text-sm text-gray-600">
                              {eleve.classe} • {eleve.categorie || 'Non catégorisé'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Convocations par session</div>
                            <div className="flex items-center gap-2">
                              {selectedGuide.sessionsStats.slice(0, 3).map((session) => {
                                const columnName = `session_${session.id}_convoque` as keyof typeof eleve;
                                const statut = eleve[columnName];
                                const estRendu = statut && typeof statut === 'string' && statut.trim() !== '';
                                
                                return (
                                  <span 
                                    key={session.id} 
                                    className={`text-xs px-2 py-1 rounded ${
                                      estRendu ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}
                                    title={session.nom}
                                  >
                                    {session.nom.split(' ')[1]}: {estRendu ? '✓' : '✗'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
                        
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setGuideDetailsOpen(false);
                  setSelectedGuide(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}