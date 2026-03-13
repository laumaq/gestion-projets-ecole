// /components/applets/circuit-constructor/CircuitCanvas.tsx

"use client";

import React from 'react';
import { Stage, Layer, Group, Rect, Text, Circle, Line } from 'react-konva';

// ============================================================================
// FONCTIONS DE FORMATAGE DES UNITÉS
// ============================================================================

const formatCurrent = (amperes: number): string => {
  if (amperes === 0) return '0 A';
  const abs = Math.abs(amperes);
  if (abs >= 1) return `${amperes.toFixed(3).replace('.', ',')} A`;
  if (abs >= 0.001) return `${(amperes * 1000).toFixed(2).replace('.', ',')} mA`;
  if (abs >= 0.000001) return `${(amperes * 1000000).toFixed(2).replace('.', ',')} µA`;
  return `${(amperes * 1000000000).toFixed(2).replace('.', ',')} nA`;
};

const formatVoltage = (volts: number): string => {
  if (volts === 0) return '0 V';
  const abs = Math.abs(volts);
  if (abs >= 1000) return `${(volts / 1000).toFixed(2).replace('.', ',')} kV`;
  if (abs >= 1) return `${volts.toFixed(2).replace('.', ',')} V`;
  if (abs >= 0.001) return `${(volts * 1000).toFixed(2).replace('.', ',')} mV`;
  return `${(volts * 1000000).toFixed(2).replace('.', ',')} µV`;
};

const formatPower = (watts: number): string => {
  if (watts === 0) return '0 W';
  const abs = Math.abs(watts);
  if (abs >= 1000) return `${(watts / 1000).toFixed(2).replace('.', ',')} kW`;
  if (abs >= 1) return `${watts.toFixed(3).replace('.', ',')} W`;
  if (abs >= 0.001) return `${(watts * 1000).toFixed(2).replace('.', ',')} mW`;
  if (abs >= 0.000001) return `${(watts * 1000000).toFixed(2).replace('.', ',')} µW`;
  return `${(watts * 1000000000).toFixed(2).replace('.', ',')} nW`;
};

const formatEnergy = (wattHours: number): string => {
  if (wattHours === 0) return '0 Wh';
  const abs = Math.abs(wattHours);
  if (abs >= 1000) return `${(wattHours / 1000).toFixed(3).replace('.', ',')} kWh`;
  if (abs >= 1) return `${wattHours.toFixed(4).replace('.', ',')} Wh`;
  if (abs >= 0.001) return `${(wattHours * 1000).toFixed(3).replace('.', ',')} mWh`;
  return `${(wattHours * 1000000).toFixed(2).replace('.', ',')} µWh`;
};

// ============================================================================
// INTERFACE
// ============================================================================

interface CircuitCanvasProps {
  components: any[];
  wires: any[];
  energyReadings?: Map<string, number>;  // ← AJOUTÉ
  getWireColor?: (fromTerminalId: string, toTerminalId: string) => string;  // ← AJOUTÉ
  onComponentDrag: (id: string, x: number, y: number) => void;
  onComponentClick: (id: string) => void;
  onTerminalClick: (terminalId: string, componentId: string) => void;
  onTerminalHover: (terminalId: string | null) => void;
  stageWidth: number;
  mode: 'component' | 'wire';
  selectedTerminal: string | null;
  hoveredTerminal: string | null;
}

