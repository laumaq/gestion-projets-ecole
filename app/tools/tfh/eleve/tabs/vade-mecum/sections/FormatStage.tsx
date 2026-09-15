// app/tools/tfh/eleve/tabs/vade-mecum/sections/FormatStage.tsx
'use client';

const ETAPES = [
  {
    date: '23 septembre : conseil commun',
    contenu: "L'occasion de prendre contact avec les membres du GT TFH qui vont vous accompagner cette année. Nous essayerons de clarifier vos demandes et d'expliciter nos attentes.",
  },
  {
    date: '30 septembre : choix du lieu de stage',
    contenu: "Tu proposes une structure d'accueil dont les valeurs sont compatibles avec celles de l'Athénée Léonie de Waha et tu présentes une idée suffisamment précise de ce que tu souhaites y faire. Explique ce qui t'attire dans cette structure et surtout ce que tu pourrais concrètement y apporter. Les activités envisagées doivent être réalistes au regard de tes possibilités, de celles de la structure et du temps dont tu disposeras.",
  },
  {
    date: '7 et 14 octobre : validation du stage et volet administratif',
    contenu: "Ces deux étapes permettent de vérifier que ton projet peut réellement se dérouler. Tu dois notamment t'assurer que la structure est d'accord pour t'accueillir, que les activités envisagées sont réalisables et que les modalités de ton engagement sont clairement définies. Le volet administratif — contrat, convention d'engagement ou autre document nécessaire — doit également être réglé. Un stage ne peut commencer que lorsque son cadre est suffisamment clair et sécurisé pour toutes les personnes concernées.",
  },
  {
    date: '25 novembre : journée de formation',
    contenu: "Tu découvres la plateforme de suivi ainsi que les attendus concernant le journal de bord. Celui-ci constitue une trace régulière de ton expérience. Tu y consigneras notamment les activités réalisées, les situations rencontrées, tes observations, tes questions, les difficultés éventuelles et les évolutions de ton projet. Il ne s'agit pas de raconter mécaniquement chacune de tes journées : le journal doit progressivement faire apparaître ce que tu apprends à travers ton expérience et la manière dont ton regard évolue.",
  },
  {
    date: 'Du 26 novembre au 21 avril : période de stage',
    contenu: "Tu réalises au minimum dix demi-journées au sein de ta structure d'accueil. Pendant cette période, tu dois t'impliquer réellement dans les activités qui t'ont été confiées et adopter une attitude responsable : ponctualité, autonomie, respect des personnes et des règles de fonctionnement de la structure. Profite de cette expérience pour observer, poser des questions, prendre des initiatives lorsque cela est possible et confronter tes représentations à la réalité du terrain. Ton journal de bord doit être alimenté au fil de l'expérience, afin de ne pas perdre les traces qui seront utiles à ton rapport final.",
  },
  {
    date: '22 et 23 avril : rentrée du rapport de stage',
    contenu: "Tu remets ton rapport de stage, qui constitue l'aboutissement de ton expérience. Il ne doit pas se limiter à décrire ce que tu as fait : il doit également permettre de comprendre ce que cette expérience t'a appris, les difficultés que tu as rencontrées, les questions qu'elle a soulevées et la manière dont tu as évolué au cours du stage. Tu rencontres ensuite le GT TFH pour prendre connaissance des modalités précises de ta défense et préparer la présentation de ton travail devant le jury.",
  },
  {
    date: 'Du 19 au 21 mai : défense devant le jury',
    contenu: "Tu présentes ton expérience devant un jury à partir de ton rapport et des traces conservées pendant ton stage. La défense doit te permettre de revenir sur ton engagement, d'expliquer tes choix, de mettre en évidence ce que tu as appris et de porter un regard critique sur ton expérience. Tu dois être capable de dépasser le simple récit des activités réalisées pour montrer ce que le stage a produit sur toi et ce que tu en as retiré. Le jury sera donc attentif autant à ton implication dans la structure qu'à ta capacité à analyser et à communiquer cette expérience.",
  },
];

export default function FormatStage() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-violet-400 rounded-full"></div>
        <h2 className="text-2xl font-bold text-violet-700">Les étapes de ton TFH — Format stage</h2>
      </div>

      <div className="space-y-4">
        {ETAPES.map((etape, index) => (
          <div key={index} className="border-l-4 border-violet-200 pl-4 py-1">
            <h3 className="font-semibold text-violet-800 mb-1">{etape.date}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{etape.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}