// components/sciences/GraphiqueIntelligent.tsx

'use client';

import { ExpressionEvaluator } from '@/lib/sciences/expressionEvaluator';


import { useRef, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController,
  BarController,
  ChartData,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Enregistrer LogarithmicScale
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController,
  BarController
);

interface GraphiqueConfig {
  nom: string;
  type: 'scatter' | 'line' | 'bar';
  tableau_index: number;
  axe_x: string;
  axe_y: string;
  groupe_par?: string;
}

interface Tableau {
  nom: string;
  colonnes: { nom: string; unite: string; }[];
}

interface Mesure {
  id: string;
  eleve_matricule: number;
  mesures: Record<string, number | null>;
  created_at: string;
  eleve?: { 
    nom: string; 
    prenom: string; 
  };
}

interface VerificationConfig {
  tableau_index: number;
  expression: string;
  variable_cible: string;
  tolerance: number;
  active: boolean;
}

interface GraphiqueIntelligentProps {
  config: GraphiqueConfig;
  tableaux: Tableau[];
  mesuresParTableau: Record<number, Mesure[]>;
  verifications?: VerificationConfig[];
  userType: 'employee' | 'student';
  userId: number;
  onModifierMesure?: (mesureId: string, valeurs: Record<string, number | null>) => void;
  onSupprimerMesure?: (mesureId: string) => void;
}

// Configuration des axes
interface AxesConfig {
  x: {
    min?: number;
    max?: number;
    beginAtZero: boolean;
    type: 'linear' | 'logarithmic';
  };
  y: {
    min?: number;
    max?: number;
    beginAtZero: boolean;
    type: 'linear' | 'logarithmic';
  };
}

