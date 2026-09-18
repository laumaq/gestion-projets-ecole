// app/tools/tfh/eleve/tabs/vade-mecum/sections/EcritOralJury.tsx
'use client';

export default function EcritOralJury() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">L'écrit, l'oral et le jury</h2>

      {/* L'écrit */}
      <div className="bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg p-5">
        <h3 className="text-xl font-bold text-indigo-900 mb-3">L'écrit : construire une réflexion personnelle</h3>
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          <p>
            Ton TFH comporte 15 à 20 pages de contenu, hors page de garde, bibliographie et éventuelles annexes. Il comprend une introduction, un développement, une conclusion et une bibliographie. Tu es libre d'organiser les différentes parties de ton développement, mais ton lecteur doit toujours pouvoir comprendre clairement ce qui relève d'un fait, de l'avis d'un auteur ou de ton propre point de vue.
          </p>
          <p>
            Le développement s'organise autour de trois dimensions complémentaires :
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>La partie informative</strong> rassemble et organise les informations factuelles nécessaires pour comprendre ta thématique.</li>
            <li><strong>L'avis d'autorité</strong> présente différents positionnements légitimes sur ta problématique.</li>
            <li><strong>L'avis personnel</strong> constitue le cœur de ton TFH : tu prends position et défends ton point de vue.</li>
          </ul>
          <p>
            L'objectif n'est donc pas d'empiler des informations ou de juxtaposer des opinions, mais de construire progressivement ta propre réflexion à partir des recherches que tu as menées.
          </p>
        </div>
      </div>

      {/* Le guide */}
      <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg p-5">
        <h3 className="text-xl font-bold text-emerald-900 mb-3">Le guide : un accompagnement, pas une béquille</h3>
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          <p>
            Ton guide est là pour t'aider, te guider et te conseiller dans la réalisation de ton TFH. Dès le premier rendez-vous, vous devez définir ensemble un cadre de travail : moyen de communication, fréquence des rencontres, organisation et planification des échanges. Pour tirer pleinement profit de cet accompagnement, prépare tes questions, transmets si possible les documents utiles avant les rencontres et conserve une trace des conseils et des décisions prises.
          </p>
          <p>
            Le guide intervient avant tout pour stimuler ta réflexion, te soutenir et t'encourager. Selon les besoins de ton projet, il peut notamment t'aider à construire ton plan, te proposer des ressources, discuter de ta méthode, attirer ton attention sur les contraintes et les attentes, réfléchir à la forme de ton travail ou t'accompagner dans la préparation de ta défense. Il ne réalise cependant pas le travail à ta place : tu restes responsable de ta recherche, de tes choix et de ta production.
          </p>
        </div>
      </div>

      {/* L'oral */}
      <div className="bg-violet-50 border-l-4 border-violet-400 rounded-r-lg p-5">
        <h3 className="text-xl font-bold text-violet-900 mb-3">L'oral : une réflexion nouvelle, pas un résumé</h3>
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          <p>
            La défense orale dure 15 minutes. Elle ne consiste pas à résumer ton TFH écrit : tu dois présenter au jury un aspect de ta problématique qui n'a pas été développé dans ton travail. Il s'agit donc d'apporter une réflexion nouvelle, complémentaire et directement liée à ta recherche. Ton oral doit montrer que ton travail t'a permis d'ouvrir de nouvelles pistes et que tu es capable de prolonger ta réflexion au-delà de ce que tu as déjà écrit.
          </p>
          <p>
            L'oral est également le moment où tu peux t'éloigner le plus facilement du cadre traditionnel de la rédaction. Mise en scène, performance, jeu de rôle, dispositif audiovisuel, débat ou autre forme de communication : à toi de choisir le moyen qui te permettra le mieux de faire vivre cette réflexion. La créativité n'est cependant pas une fin en soi : la forme choisie doit servir ton propos et permettre au jury de comprendre et d'approfondir ta réflexion.
          </p>
        </div>
      </div>

      {/* Le jury */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-5">
        <h3 className="text-xl font-bold text-blue-900 mb-3">Le jury — Trois regards complémentaires</h3>
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          <p>
            Lors de ta défense, trois personnes accompagnent et évaluent ton travail :
          </p>
          <ul className="space-y-2 ml-2">
            <li className="flex gap-2">
              <span className="font-semibold text-blue-800">Ton guide</span>
              <span>connaît ton parcours et peut revenir avec toi sur les choix effectués au cours de l'année.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-blue-800">Un médiateur</span>
              <span>veille au bon déroulement de l'échange : il distribue la parole, assure le respect du temps et facilite les interactions.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-blue-800">Un lecteur externe</span>
              <span>spécialiste de ta thématique ou simplement intéressé par celle-ci, découvre ton travail avec un regard extérieur. Il l'évalue et peut te poser des questions de relance afin de te permettre de préciser, justifier ou approfondir certains aspects de ta réflexion.</span>
            </li>
          </ul>
          <p>
            La défense est donc un véritable échange autour de ton travail. Tu dois être capable de présenter clairement ta réflexion, d'expliquer tes choix et de répondre aux questions qui te sont adressées.
          </p>
        </div>
      </div>

      {/* IA */}
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-5">
        <h3 className="text-xl font-bold text-amber-900 mb-3">Esprit critique et transparence : l'IA et ton TFH</h3>
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          <p>
            Dans le cadre de la rédaction de ton Travail de Fin d'Humanités (TFH), l'usage des outils d'Intelligence Artificielle (IA) est encadré par des règles claires basées sur les recommandations institutionnelles. L'IA a profondément évolué ces derniers mois, devenant un assistant de travail de plus en plus performant. Cependant, son efficacité dépend entièrement de la manière dont tu la pilotes. Elle doit rester un levier pour ton intelligence, et non un substitut.
          </p>
          <div>
            <p className="font-semibold text-amber-900 mb-2">Ce qui est autorisé :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Optimiser ton style</strong> : changer une formulation ou éviter les répétitions.</li>
              <li><strong>Structurer tes idées</strong> : t'aider à mettre en forme ton texte ou organiser ton plan.</li>
              <li><strong>Soutenir ta démarche</strong> : t'assister dans la recherche d'informations et de pistes de réflexion pertinentes.</li>
              <li><strong>Briser la barrière de la langue</strong> : traduire un article de référence écrit dans une langue qui t'est étrangère pour enrichir tes sources.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-red-800 mb-2">Ce qui est interdit :</p>
            <p>
              Tu ne peux pas l'utiliser pour rédiger à ta place, ni pour reformuler les écrits de quelqu'un d'autre. Générer des paragraphes entiers ou copier-coller du texte produit par une IA est strictement interdit. En plus d'être une démarche paresseuse et malhonnête, cela nous empêcherait d'évaluer tes compétences réelles.
            </p>
          </div>
          <div className="bg-white rounded p-3 border border-amber-200">
            <p className="font-semibold text-amber-900 mb-2">Obligation de transparence :</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                <strong>En annexe</strong> : Joins un document qui définit clairement ta démarche d'utilisation. Explique au lecteur pourquoi et comment l'IA t'a aidé (par exemple : la liste des requêtes/prompts principaux que tu as utilisés pour structurer tes idées).
              </li>
              <li>
                <strong>Dans tes citations</strong> : Utilise une méthode rigoureuse pour citer l'outil. Exemple de format : Nom de l'outil d'IA (+ version), date de génération du contenu, lien URL de la conversation (si disponible) ou mention de la plateforme.
              </li>
            </ol>
          </div>
          <p className="italic text-amber-800">
            Ne cherche pas à copier l'IA, cherche à la dépasser. Les outils actuels excellent dans la norme et la moyenne, mais ils manquent cruellement de profondeur vécue, d'originalité et d'esprit critique ancré dans le réel.
          </p>
        </div>
      </div>

      {/* Immersion */}
      <div className="bg-teal-50 border-l-4 border-teal-400 rounded-r-lg p-5">
        <h3 className="text-xl font-bold text-teal-900 mb-3">Immersion linguistique</h3>
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          <p>
            Si tu suis un parcours en immersion allemande, néerlandaise ou anglaise, une attention particulière est accordée à l'utilisation de la langue cible dans ton TFH.
          </p>
          <p>
            Lors de la défense, tu présentes ton travail dans la langue cible de ton immersion devant le jury. Tu dois donc être capable d'expliquer ton projet, de présenter tes choix, de développer ta réflexion et de répondre aux questions dans cette langue.
          </p>
          <p>
            Dans ton journal de bord, tu devras utiliser la langue cible. Tes notes, réflexions, observations et traces de travail contribueront ainsi au développement de tes compétences linguistiques tout au long du projet.
          </p>
        </div>
      </div>
    </div>
  );
}