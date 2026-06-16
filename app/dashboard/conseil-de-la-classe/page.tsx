// app/dashboard/conseil-de-la-classe/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, Shield, ChevronRight, Settings } from 'lucide-react';

interface ClasseInfo {
  classe_nom: string;
  nb_eleves: number;
  titulaire_nom?: string;
  co_titulaire_nom?: string;
}

export default function ConseilDeLaClasseDashboard() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClasseInfo[]>([]);
  const [annee, setAnnee] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    try {
      setLoading(true);

      // Récupérer l'année scolaire courante
      const { data: anneeData } = await supabase
        .from('conseil_classes_config')
        .select('annee_scolaire')
        .order('annee_scolaire', { ascending: false })
        .limit(1)
        .maybeSingle();

      const anneeCourante = anneeData?.annee_scolaire || '2025-2026';
      setAnnee(anneeCourante);

      // Récupérer toutes les classes depuis students
      const { data: studentsData } = await supabase
        .from('students')
        .select('classe')
        .not('classe', 'is', null)
        .not('classe', 'eq', '');

      const classesMap = new Map<string, number>();
      studentsData?.forEach(s => {
        if (s.classe) {
          classesMap.set(s.classe, (classesMap.get(s.classe) || 0) + 1);
        }
      });

      // Récupérer les titulaires
      const { data: rolesData } = await supabase
        .from('conseil_classes_roles')
        .select(`
          classe_nom,
          titulaire_id,
          co_titulaire_id,
          titulaire:titulaire_id (nom, prenom),
          co_titulaire:co_titulaire_id (nom, prenom)
        `)
        .eq('annee_scolaire', anneeCourante);

      const rolesMap = new Map();
      rolesData?.forEach((r: any) => {
        const titulaire = Array.isArray(r.titulaire) ? r.titulaire[0] : r.titulaire;
        const coTitulaire = Array.isArray(r.co_titulaire) ? r.co_titulaire[0] : r.co_titulaire;
        rolesMap.set(r.classe_nom, {
          titulaire_nom: titulaire ? `${titulaire.prenom} ${titulaire.nom}` : undefined,
          co_titulaire_nom: coTitulaire ? `${coTitulaire.prenom} ${coTitulaire.nom}` : undefined
        });
      });

      const classesList: ClasseInfo[] = Array.from(classesMap.entries()).map(([classe_nom, nb_eleves]) => ({
        classe_nom,
        nb_eleves,
        titulaire_nom: rolesMap.get(classe_nom)?.titulaire_nom,
        co_titulaire_nom: rolesMap.get(classe_nom)?.co_titulaire_nom
      })).sort((a, b) => a.classe_nom.localeCompare(b.classe_nom));

      setClasses(classesList);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Conseil de la classe
        </h1>
        <p className="text-gray-600">
          Année scolaire {annee} - Supervision générale
        </p>
      </div>

      {/* Cartes des modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Module Titulariat */}
        <div 
          onClick={() => router.push('/dashboard/conseil-de-la-classe/titulariat')}
          className="bg-white rounded-lg shadow-sm border-2 border-amber-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Titulariat</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Gestion des titulaires, co-titulaires et des rôles des élèves (président, secrétaire, délégué aux voyages)
          </p>
          <div className="flex items-center text-amber-600">
            <span className="text-sm">Gérer les titulariats</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module Ordre du jour (à venir) */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-400">Ordre du jour</h2>
          </div>
          <p className="text-gray-400 mb-4">
            Gestion des ordres du jour des conseils de classe
          </p>
          <div className="flex items-center text-gray-400">
            <span className="text-sm">Bientôt disponible</span>
          </div>
        </div>
      </div>

      {/* Aperçu des classes */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Aperçu des classes ({classes.length})</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Élèves</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titulaire</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Co-titulaire</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((classe) => (
                <tr key={classe.classe_nom} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {classe.classe_nom}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {classe.nb_eleves}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {classe.titulaire_nom || <span className="text-gray-400 italic">Non assigné</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {classe.co_titulaire_nom || <span className="text-gray-400 italic">Non assigné</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}