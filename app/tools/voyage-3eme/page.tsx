'use client';

import Link from 'next/link';

export default function Voyage3emePage() {
  return (
    <div className="space-y-8">
      {/* Header avec infos voyage */}
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
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Voyage des 3ème</h1>
              <div className="flex flex-wrap gap-4 mt-3">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">📍</span>
                  <span className="text-gray-700">Normandie, France</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">📅</span>
                  <span className="text-gray-700">20-24 mai 2024</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">👥</span>
                  <span className="text-gray-700">45 élèves, 5 accompagnateurs</span>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <span className="px-4 py-2 bg-green-100 text-green-800 font-medium rounded-lg">
                Budget: €12,500
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sections principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planning */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Planning du voyage</h2>
          <div className="space-y-3">
            {[
              { day: 'Lundi 20 mai', activities: ['Départ 7h', 'Visite du Mémorial', 'Installation à l\'auberge'] },
              { day: 'Mardi 21 mai', activities: ['Journée plages du débarquement', 'Atelier historique'] },
              { day: 'Mercredi 22 mai', activities: ['Mont Saint-Michel', 'Visite guidée'] },
            ].map((day, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-3">
                <h3 className="font-medium text-gray-900">{day.day}</h3>
                <ul className="mt-2 space-y-1">
                  {day.activities.map((activity, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📎 Documents</h2>
          <div className="space-y-3">
            {[
              { name: 'Autorisation parentale', type: 'PDF', date: '15/04/2024' },
              { name: 'Liste des médicaments', type: 'Excel', date: '18/04/2024' },
              { name: 'Planning détaillé', type: 'PDF', date: '20/04/2024' },
              { name: 'Contacts d\'urgence', type: 'Excel', date: '22/04/2024' },
            ].map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    doc.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {doc.type === 'PDF' ? '📄' : '📊'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{doc.name}</div>
                    <div className="text-sm text-gray-500">{doc.date}</div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Télécharger
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gestion des chambres */}
      <GestionChambres projet="Voyage 3ème" />
    </div>
  );
}
