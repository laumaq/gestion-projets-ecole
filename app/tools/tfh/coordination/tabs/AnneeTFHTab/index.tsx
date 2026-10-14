// app/tools/tfh/coordination/tabs/AnneeTFHTab/index.tsx
'use client';

import { useState } from 'react';
import JourneesTravailSection from './sections/JourneesTravailSection';
import JourneesDefenseSection from './sections/JourneesDefenseSection';
import EcheancierSection from './sections/EcheancierSection';

interface AnneeTFHTabProps {
  onRefresh?: () => void;
}

export default function AnneeTFHTab({ onRefresh: _onRefresh }: AnneeTFHTabProps) {
  const [expanded, setExpanded] = useState({
    travail: false,
    defense: false,
    echeancier: false,
  });

  const toggle = (key: keyof typeof expanded) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">


      <JourneesTravailSection
        expanded={expanded.travail}
        onToggle={() => toggle('travail')}
      />

      <JourneesDefenseSection
        expanded={expanded.defense}
        onToggle={() => toggle('defense')}
      />

      <EcheancierSection
        expanded={expanded.echeancier}
        onToggle={() => toggle('echeancier')}
      />
    </div>
  );
}