const CircuitCanvas: React.FC<CircuitCanvasProps> = (props) => {
  const {
    components,
    wires,
    energyReadings,  // ← AJOUTÉ
    getWireColor,  // ← AJOUTÉ
    onComponentDrag,
    onComponentClick,
    onTerminalClick,
    onTerminalHover,
    stageWidth,
    mode,
    selectedTerminal,
    hoveredTerminal,
  } = props;

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

  // Dessiner les fils
  const drawWires = () => {
    return wires.map((wire: any) => {
      // Trouver les positions des bornes
      let fromPos: any = null;
      let toPos: any = null;
      
      (components as any[]).forEach((comp: any) => {
        const terminals = getTerminals(comp);
        (terminals as any[]).forEach((term: any) => {
          if (term.id === wire.fromTerminalId) fromPos = term;
          if (term.id === wire.toTerminalId) toPos = term;
        });
      });
      
      if (!fromPos || !toPos) return null;
      
      // Déterminer la couleur du fil
      const wireColor = getWireColor 
        ? getWireColor(wire.fromTerminalId, wire.toTerminalId)
        : '#0066CC'; // Bleu par défaut si pas de fonction fournie
      
      return (
        <Line
          key={wire.id}
          points={[fromPos.x, fromPos.y, toPos.x, toPos.y]}
          stroke={wireColor}
          strokeWidth={3}
          lineCap="round"
        />
      );
    });
  };

  return (
    <Stage width={stageWidth} height={500} className="border border-gray-300 bg-white">
      <Layer>
        {/* Grille */}
        <Group>
          {Array.from({ length: 20 }).map((_, i) => (
            <React.Fragment key={`grid-${i}`}>
              <Rect
                x={i * 50}
                y={0}
                width={1}
                height={500}
                fill="#eee"
                listening={false}
              />
              <Rect
                x={0}
                y={i * 50}
                width={stageWidth}
                height={1}
                fill="#eee"
                listening={false}
              />
            </React.Fragment>
          ))}
        </Group>

        {/* Fils */}
        {drawWires()}

        {/* Composants */}
        {(components as any[]).map((comp: any) => {
          return (
            <Group
              key={comp.id}
              x={comp.x}
              y={comp.y}
              draggable={mode === 'component'}
              onDragEnd={(e) => {
                const node = e.target;
                onComponentDrag(comp.id, node.x(), node.y());
              }}
              onClick={() => onComponentClick(comp.id)}
            >

            {/* Pile - Style Duracell réaliste */}
            {comp.type === 'battery' && (
              <>
                {/* Corps principal */}
                <Rect
                  width={60}
                  height={40}
                  x={0}
                  y={0}
                  fill="#FFD700"  // Or/cuivre pour le côté positif
                  stroke="#333"
                  strokeWidth={2}
                  cornerRadius={8}
                />
                
                {/* Partie noire (côté négatif) - 3/4 de la pile */}
                <Rect
                  width={45}
                  height={40}
                  x={0}
                  y={0}
                  fill="#222"
                  cornerRadius={[8, 0, 0, 8]}  // Coins arrondis seulement à gauche
                />
                
                {/* Séparation entre noir et cuivre */}
                <Line
                  points={[45, 5, 45, 35]}
                  stroke="#FFD700"
                  strokeWidth={3}
                />
                
                {/* Borne positive (petit bout gris) */}
                <Rect
                  width={8}
                  height={12}
                  x={60}
                  y={14}
                  fill="#C0C0C0"
                  stroke="#333"
                  strokeWidth={1}
                  cornerRadius={2}
                />
                
               
                {/* Symbole - côté noir */}
                <Text
                  text="−"
                  x={10}
                  y={5}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#FFD700"
                />

                {/* Symbole + côté cuivré */}
                <Text
                  text="+"
                  x={46}
                  y={5}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#000000"
                />
                
                {/* Valeur de tension */}
                <Text
                  text={`${comp.voltage}V`}
                  x={15}
                  y={-15}
                  fontSize={12}
                  fontStyle="bold"
                  fill="#333"
                  background="white"
                  padding={2}
                />
              </>
            )}


            {/* Résistance - Style pédagogique */}
            {comp.type === 'resistor' && (
              <>
                {/* Corps rectangulaire */}
                <Rect
                  width={80}
                  height={30}
                  x={0}
                  y={0}
                  fill="#F4E4C1"  // Beige
                  stroke="#333"
                  strokeWidth={2}
                  cornerRadius={5}
                />
                
                {/* Zigzag central (symbole résistance) */}
                <Line
                  points={[10, 15, 20, 5, 30, 25, 40, 5, 50, 25, 60, 15, 70, 15]}
                  stroke="#333"
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                />
                
                {/* Trait de connexion gauche */}
                <Line
                  points={[0, 15, 10, 15]}
                  stroke="#333"
                  strokeWidth={3}
                />
                
                {/* Trait de connexion droit */}
                <Line
                  points={[70, 15, 80, 15]}
                  stroke="#333"
                  strokeWidth={3}
                />
                
                {/* Valeur en dessous */}
                <Text
                  text={`${comp.resistance} Ω`}
                  x={25}
                  y={35}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#333"
                />
              </>
            )}


            {/* Ampèremètre - Bleu */}
            {comp.type === 'ammeter' && (
              <>
                <Circle
                  x={0}
                  y={0}
                  radius={50}  // Encore plus grand
                  fill="#0066CC"
                  stroke="#333"
                  strokeWidth={3}
                />
                <Circle
                  x={0}
                  y={0}
                  radius={42}  // Plus grand
                  fill="#FFFFFF"
                  stroke="#333"
                  strokeWidth={2}
                />
                <Text
                  text="A"
                  x={-15}  // Centré
                  y={-30}  // Centré
                  fontSize={42}  // ÉNORME
                  fontStyle="bold"
                  fill="#0066CC"
                />
                {/* ← MODIFIÉ : Utilise formatCurrent */}
                <Text
                  text={formatCurrent(comp.value || 0)}
                  x={-28}
                  y={15}
                  fontSize={16}
                  fill="#333"
                />
                {/* Indications branchement */}
                <Text text="I →" x={-80} y={-7} fontSize={14} fill="#333" />
                <Text text="→ I" x={58} y={-7} fontSize={14} fill="#333" />
              </>
            )}

            {/* Voltmètre - Vert */}
            {comp.type === 'voltmeter' && (
              <>
                <Circle
                  x={0}
                  y={0}
                  radius={50}
                  fill="#009933"
                  stroke="#333"
                  strokeWidth={3}
                />
                <Circle
                  x={0}
                  y={0}
                  radius={42}
                  fill="#FFFFFF"
                  stroke="#333"
                  strokeWidth={2}
                />
                <Text
                  text="V"
                  x={-13}
                  y={-30}
                  fontSize={42}
                  fontStyle="bold"
                  fill="#009933"
                />
                {/* ← MODIFIÉ : Utilise formatVoltage */}
                <Text
                  text={formatVoltage(comp.value || 0)}
                  x={-25}
                  y={15}
                  fontSize={16}
                  fill="#333"
                />
              </>
            )}

            {/* Wattmètre - Violet */}
            {comp.type === 'wattmeter' && (
              <>
                <Rect
                  width={100}  // 100x100
                  height={100}
                  x={0}
                  y={0}
                  fill="#993399"
                  stroke="#333"
                  strokeWidth={3}
                  cornerRadius={8}
                />
                <Rect
                  width={88}
                  height={88}
                  x={6}
                  y={6}
                  fill="#FFFFFF"
                  stroke="#333"
                  strokeWidth={2}
                  cornerRadius={5}
                />
                <Text
                  text="W"
                  x={30}  // Centré
                  y={20}  // Centré
                  fontSize={42}
                  fontStyle="bold"
                  fill="#993399"
                />
                {/* ← MODIFIÉ : Utilise formatPower */}
                <Text
                  text={formatPower(comp.value || 0)}
                  x={10}
                  y={65}
                  fontSize={15}
                  fill="#333"
                />
                <Text text="U+" x={0} y={-20} fontSize={14} fill="#000000" />
                <Text text="U-" x={85} y={-20} fontSize={14} fill="#000000" />
                <Text text="I →" x={0} y={105} fontSize={14} fill="#000000" />
                <Text text="→ I" x={85} y={105} fontSize={14} fill="#000000" />
              </>
            )}

            {/* Compteur d'énergie - Orange - DOUBLE AFFICHAGE */}
            {comp.type === 'energymeter' && (
              <>
                <Rect
                  width={100}
                  height={100}
                  x={0}
                  y={0}
                  fill="#FF6600"
                  stroke="#333"
                  strokeWidth={3}
                  cornerRadius={8}
                />
                <Rect
                  width={88}
                  height={88}
                  x={6}
                  y={6}
                  fill="#FFFFFF"
                  stroke="#333"
                  strokeWidth={2}
                  cornerRadius={5}
                />
                <Text
                  text="kWh"
                  x={20}
                  y={10}
                  fontSize={28}
                  fontStyle="bold"
                  fill="#FF6600"
                />
                {/* ← MODIFIÉ : LIGNE 1 - Puissance instantanée */}
                <Text
                  text={formatPower(comp.value || 0)}
                  x={8}
                  y={48}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#333"
                />
                {/* ← MODIFIÉ : LIGNE 2 - Énergie accumulée */}
                <Text
                  text={formatEnergy(energyReadings?.get(comp.id) || 0)}
                  x={8}
                  y={68}
                  fontSize={14}
                  fill="#FF6600"
                />
                <Text text="U+" x={0} y={-20} fontSize={14} fill="#000000" />
                <Text text="U-" x={85} y={-20} fontSize={14} fill="#000000" />
                <Text text="I →" x={0} y={105} fontSize={14} fill="#000000" />
                <Text text="→ I" x={85} y={105} fontSize={14} fill="#000000" />
              </>
            )}

            </Group>
          );
        })}

        {/* Bornes (dessinées séparément pour être interactives) */}
        {(components as any[]).map((comp: any) => {
          const terminals = getTerminals(comp);
          
          return (terminals as any[]).map((term: any) => {
            const isSelected =  selectedTerminal === term.id;
            const isHovered = hoveredTerminal === term.id;
            
            // Rendre les bornes toujours visibles et cliquables en mode fil
            return (
              <Circle
                key={term.id}
                x={term.x}
                y={term.y}
                radius={mode === 'wire' ? (isSelected ? 10 : (isHovered ? 9 : 8)) : 4}
                fill={
                  mode === 'wire' 
                    ? (isSelected ? '#ffaa00' : (isHovered ? '#66ccff' : '#ff4444'))
                    : '#999'
                }
                stroke="#333"
                strokeWidth={2}
                onClick={() => onTerminalClick(term.id, comp.id)}
                onMouseEnter={() => onTerminalHover(term.id)}
                onMouseLeave={() => onTerminalHover(null)}
              />
            );
          });
        })}

      </Layer>
    </Stage>
  );
};

export default CircuitCanvas;