'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Tool {
  id: number;
  title: string;
  category: string;
  description: string;
  status: 'active' | 'development' | 'planned';
  progress: number;
  icon: string;
  path: string;
}

export default function ToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const tools: Tool[] = [
    {
      id: 1,
      title: 'Gestion des Absences',
      category: 'Administratif',
      description: 'Suivi et gestion des absences des élèves avec notifications automatiques',
      status: 'active',
      progress: 100,
      icon: '📋',
      path: '/tools/absences',
    },
    {
      id: 2,
      title: 'Planificateur de Cours',
      category: 'Pédagogique',
      description: 'Organisation des emplois du temps et gestion des salles',
      status: 'development',
      progress: 65,
      icon: '📅',
      path: '/tools/schedule',
    },
    {
      id: 3,
      title: 'Bulletins et Notes',
      category: 'Pédagogique',
      description: 'Saisie, calcul et consultation des résultats scolaires',
      status: 'planned',
      progress: 20,
      icon: '📊',
      path: '/tools/grades',
    },
    {
      id: 4,
      title: 'Communication Interne',
      category: 'Communication',
      description: 'Messagerie, annonces et notifications pour l\'équipe pédagogique',
      status: 'active',
      progress: 100,
      icon: '💬',
      path: '/tools/messaging',
    },
    {
      id: 5,
      title: 'Ressources Pédagogiques',
      category: 'Ressources',
      description: 'Bibliothèque de documents, leçons et supports de cours partagés',
      status: 'development',
      progress: 45,
      icon: '📚',
      path: '/tools/resources',
    },
    {
      id: 6,
      title: 'Évaluations et Examens',
      category: 'Pédagogique',
      description: 'Création, gestion et correction des évaluations',
      status: 'planned',
      progress: 10,
      icon: '✏️',
      path: '/tools/exams',
    },
    {
      id: 7,
      title: 'Gestion des Projets',
      category: 'Pédagogique',
      description: 'Suivi des projets scolaires et activités parascolaires',
      status: 'development',
      progress: 30,
      icon: '🎯',
      path: '/tools/projects',
    },
    {
      id: 8,
      title: 'Bibliothèque Numérique',
      category: 'Ressources',
      description: 'Catalogue et gestion des ressources bibliographiques',
      status: 'planned',
      progress: 5,
      icon: '🏛️',
      path: '/tools/library',
    },
  ];

  const categories = ['all', 'Administratif', 'Pédagogique', 'Communication', 'Ressources'];

  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(tool => tool.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'development': return 'bg-yellow-100 text-yellow-800';
      case 'planned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'development': return 'En développement';
      case 'planned': return 'Planifié';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tous les outils</h1>
            <p className="text-gray-600 mt-2">
              Découvrez tous les outils disponibles et en développement pour votre école
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{tools.filter(t => t.status === 'active').length}</span> outils actifs
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'Tous' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des outils */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{tool.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{tool.title}</h3>
                    <span className="text-sm text-gray-500">{tool.category}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(tool.status)}`}>
                  {getStatusText(tool.status)}
                </span>
              </div>

              <p className="text-gray-600 mb-6">{tool.description}</p>

              {/* Barre de progression */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Progression</span>
                  <span>{tool.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      tool.status === 'active' ? 'bg-green-500' :
                      tool.status === 'development' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${tool.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {tool.status === 'active' && 'Disponible'}
                  {tool.status === 'development' && 'En cours de développement'}
                  {tool.status === 'planned' && 'Planifié pour bientôt'}
                </div>
                <Link
                  href={tool.status === 'active' ? tool.path : '#'}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    tool.status === 'active'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {tool.status === 'active' ? 'Accéder' : 'Indisponible'}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Statistiques */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Statistiques des outils</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {tools.filter(t => t.status === 'active').length}
            </div>
            <div className="text-sm text-green-800">Outils actifs</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {tools.filter(t => t.status === 'development').length}
            </div>
            <div className="text-sm text-yellow-800">En développement</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(tools.reduce((acc, t) => acc + t.progress, 0) / tools.length)}%
            </div>
            <div className="text-sm text-blue-800">Progression moyenne</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {tools.length}
            </div>
            <div className="text-sm text-purple-800">Outils total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
