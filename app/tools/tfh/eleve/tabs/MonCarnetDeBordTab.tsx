// app/tools/tfh/eleve/tabs/MonCarnetDeBordTab.tsx
'use client';

import JournalDeBord from '../components/JournalDeBord';
import { EleveInfo } from '../types';

interface MonCarnetDeBordTabProps {
  eleve: EleveInfo;
  onUpdate: () => void;
}

export default function MonCarnetDeBordTab({ eleve, onUpdate }: MonCarnetDeBordTabProps) {
  return (
    <JournalDeBord 
      eleve={eleve} 
      onUpdate={onUpdate}
    />
  );
}