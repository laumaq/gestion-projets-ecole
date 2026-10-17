'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  HelpCircle,
  Settings2,
} from 'lucide-react';

type UserType = 'employee' | 'student';

interface HelpStep {
  title: string;
  description: string;
}

interface HelpSection {
  title: string;
  icon: typeof ClipboardList;
  steps: HelpStep[];
}

const studentSections: HelpSection[] = [
  {
    title: 'Retrouver et saisir mes mesures',
    icon: ClipboardList,
    steps: [
      { title: 'Ouvrir une expérience', description: 'Depuis le tableau de bord Sciences, ouvre une expérience à laquelle ta classe ou ton groupe participe. Si aucune expérience n’apparaît, ton professeur ne l’a peut-être pas encore partagée avec toi.' },
      { title: 'Compléter un tableau', description: 'Dans Données, renseigne les valeurs demandées en respectant les noms de colonnes et les unités affichées. Une mesure est ajoutée au tableau et partagée avec les participants de l’expérience.' },
      { title: 'Modifier mes mesures', description: 'Tes mesures apparaissent en premier. Tu peux modifier ou supprimer tes propres mesures tant qu’elles ne sont pas gelées et qu’aucune correction n’est affichée pour elles.' },
      { title: 'Éviter les doublons', description: 'Une mesure identique à une mesure que tu as déjà saisie est refusée. Vérifie les valeurs et change celles qui ne correspondent pas à ton nouvel essai.' },
    ],
  },
  {
    title: 'Lire les résultats',
    icon: BarChart3,
    steps: [
      { title: 'Graphiques', description: 'L’onglet Graphiques présente les données sous forme visuelle. Selon le graphique, les séries peuvent distinguer les groupes de mesures. Sur un graphique interactif, sélectionne un de tes points pour accéder à sa mesure.' },
      { title: 'Vérifications et corrections', description: 'Quand une vérification est configurée, tes résultats peuvent être comparés à une relation attendue. Les corrections affichées concernent uniquement tes propres mesures. Une mesure corrigée ne peut plus être modifiée.' },
      { title: 'Données gelées', description: 'Ton professeur peut verrouiller les mesures enregistrées avant une date donnée. Elles restent visibles pour garder l’historique, mais ne peuvent plus être modifiées ni supprimées.' },
    ],
  },
  {
    title: 'Accès et aide',
    icon: HelpCircle,
    steps: [
      { title: 'Je ne vois pas l’expérience', description: 'Une expérience est destinée aux classes et groupes choisis par le professeur. Tu y as accès si tu fais partie d’au moins une des classes ou un des groupes sélectionnés.' },
      { title: 'Je ne peux pas ajouter de mesure', description: 'Le professeur peut désactiver l’ajout de nouvelles mesures ou geler les données. Vérifie les indications de l’expérience et demande-lui si tu penses qu’un accès devrait être ouvert.' },
    ],
  },
];

