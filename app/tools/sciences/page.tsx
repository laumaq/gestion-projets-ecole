'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FICHES_OUTILS, FICHE_COLOR_MAP } from '@/lib/sciences/fiches-outils/registry';
import { computeStatut, FicheStatut, STATUT_LABELS, STATUT_COLORS } from '@/lib/sciences/fiches-outils/attribution';

interface Cibles {
  classes: string[];
  groupes: string[];
}

interface Experience {
  id: string;
  nom: string;
  description: string;
  classe: string;
  cibles: Cibles | null;
  created_at: string;
  statut: string;
  config: any;
  _count?: { mesures: number };
}

export default function SciencesPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userJob, setUserJob] = useState('');
  const [userClass, setUserClass] = useState('');
  const [userLevel, setUserLevel] = useState('');
  const [hasCiteAccess, setHasCiteAccess] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [fichesStatuts, setFichesStatuts] = useState<Record<string, FicheStatut>>({});

  const expIcon = useMemo(() => {
    const icons = [
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    ];
    return icons[Math.floor(Math.random() * icons.length)];
  }, []);

  useEffect(() => {
    const init = async () => {
      const type = localStorage.getItem('userType') as 'employee' | 'student';
      const id = localStorage.getItem('userId');
      const name = localStorage.getItem('userName');
      const job = localStorage.getItem('userJob');
      const classe = localStorage.getItem('userClass');
      const level = localStorage.getItem('userLevel') ?? '';

      if (!type || !id) { router.push('/'); return; }

      setUserType(type); setUserId(id); setUserName(name || '');
      setUserJob(job || ''); setUserClass(classe || ''); setUserLevel(level);

      if (type === 'employee') {
        const { data } = await supabase
          .from('projet_cite_commune_acces').select('id').eq('employee_id', id).single();
        setHasCiteAccess(!!data);
        chargerExperiencesProf(id);
      } else {
        if (level.startsWith('5')) setHasCiteAccess(true);
        chargerExperiencesEleve(parseInt(id), classe || '');
        chargerFichesStatuts(parseInt(id));
      }
    };
    init();
  }, [router]);

  // ── Statuts fiches pour l'élève ───────────────────────────
  const chargerFichesStatuts = async (matricule: number) => {
    const { data } = await supabase
      .from('fiches_outils_progression')
      .select('*')
      .eq('student_id', matricule)
      .maybeSingle();
    if (!data) return;
    const row = data as unknown as Record<string, string | null>;
    const statuts: Record<string, FicheStatut> = {};
    for (const f of FICHES_OUTILS) {
      statuts[f.key] = computeStatut(row, f.key);
    }
    setFichesStatuts(statuts);
  };

  // ── Chargement prof ───────────────────────────────────────
  const chargerExperiencesProf = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiences').select('*, experience_mesures(count)')
        .eq('created_by', id).order('created_at', { ascending: false });
      if (error) throw error;
      setExperiences((data || []).map(exp => ({
        ...exp,
        _count: { mesures: exp.experience_mesures?.[0]?.count || 0 }
      })));
    } catch (error) {
      console.error('Erreur chargement expériences prof:', error);
    } finally { setLoading(false); }
  };

  // ── Chargement élève ──────────────────────────────────────
  const chargerExperiencesEleve = async (matricule: number, classe: string) => {
    try {
      setLoading(true);
      const { data: groupesData } = await supabase
        .from('students_groups').select('groupe_code').eq('matricule', matricule);
      const groupesEleve = (groupesData || []).map((g: any) => g.groupe_code);
      const { data, error } = await supabase
        .from('experiences').select('*, experience_mesures(count)')
        .eq('statut', 'active').order('created_at', { ascending: false });
      if (error) throw error;
      const visibles = (data || []).filter(exp => {
        const cibles: Cibles = exp.cibles || { classes: [exp.classe], groupes: [] };
        return cibles.classes.includes(classe) || groupesEleve.some((g: string) => cibles.groupes.includes(g));
      });
      setExperiences(visibles.map(exp => ({
        ...exp,
        _count: { mesures: exp.experience_mesures?.[0]?.count || 0 }
      })));
    } catch (error) {
      console.error('Erreur chargement expériences élève:', error);
    } finally { setLoading(false); }
  };

  const resumeCibles = (exp: Experience): string => {
    const cibles = exp.cibles;
    if (!cibles) return exp.classe || '—';
    const parts = [...cibles.classes, ...cibles.groupes];
    if (parts.length === 0) return exp.classe || '—';
    if (parts.length <= 2) return parts.join(', ');
    return `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`;
  };

  // Fiches à afficher dans le dashboard :
  // - élève : uniquement les fiches attribuées
  // - enseignant : toutes les fiches disponibles (accès direct)
  const fichesVisibles = FICHES_OUTILS.filter(f =>
    userType === 'employee' || fichesStatuts[f.key] !== 'not_attributed'
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Bannière */}
      <div className="mb-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">
          Bonjour {userName || 'utilisateur'} !
        </h2>
        <p>
          {userType === 'employee'
            ? 'Espace sciences — Créez et gérez vos expériences collaboratives'
            : 'Espace sciences — Participez aux expériences de votre classe'}
        </p>
      </div>

      {/* Outils scientifiques */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Outils scientifiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <Link href="/tools/sciences/circuit-constructor" className="block h-full">
            <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-yellow-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Simulateur de circuits</h3>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                  Simulez des circuits électriques (Piles, Résistances, Mesures)
                </p>
              </div>
            </div>
          </Link>

          {userType === 'employee' && (
            <Link href="/tools/sciences/nouvelle-experience" className="block h-full">
              <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-green-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {expIcon}
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Expérience collaborative</h3>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                    Créer une expérience collaborative pour votre classe
                  </p>
                </div>
              </div>
            </Link>
          )}

        </div>
      </div>

      {/* ── FICHES-OUTILS ── */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Fiches-outils</h2>
          <Link href="/tools/sciences/fiches-outils"
            className="text-sm text-green-700 hover:text-green-900 font-medium">
            {userType === 'employee' ? 'Gérer les attributions →' : 'Voir tout →'}
          </Link>
        </div>

        {userType === 'student' && fichesVisibles.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Aucune fiche-outil attribuée pour l'instant.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Carte d'accès au panneau pour l'enseignant */}
            {userType === 'employee' && (
              <Link href="/tools/sciences/fiches-outils" className="block h-full">
                <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-purple-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Gérer les fiches</h3>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                      Attribuer des fiches et suivre la progression des élèves
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Fiches disponibles */}
            {fichesVisibles.map(fiche => {
              const c = FICHE_COLOR_MAP[fiche.color];
              const statut: FicheStatut = userType === 'employee' ? 'attributed' : (fichesStatuts[fiche.key] ?? 'not_attributed');
              const sc = STATUT_COLORS[statut];
              return (
                <Link key={fiche.key} href={fiche.href} className="block h-full">
                  <div className="h-40 bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group"
                    style={{ border: `2px solid ${c.border}` }}>
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: c.bg }}>
                          <svg className="w-4 h-4" fill="none" stroke={c.text} strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                        </div>
                        {userType === 'student' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0"
                            style={{ background: sc.bg, color: sc.text, border: `0.5px solid ${sc.border}` }}>
                            {STATUT_LABELS[statut]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{fiche.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 group-hover:line-clamp-none">
                        {fiche.description}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full self-start"
                      style={{ background: c.bg, color: c.text }}>
                      {fiche.subject}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Mes projets */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Mes projets</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Chargement...</p>
          </div>
        ) : !hasCiteAccess && experiences.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {userType === 'employee' ? 'Aucune expérience créée' : 'Aucune expérience en cours'}
            </h3>
            <p className="text-gray-500">
              {userType === 'employee'
                ? 'Cliquez sur "Expérience collaborative" pour commencer'
                : 'Vos professeurs n\'ont pas encore ouvert d\'expérience pour votre classe'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {hasCiteAccess && (
              <Link href="/tools/sciences/projet-5eme" className="block h-full">
                <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-teal-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 leading-snug">🏙️ Faire cité commune</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full ml-2 flex-shrink-0">5ème</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all">
                      Collecte de données énergétiques · UAA 7
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {experiences.map((exp) => (
              <Link key={exp.id} href={`/tools/sciences/experiences/${exp.id}`} className="block h-full">
                <div className="h-40 bg-white rounded-lg shadow-sm border-2 border-green-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer flex flex-col justify-between overflow-hidden group">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {expIcon}
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 leading-snug line-clamp-1 group-hover:line-clamp-none">{exp.nom}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full ml-2 flex-shrink-0 max-w-[120px] truncate" title={resumeCibles(exp)}>
                        {resumeCibles(exp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 group-hover:line-clamp-none transition-all">
                      {exp.description || 'Aucune description'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>Créée le {new Date(exp.created_at).toLocaleDateString('fr-FR')}</span>
                    {exp._count && (
                      <span className="bg-gray-100 px-2 py-1 rounded-full">
                        {exp._count.mesures} mesure{exp._count.mesures > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}