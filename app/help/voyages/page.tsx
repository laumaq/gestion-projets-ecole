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
  Hotel,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type VoyageHelpRole = 'student' | 'responsable' | 'employee';

interface HelpStep {
  title: string;
  description: string;
}

interface HelpSection {
  title: string;
  steps: HelpStep[];
}

const roleContent: Record<VoyageHelpRole, { title: string; intro: string; sections: HelpSection[] }> = {
  student: {
    title: 'Je participe à un voyage',
    intro: 'Retrouve les informations du voyage, complète les éléments demandés et prépare tes activités.',
    sections: [
      {
        title: 'Avant le départ',
        steps: [
          { title: 'Accepter la charte', description: 'Lis la charte jusqu’au bout et attends la fin du temps de lecture avant de l’accepter. Cette étape est nécessaire pour accéder à ton voyage.' },
          { title: 'Compléter Mes infos', description: 'Vérifie ton état civil et ton régime alimentaire. Tu peux modifier ton téléphone ou ton régime si les responsables ont autorisé ces changements.' },
          { title: 'Fournir les documents demandés', description: 'Dans Mes infos, dépose les documents requis : fiche médicale, carte de mutuelle, carte d’identité et autorisation de sortie. Ajoute aussi ton numéro de passeport ou de visa si le voyage en demande un. Un document déjà vérifié peut être verrouillé.' },
          { title: 'Vérifier le montant à payer', description: 'Le bloc Mes infos affiche le montant demandé, les versements enregistrés et le solde restant. Si un montant individuel n’est pas indiqué, le montant par défaut du voyage peut s’appliquer.' },
        ],
      },
      {
        title: 'Pendant la préparation du voyage',
        steps: [
          { title: 'Choisir les activités', description: 'Dans Planning > Choix des activités, inscris-toi aux activités ouvertes. Les places peuvent être limitées et un conflit d’horaire ou une inscription déjà faite dans le groupe peut empêcher un choix.' },
          { title: 'Consulter Mon planning', description: 'Retrouve tes activités et les informations de la journée dans Planning > Mon planning. Les choix disponibles dépendent des inscriptions ouvertes par les organisateurs.' },
          { title: 'Consulter les documents', description: 'L’onglet Documents présente les documents communs rendus visibles aux élèves. Les documents réservés à l’équipe ne s’affichent pas dans ton espace.' },
        ],
      },
      {
        title: 'Comprendre l’accès au voyage',
        steps: [
          { title: 'Le voyage n’apparaît pas ?', description: 'Un voyage encore en préparation est visible uniquement par ses responsables. Il apparaîtra aux participants lorsqu’il sera rendu public. Les voyages terminés ou archivés sont consultables en lecture seule.' },
          { title: 'Une information est incorrecte ?', description: 'Contacte un responsable du voyage. Les vérifications des documents, les paiements et l’organisation du voyage sont gérés par l’équipe.' },
        ],
      },
    ],
  },
  responsable: {
    title: 'Je suis responsable du voyage',
    intro: 'Tu disposes des outils d’organisation du voyage. Les onglets et possibilités d’action peuvent aussi dépendre de son statut.',
    sections: [
      {
        title: 'Créer et préparer',
        steps: [
          { title: 'Créer le voyage', description: 'Depuis la liste Voyages, choisis Nouveau voyage et renseigne son nom, sa destination et ses dates. Le créateur est ajouté comme responsable.' },
          { title: 'Ajouter les participants', description: 'Dans Participants, ajoute les élèves individuellement, par classe ou par niveau, puis ajoute les membres de l’équipe avec leur rôle. Tu peux aussi vérifier la participation, les coordonnées et la complétude des informations.' },
          { title: 'Configurer l’administratif', description: 'Dans Administratif, précise si passeport ou visa sont requis et définis le montant attendu. Depuis la fiche d’un élève, vérifie ses documents et consigne les paiements.' },
          { title: 'Partager les documents et la charte', description: 'Ajoute les documents communs dans Documents et choisis s’ils sont visibles par les élèves. Dans Charte, prépare et publie la version que les élèves devront lire et accepter.' },
        ],
      },
      {
        title: 'Organiser les activités et l’hébergement',
        steps: [
          { title: 'Configurer le planning', description: 'Dans Planning > Gestion du planning, crée les jours, groupes et activités. Ouvre les inscriptions globalement ou pour les jours, groupes et activités concernés, et vérifie horaires, jauges et caractère obligatoire.' },
          { title: 'Suivre les choix et les présences', description: 'Gestion des inscriptions permet de suivre ou administrer les inscriptions. Utilise la prise de présence pendant les activités, ou la prise de présence responsable pour la vue globale.' },
          { title: 'Préparer l’hébergement', description: 'Configure les hébergements et les chambres, puis répartis les élèves et l’équipe. Les outils de présence par nuitée permettent ensuite le suivi sur place.' },
        ],
      },
      {
        title: 'Suivre et clôturer',
        steps: [
          { title: 'Choisir le statut adapté', description: 'Le statut Préparation limite l’accès aux responsables. Préparation publique rend le voyage visible aux participants. En cours active les fonctions de voyage. Terminé et Archivé correspondent à la consultation après le séjour.' },
          { title: 'Mettre à jour les informations pratiques', description: 'Le bouton de modification permet d’ajuster le nom, la destination ou les dates. Après le séjour, archive le voyage pour le retrouver dans les archives.' },
        ],
      },
    ],
  },
  employee: {
    title: 'Je fais partie de l’équipe',
    intro: 'Les possibilités de gestion sont réservées aux responsables. Les autres membres de l’équipe disposent des informations et outils utiles à leur participation.',
    sections: [
      {
        title: 'Préparer ma participation',
        steps: [
          { title: 'Participants et Mes infos', description: 'Dans Participants, consulte les personnes inscrites. Dans Mes infos, vérifie tes propres coordonnées et informations utiles au voyage.' },
          { title: 'Consulter les documents et la charte', description: 'Documents rassemble les ressources du voyage. Charte permet de consulter les règles et consignes communiquées aux participants.' },
          { title: 'Suivre le planning', description: 'Dans Planning > Mon planning, retrouve les activités. Les membres de l’équipe peuvent également accéder à la prise de présence des activités.' },
        ],
      },
      {
        title: 'Pendant le voyage',
        steps: [
          { title: 'Prendre les présences', description: 'Utilise la prise de présence dans Planning pour enregistrer la présence aux activités. Les vues disponibles varient selon les droits associés à ton rôle.' },
          { title: 'Hébergement', description: 'Consulte les configurations de chambres et les informations de nuitée disponibles pour l’équipe.' },
        ],
      },
      {
        title: 'Accès et modifications',
        steps: [
          { title: 'Une option est inaccessible ?', description: 'La gestion des participants, du planning, des inscriptions, des documents communs ou du statut est réservée aux responsables. Si tu dois effectuer une modification, demande-la au responsable du voyage.' },
          { title: 'Le voyage n’est pas visible ?', description: 'En statut Préparation, seuls les responsables peuvent accéder au voyage. Demande au responsable de le rendre public lorsque les participants doivent y accéder.' },
        ],
      },
    ],
  },
};