const employeeSections: HelpSection[] = [
  {
    title: 'Créer une expérience collaborative',
    icon: FlaskConical,
    steps: [
      { title: 'Choisir les destinataires', description: 'Depuis le tableau de bord Sciences, sélectionne Expérience collaborative. Donne un nom et une description, puis cible une ou plusieurs classes et/ou groupes pédagogiques. Un élève peut accéder à l’expérience s’il correspond à au moins une cible.' },
      { title: 'Préparer les tableaux', description: 'Crée les tableaux de collecte, nomme chaque colonne et indique son unité. Les élèves rempliront les colonnes numériques depuis l’onglet Données.' },
      { title: 'Configurer les graphiques', description: 'Ajoute des graphiques en choisissant le tableau et les variables des axes. Un regroupement par colonne permet de distinguer automatiquement des séries.' },
    ],
  },
  {
    title: 'Accompagner la collecte et les résultats',
    icon: BarChart3,
    steps: [
      { title: 'Suivre les mesures', description: 'Dans Données, consulte les réponses partagées par les élèves. L’onglet Graphiques permet de visualiser les tendances et les séries calculées à partir des mesures.' },
      { title: 'Définir des vérifications', description: 'Dans Configuration > Vérifications, indique une relation à contrôler, la variable attendue et une tolérance. Les vérifications peuvent inclure plusieurs conditions et fournir des corrections par colonne.' },
      { title: 'Évaluer les résultats', description: 'L’onglet Évaluation présente les réponses et les résultats par tableau. Tu peux choisir le mode de calcul du score global et ajuster les seuils visuels.' },
    ],
  },
  {
    title: 'Régler les possibilités des élèves',
    icon: Settings2,
    steps: [
      { title: 'Autoriser de nouvelles mesures', description: 'Configuration > Paramètres permet d’autoriser ou non les élèves à ajouter de nouvelles mesures.' },
      { title: 'Geler les anciennes données', description: 'Définis une date de gel pour verrouiller les mesures antérieures. Elles restent consultables et leur historique n’est pas effacé.' },
      { title: 'Afficher les corrections', description: 'Tu peux choisir une date à partir de laquelle les corrections des mesures antérieures deviennent visibles. Une fois affichées, les mesures concernées ne sont plus modifiables par l’élève.' },
    ],
  },
];

function isSupportedReturnPath(path: string): boolean {
  return path === '/dashboard/sciences'
    || path === '/tools/sciences/nouvelle-experience'
    || /^\/tools\/sciences\/experiences\/[^/]+$/.test(path);
}

export default function SciencesHelpPage() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  useEffect(() => {
    const accountType = localStorage.getItem('userType');
    if (accountType === 'employee' || accountType === 'student') {
      setUserType(accountType);
    }

    const requestedPath = new URLSearchParams(window.location.search).get('from');
    if (requestedPath) {
      const requestedUrl = new URL(requestedPath, window.location.origin);
      if (requestedUrl.origin === window.location.origin && isSupportedReturnPath(requestedUrl.pathname)) {
        setSourcePath(requestedUrl.pathname);
      }
    }
  }, []);

  const sections = userType === 'student'
    ? studentSections
    : userType === 'employee'
      ? employeeSections
      : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={sourcePath || '/dashboard/sciences'}
          className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {sourcePath ? 'Retourner à ma page Sciences' : 'Retour au tableau de bord Sciences'}
        </Link>

        <section className="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-700 p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <HelpCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-100">Aide du module</p>
              <h1 className="mt-1 text-3xl font-bold">Expériences scientifiques collaboratives</h1>
              <p className="mt-2 max-w-3xl text-green-100">
                Des repères pour construire une collecte de données, partager les résultats et les exploiter en classe.
              </p>
            </div>
          </div>
        </section>

        {sections ? (
          <>
            <section className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {userType === 'student' ? 'Je participe à une expérience' : 'Je prépare une expérience pour mes élèves'}
                  </h2>
                  <p className="mt-1 text-gray-600">
                    {userType === 'student'
                      ? 'Les mesures sont partagées dans l’expérience pour permettre au groupe de comparer les résultats.'
                      : 'Les élèves ciblés peuvent saisir leurs mesures et consulter les visualisations que tu configures.'}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <section key={section.title} className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-lg bg-green-50 p-2 text-green-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    <ul className="space-y-4">
                      {section.steps.map(step => (
                        <li key={step.title} className="border-l-2 border-green-100 pl-4">
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
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <p className="text-sm leading-6 text-amber-900">
                  Pour une question sur les consignes, les vérifications ou les dates de collecte, adresse-toi à ton professeur ou à l’enseignant qui a créé l’expérience.
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Connecte-toi pour afficher l’aide adaptée</h2>
                <p className="mt-2 text-gray-600">
                  Les conseils diffèrent selon que tu participes à une expérience comme élève ou que tu la prépares comme membre du personnel.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Retour à la connexion
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
