'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TfhRole = 'eleve' | 'coordination' | 'guide' | 'direction';

interface HelpStep {
  title: string;
  description: string;
}

interface HelpSection {
  title: string;
  steps: HelpStep[];
}

const roleContent: Record<TfhRole, { title: string; intro: string; sections: HelpSection[] }> = {
  eleve: {
    title: 'Mon espace élève',
    intro: 'Retrouve ici les repères pour choisir ton projet, suivre son avancement et préparer ta défense.',
    sections: [
      {
        title: 'Faire avancer mon projet',
        steps: [
          { title: 'Mes choix', description: 'Choisis un type de TFH et complète les informations de ton projet : thématique, description, problématique ou titre, sources et lien vers ton travail. Si une information n’est pas modifiable, la période de modification est peut-être terminée.' },
          { title: 'Mon carnet de bord', description: 'Pour les formats qui le proposent, ajoute régulièrement des entrées : objectif, déroulement ou réflexion. Le carnet n’apparaît pas pour le format traditionnel.' },
          { title: 'Échéancier', description: 'Consulte les prochaines dates importantes. Les journées de travail et de défense y sont également reprises.' },
        ],
      },
      {
        title: 'Me préparer et retrouver les ressources',
        steps: [
          { title: 'Mes infos', description: 'Retrouve le récapitulatif de ton projet et les informations de suivi communiquées par ton guide.' },
          { title: 'Ma défense', description: 'Quand cet onglet est activé, vérifie la date, l’heure, le lieu et les membres du jury.' },
          { title: 'Documents et Vade Mecum', description: 'Consulte les documents partagés dans l’onglet Documents. Le Vade Mecum explique les formats de TFH, les attentes et le carnet de bord.' },
        ],
      },
      {
        title: 'Un document a été rejeté ?',
        steps: [
          { title: 'Envoyer une version corrigée', description: 'L’alerte affichée dans ton espace indique les documents concernés. Ouvre Documents, corrige le fichier demandé, puis envoie la nouvelle version.' },
        ],
      },
    ],
  },
  coordination: {
    title: 'Espace de coordination',
    intro: 'Le tableau de bord rassemble le suivi des élèves, les échéances et l’organisation des défenses.',
    sections: [
      {
        title: 'Suivre les travaux',
        steps: [
          { title: 'Tableau de bord et Liste des TFH', description: 'Le tableau de bord donne une vue synthétique. Dans Liste des TFH, retrouve les élèves, filtre les travaux et ouvre une fiche pour consulter les informations du projet.' },
          { title: 'Suivi Carnets', description: 'Consulte l’avancement des carnets de bord des élèves dont le format de TFH en prévoit un.' },
          { title: 'Contrôle et Statistiques', description: 'Utilise ces vues pour repérer les informations à vérifier et suivre l’avancement global.' },
        ],
      },
      {
        title: 'Organiser les étapes du TFH',
        steps: [
          { title: 'Convocations et Présences', description: 'Mets à jour les convocations par session et consigne les présences aux journées TFH.' },
          { title: 'Défenses et Calendrier', description: 'Planifie les défenses, renseigne les personnes et le lieu, puis consulte le calendrier pour repérer les conflits.' },
          { title: 'Année TFH', description: 'Retrouve les repères de l’année et les échéances de travail ou de défense disponibles dans cet onglet.' },
        ],
      },
      {
        title: 'Gérer les ressources et les réglages',
        steps: [
          { title: 'Documents', description: 'Partage un document avec les élèves concernés ou demande-leur de renvoyer un document complété. Tu peux ensuite suivre son statut de validation.' },
          { title: 'Utilisateurs et Paramètres', description: 'Les onglets Utilisateurs et Paramètres servent à gérer les personnes concernées et les options du module. Vérifie les destinataires et les réglages avant de les modifier.' },
        ],
      },
    ],
  },
  guide: {
    title: 'Espace guide',
    intro: 'Utilise ton espace pour suivre les élèves qui te sont attribués et préparer leur accompagnement.',
    sections: [
      {
        title: 'Accompagner les élèves',
        steps: [
          { title: 'Onglet Guide', description: 'Consulte les projets des élèves dont tu es le guide, leurs convocations par session et leur objectif particulier. Mets à jour le suivi lorsque la situation de l’élève le nécessite.' },
          { title: 'Onglet Lecteur interne', description: 'Retrouve les travaux pour lesquels tu interviens comme lecteur interne.' },
          { title: 'Onglet Défenses', description: 'Vérifie les défenses programmées et celles qui attendent encore une date, une heure ou un lieu.' },
        ],
      },
      {
        title: 'Préparer une défense',
        steps: [
          { title: 'Vérifier les informations', description: 'Consulte la composition du jury et les informations pratiques de la défense dans l’espace dédié. Si une information manque ou semble incorrecte, signale-la à la coordination TFH.' },
        ],
      },
    ],
  },
  direction: {
    title: 'Supervision TFH',
    intro: 'L’espace de supervision de la direction est en cours de construction. Les indicateurs affichés ne constituent pas encore un suivi opérationnel.',
    sections: [
      {
        title: 'Pour le suivi opérationnel',
        steps: [
          { title: 'Contacter la coordination TFH', description: 'Pour une information sur un élève, une échéance ou une défense, adresse-toi à la coordination TFH, dont l’espace de gestion contient les données de suivi.' },
        ],
      },
    ],
  },
};

