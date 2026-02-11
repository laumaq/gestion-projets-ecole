'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AGPage() {
  const [agMeetings, setAgMeetings] = useState([
    { id: 1, title: 'AG de rentrée', date: '15/09/2024', status: 'terminée', participants: 45 },
    { id: 2, title: 'AG pédagogique', date: '10/10/2024', status: 'à venir', participants: 38 },
    { id: 3, title: 'AG parents-professeurs', date: '15/11/2024', status: 'planifiée', participants: 60 },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <Link 
            href="/tools" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour aux outils
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Planification des AG</h1>
          <p className="text-gray-600 mt-2">
            Gestion des assemblées générales et réunions importantes
          </p>
        </div>
        <button className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
          Nouvelle AG
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">{agMeetings.length}</div>
          <div className="text-sm text-gray-600">AG planifiées</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {agMeetings.filter(m => m.status === 'terminée').length}
          </div>
          <div className="text-sm text-gray-600">AG terminées</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {agMeetings.filter(m => m.status === 'à venir').length}
          </div>
          <div className="text-sm text-gray-600">À venir</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {agMeetings.reduce((acc, m) => acc + m.participants, 0)}
          </div>
          <div className="text-sm text-gray-600">Participants totaux</div>
        </div>
      </div>

      {/* Liste des AG */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Assemblées Générales</h2>
        </div>
        <div className="divide-y">
          {agMeetings.map((meeting) => (
            <div key={meeting.id} className="px-6 py-4 hover:bg-gray-50 transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500">
                      📅 {meeting.date}
                    </span>
                    <span className="text-sm text-gray-500">
                      👥 {meeting.participants} participants
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 md:mt-0">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    meeting.status === 'terminée' ? 'bg-green-100 text-green-800' :
                    meeting.status === 'à venir' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {meeting.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Détails
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section documentation */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Outils disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">📋 Ordres du jour</h3>
            <p className="text-sm text-gray-600">Générateur d'ordres du jour pour les AG</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">📝 Procès-verbaux</h3>
            <p className="text-sm text-gray-600">Modèles et gestion des procès-verbaux</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">📧 Convocation</h3>
            <p className="text-sm text-gray-600">Système d'envoi des convocations</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">📊 Présences</h3>
            <p className="text-sm text-gray-600">Feuille de présence numérique</p>
          </div>
        </div>
      </div>
    </div>
  );
}
