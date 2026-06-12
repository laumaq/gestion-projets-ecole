// components/conseilLaClasse/ConseilLaClasseCard.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ConseilLaClasseCardProps {
  classeNom: string;
  userType: 'employee' | 'student';
  userId: string;
  userJob?: string | null;
}

export function ConseilLaClasseCard({ classeNom, userType, userId, userJob }: ConseilLaClasseCardProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');

  useEffect(() => {
    verifierAcces();
  }, [classeNom, userType, userId, userJob]);

  const verifierAcces = async () => {
    try {
      const annee = '2024-2025';
      
      if (userType === 'student') {
        const userClass = localStorage.getItem('userClass');
        if (userClass === classeNom) {
          setHasAccess(true);
          setRole('élève');
        }
      } else {
        const { data: roles, error } = await supabase
          .from('conseil_classes_roles')
          .select('titulaire_id, co_titulaire_id')
          .eq('annee_scolaire', annee)
          .eq('classe_nom', classeNom)
          .single();

        if (!error && roles) {
          if (roles.titulaire_id === userId) {
            setHasAccess(true);
            setRole('titulaire');
          } else if (roles.co_titulaire_id === userId) {
            setHasAccess(true);
            setRole('co-titulaire');
          } else if (userJob === 'direction') {
            setHasAccess(true);
            setRole('direction');
          }
        }
      }
    } catch (error) {
      console.error('Erreur vérification accès:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !hasAccess) return null;

  return (
    <Link href={`/dashboard/conseil-classe/${encodeURIComponent(classeNom)}`} className="block h-full">
      <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-amber-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Conseil de la classe {classeNom}
            </h3>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
            {role === 'direction' && "Supervision des conseils de classe"}
            {(role === 'titulaire' || role === 'co-titulaire') && "Animation et gestion du conseil"}
            {role === 'élève' && "Participation à la vie démocratique de la classe"}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
            {role === 'direction' ? 'Supervision' : (role === 'titulaire' || role === 'co-titulaire') ? 'Animation' : 'Participation'}
          </span>
          <span className="text-amber-600 text-sm group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </Link>
  );
}