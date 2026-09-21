// app/tools/tfh/coordination/tabs/DashboardTab.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve, Guide, Externe } from '../types';
import { useTypesTFH } from '../hooks/useTypesTFH';
import { getJourneesFromSupabase, detecterSessions, Session } from '../utils/sessionUtils';
import {
  calculerRepartitionTypes,
  calculerPrepStats,
  calculerGuidesTradi,
  calculerDefensesEtablies,
  calculerLecteursEtMediateurs,
  calculerConvoquesProchaineSession,
  calculerConvocationsRemplies,
  calculerImplicationEmployees,
} from '../utils/dashboardStats';
import TypeRepartitionCard from '../components/TypeRepartitionCard';
import StatCard from '../components/StatCard';
import { analyserJournal, calculerRythmeReference } from '../utils/journalStats';
import {
  BookOpen, FileText, Link as LinkIcon, GraduationCap, Users, UserCheck,
  AlertTriangle, User, ClipboardList, BookUser, Target
} from 'lucide-react';

interface DashboardTabProps {
  eleves: Eleve[];
  guides: Guide[];
  externes: Externe[];
  allEmployees?: Array<{ id: string; job: string; groupe_id: string | null }>;
  onTabChange: (tab: any) => void;
  userName: string;
  coordinateurNom: string;
  coordinateurPrenom: string;
  demandesEnAttente: any[];
  demandesTraitees: any[];
  onApprouverDemande: (id: string, commentaire?: string) => Promise<boolean>;
  onRefuserDemande: (id: string, commentaire?: string) => Promise<boolean>;
  onRefresh: () => void;
}

