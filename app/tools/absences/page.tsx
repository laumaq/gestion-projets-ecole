'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AbsencesPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header de l'outil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au tableau de bord
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Absences</h1>
          <p className="text-gray-600 mt-2">
            Suivi et gestion des absences des élèves - Version de démonstration
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setIsLoading(true)}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Traitement...' : 'Exporter le rapport'}
          </button>
        </div>
      </div>

      {/* Contenu de démonstration */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Page de démonstration</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Cette page est une démonstration de ce à quoi ressemblera l'outil de gestion des absences.
            Le développement complet sera implémenté ultérieurement.
          </p>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Absences aujourd'hui</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">12</div>
              <div className="text-sm text-gray-600">Absences cette semaine</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">98%</div>
              <div className="text-sm text-gray-600">Taux de présence</div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-gray-500 text-sm">
              <strong>Prochaines étapes :</strong> Intégration avec la base de données, formulaire de saisie, 
              système de notifications, rapports détaillés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
