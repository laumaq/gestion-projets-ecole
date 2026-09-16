// app/tools/tfh/eleve/tabs/vade-mecum/sections/SectionJournalDeBord.tsx
'use client';

export default function SectionJournalDeBord() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 bg-purple-500 rounded-full"></div>
        <h2 className="text-2xl font-bold text-purple-700">Le journal de bord</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-4">
        Formats atelier, stage et chef-d'œuvre
      </p>

      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Le journal de bord, accessible via la plateforme TFH, accompagne ton travail tout au long de l'année. Il constitue à la fois un outil d'organisation, un espace de réflexion et une mémoire de ton projet. Son objectif n'est pas de produire un compte rendu scolaire de chacune de tes activités, mais de conserver les traces qui permettront de comprendre comment ton projet s'est construit, comment il a évolué et ce que tu as appris au cours de sa réalisation. Il doit donc rendre visible le chemin parcouru, et pas uniquement le résultat final.
        </p>

        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded my-4">
          <h3 className="font-bold text-purple-900 mb-2">Alimente-le régulièrement</h3>
          <p className="text-sm">
            Ton journal de bord doit être alimenté régulièrement, au fur et à mesure de l'avancement de ton TFH. N'attends pas la veille d'une échéance pour essayer de reconstituer plusieurs semaines de travail : certaines observations, idées ou difficultés importantes risquent alors d'être oubliées. Après une étape importante, une séance de travail, une rencontre, une expérience ou une difficulté particulière, prends le temps de laisser une trace. Celle-ci peut être courte, pour autant qu'elle soit utile.
          </p>
        </div>

        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded my-4">
          <h3 className="font-bold text-indigo-900 mb-2">Plusieurs médias possibles</h3>
          <p className="text-sm mb-2">
            Le journal de bord n'est pas nécessairement composé uniquement de textes. Plusieurs médias peuvent l'alimenter :
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-2">
            <li>Photographies et captures d'écran</li>
            <li>Documents et productions intermédiaires</li>
            <li>Croquis et schémas</li>
            <li>Enregistrements sonores et interviews</li>
            <li>Vidéos</li>
            <li>Liens</li>
          </ul>
          <p className="text-sm mt-2">
            Ces traces doivent toutefois avoir une fonction : elles doivent permettre de documenter ton travail ou d'éclairer une étape de ta démarche.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded my-4">
          <h3 className="font-bold text-amber-900 mb-2">Montre aussi les tâtonnements</h3>
          <p className="text-sm">
            Tu es également invité à y faire apparaître les moments de tâtonnement de ton projet. Une idée abandonnée, un essai qui ne fonctionne pas, une difficulté rencontrée ou une modification importante de ton projet sont des éléments intéressants à conserver. Ils permettent de comprendre que la réalisation d'un TFH n'est pas un parcours parfaitement linéaire. Ce qui compte n'est pas de donner l'image d'un projet sans erreur, mais de montrer comment tu as été capable d'observer, de questionner tes choix, de chercher des solutions et de faire évoluer ta démarche.
          </p>
        </div>

        <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded my-4">
          <h3 className="font-bold text-emerald-900 mb-2">Une ressource pour ta défense</h3>
          <p className="text-sm">
            Enfin, ton journal de bord constituera une ressource essentielle pour la défense de ton TFH dans les formats atelier, stage et chef-d'œuvre. Les traces accumulées tout au long de l'année serviront de point d'appui à ton exposé devant le jury : elles te permettront de revenir sur les différentes étapes du projet, de justifier tes choix, d'illustrer tes expériences et de montrer son évolution. Il est donc dans ton intérêt de construire progressivement un journal suffisamment riche et personnel pour pouvoir t'y appuyer au moment de la défense.
          </p>
        </div>
      </div>
    </div>
  );
}