export default function DashboardTab({
  eleves,
  guides,
  externes,
  allEmployees = [],
  userName,
  coordinateurNom,
  coordinateurPrenom,
  onRefresh,
}: DashboardTabProps) {
  const { typesDisponibles } = useTypesTFH(true);

  const [phasePreparatoire, setPhasePreparatoire] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Charger phase préparatoire + sessions
  useEffect(() => {
    const load = async () => {
      // Phase préparatoire
      const { data: phaseData } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'phase_preparatoire')
        .maybeSingle();

      setPhasePreparatoire(phaseData?.setting_value === 'true');

      // Sessions
      const journees = await getJourneesFromSupabase();
      setSessions(detecterSessions(journees));
    };
    load();
  }, []);

  // ============================================================
  // Bloc 1 — Répartition par type
  // ============================================================
  const repartition = useMemo(
    () => calculerRepartitionTypes(eleves, typesDisponibles),
    [eleves, typesDisponibles]
  );

  // ============================================================
  // Bloc 2 — Phase préparatoire
  // ============================================================
  const prepStats = useMemo(() => calculerPrepStats(eleves), [eleves]);

  // ============================================================
  // Bloc 3 — Phase normale
  // ============================================================
  const guidesTradi = useMemo(() => calculerGuidesTradi(eleves), [eleves]);
  const defensesEtablies = useMemo(() => calculerDefensesEtablies(eleves), [eleves]);
  const lecteursMediateurs = useMemo(() => calculerLecteursEtMediateurs(eleves), [eleves]);
  const convoques = useMemo(
    () => calculerConvoquesProchaineSession(eleves, sessions),
    [eleves, sessions]
  );
  const convocationsRemplies = useMemo(
    () => calculerConvocationsRemplies(eleves, sessions),
    [eleves, sessions]
  );
  const implication = useMemo(
    () => calculerImplicationEmployees(eleves, allEmployees),
    [eleves, allEmployees]
  );

  // Stats carnets (indicateur agrégé)
  const statsCarnets = useMemo(() => {
    const elevesCarnet = eleves.filter(e => e.type && e.type !== 'traditionnel');
    if (elevesCarnet.length === 0) return null;

    const rythmes = elevesCarnet.map(e => {
      const entries = e.journal || [];
      if (entries.length === 0) return null;
      const dates = entries.map(en => new Date(en.date)).filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return null;
      dates.sort((a, b) => b.getTime() - a.getTime());
      const premiere = dates[dates.length - 1];
      const semaines = Math.max(1, (Date.now() - premiere.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return entries.length / semaines;
    });
    const ref = calculerRythmeReference(rythmes);

    let rouges = 0, oranges = 0, jaunes = 0, verts = 0;
    elevesCarnet.forEach(e => {
      const stats = analyserJournal(e.journal, ref);
      if (stats.fraicheur === 'rouge') rouges++;
      else if (stats.fraicheur === 'orange') oranges++;
      else if (stats.fraicheur === 'jaune') jaunes++;
      else if (stats.fraicheur === 'vert') verts++;
    });

    return { total: elevesCarnet.length, rouges, oranges, jaunes, verts };
  }, [eleves]);

  if (phasePreparatoire === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Bonjour {coordinateurPrenom || userName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {phasePreparatoire ? '🚧 Phase préparatoire en cours' : '📊 Vue d\'ensemble du module TFH'}
        </p>
      </div>

      {/* Bloc 1 — Répartition */}
      <TypeRepartitionCard repartition={repartition} total={eleves.length} />

      {/* Bloc 2 — Phase préparatoire */}
      {phasePreparatoire && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Avancement de la phase préparatoire</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Thématique remplie"
              icon={BookOpen}
              count={prepStats.thematiqueRemplie.count}
              total={prepStats.thematiqueRemplie.total}
              pourcentage={prepStats.thematiqueRemplie.pourcentage}
              color="blue"
            />
            <StatCard
              label="Problématique / Titre rempli"
              icon={FileText}
              count={prepStats.problematiqueRemplie.count}
              total={prepStats.problematiqueRemplie.total}
              pourcentage={prepStats.problematiqueRemplie.pourcentage}
              color="violet"
            />
            <StatCard
              label="5 sources remplies"
              icon={LinkIcon}
              count={prepStats.sourcesRemplies.count}
              total={prepStats.sourcesRemplies.total}
              pourcentage={prepStats.sourcesRemplies.pourcentage}
              color="green"
            />
          </div>
        </div>
      )}

      {/* Bloc 3 — Phase normale */}
      {!phasePreparatoire && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Suivi des carnets de bord</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <StatCard
                label="Élèves concernés"
                icon={ClipboardList}
                count={statsCarnets?.total ?? 0}
                isCount
                color="gray"
                emptyMessage="Aucun carnet"
              />
              <StatCard
                label="🔴 Critiques"
                icon={AlertTriangle}
                count={statsCarnets?.rouges ?? 0}
                isCount
                color="red"
                emptyMessage="—"
              />
              <StatCard
                label="🟠 Alertes"
                icon={AlertTriangle}
                count={statsCarnets?.oranges ?? 0}
                isCount
                color="orange"
                emptyMessage="—"
              />
              <StatCard
                label="🟡 À surveiller"
                icon={AlertTriangle}
                count={statsCarnets?.jaunes ?? 0}
                isCount
                color="amber"
                emptyMessage="—"
              />
              <StatCard
                label="🟢 OK"
                icon={UserCheck}
                count={statsCarnets?.verts ?? 0}
                isCount
                color="green"
                emptyMessage="—"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Convocations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Convoqués prochaine session"
                subtitle={convoques.sessionNom || 'Aucune session à venir'}
                icon={Users}
                count={convoques.count}
                total={convoques.total}
                pourcentage={convoques.total > 0 ? Math.round((convoques.count / convoques.total) * 100) : 0}
                color="blue"
                emptyMessage="Aucune session à venir"
              />
              <StatCard
                label="Convocations renseignées"
                subtitle={convocationsRemplies.sessionNom || 'Aucune session à venir'}
                icon={ClipboardList}
                count={convocationsRemplies.count}
                total={convocationsRemplies.total}
                pourcentage={convocationsRemplies.pourcentage}
                color="violet"
                emptyMessage="Aucune session à venir"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Défenses & jurys</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Défenses établies (date + heure + lieu)"
                icon={GraduationCap}
                count={defensesEtablies.count}
                total={defensesEtablies.total}
                pourcentage={defensesEtablies.pourcentage}
                color="green"
              />
              <StatCard
                label="Avec lecteur externe"
                icon={User}
                count={lecteursMediateurs.lecteurExterne.count}
                total={lecteursMediateurs.lecteurExterne.total}
                pourcentage={lecteursMediateurs.lecteurExterne.pourcentage}
                color="blue"
              />
              <StatCard
                label="Avec médiateur"
                icon={User}
                count={lecteursMediateurs.mediateur.count}
                total={lecteursMediateurs.mediateur.total}
                pourcentage={lecteursMediateurs.mediateur.pourcentage}
                color="purple"
              />
              <StatCard
                label="Ni lecteur externe ni médiateur"
                icon={AlertTriangle}
                count={lecteursMediateurs.sansAucun.count}
                total={lecteursMediateurs.sansAucun.total}
                pourcentage={lecteursMediateurs.sansAucun.pourcentage}
                color={lecteursMediateurs.sansAucun.pourcentage > 0 ? 'red' : 'gray'}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Implication des équipes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Traditionnels avec guide"
                icon={UserCheck}
                count={guidesTradi.count}
                total={guidesTradi.total}
                pourcentage={guidesTradi.pourcentage}
                color="violet"
              />
              <StatCard
                label="Employees guide d'au moins 1 TFH"
                icon={User}
                count={implication.guides.count}
                total={implication.guides.total}
                pourcentage={implication.guides.pourcentage}
                color="amber"
              />
              <StatCard
                label="Employees lecteur interne d'au moins 1 TFH"
                icon={BookUser}
                count={implication.lecteursInternes.count}
                total={implication.lecteursInternes.total}
                pourcentage={implication.lecteursInternes.pourcentage}
                color="blue"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}