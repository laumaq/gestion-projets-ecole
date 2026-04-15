// app/dashboard/main/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AGStatusBadge from '@/components/ag/AGStatusBadge';
import { getTfhDashboardType, TfhDashboardType } from '@/lib/tfh/permissions';

interface Voyage {
  id: string;
  nom: string;
  destination: string;
  date_debut: string;
  date_fin: string;
  statut: string;
}

interface ProjetActif {
  id: string;
  nom: string;
  description: string | null;
}

interface GroupeTravail {
  id: string;
  nom: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userId, setUserId] = useState('');
  const [userJob, setUserJob] = useState('');
  const [mesVoyages, setMesVoyages] = useState<Voyage[]>([]);
  const [mesProjets, setMesProjets] = useState<ProjetActif[]>([]);
  const [loading, setLoading] = useState(true);
  const [agStatut, setAgStatut] = useState<'pas_ag' | 'preparation' | 'planning_etabli'>('pas_ag');
  const [groupeTravail, setGroupeTravail] = useState<GroupeTravail | null>(null);
  const [tfhDashboardType, setTfhDashboardType] = useState<TfhDashboardType>(null);

  useEffect(() => {
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const id = localStorage.getItem('userId');
    const job = localStorage.getItem('userJob');

    if (!type || !id) { router.push('/'); return; }

    setUserType(type);
    setUserId(id);
    setUserJob(job || '');

    chargerMesVoyages(type, id);
    chargerStatutAG();
    chargerGroupeTravail(type, id);
    chargerTfhDashboardType(userType, userId, userJob);

    if (type === 'student') {
      chargerMesProjets(parseInt(id));
    }
  }, [router]);

  const chargerStatutAG = async () => {
    try {
      const { data: ag } = await supabase
        .from('ag_configs')
        .select('statut')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ag) setAgStatut(ag.statut);
    } catch (error) {
      console.error('Erreur chargement statut AG:', error);
    }
  };

  const chargerMesProjets = async (matricule: number) => {
    const { data } = await supabase
      .from('projet_eleves')
      .select('projet_id, projets(id, nom, description, dashboard, statut)')
      .eq('matricule', matricule);

    const accessibles = (data || [])
      .map((r: any) => r.projets)
      .filter((p: any) => p && p.statut === 'actif' && p.dashboard === 'principal');

    setMesProjets(accessibles);
  };

  const chargerMesVoyages = async (type: string, id: string) => {
    try {
      setLoading(true);
      if (type === 'employee') {
        const { data: voyagesProf, error } = await supabase
          .from('voyage_professeurs')
          .select(`voyage_id, voyages:voyage_id (id, nom, destination, date_debut, date_fin, statut)`)
          .eq('professeur_id', id);
        if (error) { setMesVoyages([]); }
        else if (voyagesProf) {
          const voyages = voyagesProf
            .map((item: any) => item.voyages)
            .filter((v: any): v is Voyage => v !== null && typeof v === 'object' && 'id' in v);
          setMesVoyages(voyages);
        }
      } else {
        const { data: voyagesEleve, error } = await supabase
          .from('voyage_participants')
          .select(`voyage_id, voyages:voyage_id (id, nom, destination, date_debut, date_fin, statut)`)
          .eq('eleve_id', parseInt(id));
        if (error) { setMesVoyages([]); }
        else if (voyagesEleve) {
          const voyages = voyagesEleve
            .map((item: any) => item.voyages)
            .filter((v: any): v is Voyage => v !== null && typeof v === 'object' && 'id' in v);
          setMesVoyages(voyages);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des voyages:', error);
      setMesVoyages([]);
    } finally {
      setLoading(false);
    }
  };

  const chargerGroupeTravail = async (type: string, id: string) => {
    if (type !== 'employee') return;

    try {
      const { data, error } = await supabase
        .from('tfh_groupes_travail_membres')
        .select(`
          groupe_id,
          tfh_groupes_travail!inner (id, nom)
        `)
        .eq('employee_id', id)
        .maybeSingle();

      if (error || !data) {
        setGroupeTravail(null);
        return;
      }

      setGroupeTravail({
        id: data.groupe_id,
        nom: (data.tfh_groupes_travail as any).nom
      });
    } catch (error) {
      console.error('Erreur chargement groupe de travail:', error);
      setGroupeTravail(null);
    }
  };

  const chargerTfhDashboardType = async (type: 'employee' | 'student', id: string, job: string) => {
    const dashboardType = await getTfhDashboardType(type, id, job);
    setTfhDashboardType(dashboardType);
  };

  // Déterminer le libellé et le lien pour la case TFH
  const getTfhCardInfo = () => {
    if (userType === 'student') {
      const niveau = localStorage.getItem('userLevel') || '';
      if (niveau.startsWith('6')) {
        return {
          title: 'Mon TFH',
          description: 'Mon travail de fin d\'humanité',
          href: '/tools/tfh/eleve',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          borderColor: 'border-purple-400'
        };
      }
      return null;
    }

    // Employees
    if (tfhDashboardType === 'coordination') {
      return {
        title: groupeTravail?.nom || 'Groupe de travail TFH',
        description: 'Coordination et suivi des TFH',
        href: '/tools/tfh/coordination',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        borderColor: 'border-indigo-400'
      };
    }
    
    if (tfhDashboardType === 'direction') {
      return {
        title: 'TFH - Direction',
        description: 'Supervision des travaux de fin d\'humanité',
        href: '/tools/tfh/direction',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        borderColor: 'border-red-400'
      };
    }
    
    if (tfhDashboardType === 'guide') {
      return {
        title: 'TFH - Guide',
        description: 'Accompagnement des travaux de fin d\'humanité',
        href: '/tools/tfh/guide',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-400'
      };
    }

    return null;
  };

  const tfhCardInfo = getTfhCardInfo();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Bannière */}
      <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">
          Bonjour {localStorage.getItem('userName') || 'utilisateur'} !
        </h2>
        <p>Bienvenue sur votre espace pédagogique.</p>
      </div>

      {/* ── Outils disponibles ── */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Outils disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Sciences */}
          <Link href="/dashboard/sciences" className="block h-full">
            <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-green-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Sciences</h3>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                  Expériences collaboratives, simulations, fiches-outils
                </p>
              </div>
            </div>
          </Link>

          {/* Lancement de projets — prof Laurent uniquement */}
          {userType === 'employee' && (
            <Link href="/tools/projets" className="block h-full">
              <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-indigo-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Lancement de projets</h3>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                    Planification de projets pédagogiques
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Assemblée Générale */}
          {userType === 'employee' && (agStatut !== 'pas_ag' || userJob === 'direction') && (
            <Link href="/tools/ag" className="block h-full">
              <div className={`h-40 bg-white rounded-lg shadow-sm border-2 border-blue-300 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group ${agStatut === 'pas_ag' ? 'opacity-60' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Assemblée Générale</h3>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                    {agStatut === 'preparation' && "Préparez votre intervention"}
                    {agStatut === 'planning_etabli' && "Consultez le planning"}
                    {agStatut === 'pas_ag' && "Aucune AG programmée pour le moment"}
                  </p>
                </div>
                {agStatut && <AGStatusBadge statut={agStatut} />}
              </div>
            </Link>
          )}

          {/* Groupe de Travail / TFH */}
          {tfhCardInfo && (
            <Link href={tfhCardInfo.href} className="block h-full">
              <div className={`h-40 bg-white rounded-lg shadow-sm border-2 ${tfhCardInfo.borderColor} p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 ${tfhCardInfo.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <svg className={`w-5 h-5 ${tfhCardInfo.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{tfhCardInfo.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                    {tfhCardInfo.description}
                  </p>
                </div>
              </div>
            </Link>
          )}

        </div>
      </div>

      {/* ── Mes projets (élèves seulement, projets dashboard=principal) ── */}
      {userType === 'student' && mesProjets.length > 0 && (
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Mes projets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mesProjets.map(projet => (
              <Link key={projet.id} href={`/tools/projets/${projet.id}/eleve`} className="block h-full">
                <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-indigo-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-base">🏛️</span>
                      </div>
                      <h3 className="text-base font-medium text-gray-900 line-clamp-1 group-hover:line-clamp-none">
                        {projet.nom}
                      </h3>
                    </div>
                    {projet.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                        {projet.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full w-fit">
                    Projet actif
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mes voyages */}
      {mesVoyages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Mes voyages</h2>
          {loading ? (
            <p className="text-gray-500">Chargement des voyages...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mesVoyages.map((voyage) => (
                <Link key={voyage.id} href={`/tools/voyages/${voyage.id}`} className="block">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{voyage.nom}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        voyage.statut === 'préparation' ? 'bg-yellow-100 text-yellow-800' :
                        voyage.statut === 'confirmé' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {voyage.statut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{voyage.destination}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(voyage.date_debut).toLocaleDateString('fr-FR')} -{' '}
                      {new Date(voyage.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && mesVoyages.length === 0 && mesProjets.length === 0 && !tfhCardInfo && (
        <div className="text-center py-12">
          <p className="text-gray-500">Vous n'êtes impliqué dans aucun voyage pour le moment.</p>
        </div>
      )}

    </main>
  );
}