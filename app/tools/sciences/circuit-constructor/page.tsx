// /app/tools/sciences/circuit-constructor/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { solveCircuit } from '@/lib/circuitSolver';

// Types pour nos composants
type ComponentType = 'battery' | 'resistor' | 'ammeter' | 'voltmeter' | 'wattmeter' | 'energymeter';


interface Battery {
  id: string;
  type: 'battery';
  x: number;
  y: number;
  voltage: number;
}

interface Resistor {
  id: string;
  type: 'resistor';
  x: number;
  y: number;
  resistance: number;
}

interface Terminal {
  id: string;
  componentId: string;
  type: 'positive' | 'negative' | 'left' | 'right';
  x: number;  // Position absolue calculée
  y: number;
}

interface Wire {
  id: string;
  fromTerminalId: string;
  toTerminalId: string;
  fromComponentId: string;
  toComponentId: string;
}

interface Ammeter {
  id: string;
  type: 'ammeter';
  x: number;
  y: number;
  value?: number;
}

interface Voltmeter {
  id: string;
  type: 'voltmeter';
  x: number;
  y: number;
  value?: number;
}

interface Wattmeter {
  id: string;
  type: 'wattmeter';
  x: number;
  y: number;
  value?: number;
}

interface EnergyMeter {
  id: string;
  type: 'energymeter';
  x: number;
  y: number;
  value?: number;
}

// Fonction pour remplacer les points par des virgules
const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals).replace('.', ',');
};

// Composant canvas chargé dynamiquement
const CircuitCanvas = dynamic(
  () => import('@/components/applets/circuit-constructor/CircuitCanvas').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 w-full h-[500px] flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement du canvas...</p>
      </div>
    )
  }
);

