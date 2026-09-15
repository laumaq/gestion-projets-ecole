// app/tools/tfh/eleve/tabs/vade-mecum/sections/PedagogieFreinet.tsx
'use client';

export default function PedagogieFreinet() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">La pédagogie Freinet derrière le TFH</h2>

      <div className="prose prose-gray max-w-none space-y-4 text-gray-700 leading-relaxed">
        <p>
          Le Travail de Fin d'Humanités (TFH) s'inscrit pleinement dans une conception Freinet de l'éducation : celle d'une pédagogie du travail, dans laquelle apprendre ne consiste pas seulement à accumuler des connaissances, mais à les construire en agissant, en expérimentant, en produisant et en donnant du sens à ce que l'on fait. Pour Freinet, le travail n'est pas une activité scolaire artificielle destinée à préparer à la « vraie vie » : il constitue au contraire un moyen essentiel de se former au contact du réel.
        </p>
        <p>
          Le TFH prolonge cette conception en plaçant l'élève dans une situation où il doit prendre une initiative, faire des choix, s'engager dans une démarche longue, rencontrer des obstacles, chercher des solutions et finalement rendre compte de son parcours. Les quatre formats proposés ne sont donc pas quatre manières différentes de réaliser un même travail : ils constituent quatre formes possibles d'un même principe pédagogique, celui d'un élève progressivement auteur de son travail, responsable de ses choix et capable de transformer une idée en réalisation concrète.
        </p>

        <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded my-6">
          <h3 className="font-bold text-emerald-900 mb-2">Le format traditionnel</h3>
          <p className="text-sm">
            S'inscrit dans les principes de recherche, d'autonomie et de tâtonnement expérimental. L'élève choisit individuellement une problématique, constitue un corpus de sources ou recueille des données sur le terrain, puis construit progressivement une réponse argumentée. Cette démarche suppose qu'il ne reçoive pas d'emblée un chemin tout tracé : il formule des hypothèses, cherche, confronte ses idées aux faits, ajuste sa démarche et construit progressivement son savoir.
          </p>
        </div>

        <div className="bg-rose-50 border-l-4 border-rose-400 p-4 rounded my-6">
          <h3 className="font-bold text-rose-900 mb-2">Le format atelier</h3>
          <p className="text-sm">
            Donne une dimension particulièrement visible à la discipline coopérative de travail, une notion essentielle de la pédagogie Freinet. En binôme, les élèves ne se contentent pas d'appliquer une activité imaginée par l'enseignant : ils conçoivent eux-mêmes un dispositif, en choisissent la thématique, organisent les séances, réfléchissent aux stratégies pédagogiques et prennent en charge les aspects pratiques de sa mise en œuvre.
          </p>
        </div>

        <div className="bg-violet-50 border-l-4 border-violet-400 p-4 rounded my-6">
          <h3 className="font-bold text-violet-900 mb-2">Le format stage</h3>
          <p className="text-sm">
            Prolonge encore davantage la conception Freinet d'une école ouverte sur le milieu et sur la vie sociale. L'élève quitte le cadre strictement scolaire pour s'engager dans une structure dont les valeurs sont compatibles avec celles de l'école. Il ne s'agit donc pas simplement d'effectuer une période d'observation : il s'agit de prendre part à une activité réelle, d'être utile, de contribuer à un projet collectif et d'assumer une responsabilité.
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded my-6">
          <h3 className="font-bold text-blue-900 mb-2">Le format chef-d'œuvre</h3>
          <p className="text-sm">
            Est peut-être celui qui exprime le plus directement la dimension de création, d'expression et de réalisation concrète propre à la pédagogie Freinet. L'élève part d'une intention personnelle et dispose d'une grande liberté pour imaginer et produire une œuvre : projet artistique, dispositif pédagogique, événement, objet, campagne de communication, aménagement… Cette liberté n'est toutefois pas synonyme de laisser-faire.
          </p>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-5 mt-6">
          <p className="font-semibold text-indigo-900 text-center">
            Faire pour apprendre, apprendre en faisant, expérimenter pour comprendre, coopérer pour progresser et produire pour communiquer.
          </p>
        </div>
      </div>
    </div>
  );
}