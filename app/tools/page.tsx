'use client';

import Link from 'next/link';

interface Tool {
  id: number;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'active' | 'development' | 'planned';
  category: 'AG' | 'Projets' | 'Voyages' | 'Administration';
}

export default function ToolsPage() {
  const tools: Tool[] = [
    {
      id: 1,
      title: 'Planification des AG',
      description: 'Organisation et suivi des assemblées générales',
      icon: '👥',
      path: '/tools/ag',
      status: 'active',
      category: 'AG'
    },
    {
      id: 2,
      title: 'Projet 5ème',
      description: 'Gestion du projet pédagogique des classes de 5ème',
      icon: '🎓',
      path: '/tools/projet-5eme',
      status: 'active',
      category: 'Projets'
    },
    {
      id: 3,
      title: 'Voyage 3ème',
      description: 'Organisation du voyage scolaire des classes de 3ème',
      icon: '🗺️',
      path: '/tools/voyage-3eme',
      status: 'active',
      category: 'Voyages'
    },
    {
      id: 4,
      title: 'Voyage des 1ère',
      description: 'Gestion du voyage scolaire des classes de 1ère',
      icon: '✈️',
      path: '/tools/voyage-1ere',
      status: 'development',
      category: 'Voyages'
    },
    {
      id: 5,
      title: 'Gestion des TFH',
      description: 'Administration des travaux de fin d\'humanités',
      icon: '📚',
      path: '/tools/gestion-tfh',
      status: 'development',
      category: 'Administration'
    },
    {
      id: 6,
      title: 'Gestion des Chambres',
      description: 'Répartition et gestion des chambres pour les voyages',
      icon: '🏨',
      path: '/tools/gestion-chambres',
      status: 'active',
      category: 'Voyages'
    }
  ];

  const categories = ['Tous', 'AG', 'Projets', 'Voyages', 'Administration'];
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  const filteredTools = selectedCategory === 'Tous' 
    ? tools 
    : tools.filter(tool => tool.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Outils pédagogiques</h1>
            <p className="text-gray-600 mt-2">
              Sélectionnez un outil pour gérer vos activités scolaires
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{tools.filter(t => t.status === 'active').length}</span> outils actifs
            </div>
          </div>
        </div>

        {/* Filtres par catégorie */}
        <div className="mt-6 flex flex-wrap gap-2">
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
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des outils */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.path}
            className="block group"
          >
            <div className="h-full bg-white rounded-xl shadow hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl">{tool.icon}</div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  tool.status === 'active' ? 'bg-green-100 text-green-800' :
                  tool.status === 'development' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tool.status === 'active' ? 'Actif' : 
                   tool.status === 'development' ? 'En développement' : 'Planifié'}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                {tool.title}
              </h3>
              <p className="text-gray-600 mb-4">{tool.description}</p>
              
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {tool.category}
                </span>
                <span className="text-blue-600 font-medium text-sm flex items-center">
                  Accéder
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
