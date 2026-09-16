// app/tools/mon-horaire/page.tsx
'use client';

import { useMemo, useState } from 'react';
import type { Cours, VueType } from './types';
import { lundiDeLaSemaine } from './utils/dates';
import { calculerPlageHoraire, extraireGroupe } from './utils/horaire';
import { useMonHoraire } from './hooks/useMonHoraire';

import AgendaHeader from './components/AgendaHeader';
import VueSemaine from './components/VueSemaine';
import VueJour from './components/VueJour';
import ModalComposition from './components/ModalComposition';

export default function MonHorairePage() {
  const { cours, loading, userName } = useMonHoraire();

  const [vue, setVue] = useState<VueType>('semaine');
  const [dateRef, setDateRef] = useState<Date>(() => lundiDeLaSemaine(new Date()));

  const [modalOpen, setModalOpen] = useState(false);
  const [modalGroupe, setModalGroupe] = useState('');
  const [modalTitre, setModalTitre] = useState('');

  // Plage horaire dynamique (étendue si cours hors 8h–18h)
  const plage = useMemo(() => calculerPlageHoraire(cours), [cours]);

  function handleCoursClick(c: Cours) {
    const groupe = extraireGroupe(c.raw_pattern);
    if (!groupe) return;
    setModalGroupe(groupe);
    setModalTitre(`${c.matiere || '—'} — ${c.jour} ${c.heure_debut}`);
    setModalOpen(true);
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        Chargement de votre horaire...
      </div>
    );
  }

  return (
    <div>
      <AgendaHeader
        vue={vue}
        dateRef={dateRef}
        userName={userName}
        nbCours={cours.length}
        onVueChange={setVue}
        onDateChange={setDateRef}
      />

      {cours.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Aucun cours à afficher.
        </div>
      ) : vue === 'semaine' ? (
        <VueSemaine
          cours={cours}
          dateRef={dateRef}
          heureMin={plage.min}
          heureMax={plage.max}
          onCoursClick={handleCoursClick}
        />
      ) : (
        <VueJour
          cours={cours}
          dateRef={dateRef}
          heureMin={plage.min}
          heureMax={plage.max}
          onCoursClick={handleCoursClick}
        />
      )}

      {modalOpen && (
        <ModalComposition
          groupe={modalGroupe}
          titre={modalTitre}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}