// app/tools/tfh/eleve/tabs/vade-mecum/TableOfContents.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { VadeMecumSection } from '../VadeMecumTab';

interface TableOfContentsProps {
  sections: VadeMecumSection[];
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export default function TableOfContents({ sections, activeSection, onSectionClick }: TableOfContentsProps) {
  return (
    <ul className="space-y-1">
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <li key={section.id}>
            <button
              onClick={() => onSectionClick(section.id)}
              className={`
                w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-all
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  isActive ? 'text-indigo-500' : 'text-gray-300'
                }`}
              />
              <span className="leading-snug">{section.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}