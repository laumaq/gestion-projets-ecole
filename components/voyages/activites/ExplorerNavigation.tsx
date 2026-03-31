// components/voyages/activites/ExplorerNavigation.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronRight, FolderOpen, FileText, Calendar } from 'lucide-react';

interface Props {
  voyageId: string;
  selectedActivite: string | null;
  onSelectActivite: (id: string) => void;
  navigationStack: any[];
  onNavigate: (item: any) => void;
  onBack: () => void;
}

export default function ExplorerNavigation({
  voyageId,
  selectedActivite,
  onSelectActivite,
  navigationStack,
  onNavigate,
  onBack
}: Props) {
  const [jours, setJours] = useState<any[]>([]);
  const [expandedJours, setExpandedJours] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadJours();
  }, [voyageId]);

  const loadJours = async () => {
    const { data } = await supabase
      .from('planning_jours')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date');
    setJours(data || []);
  };

  const toggleJour = (jourId: string) => {
    const newExpanded = new Set(expandedJours);
    if (newExpanded.has(jourId)) {
      newExpanded.delete(jourId);
    } else {
      newExpanded.add(jourId);
    }
    setExpandedJours(newExpanded);
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Barre de navigation */}
      {navigationStack.length > 0 && (
        <div className="sticky top-0 bg-gray-50 p-2 border-b flex items-center gap-2">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800">
            ← Retour
          </button>
          <span className="text-sm text-gray-500">
            {navigationStack.map((item, i) => (
              <span key={i}>
                {i > 0 && ' / '}
                {item.name}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Liste des jours */}
      <div className="divide-y">
        {jours.map((jour) => {
          const isExpanded = expandedJours.has(jour.id);
          const dateObj = new Date(jour.date);
          const jourLabel = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

          return (
            <div key={jour.id}>
              <button
                onClick={() => toggleJour(jour.id)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-left"
              >
                <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium capitalize">{jourLabel}</span>
              </button>

              {isExpanded && (
                <div className="pl-6">
                  <GroupesList
                    jourId={jour.id}
                    selectedActivite={selectedActivite}
                    onSelectActivite={onSelectActivite}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant pour la liste des groupes
function GroupesList({ jourId, selectedActivite, onSelectActivite }: any) {
  const [groupes, setGroupes] = useState<any[]>([]);
  const [expandedGroupes, setExpandedGroupes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGroupes();
  }, [jourId]);

  const loadGroupes = async () => {
    const { data } = await supabase
      .from('groupes_activites')
      .select('*')
      .eq('planning_jour_id', jourId)
      .order('ordre');
    setGroupes(data || []);
  };

  const toggleGroupe = (groupeId: string) => {
    const newExpanded = new Set(expandedGroupes);
    if (newExpanded.has(groupeId)) {
      newExpanded.delete(groupeId);
    } else {
      newExpanded.add(groupeId);
    }
    setExpandedGroupes(newExpanded);
  };

  return (
    <div className="ml-2">
      {groupes.map((groupe) => {
        const isExpanded = expandedGroupes.has(groupe.id);
        return (
          <div key={groupe.id}>
            <button
              onClick={() => toggleGroupe(groupe.id)}
              className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-left"
            >
              <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
              <FolderOpen className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{groupe.nom}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {groupe.nb_inscriptions_max} max
              </span>
            </button>

            {isExpanded && (
              <div className="pl-6">
                <ActivitesList
                  groupeId={groupe.id}
                  selectedActivite={selectedActivite}
                  onSelectActivite={onSelectActivite}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Composant pour la liste des activités
function ActivitesList({ groupeId, selectedActivite, onSelectActivite }: any) {
  const [activites, setActivites] = useState<any[]>([]);

  useEffect(() => {
    loadActivites();
  }, [groupeId]);

  const loadActivites = async () => {
    const { data } = await supabase
      .from('activites')
      .select('*')
      .eq('groupe_id', groupeId)
      .order('heure_debut');
    setActivites(data || []);
  };

  return (
    <div>
      {activites.map((activite) => (
        <button
          key={activite.id}
          onClick={() => onSelectActivite(activite.id)}
          className={`w-full px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-left rounded ${
            selectedActivite === activite.id ? 'bg-blue-50 text-blue-700' : ''
          }`}
        >
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm truncate">{activite.titre}</span>
          <span className="text-xs text-gray-400 ml-auto">
            {activite.heure_debut.slice(0, 5)}-{activite.heure_fin.slice(0, 5)}
          </span>
        </button>
      ))}
    </div>
  );
}