const CircuitConstructorPage = () => {
  const [components, setComponents] = useState<(Battery | Resistor | Ammeter | Voltmeter | Wattmeter | EnergyMeter)[]>([
    { id: 'default-battery', type: 'battery', x: 50, y: 150, voltage: 230 },
    { id: 'default-resistor', type: 'resistor', x: 200, y: 150, resistance: 100 },
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);
  const [solvedData, setSolvedData] = useState<any>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [mode, setMode] = useState<'component' | 'wire'>('component');
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
  const [hoveredTerminal, setHoveredTerminal] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [energyReadings, setEnergyReadings] = useState<Map<string, number>>(new Map());
  const [isDragging, setIsDragging] = useState(false);

  // Gestion des fils et bornes
  const handleTerminalClick = (terminalId: string, componentId: string) => {
    if (mode !== 'wire') return;
    
    if (!selectedTerminal) {
      // Premier terminal sélectionné
      setSelectedTerminal(terminalId);
    } else {
      // Deuxième terminal sélectionné
      if (selectedTerminal === terminalId) {
        // Même terminal : annuler la sélection
        setSelectedTerminal(null);
      } else {
        // Vérifier si un fil existe déjà entre ces deux bornes
        const existingWire = wires.find((w: any) => 
          (w.fromTerminalId === selectedTerminal && w.toTerminalId === terminalId) ||
          (w.fromTerminalId === terminalId && w.toTerminalId === selectedTerminal)
        );
        
        if (existingWire) {
          // Si le fil existe, le supprimer
          setWires(wires.filter((w: any) => w.id !== existingWire.id));
        } else {
          // Sinon, créer un nouveau fil
          const newWire = {
            id: `wire-${Date.now()}-${Math.random()}`,
            fromTerminalId: selectedTerminal,
            toTerminalId: terminalId,
            fromComponentId: components.find((c: any) => 
              getTerminals(c).some((t: any) => t.id === selectedTerminal)
            )?.id || '',
            toComponentId: componentId,
          };
          setWires([...wires, newWire]);
        }
      }
      setSelectedTerminal(null);
    }
  };

  const handleTerminalHover = (terminalId: string | null) => {
    setHoveredTerminal(terminalId);
  };

  // Fonction pour calculer la position des bornes
  const getTerminals = (comp: any) => {
    if (comp.type === 'resistor') {
      // Résistance : bornes à gauche et à droite, centrées verticalement
      return [
        {
          id: `${comp.id}-left`,
          componentId: comp.id,
          type: 'left',
          x: comp.x,  // Extrémité gauche
          y: comp.y + 15,   // Centre vertical du composant
        },
        {
          id: `${comp.id}-right`,
          componentId: comp.id,
          type: 'right',
          x: comp.x + 80,   // Extrémité droite
          y: comp.y + 15,   // Centre vertical du composant
        },
      ];
    } else if (comp.type === 'battery') {
      // Pile : bornes à gauche et à droite, centrées verticalement
      return [
        {
          id: `${comp.id}-negative`,
          componentId: comp.id,
          type: 'negative',
          x: comp.x - 0,   // Côté négatif (noir)
          y: comp.y + 20,   // Centre vertical
        },
        {
          id: `${comp.id}-positive`,
          componentId: comp.id,
          type: 'positive',
          x: comp.x + 68,   // Côté positif (cuivre)
          y: comp.y + 20,   // Centre vertical
        },
      ];
    } else if (comp.type === 'ammeter' || comp.type === 'voltmeter') {
      // Ampèremètre/Voltmètre : bornes à gauche et à droite, centrées
      return [
        {
          id: `${comp.id}-in`,
          componentId: comp.id,
          type: 'in',
          x: comp.x - 52,
          y: comp.y,
        },
        {
          id: `${comp.id}-out`,
          componentId: comp.id,
          type: 'out',
          x: comp.x + 52,
          y: comp.y,
        },
      ];
    } else if (comp.type === 'wattmeter') {
      // Wattmètre : 4 bornes aux 4 coins
      return [
        {
          id: `${comp.id}-vplus`,
          componentId: comp.id,
          type: 'vplus',
          x: comp.x,        // Coin haut-gauche
          y: comp.y ,
        },
        {
          id: `${comp.id}-vminus`,
          componentId: comp.id,
          type: 'vminus',
          x: comp.x + 100,   // Coin haut-droit
          y: comp.y,
        },
        {
          id: `${comp.id}-iplus`,
          componentId: comp.id,
          type: 'iplus',
          x: comp.x,        // Coin bas-gauche
          y: comp.y + 100,
        },
        {
          id: `${comp.id}-iminus`,
          componentId: comp.id,
          type: 'iminus',
          x: comp.x + 100,   // Coin bas-droit
          y: comp.y + 100,
        },
      ];
    } else if (comp.type === 'energymeter') {
      return [
        {
          id: `${comp.id}-vplus`,
          componentId: comp.id,
          type: 'vplus',
          x: comp.x,
          y: comp.y,
        },
        {
          id: `${comp.id}-vminus`,
          componentId: comp.id,
          type: 'vminus',
          x: comp.x + 100,
          y: comp.y,
        },
        {
          id: `${comp.id}-iplus`,
          componentId: comp.id,
          type: 'iplus',
          x: comp.x,
          y: comp.y + 100,
        },
        {
          id: `${comp.id}-iminus`,
          componentId: comp.id,
          type: 'iminus',
          x: comp.x + 100,
          y: comp.y + 100,
        },
      ];
    }
    return [];
  };


  // Fonction pour déterminer si un terminal est une borne de tension
  const isVoltageBorne = (terminalId: string): boolean => {
    // Bornes de tension des wattmètres et energymètres
    if (terminalId.includes('-vplus') || terminalId.includes('-vminus')) {
      return true;
    }
    
    // Bornes des voltmètres (vérifier si le composant est un voltmètre)
    const comp = components.find(c => terminalId.startsWith(c.id));
    if (comp && comp.type === 'voltmeter') {
      return true;
    }
    
    return false;
  };

  // Fonction pour déterminer la couleur d'un fil
  const getWireColor = (fromTerminalId: string, toTerminalId: string): string => {
    // Si les deux bornes sont des bornes de tension
    if (isVoltageBorne(fromTerminalId) && isVoltageBorne(toTerminalId)) {
      // Rouge pour vplus ou voltmeter-in
      if (fromTerminalId.includes('-vplus') || fromTerminalId.includes('-in')) {
        return '#FF0000';
      } else {
        return '#000000';
      }
    }
    // Sinon, fil bleu par défaut (courant)
    return '#0066CC';
  };

  // Ajuster la largeur du canvas à la fenêtre
  useEffect(() => {
    setStageWidth(window.innerWidth - 100);
    const handleResize = () => setStageWidth(window.innerWidth - 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

    useEffect(() => {
    // Calcul simplifié pour l'affichage
    if (components.length > 0) {
      const solution = solveCircuit(components, wires);
      setSolvedData(solution);
    } else {
      setSolvedData(null);
    }
  }, [components, wires]);

  // Ajouter un composant
  const addComponent = (type: ComponentType) => {
    const newComponent = {
      id: `comp-${Date.now()}-${Math.random()}`,
      type,
      x: 200,
      y: 200,
      ...(type === 'battery' && { voltage: 9 }),
      ...(type === 'resistor' && { resistance: 1000 }),
      ...(type === 'ammeter' && { value: 0 }),
      ...(type === 'voltmeter' && { value: 0 }),
      ...(type === 'wattmeter' && { value: 0 }),
      ...(type === 'energymeter' && { value: 0 }),
    } as any;
    setComponents([...components, newComponent]);
    
    // Désactiver le mode fil et annuler toute sélection de borne
    setMode('component');
    setSelectedTerminal(null);
  };

  // Mettre à jour la position après drag
  const handleComponentDrag = (id: string, x: number, y: number) => {
    setIsDragging(true);
    setComponents(components.map(c => c.id === id ? { ...c, x, y } : c));
  };

  // Sélectionner un composant
  const handleComponentClick = (id: string) => {
    if (!isDragging) {
      setSelectedComponentId(id);
    }
    setTimeout(() => setIsDragging(false), 100);
  };

  // Mettre à jour une propriété
  const updateProperty = (id: string, property: string, value: number) => {
    setComponents(components.map(comp =>
      comp.id === id ? { ...comp, [property]: value } : comp
    ));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTimeElapsed(0);
    setTotalEnergy(0);
    setEnergyReadings(new Map()); // Reset tous les compteurs d'énergie
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 0.1);
        
        // Calculer l'énergie totale du circuit (pour l'affichage global)
        let totalPower = 0;
        components.forEach(comp => {
          if (comp.type === 'resistor') {
            const current = solvedData?.componentCurrents.get(comp.id) || 0;
            totalPower += comp.resistance * current * current;
          }
        });
        setTotalEnergy(prev => prev + (totalPower * (0.1 / 3600))); // Convertir en Wh
        
        // Mettre à jour les compteurs d'énergie individuels
        components.forEach(comp => {
          if (comp.type === 'energymeter') {
            const powerWatts = solvedData?.powerReadings.get(comp.id) || 0;
            const deltaTime = 0.1; // secondes
            const energyJoules = powerWatts * deltaTime; // Joules = Watts × secondes
            const energyWh = energyJoules / 3600; // Convertir en Watt-heures
            
            setEnergyReadings(prev => {
              const newMap = new Map(prev);
              const currentEnergy = newMap.get(comp.id) || 0;
              newMap.set(comp.id, currentEnergy + energyWh);
              return newMap;
            });
          }
        });
      }, 100);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, components, solvedData]);


  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">⚡ Constructeur de Circuits</h1>
      
      {/* Barre d'outils */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button 
          onClick={() => addComponent('battery')} 
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-4 py-2 rounded flex items-center gap-2 shadow-md"
        >
          <span>🔋</span> Ajouter Pile
        </button>
        
        <button 
          onClick={() => addComponent('resistor')} 
          className="bg-[#F4E4C1] hover:bg-[#E8D4A8] text-gray-800 px-4 py-2 rounded flex items-center gap-2 shadow-md border-2 border-gray-800"
        >
          <span>〓</span> Ajouter Résistance
        </button>
        
        <button 
          onClick={() => { setMode(mode === 'wire' ? 'component' : 'wire'); setSelectedTerminal(null); }} 
          className={`px-4 py-2 rounded flex items-center gap-2 shadow-md ${
            mode === 'wire' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <span>🔌</span> {mode === 'wire' ? 'Mode Fil (actif)' : 'Mode Fil'}
        </button>
        
        <button 
          onClick={() => addComponent('ammeter')} 
          className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-4 py-2 rounded flex items-center gap-2 shadow-md"
        >
          <span>⏚</span> Ampèremètre
        </button>
        
        <button 
          onClick={() => addComponent('voltmeter')} 
          className="bg-[#009933] hover:bg-[#007A29] text-white px-4 py-2 rounded flex items-center gap-2 shadow-md"
        >
          <span>📏</span> Voltmètre
        </button>
        
        <button 
          onClick={() => addComponent('wattmeter')} 
          className="bg-[#993399] hover:bg-[#7A297A] text-white px-4 py-2 rounded flex items-center gap-2 shadow-md"
        >
          <span>📊</span> Wattmètre
        </button>
        
        <button 
          onClick={() => addComponent('energymeter')} 
          className="bg-[#FF6600] hover:bg-[#E55A00] text-white px-4 py-2 rounded flex items-center gap-2 shadow-md"
        >
          <span>🔋</span> Compteur Énergie
        </button>
      </div>

      {/* Légende des couleurs */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#0066CC] rounded"></div>
          <span>Ampèremètre (bleu) : mesure I</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#009933] rounded"></div>
          <span>Voltmètre (vert) : mesure V</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#993399] rounded"></div>
          <span>Wattmètre (violet) : mesure P</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#FF6600] rounded"></div>
          <span>Compteur (orange) : mesure kWh</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-bold">⚠️</span>
          <span>Mode fil: cliquer les bornes</span>
        </div>
      </div>

      {/* Panneau de contrôle */}
      <div className="mb-4 bg-gray-100 p-4 rounded-lg flex items-center gap-6">
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button onClick={handleReset} className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white">
          🔄 Reset
        </button>
        <div className="flex gap-4">
          <div className="bg-white px-3 py-1 rounded shadow">
            <span className="text-gray-600">Temps:</span>{' '}
            <span className="font-mono font-bold">{formatNumber(timeElapsed, 1)} s</span>
          </div>
          <div className="bg-white px-3 py-1 rounded shadow">
            <span className="text-gray-600">Énergie:</span>{' '}
            <span className="font-mono font-bold">{formatNumber(totalEnergy, 6)} Wh</span>
          </div>
        </div>
      </div>

      {/* Zone de dessin */}
      <CircuitCanvas
        components={components}
        wires={wires}
        energyReadings={energyReadings} 
        onComponentDrag={handleComponentDrag}
        getWireColor={getWireColor}
        onComponentClick={handleComponentClick}
        onTerminalClick={handleTerminalClick}
        onTerminalHover={handleTerminalHover}
        stageWidth={stageWidth}
        mode={mode}
        selectedTerminal={selectedTerminal}
        hoveredTerminal={hoveredTerminal}
      />

      {/* Indication */}
      {components.length > 0 && !selectedComponentId && (
        <div className="mt-4 p-2 bg-blue-50 text-blue-700 rounded text-center text-sm">
          💡 Cliquez sur un composant pour modifier ses propriétés
        </div>
      )}

      {/* Panneau de propriétés */}
      {selectedComponentId && (
        <div className="mt-4 p-4 border rounded-lg bg-white shadow fixed bottom-4 right-4 w-80">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Propriétés</h2>
            <button 
              onClick={() => setSelectedComponentId(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {components.find(c => c.id === selectedComponentId)?.type === 'resistor' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="font-medium w-24">Résistance:</label>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={(components.find(c => c.id === selectedComponentId) as any)?.resistance || 0}
                    onChange={(e) => updateProperty(selectedComponentId, 'resistance', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="100"
                    value={(components.find(c => c.id === selectedComponentId) as any)?.resistance || 0}
                    onChange={(e) => updateProperty(selectedComponentId, 'resistance', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border rounded font-mono text-right"
                  />
                  <span className="font-mono">Ω</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Valeur: 0 à 100 kΩ</p>
            </div>
          )}
          
          {components.find(c => c.id === selectedComponentId)?.type === 'battery' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="font-medium w-24">Tension:</label>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="250"
                    step="1"
                    value={(components.find(c => c.id === selectedComponentId) as any)?.voltage || 0}
                    onChange={(e) => updateProperty(selectedComponentId, 'voltage', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="0"
                    max="250"
                    step="1"
                    value={(components.find(c => c.id === selectedComponentId) as any)?.voltage || 0}
                    onChange={(e) => updateProperty(selectedComponentId, 'voltage', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border rounded font-mono text-right"
                  />
                  <span className="font-mono">V</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Valeur: 0 à 250 V</p>
            </div>
          )}

        </div>
      )}


    </div>
  );
};

export default CircuitConstructorPage;