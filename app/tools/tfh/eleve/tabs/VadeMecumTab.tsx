// app/tools/tfh/eleve/tabs/VadeMecumTab.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { BookOpen, ChevronRight, Menu, X } from 'lucide-react';
import Introduction from './vade-mecum/sections/Introduction';
import QuatreFormats from './vade-mecum/sections/QuatreFormats';
import Echeanciers from './vade-mecum/sections/Echeanciers';
import PedagogieFreinet from './vade-mecum/sections/PedagogieFreinet';
import FormatTraditionnel from './vade-mecum/sections/FormatTraditionnel';
import FormatAtelier from './vade-mecum/sections/FormatAtelier';
import FormatStage from './vade-mecum/sections/FormatStage';
import FormatChefOeuvre from './vade-mecum/sections/FormatChefOeuvre';
import EcritOralJury from './vade-mecum/sections/EcritOralJury';
import JournalDeBord from './vade-mecum/sections/JournalDeBord';
import ContactGT from './vade-mecum/sections/ContactGT';

export interface VadeMecumSection {
  id: string;
  title: string;
  component: React.ComponentType;
}

const SECTIONS: VadeMecumSection[] = [
  { id: 'introduction', title: 'Introduction', component: Introduction },
  { id: 'quatre-formats', title: '1 TFH / 4 formats', component: QuatreFormats },
  { id: 'echeanciers', title: '4 TFH / 4 échéanciers', component: Echeanciers },
  { id: 'pedagogie-freinet', title: 'Pédagogie Freinet', component: PedagogieFreinet },
  { id: 'format-traditionnel', title: 'Le format traditionnel', component: FormatTraditionnel },
  { id: 'format-atelier', title: 'Le format atelier', component: FormatAtelier },
  { id: 'format-stage', title: 'Le format stage', component: FormatStage },
  { id: 'format-chef-oeuvre', title: "Le format chef-d'œuvre", component: FormatChefOeuvre },
  { id: 'ecrit-oral-jury', title: 'L\'écrit, l\'oral et le jury', component: EcritOralJury },
  { id: 'journal-de-bord', title: 'Le journal de bord', component: JournalDeBord },
  { id: 'contact-gt', title: 'Contacter le GT TFH', component: ContactGT },
];

export default function VadeMecumTab() {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const [showMobileToc, setShowMobileToc] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Observer pour détecter la section visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('section-', '');
            setActiveSection(id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 80; // Offset pour compenser le header sticky
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      setShowMobileToc(false);
    }
  };

  return (
    <div className="relative">
      {/* En-tête du Vade Mecum */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Vade-Mecum TFH</h2>
            <p className="text-sm text-gray-500">Quatre formats, une seule pédagogie du travail d'inspiration Freinet</p>
          </div>
        </div>
        
        {/* Bouton TOC mobile */}
        <button
          onClick={() => setShowMobileToc(!showMobileToc)}
          className="lg:hidden flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Menu className="w-4 h-4" />
          Table des matières
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        {/* Table des matières - Desktop sticky + Mobile modal */}
        <aside
          className={`
            ${showMobileToc ? 'fixed inset-0 z-50 bg-black/50 p-4 lg:static lg:bg-transparent lg:p-0' : 'hidden lg:block'}
          `}
          onClick={() => showMobileToc && setShowMobileToc(false)}
        >
          <nav
            className={`
              lg:sticky lg:top-24 bg-white rounded-xl p-4 border border-gray-100 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto
              ${showMobileToc ? 'max-w-md mx-auto mt-16 max-h-[80vh]' : ''}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 lg:block">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Table des matières
              </h3>
              {showMobileToc && (
                <button
                  onClick={() => setShowMobileToc(false)}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={`
                        w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-all
                        ${isActive
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-transform ${
                          isActive ? 'text-indigo-500' : 'text-gray-300'
                        }`}
                      />
                      <span className="leading-snug">{section.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Contenu */}
        <div ref={contentRef} className="space-y-6 mt-6 lg:mt-0">
          {SECTIONS.map((section) => {
            const SectionComponent = section.component;
            return (
              <section
                key={section.id}
                id={`section-${section.id}`}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className="scroll-mt-24"
              >
                <SectionComponent />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}