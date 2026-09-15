// app/tools/tfh/eleve/tabs/vade-mecum/sections/FormatAtelier.tsx
'use client';

const ETAPES = [
  {
    date: '23 septembre : conseil commun',
    contenu: "L'occasion de prendre contact avec les membres du GT TFH qui vont vous accompagner cette année. Nous essayerons de clarifier vos demandes et d'expliciter nos attentes.",
  },
  {
    date: '30 septembre : proposition de l\'atelier',
    contenu: "En binôme, vous proposez un projet d'atelier et définissez ses objectifs pédagogiques. Que voulez-vous que les participants découvrent, comprennent, sachent faire ou expérimentent au terme des dix journées ? Votre projet doit être suffisamment précis pour que l'on comprenne ce que vous souhaitez proposer, tout en laissant une place à l'expérimentation et aux ajustements qui auront lieu au fil de l'année.",
  },
  {
    date: '7 octobre : planification des dix journées',
    contenu: "Pour chacune des 10 journées atelier, vous commencez à déterminer ce que les participants vont faire, les activités que vous allez proposer, le matériel nécessaire et la manière dont vous allez organiser le groupe. Cette planification est un point de départ, pas un scénario figé : elle doit vous donner une direction tout en pouvant évoluer à partir de ce que vous observerez sur le terrain. La rencontre avec le GT ou des membres du GT atelier permet de confronter votre projet à nos remarques et de l'enrichir.",
  },
  {
    date: '3 novembre : validation définitive',
    contenu: "Votre projet est désormais suffisamment abouti pour être définitivement validé. Vous rédigez également un résumé de cinq lignes qui présente clairement votre atelier : son thème, son principe et ce que les participants pourront y faire ou apprendre. Ce texte doit donner envie de découvrir votre projet tout en permettant à chacun de comprendre rapidement ce que vous proposez.",
  },
  {
    date: '13 novembre : la bourse aux projets',
    contenu: "La bourse aux projets est le moment où votre atelier rencontre son public potentiel. Vous présentez votre projet et cherchez à donner envie aux autres élèves de vous rejoindre. Soyez capables d'expliquer simplement ce que vous allez faire, pourquoi vous avez choisi cette thématique et ce qui rend votre atelier intéressant. Cette rencontre peut également vous amener à préciser ou à questionner certains aspects de votre projet.",
  },
  {
    date: '25 novembre : journée de formation',
    contenu: "Vous découvrez la plateforme de suivi et les attendus liés au journal de bord. Celui-ci ne doit pas être envisagé comme une simple formalité administrative : il constitue la mémoire de votre travail. Vous y conserverez les traces de la préparation, des séances réalisées, des observations, des difficultés rencontrées, des réussites et des modifications apportées au projet. Il vous permettra progressivement de transformer votre expérience en démarche réflexive.",
  },
  {
    date: '2 décembre : planification des journées 2 et 3',
    contenu: "Vous préparez de manière détaillée les deuxième et troisième journées de votre atelier. Pour chacune, vous devez savoir ce que vous souhaitez faire vivre aux participants, comment vous allez vous y prendre, de quel matériel vous aurez besoin et comment vous allez organiser le temps et le groupe. Pensez également à ce que vous devrez observer afin de savoir, après la séance, ce qui a fonctionné et ce qui devra être adapté.",
  },
  {
    date: '13 janvier : planification des journées 4 et 5',
    contenu: "Vous poursuivez la construction progressive de votre atelier en préparant les journées 4 et 5. À ce stade, votre planification doit pouvoir tenir compte de ce que vous avez déjà expérimenté. Les premières séances auront peut-être confirmé certaines de vos idées ou, au contraire, révélé des difficultés inattendues. Il vous appartient d'en tirer les enseignements et de faire évoluer votre dispositif en conséquence.",
  },
  {
    date: '7 avril : planification des journées 6 et 7',
    contenu: "Vous préparez les journées 6 et 7 en vous appuyant sur l'ensemble de l'expérience déjà acquise. Votre atelier doit continuer à évoluer : approfondissement des apprentissages, adaptation des activités, modification de l'organisation ou nouvelles propositions. Vous devez être capables de montrer que vos choix ne sont pas arbitraires, mais qu'ils résultent de vos observations et de votre réflexion sur les séances précédentes.",
  },
  {
    date: '22 mai : présentation et évaluation lors des portes ouvertes',
    contenu: "Les portes ouvertes constituent l'aboutissement de votre TFH. Vous présentez votre atelier devant un jury, mais aussi devant des personnes qui découvrent votre projet à cette occasion. Vous devez donc être capables de faire vivre ou de présenter votre travail tout en expliquant clairement vos intentions pédagogiques et les choix que vous avez effectués. Le jury sera particulièrement attentif à votre capacité à rendre compte de votre démarche, à analyser ce qui s'est passé et à porter un regard critique sur votre expérience. Votre évaluation ne porte donc pas uniquement sur le résultat visible de l'atelier, mais également sur votre capacité à concevoir, conduire, ajuster et analyser un projet collectif.",
  },
];

export default function FormatAtelier() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-rose-500 rounded-full"></div>
        <h2 className="text-2xl font-bold text-rose-700">Les étapes de ton TFH — Format atelier</h2>
      </div>

      <div className="space-y-4">
        {ETAPES.map((etape, index) => (
          <div key={index} className="border-l-4 border-rose-200 pl-4 py-1">
            <h3 className="font-semibold text-rose-800 mb-1">{etape.date}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{etape.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}