// Composant de configuration des axes
function AxesConfigPanel({ config, onChange }: { config: AxesConfig; onChange: (newConfig: AxesConfig) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onChange(localConfig);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-gray-400 hover:text-gray-600 ml-2"
        title="Configurer les axes"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-30 p-4 min-w-[300px]">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration des axes</h4>
          
          {/* Axe X */}
          <div className="mb-4">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Axe X</h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">Min</label>
                <input
                  type="number"
                  step="any"
                  value={localConfig.x.min ?? ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    x: { ...localConfig.x, min: e.target.value ? parseFloat(e.target.value) : undefined }
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="auto"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Max</label>
                <input
                  type="number"
                  step="any"
                  value={localConfig.x.max ?? ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    x: { ...localConfig.x, max: e.target.value ? parseFloat(e.target.value) : undefined }
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="auto"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={localConfig.x.beginAtZero}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    x: { ...localConfig.x, beginAtZero: e.target.checked }
                  })}
                />
                Commencer à 0
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={localConfig.x.type === 'logarithmic'}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    x: { ...localConfig.x, type: e.target.checked ? 'logarithmic' : 'linear' }
                  })}
                />
                Échelle logarithmique
              </label>
            </div>
          </div>

          {/* Axe Y */}
          <div className="mb-4">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Axe Y</h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">Min</label>
                <input
                  type="number"
                  step="any"
                  value={localConfig.y.min ?? ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    y: { ...localConfig.y, min: e.target.value ? parseFloat(e.target.value) : undefined }
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="auto"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Max</label>
                <input
                  type="number"
                  step="any"
                  value={localConfig.y.max ?? ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    y: { ...localConfig.y, max: e.target.value ? parseFloat(e.target.value) : undefined }
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="auto"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={localConfig.y.beginAtZero}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    y: { ...localConfig.y, beginAtZero: e.target.checked }
                  })}
                />
                Commencer à 0
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={localConfig.y.type === 'logarithmic'}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    y: { ...localConfig.y, type: e.target.checked ? 'logarithmic' : 'linear' }
                  })}
                />
                Échelle logarithmique
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button onClick={handleCancel} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
              Annuler
            </button>
            <button onClick={handleSave} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphiqueIntelligent({ 
  config, 
  tableaux, 
  mesuresParTableau,
  verifications = [],
  userType,
  userId,
  onModifierMesure,
  onSupprimerMesure 
}: GraphiqueIntelligentProps) {
  const tableau = tableaux[config.tableau_index];
  const mesures = mesuresParTableau[config.tableau_index] || [];
  
  // État pour le filtrage par vérification
  const [filterByVerification, setFilterByVerification] = useState(false);
  
  // État pour la configuration des axes
  const [axesConfig, setAxesConfig] = useState<AxesConfig>({
    x: { beginAtZero: true, type: 'linear' },
    y: { beginAtZero: true, type: 'linear' }
  });

  const chartRef = useRef<ChartJS>(null);

  const [selectedPoint, setSelectedPoint] = useState<Mesure | null>(null);
  const [showPointMenu, setShowPointMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [editingMesure, setEditingMesure] = useState<Mesure | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Récupérer la vérification active pour ce tableau
  const verification = verifications.find(v => v.active && v.tableau_index === config.tableau_index);

  // FONCTION CORRIGÉE : utilise ExpressionEvaluator
  const evaluateVerification = (verif: VerificationConfig, valeurs: Record<string, number | null>) => {
    // Vérifier que toutes les colonnes nécessaires sont présentes
    const colonnePattern = /\{([^}]+)\}/g;
    const matches = [];
    let match;
    while ((match = colonnePattern.exec(verif.expression)) !== null) {
      matches.push(match);
    }
    const colonnesNecessaires = matches.map(m => m[1]);
    
    for (const col of colonnesNecessaires) {
      if (valeurs[col] === null || valeurs[col] === undefined) {
        return { estValide: false };
      }
    }
    
    const resultat = ExpressionEvaluator.verifierMesure(
      verif.expression,
      valeurs,
      verif.variable_cible,
      verif.tolerance
    );
    
    return { estValide: resultat.estValide };
  };
    
  // Filtrer les mesures selon la vérification
  const mesuresFiltrees = useMemo(() => {
    if (!filterByVerification || !verification) return mesures;
    
    return mesures.filter(mesure => {
      const resultat = evaluateVerification(verification, mesure.mesures);
      return resultat.estValide;
    });
  }, [mesures, filterByVerification, verification]);



  // Trouver les colonnes pour les axes
  const xCol = tableau?.colonnes.find(c => c.nom === config.axe_x);
  const yCol = tableau?.colonnes.find(c => c.nom === config.axe_y);
  const groupeCol = config.groupe_par ? tableau?.colonnes.find(c => c.nom === config.groupe_par) : null;

  // Grouper intelligemment les données (avec mesures filtrées)
  const { series, xValues, rawData } = useMemo(() => {
    if (!mesuresFiltrees.length || !tableau) return { series: [], xValues: [], rawData: [] };

    // Filtrer les mesures valides
    const mesuresValides = mesuresFiltrees.filter(m => 
      m.mesures[config.axe_x] !== null && 
      m.mesures[config.axe_x] !== undefined &&
      m.mesures[config.axe_y] !== null && 
      m.mesures[config.axe_y] !== undefined
    );

    if (!config.groupe_par) {
      const points = mesuresValides.map(m => ({
        x: m.mesures[config.axe_x] as number,
        y: m.mesures[config.axe_y] as number
      }));

      if (config.type !== 'scatter') {
        points.sort((a, b) => a.x - b.x);
      }

      const xUniques = Array.from(new Set(points.map(p => p.x))).sort((a, b) => a - b);

      const seriesData = points.length >= 2 ? [{
        label: `${config.axe_y} en fonction de ${config.axe_x}`,
        data: points,
        type: config.type
      }] : [];

      return {
        series: seriesData,
        xValues: xUniques,
        rawData: mesuresValides
      };
    } else {
      const groupes = new Map<string, typeof mesuresValides>();

      mesuresValides.forEach(m => {
        const valeurGroupe = m.mesures[config.groupe_par!];
        if (valeurGroupe === null || valeurGroupe === undefined) return;
        
        const cle = `${valeurGroupe}`;
        if (!groupes.has(cle)) {
          groupes.set(cle, []);
        }
        groupes.get(cle)!.push(m);
      });

      const seriesData = Array.from(groupes.entries())
        .map(([cle, mesuresGroupe], index) => {
          const points = mesuresGroupe.map(m => ({
            x: m.mesures[config.axe_x] as number,
            y: m.mesures[config.axe_y] as number
          }));

          if (config.type !== 'scatter') {
            points.sort((a, b) => a.x - b.x);
          }

          return {
            label: `${config.groupe_par} = ${cle} ${groupeCol?.unite || ''}`,
            data: points,
            type: config.type
          };
        })
        .filter(serie => serie.data.length >= 2);

      const xUniques = Array.from(new Set(
        mesuresValides.map(m => m.mesures[config.axe_x] as number)
      )).sort((a, b) => a - b);

      return {
        series: seriesData,
        xValues: xUniques,
        rawData: mesuresValides
      };
    }
  }, [mesuresFiltrees, config, tableau, groupeCol]);

  // Calculer l'échelle Y (si non configurée manuellement)
  const yMinMax = useMemo(() => {
    if (axesConfig.y.min !== undefined && axesConfig.y.max !== undefined) {
      return { min: axesConfig.y.min, max: axesConfig.y.max };
    }
    
    let min = Infinity;
    let max = -Infinity;
    
    series.forEach(serie => {
      serie.data.forEach(point => {
        min = Math.min(min, point.y);
        max = Math.max(max, point.y);
      });
    });
    
    if (min === Infinity) return { min: 0, max: 1 };
    
    const range = max - min;
    const margin = range * 0.1;
    return {
      min: axesConfig.y.min ?? (axesConfig.y.beginAtZero ? Math.min(0, min - margin) : min - margin),
      max: axesConfig.y.max ?? max + margin
    };
  }, [series, axesConfig.y]);

  // Calculer l'échelle X
  const xMinMax = useMemo(() => {
    if (axesConfig.x.min !== undefined && axesConfig.x.max !== undefined) {
      return { min: axesConfig.x.min, max: axesConfig.x.max };
    }
    
    let min = Infinity;
    let max = -Infinity;
    
    series.forEach(serie => {
      serie.data.forEach(point => {
        min = Math.min(min, point.x);
        max = Math.max(max, point.x);
      });
    });
    
    if (min === Infinity) return { min: 0, max: 1 };
    
    const range = max - min;
    const margin = range * 0.1;
    return {
      min: axesConfig.x.min ?? (axesConfig.x.beginAtZero ? Math.min(0, min - margin) : min - margin),
      max: axesConfig.x.max ?? max + margin
    };
  }, [series, axesConfig.x]);

  // Préparer les données pour Chart.js
  const data = useMemo((): ChartData => {
    if (config.type === 'scatter') {
      return {
        datasets: series.map((serie, index) => ({
          label: serie.label,
          data: serie.data,
          backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8
        }))
      };
    } else {
      const datasets = series.map((serie, index) => {
        const yParX = new Map(serie.data.map(p => [p.x, p.y]));
        const yValues = xValues.map(x => yParX.get(x) ?? null);

        return {
          label: serie.label,
          data: yValues,
          backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
          borderColor: `hsl(${index * 60}, 70%, 50%)`,
          tension: 0.1,
          fill: false
        };
      });

      return {
        labels: xValues.map(x => x.toFixed(2)),
        datasets
      };
    }
  }, [series, xValues, config.type]);

  const handlePointClick = (event: any, elements: any[], chart: any) => {
    if (elements.length > 0) {
      const element = elements[0];
      const datasetIndex = element.datasetIndex;
      const index = element.index;
      
      const serie = series[datasetIndex];
      const point = serie.data[index];
      
      const mesureTrouvee = rawData.find(m => {
        const xVal = m.mesures[config.axe_x];
        const yVal = m.mesures[config.axe_y];
        return Math.abs((xVal as number) - point.x) < 0.001 && 
               Math.abs((yVal as number) - point.y) < 0.001;
      });

      if (mesureTrouvee) {
        const peutModifier = userType === 'employee' || 
                            (userType === 'student' && mesureTrouvee.eleve_matricule === userId);

        if (peutModifier) {
          setSelectedPoint(mesureTrouvee);
          
          const rect = event.chart.canvas.getBoundingClientRect();
          setMenuPosition({
            x: event.native.clientX - rect.left,
            y: event.native.clientY - rect.top
          });
          setShowPointMenu(true);
        }
      }
    }
  };

  const handleOpenEditModal = (mesure: Mesure) => {
    const values: Record<string, string> = {};
    Object.entries(mesure.mesures).forEach(([key, value]) => {
      values[key] = value?.toString() || '';
    });
    
    setEditingMesure(mesure);
    setEditValues(values);
  };

  const handleSaveEdit = async () => {
    if (!editingMesure || !onModifierMesure) return;

    const valeursNumeriques: Record<string, number | null> = {};
    Object.entries(editValues).forEach(([key, value]) => {
      valeursNumeriques[key] = value === '' ? null : parseFloat(value);
    });

    await onModifierMesure(editingMesure.id, valeursNumeriques);
    setEditingMesure(null);
    setEditValues({});
    setShowPointMenu(false);
  };

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any[], chart: any) => {
      handlePointClick(event, elements, chart);
    },
    plugins: {
      legend: { position: 'top' },
      title: { 
        display: true, 
        text: config.nom 
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<any>) => {
            if (config.type === 'scatter') {
              const point = context.raw as any;
              return `${context.dataset.label}: (${point.x.toFixed(2)} ${xCol?.unite || ''}, ${point.y.toFixed(2)} ${yCol?.unite || ''})`;
            } else {
              const valeur = context.raw as number;
              return `${context.dataset.label}: ${valeur.toFixed(2)} ${yCol?.unite || ''}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        type: axesConfig.x.type === 'logarithmic' ? 'logarithmic' : 'linear',
        title: {
          display: true,
          text: xCol ? `${xCol.nom} (${xCol.unite})` : 'X'
        },
        min: xMinMax.min,
        max: xMinMax.max,
        beginAtZero: axesConfig.x.beginAtZero
      },
      y: {
        type: axesConfig.y.type === 'logarithmic' ? 'logarithmic' : 'linear',
        title: {
          display: true,
          text: yCol ? `${yCol.nom} (${yCol.unite})` : 'Y'
        },
        min: yMinMax.min,
        max: yMinMax.max,
        beginAtZero: axesConfig.y.beginAtZero
      }
    }
  };

  const PointContextMenu = () => {
    if (!showPointMenu || !selectedPoint) return null;

    const trouverSerieLabel = () => {
      for (const serie of series) {
        const match = serie.data.find(p => 
          Math.abs(p.x - (selectedPoint.mesures[config.axe_x] as number)) < 0.001 &&
          Math.abs(p.y - (selectedPoint.mesures[config.axe_y] as number)) < 0.001
        );
        if (match) return serie.label;
      }
      return 'Point';
    };

    return (
      <div 
        className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 min-w-[240px]"
        style={{
          left: menuPosition.x,
          top: menuPosition.y - 160,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="text-sm font-medium text-gray-700 px-3 py-2 border-b border-gray-100">
          {trouverSerieLabel()}
        </div>
        <div className="text-xs text-gray-500 px-3 py-2 space-y-1">
          {Object.entries(selectedPoint.mesures).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <span className="font-mono font-medium">{value ?? '-'}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <div>👤 {selectedPoint.eleve?.prenom} {selectedPoint.eleve?.nom}</div>
            <div>🕐 {new Date(selectedPoint.created_at).toLocaleTimeString('fr-FR')}</div>
          </div>
        </div>
        <div className="flex border-t border-gray-100 mt-1 pt-1">
          <button
            onClick={() => {
              handleOpenEditModal(selectedPoint);
              setShowPointMenu(false);
            }}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded flex-1 transition"
          >
            ✏️ Modifier
          </button>
          <button
            onClick={() => {
              if (onSupprimerMesure && confirm('Supprimer ce point ?')) {
                onSupprimerMesure(selectedPoint.id);
              }
              setShowPointMenu(false);
            }}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded flex-1 transition"
          >
            🗑️ Supprimer
          </button>
          <button
            onClick={() => setShowPointMenu(false)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded flex-1 transition"
          >
            ✕ Fermer
          </button>
        </div>
      </div>
    );
  };

  const EditModal = () => {
    if (!editingMesure) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Modifier la mesure
          </h3>
          
          <div className="space-y-4">
            {tableau.colonnes.map((colonne) => (
              <div key={colonne.nom}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {colonne.nom} {colonne.unite && `(${colonne.unite})`}
                </label>
                <input
                  type="number"
                  step="any"
                  value={editValues[colonne.nom] || ''}
                  onChange={(e) => setEditValues({
                    ...editValues,
                    [colonne.nom]: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={`Entrez ${colonne.nom}`}
                />
              </div>
            ))}

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p>👤 {editingMesure.eleve?.prenom} {editingMesure.eleve?.nom}</p>
              <p>🕐 {new Date(editingMesure.created_at).toLocaleString('fr-FR')}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setEditingMesure(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (series.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{config.nom}</h3>
          <div className="flex items-center gap-2">
            {verification && (
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={filterByVerification}
                  onChange={(e) => setFilterByVerification(e.target.checked)}
                />
                Filtrer par vérification
              </label>
            )}
            <AxesConfigPanel config={axesConfig} onChange={setAxesConfig} />
          </div>
        </div>
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-center">
            {mesuresFiltrees.length === 0 
              ? filterByVerification ? "Aucune donnée ne vérifie la relation" : "En attente de données..."
              : "Pas assez de points pour afficher le graphique (minimum 2 points par série)"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 relative">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.nom}</h3>
        <div className="flex items-center gap-2">
          {verification && (
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={filterByVerification}
                onChange={(e) => setFilterByVerification(e.target.checked)}
              />
              Filtrer par vérification
            </label>
          )}
          <AxesConfigPanel config={axesConfig} onChange={setAxesConfig} />
        </div>
      </div>
      <div className="h-96 relative">
        <Chart
          ref={chartRef}
          type={config.type}
          data={data}
          options={options}
        />
        <PointContextMenu />
        <EditModal />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        {rawData.length} point{rawData.length > 1 ? 's' : ''} de mesure
        {filterByVerification && rawData.length !== mesures.length && (
          <span className="ml-2 text-xs text-green-600">
            (filtrés: {rawData.length}/{mesures.length})
          </span>
        )}
        {userType === 'employee' && (
          <span className="ml-2 text-xs text-gray-400">
            (cliquez sur un point pour le modifier)
          </span>
        )}
      </div>
    </div>
  );
}