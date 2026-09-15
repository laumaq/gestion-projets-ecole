// app/tools/tfh/eleve/tabs/vade-mecum/sections/Echeanciers.tsx
'use client';

export default function Echeanciers() {
  const formats = [
    {
      name: 'Le format tradi',
      color: 'emerald',
      steps: [
        '23 septembre : conseil commun',
        '30 septembre : proposition de la thématique générale',
        '7 octobre : écriture de la problématique',
        'Semaine du 9 novembre = communication des guides',
        '25 novembre : bibliographie commentée',
        '17 décembre : plan d\'idées, état avancement, planification',
        '26 janvier : partie informative bouclée',
        'Semaine du 8 mars : le pré TFH',
        '22 avril rentrée du TFH',
        'Du 19 au 21 mai : défense lors des 3 dernières journées ateliers',
      ],
    },
    {
      name: 'Le format atelier',
      color: 'rose',
      steps: [
        '23 septembre : conseil commun',
        '30 septembre : la proposition d\'atelier + ses objectifs pédagogiques',
        '7 octobre : rentrée d\'une planification des 10 journées et rencontre avec les conseillers ateliers',
        '3 novembre : validation définitive et écriture du résumé de 5 lignes à communiquer lors de la bourse',
        '13 novembre : la bourse aux projets',
        '25 novembre : journée de formation : présentation de la plateforme et des attendus au niveau du journal de bord',
        '2 décembre : planification précise des journées atelier 2 et 3',
        '13 janvier : idem pour journées 4 et 5',
        '7 avril : idem journée 6 et 7',
        'Évaluation lors des journées portes ouvertes le 22 mai devant jury et des personnes invitées ou simplement présentes à l\'occasion des PO',
      ],
    },
    {
      name: 'Le format stage',
      color: 'violet',
      steps: [
        '23 septembre : conseil commun',
        '30 septembre : le lieu de stage et une idée précise des activités à faire',
        '7 et 14 octobre : garantie que le stage puisse se dérouler et discuter du volet administratif (contrat ou convention d\'engagement)',
        '25 novembre : journée de formation : présentation de la plateforme et des attendus au niveau du journal de bord',
        'Entre le 26 novembre et le 21 avril : période de stage, 10 demi-journées (à minima)',
        '22 et 23 avril rentrée du rapport de stage + rencontre avec le GT pour présenter les modalités de la défense',
        'Défense du 19 au 21 mai devant jury',
      ],
    },
    {
      name: 'Le format chef-d\'œuvre',
      color: 'blue',
      steps: [
        '23 septembre : conseil commun',
        'Le 30 septembre : identifier le type de chef d\'œuvre, sa nature, les modalités de réalisation',
        '7 et 14 octobre : validation définitive du projet chef d\'œuvre. Présentation d\'un échéancier reprenant les phases décisives du projet. Premières propositions de présentation du chef d\'œuvre devant un public « réel »',
        '25 novembre : journée de formation : présentation de la plateforme et des attendus au niveau du journal de bord',
        'Les présentations du chef d\'œuvre se déroulent au cas par cas. Dans la mesure du possible, une présentation commune lors des journées portes ouvertes est envisagée',
      ],
    },
  ];

  const colorClasses: Record<string, { border: string; bg: string; text: string; bullet: string }> = {
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', bullet: 'bg-emerald-500' },
    rose: { border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-800', bullet: 'bg-rose-500' },
    violet: { border: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-800', bullet: 'bg-violet-500' },
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', bullet: 'bg-blue-500' },
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">4 TFH / 4 échéanciers</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {formats.map((format) => {
          const colors = colorClasses[format.color];
          return (
            <div key={format.name} className={`rounded-xl p-5 border ${colors.border} ${colors.bg}`}>
              <h3 className={`text-lg font-bold mb-4 ${colors.text}`}>{format.name}</h3>
              <ul className="space-y-2">
                {format.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm text-gray-700">
                    <span className={`w-2 h-2 rounded-full ${colors.bullet} mt-1.5 flex-shrink-0`}></span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}