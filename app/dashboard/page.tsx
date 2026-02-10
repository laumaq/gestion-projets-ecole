'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Interface pour les outils
interface Tool {
  id: number;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'active' | 'development' | 'planned';
  color: string;
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Récupérer les infos utilisateur
    const name = localStorage.getItem('userName') || 'Utilisateur';
    const role = localStorage.getItem('userRole') || 'employee';
    setUserName(name);
    setUserRole(role);
  }, []);

  // Liste des outils (à adapter selon vos besoins)
  const tools: Tool[] = [
    {
      id: 1,
      title: 'Gestion des Absences',
      description: 'Suivi et gestion des absences des élèves',
      icon: '📋',
      path: '/tools/absences',
      status: 'active',
      color: 'bg-blue-100 border-blue-300',
    },
    {
      id: 2,
      title: 'Planificateur de Cours',
      description: 'Organisation des emplois du temps',
      icon: '📅',
      path: '/tools/schedule',
      status: 'development',
      color: 'bg-green-100 border-green-300',
    },
    {
      id: 3,
      title: 'Bulletins et Notes',
      description: 'Saisie et consultation des résultats',
      icon: '📊',
      path: '/tools/grades',
      status: 'planned',
      color: 'bg-purple-100 border-purple-300',
    },
    {
      id: 4,
      title: 'Communication',
      description: 'Messagerie interne et annonces',
      icon: '💬',
      path: '/tools/messaging',
      status: 'active',
      color: 'bg-yellow-100 border-yellow-300',
    },
    {
      id: 5,
      title: 'Ressources Pédagogiques',
      description: 'Bibliothèque de documents partagés',
      icon: '📚',
      path: '/tools/resources',
      status: 'development',
      color: 'bg-red-100 border-red-300',
    },
    {
      id: 6,
      title: 'Évaluations',
      description: 'Création et gestion des évaluations',
      icon: '✏️',
      path: '/tools/exams',
      status: 'planned',
      color: 'bg-indigo-100 border-indigo-300',
    },
  ];

  // Filtrer les outils selon le rôle (exemple simple)
  const getFilteredTools = () => {
    // Logique de filtrage selon le rôle
    // Pour l'instant, tous les outils sont visibles
    return tools;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Actif</span>;
      case 'development':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">En développement</span>;
      case 'planned':
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Planifié</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-600 mt-2">
              Bienvenue, <span className="font-semibold text-blue-600">{userName}</span>
              <span className="ml-2 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                {userRole.toUpperCase()}
              </span>
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section des outils */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Outils disponibles</h2>
          <div className="text-sm text-gray-500">
            {tools.filter(t => t.status === 'active').length} sur {tools.length} outils actifs
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredTools().map((tool) => (
            <Link
              key={tool.id}
              href={tool.status === 'active' ? tool.path : '#'}
              className={`block ${tool.status !== 'active' ? 'cursor-not-allowed' : 'hover:shadow-lg transition-shadow duration-200'}`}
            >
              <div className={`h-full rounded-xl border-2 ${tool.color} p-6 ${tool.status !== 'active' ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{tool.icon}</div>
                  {getStatusBadge(tool.status)}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tool.title}</h3>
                <p className="text-gray-600 mb-4">{tool.description}</p>
                
                <div className="mt-4">
                  {tool.status === 'active' ? (
                    <span className="text-blue-600 font-medium text-sm flex items-center">
                      Accéder à l'outil
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  ) : tool.status === 'development' ? (
                    <span className="text-yellow-600 font-medium text-sm">Bientôt disponible</span>
                  ) : (
                    <span className="text-gray-500 font-medium text-sm">En cours de planification</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Section informations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Actualités et annonces</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-medium">Maintenance prévue</p>
              <p className="text-sm text-gray-600">Le système sera inaccessible le samedi 15 mars de 2h à 6h.</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="font-medium">Nouvelle fonctionnalité</p>
              <p className="text-sm text-gray-600">L'export des rapports d'absences est maintenant disponible.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Accès rapide</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <span className="font-medium text-gray-900">Mon profil</span>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <span className="font-medium text-gray-900">Paramètres</span>
            </button>
            <button 
              className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition font-medium"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
