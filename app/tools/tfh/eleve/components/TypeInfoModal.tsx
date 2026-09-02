// app/tools/tfh/eleve/components/TypeInfoModal.tsx
'use client';

import { useState } from 'react';
import { X, BookOpen, Users, Palette, Hammer } from 'lucide-react';

interface TypeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const TYPE_DESCRIPTIONS: Record<string, { title: string; description: string; details: string[] }> = {
  mémoire: {
    title: 'Mémoire',
    description: 'Un travail de recherche approfondi sur un sujet choisi par l\'élève.',
    details: [
      'Recherche documentaire et bibliographique',
      'Analyse critique des sources',
      'Rédaction d\'un mémoire structuré',
      'Soutenance orale devant un jury'
    ]
  },
  associatif: {
    title: 'Associatif',
    description: 'Un projet mené dans le cadre d\'une association ou d\'un engagement citoyen.',
    details: [
      'Participation à une association existante',
      'Création d\'un projet associatif',
      'Implication dans la communauté',
      'Bilan et réflexion sur l\'engagement'
    ]
  },
  artistique: {
    title: 'Artistique',
    description: 'Une création artistique dans le domaine de son choix.',
    details: [
      'Création originale (peinture, sculpture, musique, etc.)',
      'Démarche créative documentée',
      'Présentation publique du travail',
      'Analyse de la démarche artistique'
    ]
  },
  atelier: {
    title: 'Atelier',
    description: 'Un projet technique ou pratique réalisé en atelier.',
    details: [
      'Conception et réalisation d\'un objet ou prototype',
      'Méthodologie de projet',
      'Documentation du processus',
      'Présentation et démonstration finale'
    ]
  }
};

const TYPE_ICONS = {
  mémoire: BookOpen,
  associatif: Users,
  artistique: Palette,
  atelier: Hammer
};

export default function TypeInfoModal({ isOpen, onClose, type, label }: TypeInfoModalProps) {
  if (!isOpen) return null;

  const info = TYPE_DESCRIPTIONS[type];
  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];

  if (!info) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <Icon className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">{info.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm leading-relaxed">{info.description}</p>
        </div>

        {/* Détails */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📌 Caractéristiques principales</h4>
          <ul className="space-y-1.5">
            {info.details.map((detail, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {/* Bouton */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          OK
        </button>
      </div>
    </div>
  );
}