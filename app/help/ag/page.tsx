'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  Users,
  Vote,
} from 'lucide-react';
import { useAGPermissions } from '@/hooks/ag/useAGPermissions';

type AgHelpRole = 'employee' | 'organizer';

interface HelpStep {
  title: string;
  description: string;
}

interface HelpSection {
  title: string;
  steps: HelpStep[];
}

const roleContent: Record<AgHelpRole, { title: string; intro: string; sections: HelpSection[] }> = {
  employee: {
    title: 'Je participe à l’Assemblée Générale',
    intro: 'Prépare la contribution de ton groupe ou une intervention personnelle, puis consulte le planning et les votes.',
    sections: [
      {
        title: 'Préparer mon intervention',
        steps: [
          { title: 'Quand le statut est « En préparation »', description: 'L’onglet Préparer mon intervention te permet d’envoyer une demande de temps de parole et un résumé. Indique un temps positif et choisis le type de communication : information, consultation ou décision.' },
          { title: 'Intervention de groupe de travail', description: 'Si tu es assigné à un GT, complète la demande de ton groupe. Vérifie son résumé et son temps demandé avant de l’enregistrer.' },
          { title: 'Intervention libre', description: 'Si tu n’as pas de GT, ou si tu souhaites proposer une intervention personnelle, donne-lui un titre et complète les mêmes informations. Tu peux ensuite mettre à jour ou supprimer ta demande.' },
        ],
      },
      {
        title: 'Le jour de l’AG',
        steps: [
          { title: 'Consulter le planning', description: 'Quand le planning est établi, ouvre Voir le planning pour retrouver l’ordre des interventions et les horaires prévus. Les temps et pauses sont intégrés au déroulement.' },
          { title: 'Votes', description: 'Ouvre l’onglet Votes pour voir les votes en cours ou clôturés. Lis la question et les choix affichés, puis participe lorsque le vote est ouvert.' },
        ],
      },
      {
        title: 'Je ne vois pas un onglet',
        steps: [
          { title: 'Le contenu dépend du statut', description: 'La préparation des interventions est ouverte pendant le statut En préparation. Le planning apparaît lorsque la direction ou le bureau l’a établi. L’onglet Votes reste accessible aux employés.' },
          { title: 'Mon GT est absent ou incorrect', description: 'Demande à la direction ou au bureau de vérifier ton assignation dans Gestion des GT.' },
        ],
      },
    ],
  },
  organizer: {
    title: 'Je prépare et organise l’AG',
    intro: 'La direction et les membres du bureau disposent des outils de configuration, de coordination des groupes et de construction du planning.',
    sections: [
      {
        title: 'Configurer l’Assemblée',
        steps: [
          { title: 'Choisir le statut', description: 'Pas d’AG désactive la préparation. En préparation permet aux employés de soumettre leurs demandes. Planning établi rend le planning visible à tous. Le changement de statut modifie donc ce que les participants peuvent consulter ou compléter.' },
          { title: 'Renseigner date et horaires', description: 'Dans Préparer l’AG > Configuration, définis la date, l’heure de début et l’heure de fin, puis enregistre les horaires.' },
          { title: 'Définir le type et les pauses', description: 'Choisis le type d’AG. Pour une AG classique, renseigne les groupes de travail; les pauses ont une durée et une heure idéale qui servent à construire le déroulement.' },
        ],
      },
      {
        title: 'Coordonner les contributions',
        steps: [
          { title: 'Gestion des GT', description: 'Assigne les employés aux groupes de travail et désigne les rôles du bureau, notamment maître du temps et animateur. Utilise la recherche et le filtre par emploi pour retrouver les personnes.' },
          { title: 'Suivre les demandes', description: 'Pendant la préparation, vérifie les demandes de GT et les interventions libres, leurs résumés, types de communication et temps demandés.' },
          { title: 'Attention à l’effacement', description: 'Le bouton Effacer toutes les demandes supprime les demandes des GT et les interventions libres. Cette action est destinée à réinitialiser la préparation : vérifie avant de confirmer.' },
        ],
      },
      {
        title: 'Construire et publier le planning',
        steps: [
          { title: 'Gestion du planning', description: 'Dans Préparer l’AG > Gestion du planning, organise les interventions et les pauses dans l’ordre de passage. Le glisser-déposer permet d’ajuster le déroulement.' },
          { title: 'Vérifier la durée', description: 'Compare le temps demandé au temps disponible entre les horaires de début et de fin. Vérifie le résultat et les pauses avant de passer au statut Planning établi.' },
          { title: 'Votes', description: 'L’onglet Votes permet de retrouver les votes de l’AG. Les votes associés aux contributions sont également accessibles depuis la préparation de l’intervention concernée.' },
        ],
      },
    ],
  },
};

export default function AgHelpPage() {
  const permissions = useAGPermissions();
  const [userType, setUserType] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setUserType(localStorage.getItem('userType'));
  }, []);

  const loading = permissions.loading || userType === undefined;
  const role: AgHelpRole | null = userType === 'employee'
    ? permissions.canConfigure ? 'organizer' : 'employee'
    : null;
  const content = role ? roleContent[role] : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/tools/ag"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l’Assemblée Générale
        </Link>

        <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <HelpCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">Aide du module</p>
              <h1 className="mt-1 text-3xl font-bold">Assemblée Générale</h1>
              <p className="mt-2 max-w-3xl text-blue-100">
                Des repères pratiques pour préparer une contribution, organiser l’AG et suivre son déroulement.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div role="status" className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Chargement de l’aide correspondant à votre rôle…
          </div>
        ) : content ? (
          <>
            <section className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{content.title}</h2>
                  <p className="mt-1 text-gray-600">{content.intro}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {content.sections.map((section, index) => {
                const Icon = section.title.includes('Vote')
                  ? Vote
                  : section.title.includes('planning') || section.title.includes('AG')
                    ? CalendarDays
                    : index === 0 ? ClipboardList : Users;
                return (
                  <section key={section.title} className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    <ul className="space-y-4">
                      {section.steps.map(step => (
                        <li key={step.title} className="border-l-2 border-blue-100 pl-4">
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
                  Pour corriger une assignation, une demande ou un élément du planning, contacte la direction ou un membre du bureau. En cas de problème technique, adresse-toi au support habituel de l’école.
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Aide AG non disponible pour ce compte</h2>
                <p className="mt-2 text-gray-600">
                  Le module Assemblée Générale est réservé au personnel. Connecte-toi avec un compte employé ou retourne au portail.
                </p>
                <Link
                  href="/dashboard/main"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Retourner au portail
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
