// app/tools/tfh/eleve/tabs/vade-mecum/sections/FormatChefOeuvre.tsx
'use client';

const ETAPES = [
  {
    date: '23 septembre : conseil commun',
    contenu: "L'occasion de prendre contact avec les membres du GT TFH qui vont vous accompagner cette année. Nous essayerons de clarifier vos demandes et d'expliciter nos attentes.",
  },
  {
    date: '30 septembre : définir ton chef-d\'œuvre',
    contenu: "Tu précises la nature de ton projet : œuvre artistique, objet, dispositif pédagogique, événement, projet scientifique, aménagement, production audiovisuelle, projet de communication... Tu dois également déterminer ses modalités de réalisation : que vas-tu produire ? Avec quels moyens ? Quelles compétences devras-tu mobiliser ? Quelles étapes seront nécessaires ? À ce stade, l'objectif est de passer d'une envie ou d'une idée à un projet concret et réalisable.",
  },
  {
    date: '7 et 14 octobre : validation définitive et échéancier',
    contenu: "Ton projet est présenté au GT TFH pour validation définitive. Tu dois être capable d'en expliquer les ambitions, la pertinence et la faisabilité. Tu présentes également un échéancier faisant apparaître les grandes phases du projet : conception, recherches, expérimentations, réalisation, ajustements, finalisation... Cette planification doit être suffisamment précise pour t'aider à avancer, mais elle pourra évoluer en fonction des problèmes rencontrés et des découvertes réalisées en cours de route. Tu réfléchis enfin aux premières modalités de présentation de ton chef-d'œuvre devant un public réel : qui souhaites-tu toucher et comment vas-tu lui faire découvrir ta réalisation ?",
  },
  {
    date: '25 novembre : journée de formation',
    contenu: "Tu découvres la plateforme de suivi et les attendus concernant le journal de bord. Celui-ci doit garder la trace de la construction de ton projet : recherches, idées, essais, choix, difficultés, solutions trouvées, modifications et étapes de réalisation. Il te permettra de montrer que ton chef-d'œuvre n'est pas apparu d'un seul coup, mais qu'il est le résultat d'un processus de création et de tâtonnement. Ces traces seront également précieuses pour prendre du recul sur ton travail et préparer sa présentation.",
  },
  {
    date: 'Tout au long de l\'année : expérimenter, améliorer',
    contenu: "Le calendrier précis dépend de la nature de ton chef-d'œuvre. Tu dois cependant être capable de faire avancer régulièrement ton projet et de conserver les traces significatives de son évolution. Une difficulté technique, une idée qui ne fonctionne pas ou un changement de direction ne constituent pas nécessairement des problèmes : ils font partie du processus. L'enjeu est de tirer parti de ces expériences pour améliorer ta réalisation. Tu es responsable de ton organisation et de tes choix, tout en pouvant solliciter l'accompagnement du GT TFH lorsque cela est nécessaire.",
  },
  {
    date: 'Présentation du chef-d\'œuvre',
    contenu: "Ton chef-d'œuvre est présenté selon des modalités définies en fonction de sa nature. Lorsque cela est possible, une présentation commune est organisée lors des journées portes ouvertes. Cette rencontre avec un public réel donne une véritable destination à ton travail : tu ne réalises pas ton chef-d'œuvre uniquement pour qu'il soit évalué, mais pour le montrer, le partager et le faire exister au-delà du cadre scolaire. Tu dois donc être capable de présenter ta réalisation, d'expliquer les choix qui ont guidé sa conception et de rendre compte du chemin parcouru pour parvenir au résultat final.",
  },
  {
    date: 'La défense devant le jury',
    contenu: "La défense ne consiste pas uniquement à montrer ce que tu as produit. Tu dois également être capable d'expliquer comment et pourquoi tu l'as produit : quelles étaient tes intentions de départ ? Quelles difficultés as-tu rencontrées ? Quels choix as-tu dû effectuer ? Qu'as-tu appris au cours du processus ? Qu'est-ce que tu modifierais aujourd'hui ? Le jury évalue ainsi à la fois la qualité et l'ambition de la réalisation, mais aussi ta capacité à analyser ton propre processus de création et à en tirer des enseignements.",
  },
];

export default function FormatChefOeuvre() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
        <h2 className="text-2xl font-bold text-blue-700">Les étapes de ton TFH — Format chef-d'œuvre</h2>
      </div>

      <div className="space-y-4">
        {ETAPES.map((etape, index) => (
          <div key={index} className="border-l-4 border-blue-200 pl-4 py-1">
            <h3 className="font-semibold text-blue-800 mb-1">{etape.date}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{etape.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}