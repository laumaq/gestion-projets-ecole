// components/sciences/GraphiqueIntelligent.tsx
'use client';

import { useRef, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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

ChartJS.register(
  CategoryScale,
  LinearScale,
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

interface GraphiqueIntelligentProps {
  config: GraphiqueConfig;
  tableaux: Tableau[];
  mesuresParTableau: Record<number, Mesure[]>;  // <- Vérifiez que c'est bien écrit comme ça
  userType: 'employee' | 'student';
  userId: number;
  onModifierMesure?: (mesureId: string, valeurs: Record<string, number | null>) => void;
  onSupprimerMesure?: (mesureId: string) => void;
}

export default function GraphiqueIntelligent({ 
  config, 
  tableaux, 
  mesuresParTableau, 
  userType,
  userId,
  onModifierMesure,
  onSupprimerMesure 
}: GraphiqueIntelligentProps) {
  const tableau = tableaux[config.tableau_index];
  const mesures = mesuresParTableau[config.tableau_index] || [];
  
  const chartRef = useRef<ChartJS>(null);

  const [selectedPoint, setSelectedPoint] = useState<Mesure | null>(null);
  const [showPointMenu, setShowPointMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [editingMesure, setEditingMesure] = useState<Mesure | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Trouver les colonnes pour les axes
  const xCol = tableau?.colonnes.find(c => c.nom === config.axe_x);
  const yCol = tableau?.colonnes.find(c => c.nom === config.axe_y);
  const groupeCol = config.groupe_par ? tableau?.colonnes.find(c => c.nom === config.groupe_par) : null;

  // Grouper intelligemment les données
  const { series, xValues } = useMemo(() => {
    if (!mesures.length || !tableau) return { series: [], xValues: [] };

    // Filtrer les mesures valides
    const mesuresValides = mesures.filter(m => 
      m.mesures[config.axe_x] !== null && 
      m.mesures[config.axe_x] !== undefined &&
      m.mesures[config.axe_y] !== null && 
      m.mesures[config.axe_y] !== undefined
    );

    if (!config.groupe_par) {
      // Pas de grouping : une seule série
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
        xValues: xUniques
      };
    } else {
      // Grouper par la variable spécifiée
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
        xValues: xUniques
      };
    }
  }, [mesures, config, tableau, groupeCol]);

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
      // Pour line et bar, on doit réorganiser les données
      const datasets = series.map((serie, index) => {
        // Créer un map des valeurs Y pour chaque X
        const yParX = new Map(
          serie.data.map(p => [p.x, p.y])
        );

        // Prendre tous les X dans l'ordre
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

  // Calculer l'échelle Y
  const yMinMax = useMemo(() => {
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
      min: Math.min(0, min - margin),
      max: max + margin
    };
  }, [series]);

  const handlePointClick = (event: any, elements: any[], chart: any) => {
    if (elements.length > 0) {
      const element = elements[0];
      const datasetIndex = element.datasetIndex;
      const index = element.index;
      
      // Récupérer le point cliqué
      const serie = series[datasetIndex];
      const point = serie.data[index];
      
      // Trouver la mesure correspondante
      const mesureTrouvee = mesures.find(m => {
        const xVal = m.mesures[config.axe_x];
        const yVal = m.mesures[config.axe_y];
        return Math.abs((xVal as number) - point.x) < 0.001 && 
               Math.abs((yVal as number) - point.y) < 0.001;
      });

      if (mesureTrouvee) {
        // Vérifier si l'utilisateur peut modifier cette mesure
        const peutModifier = userType === 'employee' || 
                            (userType === 'student' && mesureTrouvee.eleve_matricule === userId);

        if (peutModifier) {
          setSelectedPoint(mesureTrouvee);
          
          // Calculer la position du menu
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
        title: {
          display: true,
          text: xCol ? `${xCol.nom} (${xCol.unite})` : 'X'
        },
        beginAtZero: true
      },
      y: {
        title: {
          display: true,
          text: yCol ? `${yCol.nom} (${yCol.unite})` : 'Y'
        },
        beginAtZero: true,
        min: 0,
        max: yMinMax.max,
        suggestedMin: 0,
        suggestedMax: yMinMax.max
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{config.nom}</h3>
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-center">
            {mesures.length === 0 
              ? "En attente de données..." 
              : "Pas assez de points pour afficher le graphique (minimum 2 points par série)"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 relative">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{config.nom}</h3>
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
        {mesures.length} point{mesures.length > 1 ? 's' : ''} de mesure
        {userType === 'employee' && (
          <span className="ml-2 text-xs text-gray-400">
            (cliquez sur un point pour le modifier)
          </span>
        )}
      </div>
    </div>
  );
}