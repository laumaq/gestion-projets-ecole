// app/tools/mon-horaire/components/AgendaHeader.tsx
'use client';

import type { VueType } from '../types';
import {
  ajouterJours,
  dateOuvree,
  formatJourLong,
  formatPlageSemaine,
  jourOuvrePrecedent,
  jourOuvreSuivant,
  lundiDeLaSemaine,
  nomJourFr,
} from '../utils/dates';

interface AgendaHeaderProps {
  vue: VueType;
  dateRef: Date;
  userName: string;
  nbCours: number;
  onVueChange: (v: VueType) => void;
  onDateChange: (d: Date) => void;
}

export default function AgendaHeader({
  vue,
  dateRef,
  userName,
  nbCours,
  onVueChange,
  onDateChange,
}: AgendaHeaderProps) {
  function precedent() {
    if (vue === 'semaine') onDateChange(ajouterJours(dateRef, -7));
    else onDateChange(jourOuvrePrecedent(dateRef));
  }

  function suivant() {
    if (vue === 'semaine') onDateChange(ajouterJours(dateRef, 7));
    else onDateChange(jourOuvreSuivant(dateRef));
  }

  function aujourdhui() {
    const now = dateOuvree(new Date());
    onDateChange(vue === 'semaine' ? lundiDeLaSemaine(now) : now);
  }

  const titre =
    vue === 'semaine'
      ? formatPlageSemaine(lundiDeLaSemaine(dateRef))
      : formatJourLong(dateRef);

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon horaire</h1>
          {userName && (
            <p className="text-gray-600 mt-1">
              {userName} — {nbCours} heure{nbCours > 1 ? 's' : ''} de cours au total
            </p>
          )}
        </div>

        {/* Switch vue */}
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            onClick={() => onVueChange('jour')}
            className={`px-4 py-1.5 text-sm font-medium ${
              vue === 'jour'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => onVueChange('semaine')}
            className={`px-4 py-1.5 text-sm font-medium border-l border-gray-300 ${
              vue === 'semaine'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Semaine
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={precedent}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          aria-label="Précédent"
        >
          ‹
        </button>
        <button
          onClick={aujourdhui}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          Aujourd'hui
        </button>
        <button
          onClick={suivant}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          aria-label="Suivant"
        >
          ›
        </button>
        <span className="ml-3 text-lg font-medium text-gray-800">{titre}</span>
      </div>
    </div>
  );
}