// lib/expressionEvaluator.ts

export class ExpressionEvaluator {
  private static readonly CONSTANTS: Record<string, number> = {
    pi: Math.PI,
    e: Math.E
  };

  private static readonly FUNCTIONS: Record<string, (...args: number[]) => number> = {
    sqrt: Math.sqrt,
    exp: Math.exp,
    log: (x: number) => Math.log10(x),
    ln: Math.log,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan
  };

  // lib/expressionEvaluator.ts - Version corrigée de parseExpression

  static parseExpression(expression: string, colonnesDisponibles: string[]): {
    isValid: boolean;
    parsedExpression?: string;
    variables?: string[];
    error?: string;
  } {
    // Enlever les espaces et gérer le cas avec =
    let cleanExpression = expression.trim();
    
    // Si l'expression contient un =, on ne garde que la partie droite pour la validation
    if (cleanExpression.includes('=')) {
      const parts = cleanExpression.split('=');
      if (parts.length === 2) {
        cleanExpression = parts[1].trim();
      }
    }
    
    // Vérifier que toutes les colonnes entre {} existent
    const colonnePattern = /\{([^}]+)\}/g;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = colonnePattern.exec(cleanExpression)) !== null) {
      matches.push(match);
    }
    const variables = matches.map(m => m[1]);
    
    const colonnesInvalides = variables.filter(v => !colonnesDisponibles.includes(v));
    if (colonnesInvalides.length > 0) {
      return {
        isValid: false,
        error: `Colonnes inconnues: ${colonnesInvalides.join(', ')}`
      };
    }

    // Remplacer les {colonne} par des noms de variables valides
    let parsed = cleanExpression;
    variables.forEach(v => {
      const regex = new RegExp(`\\{${v}\\}`, 'g');
      parsed = parsed.replace(regex, `__col__${v.replace(/[^a-zA-Z0-9]/g, '_')}`);
    });

    // Vérifier que l'expression est syntaxiquement valide
    try {
      // Test d'évaluation avec des valeurs factices
      const testVars: Record<string, number> = {};
      variables.forEach(v => {
        testVars[`__col__${v.replace(/[^a-zA-Z0-9]/g, '_')}`] = 1;
      });
      this.evaluateExpression(parsed, testVars);
      return { isValid: true, parsedExpression: parsed, variables };
    } catch (error) {
      return {
        isValid: false,
        error: `Erreur de syntaxe: ${(error as Error).message}`
      };
    }
  }

  /**
   * Évalue une expression mathématique avec les valeurs des variables
   */
  static evaluateExpression(expression: string, variables: Record<string, number>): number {
    // Remplacer les constantes
    let expr = expression;
    for (const [constName, constValue] of Object.entries(this.CONSTANTS)) {
      expr = expr.replace(new RegExp(`\\b${constName}\\b`, 'g'), constValue.toString());
    }

    // Remplacer les variables par leurs valeurs
    for (const [varName, varValue] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      expr = expr.replace(regex, varValue.toString());
    }

    // Créer un objet avec toutes les fonctions mathématiques
    const mathContext: Record<string, any> = {};
    for (const [fnName, fn] of Object.entries(this.FUNCTIONS)) {
      mathContext[fnName] = fn;
    }

    // Construire la fonction avec les fonctions mathématiques dans le scope
    const functionBody = `with (mathContext) { return ${expr}; }`;
    // eslint-disable-next-line no-new-func
    const evaluator = new Function('mathContext', functionBody);
    return evaluator(mathContext);
  }

  /**
   * Vérifie si une mesure est correcte selon l'expression
   * @param expression Expression mathématique (ex: "{Tension} = {Résistance} * {Intensité}")
   * @param valeurs Les valeurs de toutes les colonnes pour cette mesure
   * @param variableCible La colonne qui est mesurée (celle qu'on vérifie)
   * @param tolerance Pourcentage de tolérance (ex: 5 pour 5%)
   */
  static verifierMesure(
    expression: string,
    valeurs: Record<string, number | null>,
    variableCible: string,
    tolerance: number
  ): { estValide: boolean; valeurCalculee: number | null; valeurReelle: number | null; ecart: number | null } {
    
    const valeurReelle = valeurs[variableCible];
    if (valeurReelle === null || valeurReelle === undefined) {
      return { estValide: false, valeurCalculee: null, valeurReelle: null, ecart: null };
    }

    // Extraire les colonnes de l'expression
    const colonnePattern = /\{([^}]+)\}/g;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = colonnePattern.exec(expression)) !== null) {
      matches.push(match);
    }
    const variables = matches.map(m => m[1]);

    // Vérifier que toutes les colonnes nécessaires sont présentes
    for (const varName of variables) {
      if (valeurs[varName] === null || valeurs[varName] === undefined) {
        return { estValide: false, valeurCalculee: null, valeurReelle: valeurReelle, ecart: null };
      }
    }

    // Préparer l'expression pour l'évaluation (remplacer {colonne} par des variables)
    let exprEval = expression;
    const evalVars: Record<string, number> = {};
    
    for (const varName of variables) {
      const varKey = `__col__${varName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      exprEval = exprEval.replace(new RegExp(`\\{${varName}\\}`, 'g'), varKey);
      evalVars[varKey] = valeurs[varName] as number;
    }

    try {
      // Extraire le côté droit de l'égalité si présent
      let expressionToEvaluate = exprEval;
      if (exprEval.includes('=')) {
        const parts = exprEval.split('=');
        if (parts.length === 2) {
          // On évalue le côté droit
          expressionToEvaluate = parts[1].trim();
        }
      }

      const valeurCalculee = this.evaluateExpression(expressionToEvaluate, evalVars);
      const ecartAbsolu = Math.abs(valeurCalculee - valeurReelle);
      const toleranceAbsolue = (Math.abs(valeurCalculee) * tolerance) / 100;
      const estValide = ecartAbsolu <= toleranceAbsolue;

      return {
        estValide,
        valeurCalculee,
        valeurReelle,
        ecart: (ecartAbsolu / Math.abs(valeurCalculee)) * 100
      };
    } catch (error) {
      console.error('Erreur évaluation:', error);
      return { estValide: false, valeurCalculee: null, valeurReelle, ecart: null };
    }
  }

  /**
   * Formate l'expression pour l'affichage LaTeX-like
   */
  static formaterExpression(expression: string): string {
    // Remplacer les noms de colonnes par leur version lisible
    let formatted = expression.replace(/\{([^}]+)\}/g, '$1');
    
    // Remplacer les opérateurs
    formatted = formatted.replace(/\*/g, '×');
    formatted = formatted.replace(/\//g, '÷');
    formatted = formatted.replace(/\^/g, '^');
    
    // Remplacer les fonctions
    formatted = formatted.replace(/sqrt\(/g, '√(');
    formatted = formatted.replace(/exp\(/g, 'e^(');
    formatted = formatted.replace(/log\(/g, 'log₁₀(');
    formatted = formatted.replace(/ln\(/g, 'ln(');
    formatted = formatted.replace(/sin\(/g, 'sin(');
    formatted = formatted.replace(/cos\(/g, 'cos(');
    formatted = formatted.replace(/tan\(/g, 'tan(');
    
    return formatted;
  }
}