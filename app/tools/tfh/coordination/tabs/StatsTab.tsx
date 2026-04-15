// app/tools/tfh/coordination/tabs/StatsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, TrendingUp, Users, BookOpen, UserCheck, Eye, 
  CheckCircle, XCircle, AlertCircle, Filter, RefreshCw
} from 'lucide-react';
import { Eleve } from '../types';

interface StatsTabProps {
  eleves: Eleve[];
}

interface StatsData {
  totalEleves: number;
  avecThematique: number;
  avecProblematique: number;
  avecSources: number;
  avecGuide: number;
  avecLecteurInterne: number;
  avecLecteurExterne: number;
  pourcentageThematique: number;
  pourcentageProblematique: number;
  pourcentageSources: number;
  pourcentageGuide: number;
  pourcentageLecteurInterne: number;
  pourcentageLecteurExterne: number;
}

interface ElevesListModalProps {
  isOpen: boolean;
  title: string;
  eleves: Eleve[];
  onClose: () => void;
}

function ElevesListModal({ isOpen, title, eleves, onClose }: ElevesListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {eleves.length} élève{eleves.length > 1 ? 's' : ''} concerné{eleves.length > 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {eleves.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun élève concerné !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eleves.map((eleve) => (
                <div key={eleve.student_matricule} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {eleve.prenom} {eleve.nom}
                      </h4>
                      <p className="text-sm text-gray-600">{eleve.classe}</p>
                      {eleve.categorie && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {eleve.categorie}
                        </span>
                      )}
                    </div>
                    {eleve.guide_nom && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Guide</p>
                        <p className="text-sm font-medium">
                          {eleve.guide_prenom} {eleve.guide_nom}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {eleve.problematique && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-1">Problématique</p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {eleve.problematique}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StatsTab({ eleves }: StatsTabProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [elevesList, setElevesList] = useState<Eleve[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'with' | 'without'>('without');

  const loadStats = async () => {
    setLoading(true);
    try {
      // Charger les élèves avec jointure vers students
      const { data: elevesData, error } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          lecteur_interne_id,
          lecteur_externe_id,
          problematique,
          thematique,
          categorie,
          source_1,
          source_2,
          source_3,
          source_4,
          source_5,
          students!inner (nom, prenom, classe)
        `);
      
      if (error) throw error;

      // Formater les élèves
      const eleves: Eleve[] = (elevesData || []).map(e => ({
        id: e.student_matricule,
        student_matricule: e.student_matricule,
        nom: (e.students as any)?.nom || '',
        prenom: (e.students as any)?.prenom || '',
        classe: (e.students as any)?.classe || '',
        guide_id: e.guide_id,
        lecteur_interne_id: e.lecteur_interne_id,
        lecteur_externe_id: e.lecteur_externe_id,
        problematique: e.problematique || '',
        thematique: e.thematique || '',
        categorie: e.categorie || '',
        source_1: e.source_1 || '',
        source_2: e.source_2 || '',
        source_3: e.source_3 || '',
        source_4: e.source_4 || '',
        source_5: e.source_5 || '',
        // Champs requis par l'interface mais non utilisés dans ce composant
        convocation_mars: '',
        convocation_avril: '',
        presence_9_mars: null,
        presence_10_mars: null,
        presence_16_avril: null,
        presence_17_avril: null,
        date_defense: null,
        heure_defense: null,
        localisation_defense: null,
        mediateur_id: null
      }));

      const totalEleves = eleves.length;
      
      // Calculer les statistiques
      const avecThematique = eleves.filter(e => e.thematique && e.thematique.trim() !== '').length;
      const avecProblematique = eleves.filter(e => e.problematique && e.problematique.trim() !== '').length;
      const avecSources = eleves.filter(e => 
        e.source_1 && e.source_1.trim() !== '' &&
        e.source_2 && e.source_2.trim() !== '' &&
        e.source_3 && e.source_3.trim() !== '' &&
        e.source_4 && e.source_4.trim() !== '' &&
        e.source_5 && e.source_5.trim() !== ''
      ).length;
      const avecGuide = eleves.filter(e => e.guide_id).length;
      const avecLecteurInterne = eleves.filter(e => e.lecteur_interne_id).length;
      const avecLecteurExterne = eleves.filter(e => e.lecteur_externe_id).length;

      setStats({
        totalEleves,
        avecThematique,
        avecProblematique,
        avecSources,
        avecGuide,
        avecLecteurInterne,
        avecLecteurExterne,
        pourcentageThematique: totalEleves > 0 ? (avecThematique / totalEleves) * 100 : 0,
        pourcentageProblematique: totalEleves > 0 ? (avecProblematique / totalEleves) * 100 : 0,
        pourcentageSources: totalEleves > 0 ? (avecSources / totalEleves) * 100 : 0,
        pourcentageGuide: totalEleves > 0 ? (avecGuide / totalEleves) * 100 : 0,
        pourcentageLecteurInterne: totalEleves > 0 ? (avecLecteurInterne / totalEleves) * 100 : 0,
        pourcentageLecteurExterne: totalEleves > 0 ? (avecLecteurExterne / totalEleves) * 100 : 0,
      });

    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadElevesList = async (field: string, filter: 'with' | 'without' = 'without') => {
    try {
      // Charger les élèves avec leurs infos
      const { data, error } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          lecteur_interne_id,
          lecteur_externe_id,
          problematique,
          thematique,
          categorie,
          source_1,
          source_2,
          source_3,
          source_4,
          source_5,
          students!inner (nom, prenom, classe)
        `);
      
      if (error) throw error;
      
      // Formater les élèves
      const eleves: Eleve[] = (data || []).map(e => ({
        id: e.student_matricule,
        student_matricule: e.student_matricule,
        nom: (e.students as any)?.nom || '',
        prenom: (e.students as any)?.prenom || '',
        classe: (e.students as any)?.classe || '',
        guide_id: e.guide_id,
        lecteur_interne_id: e.lecteur_interne_id,
        lecteur_externe_id: e.lecteur_externe_id,
        problematique: e.problematique || '',
        thematique: e.thematique || '',
        categorie: e.categorie || '',
        source_1: e.source_1 || '',
        source_2: e.source_2 || '',
        source_3: e.source_3 || '',
        source_4: e.source_4 || '',
        source_5: e.source_5 || '',
        convocation_mars: '',
        convocation_avril: '',
        presence_9_mars: null,
        presence_10_mars: null,
        presence_16_avril: null,
        presence_17_avril: null,
        date_defense: null,
        heure_defense: null,
        localisation_defense: null,
        mediateur_id: null
      }));
      
      // Filtrer selon le champ et le type de filtre
      const filtered = eleves.filter(eleve => {
        const hasField = () => {
          switch (field) {
            case 'thematique':
              return eleve.thematique && eleve.thematique.trim() !== '';
            case 'problematique':
              return eleve.problematique && eleve.problematique.trim() !== '';
            case 'sources':
              return eleve.source_1 && eleve.source_1.trim() !== '' &&
                     eleve.source_2 && eleve.source_2.trim() !== '' &&
                     eleve.source_3 && eleve.source_3.trim() !== '' &&
                     eleve.source_4 && eleve.source_4.trim() !== '' &&
                     eleve.source_5 && eleve.source_5.trim() !== '';
            case 'guide':
              return !!eleve.guide_id;
            case 'lecteur_interne':
              return !!eleve.lecteur_interne_id;
            case 'lecteur_externe':
              return !!eleve.lecteur_externe_id;
            default:
              return false;
          }
        };
        
        return filter === 'with' ? hasField() : !hasField();
      });
      
      setElevesList(filtered);
      setSelectedStat(field);
      setFilterType(filter);
      setModalOpen(true);
    } catch (err) {
      console.error('Erreur chargement liste:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getStatColor = (pourcentage: number) => {
    if (pourcentage >= 80) return 'from-green-400 to-green-500';
    if (pourcentage >= 50) return 'from-yellow-400 to-yellow-500';
    return 'from-red-400 to-red-500';
  };

  const getStatIcon = (field: string) => {
    switch (field) {
      case 'thematique': return <BookOpen className="w-6 h-6" />;
      case 'problematique': return <TrendingUp className="w-6 h-6" />;
      case 'sources': return <BarChart3 className="w-6 h-6" />;
      case 'guide': return <Users className="w-6 h-6" />;
      case 'lecteur_interne': return <Eye className="w-6 h-6" />;
      case 'lecteur_externe': return <UserCheck className="w-6 h-6" />;
      default: return null;
    }
  };

  const getStatLabel = (field: string) => {
    switch (field) {
      case 'thematique': return 'Thématique';
      case 'problematique': return 'Problématique';
      case 'sources': return '5 Sources';
      case 'guide': return 'Guide';
      case 'lecteur_interne': return 'Lecteur interne';
      case 'lecteur_externe': return 'Lecteur externe';
      default: return '';
    }
  };

  const getModalTitle = () => {
    if (!selectedStat) return '';
    const label = getStatLabel(selectedStat);
    return filterType === 'with' 
      ? `Élèves AVEC ${label.toLowerCase()}`
      : `Élèves SANS ${label.toLowerCase()}`;
  };

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
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">📊 Tableau de bord statistique</h2>
              <p className="text-gray-600">Vue d'ensemble de l'avancement des TFH</p>
            </div>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-700">{stats.totalEleves}</div>
              <div className="text-sm text-blue-600">Élèves total</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-700">{stats.avecGuide}</div>
              <div className="text-sm text-green-600">Avec guide</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-700">{stats.avecProblematique}</div>
              <div className="text-sm text-purple-600">Problématique</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-700">{stats.avecSources}</div>
              <div className="text-sm text-orange-600">5 sources</div>
            </div>
          </div>
        )}
      </div>

      {stats && (
        <>
          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { field: 'thematique', value: stats.avecThematique, percentage: stats.pourcentageThematique },
              { field: 'problematique', value: stats.avecProblematique, percentage: stats.pourcentageProblematique },
              { field: 'sources', value: stats.avecSources, percentage: stats.pourcentageSources },
              { field: 'guide', value: stats.avecGuide, percentage: stats.pourcentageGuide },
              { field: 'lecteur_interne', value: stats.avecLecteurInterne, percentage: stats.pourcentageLecteurInterne },
              { field: 'lecteur_externe', value: stats.avecLecteurExterne, percentage: stats.pourcentageLecteurExterne },
            ].map((stat) => (
              <div
                key={stat.field}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        stat.percentage >= 80 ? 'bg-green-100 text-green-600' :
                        stat.percentage >= 50 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {getStatIcon(stat.field)}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">{getStatLabel(stat.field)}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      stat.percentage >= 80 ? 'bg-green-100 text-green-800' :
                      stat.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stat.percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                      className={`h-2.5 rounded-full bg-gradient-to-r ${getStatColor(stat.percentage)}`}
                      style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-100">
                  <div className="grid grid-cols-2 divide-x divide-gray-100">
                    <button
                      onClick={() => loadElevesList(stat.field, 'without')}
                      className="py-3 text-center text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Sans ({stats.totalEleves - stat.value})
                    </button>
                    <button
                      onClick={() => loadElevesList(stat.field, 'with')}
                      className="py-3 text-center text-sm font-medium text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Avec ({stat.value})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau détaillé */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Détails des indicateurs</h3>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Classé par importance</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Indicateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      État
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Complétion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { field: 'guide', label: 'Guide assigné', value: stats.avecGuide, percentage: stats.pourcentageGuide, color: 'yellow' },
                    { field: 'problematique', label: 'Problématique', value: stats.avecProblematique, percentage: stats.pourcentageProblematique, color: 'green' },
                    { field: 'thematique', label: 'Thématique', value: stats.avecThematique, percentage: stats.pourcentageThematique, color: 'blue' },
                    { field: 'sources', label: '5 sources rendues', value: stats.avecSources, percentage: stats.pourcentageSources, color: 'purple' },
                    { field: 'lecteur_interne', label: 'Lecteur interne', value: stats.avecLecteurInterne, percentage: stats.pourcentageLecteurInterne, color: 'indigo' },
                    { field: 'lecteur_externe', label: 'Lecteur externe', value: stats.avecLecteurExterne, percentage: stats.pourcentageLecteurExterne, color: 'pink' },
                  ].map((item) => (
                    <tr key={item.field} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                            item.color === 'green' ? 'bg-green-100 text-green-600' :
                            item.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                            item.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                            item.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                            'bg-pink-100 text-pink-600'
                          }`}>
                            {getStatIcon(item.field)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.label}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.percentage >= 80 ? 'bg-green-100 text-green-800' :
                            item.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.value} / {stats.totalEleves}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-48">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className={`h-2 rounded-full ${
                                  item.color === 'blue' ? 'bg-blue-500' :
                                  item.color === 'green' ? 'bg-green-500' :
                                  item.color === 'yellow' ? 'bg-yellow-500' :
                                  item.color === 'purple' ? 'bg-purple-500' :
                                  item.color === 'indigo' ? 'bg-indigo-500' :
                                  'bg-pink-500'
                                }`}
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                              />
                            </div>
                            <div className={`text-sm font-medium ${
                              item.percentage >= 80 ? 'text-green-600' :
                              item.percentage >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {item.percentage >= 80 ? '✓ Excellent' :
                               item.percentage >= 50 ? '⚠️ Moyen' : '✗ Critique'}
                            </div>
                          </div>
                        </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadElevesList(item.field, 'without')}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Voir manquants
                          </button>
                          <button
                            onClick={() => loadElevesList(item.field, 'with')}
                            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-sm flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Voir complétés
                          </button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Résumé global */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analyse globale
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Points forts</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Guide assigné', value: stats.pourcentageGuide },
                    { label: 'Problématique', value: stats.pourcentageProblematique },
                    { label: 'Thématique', value: stats.pourcentageThematique },
                  ]
                    .filter(item => item.value >= 70)
                    .map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">{item.label} : {item.value.toFixed(1)}%</span>
                      </li>
                    ))
                  }
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Points d'amélioration</h4>
                <ul className="space-y-2">
                  {[
                    { label: '5 sources', value: stats.pourcentageSources },
                    { label: 'Lecteur interne', value: stats.pourcentageLecteurInterne },
                    { label: 'Lecteur externe', value: stats.pourcentageLecteurExterne },
                  ]
                    .filter(item => item.value < 70)
                    .map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        <span className="text-gray-700">{item.label} : {item.value.toFixed(1)}%</span>
                      </li>
                    ))
                  }
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      <ElevesListModal
        isOpen={modalOpen}
        title={getModalTitle()}
        eleves={elevesList}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}