function getContextLabel(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('/tools/tfh/coordination')) return 'tableau de coordination';
  if (path.startsWith('/tools/tfh/eleve')) return 'espace élève';
  if (path.startsWith('/tools/tfh/guide')) return 'espace guide';
  if (path.startsWith('/tools/tfh/direction')) return 'espace de supervision';
  return 'module TFH';
}

export default function TfhHelpPage() {
  const [role, setRole] = useState<TfhRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHelpContext = async () => {
      const requestedPath = new URLSearchParams(window.location.search).get('from');
      if (requestedPath) {
        const requestedUrl = new URL(requestedPath, window.location.origin);
        if (requestedUrl.origin === window.location.origin && requestedUrl.pathname.startsWith('/tools/tfh/')) {
          setSourcePath(requestedUrl.pathname);
        }
      }

      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      const userJob = localStorage.getItem('userJob') || '';

      if (!userType || !userId) {
        setLoading(false);
        return;
      }

      try {
        if (userType === 'student') {
          const matricule = Number(userId);
          if (!Number.isFinite(matricule)) {
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('students')
            .select('niveau')
            .eq('matricule', matricule)
            .maybeSingle();

          if (error) throw error;
          if (!cancelled && data?.niveau?.toString().startsWith('6')) {
            setRole('eleve');
          }
        } else if (userType === 'employee') {
          if (userJob === 'direction') {
            if (!cancelled) setRole('direction');
          } else {
            const { data, error } = await supabase
              .from('employees')
              .select('groupe_id')
              .eq('id', userId)
              .maybeSingle();

            if (error) throw error;
            if (!cancelled) {
              if (data?.groupe_id === '0092b3db-1f7e-40e1-8f6b-70219d6a50f2') {
                setRole('coordination');
              } else if (userJob === 'prof') {
                setRole('guide');
              }
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Impossible de déterminer votre espace TFH.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHelpContext();
    return () => {
      cancelled = true;
    };
  }, []);

  const content = role ? roleContent[role] : null;
  const backHref = sourcePath || (role ? `/tools/tfh/${role === 'eleve' ? 'eleve' : role}` : '/dashboard/main');
  const contextLabel = getContextLabel(sourcePath);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {sourcePath || role ? 'Retourner à mon espace TFH' : 'Retour au portail'}
        </Link>

        <section className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <HelpCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">Aide du module</p>
              <h1 className="mt-1 text-3xl font-bold">Travail de Fin d’Humanité</h1>
              <p className="mt-2 max-w-3xl text-indigo-100">
                {contextLabel ? `Repères utiles depuis votre ${contextLabel}.` : 'Des repères pratiques, adaptés à votre espace et à votre rôle.'}
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div role="status" className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Chargement de l’aide correspondant à votre rôle…
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            L’aide personnalisée n’a pas pu être chargée : {loadError}
          </div>
        ) : content ? (
          <>
            <section className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{content.title}</h2>
                  <p className="mt-1 text-gray-600">{content.intro}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {content.sections.map((section, index) => {
                const Icon = index === 0 ? BookOpen : index === 1 ? CalendarDays : ClipboardList;
                return (
                  <section key={section.title} className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    <ul className="space-y-4">
                      {section.steps.map(step => (
                        <li key={step.title} className="border-l-2 border-indigo-100 pl-4">
                          <h4 className="font-medium text-gray-900">{step.title}</h4>
                          <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <p className="text-sm leading-6 text-amber-900">
                  Une question sur un choix, une échéance ou une information de suivi ? Contacte ton guide ou la coordination TFH. Pour un problème d’accès à ton compte, adresse-toi au support habituel de l’école.
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Aide TFH non disponible pour ce compte</h2>
                <p className="mt-2 text-gray-600">
                  Connecte-toi avec le compte utilisé pour accéder au module TFH. Si tu penses devoir y avoir accès, contacte la coordination TFH.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Se connecter
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
