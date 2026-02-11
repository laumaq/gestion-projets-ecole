'use client';

import Link from 'next/link';
import GestionChambres from '@/components/GestionChambres.tsx';

export default function Projet5emePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link 
          href="/tools" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour aux outils
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projet 5ème</h1>
            <p className="text-gray-600 mt-2">
              Projet pédagogique interdisciplinaire des classes de 5ème
            </p>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition">
              Documentation
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              Ajouter une activité
            </button>
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Activités du projet</h2>
          <div className="space-y-4">
            {[
              { title: 'Sortie géologique', date: '15/10/2024', responsable: 'M. Dupont', status: 'confirmée' },
              { title: 'Atelier écriture', date: '22/10/2024', responsable: 'Mme Martin', status: 'planifiée' },
              { title: 'Exposition finale', date: '15/12/2024', responsable: 'M. Leroy', status: 'en préparation' },
            ].map((activity, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{activity.title}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-500">📅 {activity.date}</span>
                      <span className="text-sm text-gray-500">👤 {activity.responsable}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    activity.status === 'confirmée' ? 'bg-green-100 text-green-800' :
                    activity.status === 'planifiée' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Équipe pédagogique</h2>
          <div className="space-y-3">
            {[
              { name: 'Marie Dupont', role: 'Coordinatrice', subjects: 'Sciences' },
              { name: 'Jean Martin', role: 'Membre', subjects: 'Français' },
              { name: 'Pierre Leroy', role: 'Membre', subjects: 'Histoire' },
            ].map((teacher, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {teacher.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{teacher.name}</div>
                  <div className="text-sm text-gray-600">{teacher.role} • {teacher.subjects}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gestion des chambres (composant réutilisable) */}
      <GestionChambres projet="Projet 5ème" />
    </div>
  );
}
