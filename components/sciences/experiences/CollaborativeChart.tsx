// components/sciences/CollaborativeChart.tsx
'use client';

import { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController,
  BarController,
  PieController,
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
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController,
  BarController,
  PieController
);

interface Colonne {
  nom: string;
  unite: string;
}

interface Tableau {
  nom: string;
  colonnes: Colonne[];
}

interface Graphique {
  nom: string;
  type: 'scatter' | 'line' | 'bar' | 'pie';
  tableau_source: number;
  series: {
    nom: string;
    x_colonne: string;
    y_colonne: string;
  }[];
}

interface Mesure {
  mesures: Record<string, number | null>;
  eleve?: {
    nom: string;
    prenom: string;
  };
}

interface CollaborativeChartProps {
  graphique: Graphique;
  tableau: Tableau;
  mesures: Mesure[];
}

export default function CollaborativeChart({ graphique, tableau, mesures }: CollaborativeChartProps) {
  const chartRef = useRef<ChartJS>(null);

  // UNE SEULE déclaration de options, avec le typage correct
  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: graphique.nom
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<any>) => {
            if (graphique.type === 'pie') {
              return `${context.label}: ${context.raw} mesures`;
            } else {
              const dataset = context.dataset;
              const dataPoint = context.raw as any;
              
              if (graphique.type === 'scatter') {
                return `${dataset.label}: (${dataPoint.x}, ${dataPoint.y})`;
              } else {
                const serie = graphique.series[context.datasetIndex];
                const yCol = tableau.colonnes.find(c => c.nom === serie?.y_colonne);
                return `${serie?.nom}: ${context.raw} ${yCol?.unite || ''}`;
              }
            }
          }
        }
      }
    },
    scales: graphique.type !== 'pie' ? {
      x: {
        title: {
          display: true,
          text: graphique.series[0]?.x_colonne || 'X'
        }
      },
      y: {
        title: {
          display: true,
          text: graphique.series[0]?.y_colonne || 'Y'
        },
        beginAtZero: true
      }
    } : undefined
  };

  // Préparer les données pour le graphique
  const prepareData = (): ChartData => {
    if (graphique.type === 'pie') {
      // Pour un camembert, on utilise la première série
      const serie = graphique.series[0];
      if (!serie) return { datasets: [] };

      // Compter les occurrences des valeurs Y
      const counts: Record<string, number> = {};
      mesures.forEach(mesure => {
        const valeur = mesure.mesures[serie.y_colonne];
        if (valeur !== null && valeur !== undefined) {
          const key = valeur.toString();
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      return {
        labels: Object.keys(counts),
        datasets: [{
          label: serie.nom,
          data: Object.values(counts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
          ]
        }]
      };
    } else {
      // Pour scatter, line, bar
      const datasets = graphique.series.map((serie, index) => {
        const points = mesures
          .map(mesure => ({
            x: mesure.mesures[serie.x_colonne],
            y: mesure.mesures[serie.y_colonne]
          }))
          .filter(point => point.x !== null && point.x !== undefined && point.y !== null && point.y !== undefined);

        // Couleurs différentes pour chaque série
        const colors = [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
        ];

        if (graphique.type === 'scatter') {
          return {
            label: serie.nom,
            data: points,
            backgroundColor: colors[index % colors.length],
            showLine: false
          };
        } else {
          // Pour line et bar, on trie par x
          points.sort((a, b) => (a.x as number) - (b.x as number));
          
          return {
            label: serie.nom,
            data: points.map(p => p.y),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            tension: 0.1
          };
        }
      });

      // Pour line et bar, on a besoin des labels X
      if (graphique.type !== 'scatter') {
        const firstSerie = graphique.series[0];
        const xValues = mesures
          .map(m => m.mesures[firstSerie.x_colonne])
          .filter((v, i, a) => v !== null && v !== undefined && a.indexOf(v) === i)
          .sort((a, b) => (a as number) - (b as number));

        return {
          labels: xValues.map(v => v?.toString()),
          datasets
        };
      }

      return { datasets };
    }
  };

  if (mesures.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphique.nom}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          En attente de données...
        </div>
      </div>
    );
  }

  const data = prepareData();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphique.nom}</h3>
      <div className="h-96">
        <Chart
          ref={chartRef}
          type={graphique.type}
          data={data}
          options={options}
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        {mesures.length} point{mesures.length > 1 ? 's' : ''} de mesure
      </div>
    </div>
  );
}