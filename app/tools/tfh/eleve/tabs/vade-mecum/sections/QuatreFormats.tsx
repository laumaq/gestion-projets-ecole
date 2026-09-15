// app/tools/tfh/eleve/tabs/vade-mecum/sections/QuatreFormats.tsx
'use client';

export default function QuatreFormats() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">1 TFH / 4 formats</h2>

      <div className="space-y-6">
        {/* Tradi */}
        <div className="border-l-4 border-emerald-500 pl-4">
          <h3 className="text-xl font-bold text-emerald-700 mb-2">Le format tradi</h3>
          <div className="space-y-3 text-gray-700 leading-relaxed">
            <p>
              C'est le format adopté ces dernières années. Tu choisis individuellement une problématique, puis tu la développes à l'aide de ton corpus de sources ou de données collectées sur ton terrain de recherche. L'approche est rigoureuse et scientifique, et ton écrit (d'une quinzaine de pages) démontre ta maîtrise du sujet tout en rendant compte de ta position vis-à-vis de la question de recherche.
            </p>
            <p>
              En sus, une présentation orale de vingt minutes face à un jury te permet de mettre en valeur un axe intéressant, moins développé, voire non exploité dans le manuscrit.
            </p>
            <p className="text-sm italic text-gray-500">
              Le GT TFH t'aide à définir ta problématique, t'affecte un guide et te réserve un espace de travail dédié lors des journées-ateliers.
            </p>
          </div>
        </div>

        {/* Atelier */}
        <div className="border-l-4 border-rose-500 pl-4">
          <h3 className="text-xl font-bold text-rose-700 mb-2">Le format atelier</h3>
          <div className="space-y-3 text-gray-700 leading-relaxed">
            <p>
              En binôme, vous proposez une thématique pour un atelier. Vous l'encadrez et vous vous chargez de nourrir chacune des dix journées qui le composent. Vous gérez la discipline, les stratégies pédagogiques et le volet administratif. Comme de coutume, vous présentez le résultat de l'atelier au public venu pour les portes ouvertes.
            </p>
            <p>
              Cela dit, ce même jour, un jury TFH viendra spécialement pour évaluer la qualité de votre travail. Lors de cette visite, il vous sera demandé d'expliquer avec précision vos motivations et le déroulement de l'atelier. De même, le jury sera attentif à votre capacité à produire un compte rendu réflexif et critique de votre démarche.
            </p>
            <p>
              Le GT TFH vous aide à définir et à valider le thème de l'atelier. Il peut également vous accompagner pour dresser le canevas de chaque journée. Cela dit, soyons clairs : c'est à vous de prendre les choses en main pour créer un formidable atelier qui s'inscrive dans les principes et les valeurs de notre école.
            </p>
          </div>
        </div>

        {/* Stage */}
        <div className="border-l-4 border-violet-400 pl-4">
          <h3 className="text-xl font-bold text-violet-700 mb-2">Le format stage</h3>
          <div className="space-y-3 text-gray-700 leading-relaxed">
            <p>
              Pour ce format, tu dois intégrer une structure qui partage les mêmes valeurs que l'Athénée de Waha. Par exemple, tu prends en charge des lectures pour l'ASBL La Lumière, tu deviens la cheville ouvrière d'une maison de jeunes dans un quartier peu favorisé, tu intègres un collectif féministe ou tu donnes de ton temps pour un centre de réfugiés. Les exemples ne manquent pas.
            </p>
            <p>
              Outre ton implication sur place, une partie de ton travail consiste à documenter l'activité de ta structure et à conserver des traces de ton investissement. Celles-ci te permettront de produire un compte rendu (au choix : écrit, sonore ou visuel) à la fois factuel et réflexif sur cette incroyable expérience.
            </p>
            <p>
              Le GT TFH doit valider ton choix de structure et le volume d'heures que tu comptes prester. Ton évaluation consiste en un exposé oral devant un jury, structuré autour du compte rendu critique que tu auras produit.
            </p>
          </div>
        </div>

        {/* Chef-d'œuvre */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-xl font-bold text-blue-700 mb-2">Le format chef-d'œuvre</h3>
          <div className="space-y-3 text-gray-700 leading-relaxed">
            <p>
              Tu produis, en autonomie, une œuvre que tu présentes ensuite au public des portes ouvertes ainsi qu'à un jury TFH. Soyons clairs : pas la peine d'envisager de faire un vase en pâte à modeler ou de venir plaquer trois notes sur ton synthétiseur. Ce format est destiné à l'artisan-artiste qui sommeille en toi, et l'œuvre doit être à la hauteur des exigences d'un TFH.
            </p>
            <p>
              Tu veux prendre en charge le ciné-club de l'école pendant un semestre ? Tu veux créer une activité pédagogique destinée aux élèves du primaire Freinet ? Tu veux imaginer une campagne de communication au sein de l'école consacrée aux dérives de l'IA ? Tu veux concevoir du mobilier pour rénover un espace précis dans l'école ? Tu veux créer un événement scientifique dans l'école sans faire sauter le bâtiment ?
            </p>
            <p>
              Le GT TFH doit impérativement valider ta proposition pour s'assurer qu'elle corresponde pleinement aux ambitions de ce format. Le GT doit également définir avec toi les modalités de présentation de ton chef-d'œuvre selon sa nature. Ici, c'est pratiquement du « à la carte », selon ce que tu imagines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}