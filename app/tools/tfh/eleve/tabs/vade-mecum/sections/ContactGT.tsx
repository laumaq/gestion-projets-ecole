// app/tools/tfh/eleve/tabs/vade-mecum/sections/ContactGT.tsx
'use client';

import { Mail, AlertCircle } from 'lucide-react';

const MEMBRES_GT = [
  'Alexandre Cesa',
  'Emmanuel Chapeau',
  'Vincent Chapeau',
  'Frédéric Donjean',
  'Laurent Maquet',
];

export default function ContactGT() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
        <h2 className="text-2xl font-bold text-indigo-700">Comment contacter le GT TFH</h2>
      </div>

      <div className="space-y-5 text-gray-700 leading-relaxed">
        <p>
          Le GT TFH est là pour t'accompagner tout au long de ton projet. Si tu as une question concernant le choix de ton format, une étape du calendrier, ton projet, ton guide ou encore les modalités de présentation et de défense, tu peux nous contacter.
        </p>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900 mb-2">
                Pour toute question concernant le TFH, privilégie un message via Smartschool.
              </p>
              <p className="text-sm mb-3">Lorsque tu écris au GT, pense à :</p>
              <ul className="list-disc list-inside space-y-1.5 text-sm ml-2">
                <li>préciser clairement que ta demande concerne le TFH ;</li>
                <li>indiquer un objet de message explicite, par exemple : <em>TFH question concernant mon projet</em> ;</li>
                <li>expliquer brièvement ta question ou ta difficulté afin que nous puissions te répondre le plus efficacement possible ;</li>
                <li>si nécessaire, joindre les documents utiles à la compréhension de ta demande.</li>
              </ul>
              <p className="text-sm mt-3 italic">
                Plus ta demande est précise, plus il nous sera facile de t'aider rapidement.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-800 mb-3">
            Tu peux t'adresser à l'un des membres du groupe de travail :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MEMBRES_GT.map((membre) => (
              <div
                key={membre}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-sm font-medium text-gray-800">{membre}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3 italic">
            Le GT travaille collectivement : selon la nature de ta demande, ton message pourra donc être pris en charge par l'un ou l'autre de ses membres.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 mb-1">
                Une question ? Une difficulté ? N'attends pas.
              </p>
              <p className="text-sm text-amber-800">
                Le TFH se construit progressivement. Si tu bloques, si tu hésites ou si tu ne sais pas comment avancer, contacte le GT plutôt que de laisser la difficulté s'installer. Une question posée au bon moment peut souvent permettre de débloquer rapidement ton projet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}