function getVoyageId(path: string | null): string | null {
  if (!path) return null;
  const match = path.match(/^\/tools\/voyages\/([^/]+)$/);
  return match?.[1] || null;
}

function getContextLabel(path: string | null): string | null {
  if (!path) return null;
  if (path === '/archives/voyages') return 'archives des voyages';
  if (path === '/tools/voyages') return 'liste des voyages';
  if (getVoyageId(path)) return 'espace d’un voyage';
  return null;
}

export default function VoyagesHelpPage() {
  const [role, setRole] = useState<VoyageHelpRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHelpContext = async () => {
      const requestedPath = new URLSearchParams(window.location.search).get('from');
      let safeSourcePath: string | null = null;

      if (requestedPath) {
        const requestedUrl = new URL(requestedPath, window.location.origin);
        const isVoyagePath = requestedUrl.pathname === '/tools/voyages'
          || /^\/tools\/voyages\/[^/]+$/.test(requestedUrl.pathname)
          || requestedUrl.pathname === '/archives/voyages';
        if (requestedUrl.origin === window.location.origin && isVoyagePath) {
          safeSourcePath = requestedUrl.pathname;
          setSourcePath(safeSourcePath);
        }
      }

      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      if (!userType || !userId) {
        setLoading(false);
        return;
      }

      if (userType === 'student') {
        if (!cancelled) setRole('student');
        setLoading(false);
        return;
      }

      if (userType !== 'employee') {
        setLoading(false);
        return;
      }

      const voyageId = getVoyageId(safeSourcePath);
      if (!voyageId) {
        if (!cancelled) setRole('employee');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('voyage_professeurs')
          .select('role')
          .eq('voyage_id', voyageId)
          .eq('professeur_id', userId)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) {
          setRole(data?.role === 'responsable' ? 'responsable' : 'employee');
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Impossible de déterminer votre rôle pour ce voyage.');
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
  const contextLabel = getContextLabel(sourcePath);
  const backHref = sourcePath || '/tools/voyages';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {sourcePath ? 'Retourner à ma page Voyages' : 'Retour aux voyages'}
        </Link>

        <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <HelpCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">Aide du module</p>
              <h1 className="mt-1 text-3xl font-bold">Voyages scolaires</h1>
              <p className="mt-2 max-w-3xl text-blue-100">
                {contextLabel ? `Repères pratiques depuis la ${contextLabel}.` : 'Des repères pratiques pour préparer le voyage et retrouver les informations utiles.'}
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
                const Icon = index === 0 ? ClipboardList : index === 1 ? CalendarDays : Hotel;
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
                  Pour corriger une information ou débloquer une action, contacte le responsable du voyage. Si tu rencontres un problème technique, adresse-toi au support habituel de l’école.
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Aide Voyages non disponible pour ce compte</h2>
                <p className="mt-2 text-gray-600">
                  Connecte-toi avec le compte utilisé pour accéder aux voyages. Si tu penses devoir y avoir accès, contacte un responsable du voyage.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
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
