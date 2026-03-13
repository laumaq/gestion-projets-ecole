// Circuit Solver avec support complet des instruments de mesure
// Modified Nodal Analysis (MNA) avec wattmètres et compteurs d'énergie

export interface CircuitNode {
  id: number;
  terminalIds: string[];
}

export interface SolvedCircuit {
  nodeVoltages: Map<number, number>;
  componentCurrents: Map<string, number>;
  componentVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  powerReadings: Map<string, number>; // Pour wattmètres
}

interface Component {
  id: string;
  type: string;
  voltage?: number;
  resistance?: number;
  value?: number;
}

interface Wire {
  id: string;
  fromTerminalId: string;
  toTerminalId: string;
  fromComponentId: string;
  toComponentId: string;
}

/**
 * Résout un système linéaire Ax = b par élimination de Gauss avec pivotage partiel
 */
const solveLinearSystem = (A: number[][], b: number[]): number[] => {
  const n = A.length;
  if (n === 0) return [];
  
  // Créer la matrice augmentée [A|b]
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  // Élimination de Gauss avec pivotage partiel
  for (let col = 0; col < n; col++) {
    // Trouver le pivot (plus grande valeur en valeur absolue)
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    
    // Échanger les lignes
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
    
    // Vérifier si le pivot est proche de zéro
    if (Math.abs(augmented[col][col]) < 1e-12) {
      continue; // Système singulier ou dégénéré
    }
    
    // Normaliser la ligne du pivot
    const pivot = augmented[col][col];
    for (let j = col; j <= n; j++) {
      augmented[col][j] /= pivot;
    }
    
    // Éliminer la colonne pour les autres lignes
    for (let row = 0; row < n; row++) {
      if (row !== col && Math.abs(augmented[row][col]) > 1e-12) {
        const factor = augmented[row][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
  }
  
  // Extraire la solution
  return augmented.map(row => row[n] || 0);
};

/**
 * Construit le graphe de connectivité des terminaux
 */
const buildTerminalGraph = (wires: Wire[]): Map<string, string[]> => {
  const graph = new Map<string, string[]>();
  
  wires.forEach(wire => {
    if (!graph.has(wire.fromTerminalId)) {
      graph.set(wire.fromTerminalId, []);
    }
    if (!graph.has(wire.toTerminalId)) {
      graph.set(wire.toTerminalId, []);
    }
    
    graph.get(wire.fromTerminalId)!.push(wire.toTerminalId);
    graph.get(wire.toTerminalId)!.push(wire.fromTerminalId);
  });
  
  return graph;
};

/**
 * Identifie tous les terminaux du circuit
 */
const getAllTerminals = (components: Component[]): Set<string> => {
  const terminals = new Set<string>();
  
  components.forEach(comp => {
    switch (comp.type) {
      case 'resistor':
        terminals.add(`${comp.id}-left`);
        terminals.add(`${comp.id}-right`);
        break;
      case 'battery':
        terminals.add(`${comp.id}-positive`);
        terminals.add(`${comp.id}-negative`);
        break;
      case 'ammeter':
      case 'voltmeter':
        terminals.add(`${comp.id}-in`);
        terminals.add(`${comp.id}-out`);
        break;
      case 'wattmeter':
      case 'energymeter':
        terminals.add(`${comp.id}-vplus`);
        terminals.add(`${comp.id}-vminus`);
        terminals.add(`${comp.id}-iplus`);
        terminals.add(`${comp.id}-iminus`);
        break;
    }
  });
  
  return terminals;
};

/**
 * Groupe les terminaux connectés en nœuds (DFS)
 */
const findNodes = (
  terminals: Set<string>,
  graph: Map<string, string[]>
): CircuitNode[] => {
  const visited = new Set<string>();
  const nodes: CircuitNode[] = [];
  
  const dfs = (terminalId: string, nodeId: number) => {
    if (visited.has(terminalId)) return;
    visited.add(terminalId);
    
    if (!nodes[nodeId]) {
      nodes[nodeId] = { id: nodeId, terminalIds: [] };
    }
    nodes[nodeId].terminalIds.push(terminalId);
    
    const neighbors = graph.get(terminalId) || [];
    neighbors.forEach(neighbor => dfs(neighbor, nodeId));
  };
  
  let nodeId = 0;
  terminals.forEach(terminal => {
    if (!visited.has(terminal)) {
      dfs(terminal, nodeId);
      nodeId++;
    }
  });
  
  return nodes;
};

/**
 * Résout le circuit électrique avec Modified Nodal Analysis
 * Support complet: batteries, résistances, ampèremètres, voltmètres, wattmètres, compteurs d'énergie
 */
export const solveCircuit = (
  components: Component[],
  wires: Wire[]
): SolvedCircuit => {
  const componentCurrents = new Map<string, number>();
  const componentVoltages = new Map<string, number>();
  const nodeVoltages = new Map<number, number>();
  const branchCurrents = new Map<string, number>();
  const powerReadings = new Map<string, number>();
  
  // Pas de composants = pas de solution
  if (components.length === 0) {
    return { nodeVoltages, componentCurrents, componentVoltages, branchCurrents, powerReadings };
  }
  
  // 1. Construire le graphe de connectivité
  const graph = buildTerminalGraph(wires);
  const allTerminals = getAllTerminals(components);
  
  // 2. Identifier les nœuds du circuit
  const nodes = findNodes(allTerminals, graph);
  
  // 3. Créer un mapping terminal → nœud
  const terminalToNode = new Map<string, number>();
  nodes.forEach(node => {
    node.terminalIds.forEach(termId => {
      terminalToNode.set(termId, node.id);
    });
  });
  
  // 4. Identifier les composants par type
  const batteries = components.filter(c => c.type === 'battery');
  const ammeters = components.filter(c => c.type === 'ammeter');
  const powerMeters = components.filter(c => c.type === 'wattmeter' || c.type === 'energymeter');
  
  if (batteries.length === 0) {
    // Pas de source = pas de courant
    return { nodeVoltages, componentCurrents, componentVoltages, branchCurrents, powerReadings };
  }
  
  // 5. Configuration du système MNA
  // Variables: [V₀, V₁, ..., Vₙ, I_bat₁, ..., I_amp₁, ..., I_watt₁, ...]
  const numNodes = nodes.length;
  const numVoltageSources = batteries.length;
  const numAmmeters = ammeters.length;
  const numPowerMeters = powerMeters.length;
  const totalVars = numNodes + numVoltageSources + numAmmeters + numPowerMeters;
  
  // Matrices du système
  const G = Array(totalVars).fill(0).map(() => Array(totalVars).fill(0));
  const I = Array(totalVars).fill(0);
  
  // 6. Ajouter les résistances (conductances)
  components.forEach(comp => {
    if (comp.type === 'resistor' && comp.resistance && comp.resistance > 0) {
      const leftNode = terminalToNode.get(`${comp.id}-left`);
      const rightNode = terminalToNode.get(`${comp.id}-right`);
      
      if (leftNode !== undefined && rightNode !== undefined) {
        const conductance = 1 / comp.resistance;
        
        // Matrice de conductance (stamp de résistance)
        G[leftNode][leftNode] += conductance;
        G[rightNode][rightNode] += conductance;
        G[leftNode][rightNode] -= conductance;
        G[rightNode][leftNode] -= conductance;
      }
    }
  });
  
  // 7. Ajouter les batteries (sources de tension)
  batteries.forEach((battery, idx) => {
    const posNode = terminalToNode.get(`${battery.id}-positive`);
    const negNode = terminalToNode.get(`${battery.id}-negative`);
    
    if (posNode !== undefined && negNode !== undefined && battery.voltage !== undefined) {
      const currentVarIdx = numNodes + idx;
      
      // Contrainte: V_pos - V_neg = V_battery
      G[currentVarIdx][posNode] = 1;
      G[currentVarIdx][negNode] = -1;
      I[currentVarIdx] = battery.voltage;
      
      // Équations de courant (KCL aux nœuds)
      G[posNode][currentVarIdx] = 1;
      G[negNode][currentVarIdx] = -1;
    }
  });
  
  // 8. Ajouter les ampèremètres (fils avec courant mesuré)
  ammeters.forEach((ammeter, idx) => {
    const inNode = terminalToNode.get(`${ammeter.id}-in`);
    const outNode = terminalToNode.get(`${ammeter.id}-out`);
    
    if (inNode !== undefined && outNode !== undefined) {
      const currentVarIdx = numNodes + numVoltageSources + idx;
      
      // Contrainte: V_in - V_out = 0 (fil parfait)
      G[currentVarIdx][inNode] = 1;
      G[currentVarIdx][outNode] = -1;
      I[currentVarIdx] = 0;
      
      // Équations de courant (KCL)
      G[inNode][currentVarIdx] = 1;
      G[outNode][currentVarIdx] = -1;
    }
  });
  
  // 9. Ajouter les wattmètres/compteurs d'énergie
  // Les bornes de courant (iplus/iminus) sont traitées comme des ampèremètres
  // Les bornes de tension (vplus/vminus) ont une impédance infinie (rien à ajouter)
  powerMeters.forEach((meter, idx) => {
    const iplusNode = terminalToNode.get(`${meter.id}-iplus`);
    const iminusNode = terminalToNode.get(`${meter.id}-iminus`);
    
    if (iplusNode !== undefined && iminusNode !== undefined) {
      const currentVarIdx = numNodes + numVoltageSources + numAmmeters + idx;
      
      // Contrainte: V_iplus - V_iminus = 0 (fil parfait pour le courant)
      G[currentVarIdx][iplusNode] = 1;
      G[currentVarIdx][iminusNode] = -1;
      I[currentVarIdx] = 0;
      
      // Équations de courant (KCL)
      G[iplusNode][currentVarIdx] = 1;
      G[iminusNode][currentVarIdx] = -1;
    }
    
    // Note: Les bornes vplus/vminus n'ajoutent rien à la matrice
    // (impédance infinie = pas de conductance, pas de courant)
  });
  
  // 10. Fixer le nœud de référence (masse à 0V)
  const refNode = 0;
  G[refNode] = Array(totalVars).fill(0);
  G[refNode][refNode] = 1;
  I[refNode] = 0;
  
  // 11. Résoudre le système linéaire
  const solution = solveLinearSystem(G, I);
  
  // 12. Extraire les tensions de nœud
  for (let i = 0; i < numNodes; i++) {
    nodeVoltages.set(i, solution[i] || 0);
  }
  
  // 13. Extraire les courants des batteries
  batteries.forEach((battery, idx) => {
    const current = solution[numNodes + idx] || 0;
    componentCurrents.set(battery.id, Math.abs(current));
    componentVoltages.set(battery.id, battery.voltage || 0);
  });
  
  // 14. Extraire les courants des ampèremètres
  ammeters.forEach((ammeter, idx) => {
    const current = solution[numNodes + numVoltageSources + idx] || 0;
    branchCurrents.set(ammeter.id, Math.abs(current));
  });
  
  // 15. Calculer les courants et tensions dans les résistances
  components.forEach(comp => {
    if (comp.type === 'resistor' && comp.resistance) {
      const leftNode = terminalToNode.get(`${comp.id}-left`);
      const rightNode = terminalToNode.get(`${comp.id}-right`);
      
      if (leftNode !== undefined && rightNode !== undefined) {
        const vLeft = solution[leftNode] || 0;
        const vRight = solution[rightNode] || 0;
        const voltage = Math.abs(vLeft - vRight);
        const current = comp.resistance > 0 ? voltage / comp.resistance : 0;
        
        componentCurrents.set(comp.id, current);
        componentVoltages.set(comp.id, voltage);
      }
    }
  });
  
  // 16. Mettre à jour les valeurs des instruments de mesure
  components.forEach(comp => {
    // Ampèremètre
    if (comp.type === 'ammeter') {
      const current = branchCurrents.get(comp.id) || 0;
      (comp as any).value = current;
    }
    
    // Voltmètre
    else if (comp.type === 'voltmeter') {
      const inNode = terminalToNode.get(`${comp.id}-in`);
      const outNode = terminalToNode.get(`${comp.id}-out`);
      
      if (inNode !== undefined && outNode !== undefined) {
        const vIn = solution[inNode] || 0;
        const vOut = solution[outNode] || 0;
        (comp as any).value = Math.abs(vIn - vOut);
      }
    }
    
    // Wattmètre et Compteur d'énergie
    else if (comp.type === 'wattmeter' || comp.type === 'energymeter') {
      const vplusNode = terminalToNode.get(`${comp.id}-vplus`);
      const vminusNode = terminalToNode.get(`${comp.id}-vminus`);
      
      // Mesure de tension (bornes en parallèle, impédance infinie)
      let voltage = 0;
      if (vplusNode !== undefined && vminusNode !== undefined) {
        voltage = Math.abs((solution[vplusNode] || 0) - (solution[vminusNode] || 0));
      }
      
      // Mesure de courant (bornes en série, résistance nulle)
      let current = 0;
      const meterIdx = powerMeters.findIndex(m => m.id === comp.id);
      if (meterIdx >= 0) {
        const currentVarIdx = numNodes + numVoltageSources + numAmmeters + meterIdx;
        current = Math.abs(solution[currentVarIdx] || 0);
      }
      
      // Puissance instantanée P = V × I
      const power = voltage * current;
      (comp as any).value = power;
      powerReadings.set(comp.id, power);
    }
  });
  
  return { nodeVoltages, componentCurrents, componentVoltages, branchCurrents, powerReadings };
};