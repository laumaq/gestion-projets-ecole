// lib/sciences/expressionEvaluator.ts
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

  static parseExpression(expression: string, colonnesDisponibles: string[]): {
    isValid: boolean;
    parsedExpression?: string;
    variables?: string[];
    error?: string;
  } {
    let cleanExpression = expression.trim();
    
    // Gérer les conditions multiples : on prend la dernière partie après le dernier = si présent
    if (cleanExpression.includes('=')) {
      const parts = cleanExpression.split('=');
      if (parts.length === 2) {
        cleanExpression = parts[1].trim();
      }
    }
    
    // Extraire les colonnes
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

    let parsed = cleanExpression;
    variables.forEach(v => {
      const regex = new RegExp(`\\{${v}\\}`, 'g');
      parsed = parsed.replace(regex, `__col__${v.replace(/[^a-zA-Z0-9]/g, '_')}`);
    });

    try {
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

  static evaluateExpression(expression: string, variables: Record<string, number>): number {
    let expr = expression;
    for (const [constName, constValue] of Object.entries(this.CONSTANTS)) {
      expr = expr.replace(new RegExp(`\\b${constName}\\b`, 'g'), constValue.toString());
    }
    for (const [varName, varValue] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      expr = expr.replace(regex, varValue.toString());
    }
    // eslint-disable-next-line no-new-func
    const evaluator = new Function('return ' + expr);
    return evaluator();
  }

  // Point d'entrée principal : supporte les conditions multiples séparées par &&
  static verifierMesure(
    expression: string,
    valeurs: Record<string, number | null>,
    variableCible: string,
    tolerance: number
  ): { estValide: boolean; valeurCalculee: number | null; valeurReelle: number | null; ecart: number | null } {
    const subExprs = expression.split('&&').map(e => e.trim());
    let toutesValides = true;
    let derniereValeurCalculee: number | null = null;

    for (const subExpr of subExprs) {
      const result = this.verifierUneExpression(subExpr, valeurs, variableCible, tolerance);
      if (!result.estValide) {
        toutesValides = false;
        break;
      }
      if (result.valeurCalculee !== null) {
        derniereValeurCalculee = result.valeurCalculee;
      }
    }

    return {
      estValide: toutesValides,
      valeurCalculee: toutesValides ? derniereValeurCalculee : null,
      valeurReelle: valeurs[variableCible] ?? null,
      ecart: null
    };
  }

  private static verifierUneExpression(
    expression: string,
    valeurs: Record<string, number | null>,
    variableCible: string,
    tolerance: number
  ): { estValide: boolean; valeurCalculee: number | null; valeurReelle: number | null; ecart: number | null } {
    const valeurReelle = valeurs[variableCible];
    if (valeurReelle === null || valeurReelle === undefined) {
      return { estValide: false, valeurCalculee: null, valeurReelle: null, ecart: null };
    }

    const colonnePattern = /\{([^}]+)\}/g;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = colonnePattern.exec(expression)) !== null) {
      matches.push(match);
    }
    const variables = matches.map(m => m[1]);

    for (const varName of variables) {
      if (valeurs[varName] === null || valeurs[varName] === undefined) {
        return { estValide: false, valeurCalculee: null, valeurReelle: valeurReelle, ecart: null };
      }
    }

    let exprEval = expression;
    const evalVars: Record<string, number> = {};
    for (const varName of variables) {
      const varKey = `__col__${varName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      exprEval = exprEval.replace(new RegExp(`\\{${varName}\\}`, 'g'), varKey);
      evalVars[varKey] = valeurs[varName] as number;
    }

    try {
      let expressionToEvaluate = exprEval;
      if (exprEval.includes('=')) {
        const parts = exprEval.split('=');
        if (parts.length === 2) {
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

  static formaterExpression(expression: string): string {
    let formatted = expression.replace(/\{([^}]+)\}/g, '$1');
    formatted = formatted.replace(/\*/g, '×');
    formatted = formatted.replace(/\//g, '÷');
    formatted = formatted.replace(/\^/g, '^');
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