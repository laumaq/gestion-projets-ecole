// app/tools/tfh/coordination/tabs/ParametresTab/index.tsx
'use client';

import { useState } from 'react';
import SectionFonctionnels from './sections/SectionFonctionnels';
import SectionAffichage from './sections/SectionAffichage';
import SectionNouvelleAnnee from './sections/SectionNouvelleAnnee';
import SectionTypesTFH from './sections/SectionTypesTFH';

interface ParametresTabProps {
  onRefresh?: () => void;
}

export default function ParametresTab({ onRefresh }: ParametresTabProps) {
  const [expandedSections, setExpandedSections] = useState({
    fonctionnels: false,
    affichage: false,
    nouvelleAnnee: false,
    typesTFH: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      <SectionFonctionnels
        expanded={expandedSections.fonctionnels}
        onToggle={() => toggleSection('fonctionnels')}
      />

      <SectionAffichage
        expanded={expandedSections.affichage}
        onToggle={() => toggleSection('affichage')}
      />

      <SectionTypesTFH
        expanded={expandedSections.typesTFH}
        onToggle={() => toggleSection('typesTFH')}
      />

      <SectionNouvelleAnnee
        expanded={expandedSections.nouvelleAnnee}
        onToggle={() => toggleSection('nouvelleAnnee')}
        onRefresh={onRefresh}
      />
    </div>
  );
}