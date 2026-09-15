// app/tools/tfh/eleve/tabs/vade-mecum/sections/FormatTraditionnel.tsx
'use client';

const ETAPES = [
  {
    date: '23 septembre : conseil commun',
    contenu: "L'occasion de prendre contact avec les membres du GT TFH qui vont vous accompagner cette année. Nous essayerons de clarifier vos demandes et d'expliciter nos attentes.",
  },
  {
    date: '30 septembre : proposition de la thématique',
    contenu: "Tu proposes une thématique générale dans laquelle tu souhaites inscrire ton TFH. À ce stade, il ne s'agit pas encore de formuler une question précise : l'objectif est de définir un territoire de recherche suffisamment large pour permettre l'exploration. Ta proposition doit toutefois être personnelle, réaliste et suffisamment riche pour donner lieu à une véritable recherche.",
  },
  {
    date: '7 octobre : écriture de la problématique',
    contenu: "Tu transformes progressivement ta thématique en une problématique de recherche. Celle-ci doit prendre la forme d'une véritable question : elle doit susciter une réflexion, permettre la confrontation de différents points de vue et nécessiter une recherche pour construire une réponse. Une bonne problématique n'est donc ni une simple question factuelle ni une question à laquelle on peut répondre en quelques lignes.",
  },
  {
    date: 'Semaine du 9 novembre : attribution des guides',
    contenu: "Tu prends connaissance du nom de ton guide TFH. Il t'aide à structurer ton travail, à identifier les étapes importantes et à avancer de manière autonome. C'est le moment de vérifier que ta problématique, ta méthode de recherche et ton organisation sont suffisamment claires afin de planifier un premier contact efficace avec lui.",
  },
  {
    date: '25 novembre : bibliographie commentée',
    contenu: "Tu présentes les premières sources que tu comptes utiliser et tu expliques ce qu'elles peuvent apporter à ta recherche. Une bibliographie commentée ne consiste donc pas à dresser une simple liste de livres et de sites : pour chaque source importante, tu dois pouvoir préciser son intérêt, sa fiabilité et le lien qu'elle entretient avec ta problématique. Cette étape doit aussi te permettre d'identifier les éventuels manques dans ta documentation.",
  },
  {
    date: '17 décembre : plan d\'idées, état d\'avancement et planification',
    contenu: "Tu fais le point sur le chemin déjà parcouru. Ton plan d'idées permet de montrer comment les informations et les arguments que tu as recueillis commencent à s'organiser autour de ta problématique. Tu identifies également ce qu'il te reste à chercher ou à approfondir. Enfin, tu établis une planification réaliste des étapes à venir afin de pouvoir terminer ton travail dans les délais. L'objectif n'est pas d'avoir déjà écrit ton TFH, mais de savoir où tu vas.",
  },
  {
    date: '26 janvier : partie informative bouclée',
    contenu: "La phase de recherche et de documentation est désormais suffisamment avancée pour que ta partie informative soit terminée. Tu dois disposer des connaissances, données, exemples et sources nécessaires pour construire ton argumentation. À cette étape, tu dois surtout être capable de distinguer ce que tes sources t'apprennent de ce que tu veux personnellement montrer ou défendre. Il est encore possible d'ajuster ton raisonnement, mais la recherche documentaire ne peut plus rester indéfiniment ouverte.",
  },
  {
    date: 'Semaine du 8 mars : pré-TFH',
    contenu: "Le pré-TFH constitue une première version complète de ton travail. Il doit permettre de vérifier la solidité de ta problématique, de ton raisonnement, de ton organisation et de tes sources. C'est une étape de mise à l'épreuve : les remarques reçues doivent t'aider à repérer ce qui fonctionne, ce qui manque ou ce qui doit être repris. Dans une logique de tâtonnement expérimental, cette version intermédiaire n'est pas un échec à éviter, mais un passage nécessaire pour améliorer ton travail.",
  },
  {
    date: '22 avril : rentrée du TFH',
    contenu: "Ton TFH entre dans sa phase finale. Tu dois remettre une version aboutie de ton travail et être désormais capable d'en maîtriser le contenu. Il ne s'agit plus seulement de connaître ton sujet : tu dois pouvoir expliquer tes choix, défendre ton raisonnement et porter un regard critique sur la manière dont tu as construit ta réponse. Ton travail écrit et ta présentation orale doivent donc être envisagés comme deux formes complémentaires d'une même recherche.",
  },
  {
    date: 'Du 19 au 21 mai : défense lors des trois dernières journées-ateliers',
    contenu: "Tu présentes ton TFH devant un jury pendant une défense orale de vingt minutes. Cette présentation est l'occasion de mettre en évidence un aspect particulièrement intéressant de ta recherche, notamment un élément qui aurait été moins développé dans ton écrit. Tu dois être capable de présenter clairement ta démarche, de justifier tes choix, de répondre aux questions du jury et de prendre du recul sur ton propre travail. Le jury n'évalue donc pas uniquement le résultat final : il s'intéresse également à la démarche de recherche et à ta capacité à en rendre compte.",
  },
];

export default function FormatTraditionnel() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
        <h2 className="text-2xl font-bold text-emerald-700">Les étapes de ton TFH — Format traditionnel</h2>
      </div>

      <div className="space-y-4">
        {ETAPES.map((etape, index) => (
          <div key={index} className="border-l-4 border-emerald-200 pl-4 py-1">
            <h3 className="font-semibold text-emerald-800 mb-1">{etape.date}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{etape.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}