// /app/tools/sciences/projet-5eme/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FormulaireFacture from '@/components/sciences/projet-5eme/FormulaireFacture';
import FormulaireAppareil from '@/components/sciences/projet-5eme/FormulaireAppareil';
import VueGroupee from '@/components/sciences/projet-5eme/VueGroupee';
import Parametres from '@/components/sciences/projet-5eme/Parametres';

type Tab = 'facture' | 'appareils' | 'donnees' | 'parametres';

export default function ProjetCiteCommune() {
  const [activeTab, setActiveTab] = useState<Tab>('facture');
  const [userType, setUserType] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDeniedReason, setAccessDeniedReason] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      const type = localStorage.getItem('userType') ?? '';
      const id = localStorage.getItem('userId') ?? '';
      const name = localStorage.getItem('userName') ?? '';
      const level = localStorage.getItem('userLevel') ?? '';

      if (!type || !id) {
        window.location.href = '/';
        return;
      }

      setUserType(type);
      setUserId(id);
      setUserName(name);

      if (type === 'student') {
        // Accès aux élèves de 5ème
        if (level && level.startsWith('5')) {
          setIsAuthorized(true);
          setIsStudent(true);
        } else {
          setAccessDeniedReason(`Ce module est réservé aux élèves de 5ème (ton niveau : ${level || 'inconnu'}).`);
        }
      } else if (type === 'employee') {
        const { data } = await supabase
          .from('projet_cite_commune_acces')
          .select('id')
          .eq('employee_id', id)
          .single();

        if (data) {
          setIsAuthorized(true);
          setIsTeacher(true);
        } else {
          setAccessDeniedReason('Tu n\'as pas accès à ce module. Contacte Laurent Maquet ou Youssef Bakhti.');
        }
      }

      setLoading(false);
    };

    checkAccess();
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    ...(isStudent ? [
      { id: 'facture' as Tab, label: '📄 Ma facture' },
      { id: 'appareils' as Tab, label: '🔌 Mes appareils' },
    ] : []),
    { id: 'donnees' as Tab, label: '📊 Données de la classe' },
    ...(isTeacher ? [{ id: 'parametres' as Tab, label: '⚙️ Paramètres' }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Vérification des accès...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Accès restreint</h2>
        <p className="text-sm text-gray-500">{accessDeniedReason}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* En-tête */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">🏙️ Projet : Faire cité commune</h1>
        <p className="text-gray-500 text-sm mt-1">
          UAA 7 · De l'atome à l'éolienne · Collecte de données énergétiques
          {isTeacher && (
            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Vue enseignant
            </span>
          )}
        </p>
      </div>

      {/* Bandeau contexte */}
      {isStudent && (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4 mb-6 mt-4">
          <p className="text-sm text-green-800">
            <strong>👋 Bienvenue {userName} !</strong> Dans le cadre du projet de cité commune, tu vas collecter
            des données sur la consommation électrique de ton ménage. Ces données seront partagées avec
            toute la classe pour calculer la consommation d'une « cité » à notre échelle.
          </p>
        </div>
      )}

      {/* Navigation par onglets */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div>
        {activeTab === 'facture' && isStudent && (
          <FormulaireFacture userId={userId} />
        )}
        {activeTab === 'appareils' && isStudent && (
          <FormulaireAppareil userId={userId} />
        )}
        {activeTab === 'donnees' && (
          <VueGroupee isTeacher={isTeacher} />
        )}
        {activeTab === 'parametres' && isTeacher && (
          <Parametres currentUserId={userId} />
        )}
      </div>
    </div>
  );
}