// lib/sciences/expressionEvaluator.ts

// lib/sciences/expressionEvaluator.ts
export class ExpressionEvaluator {
  static parseExpression(expression: string, colonnesDisponibles: string[]): {
    isValid: boolean;
    variables?: string[];
    error?: string;
  } {
    const colonnePattern = /\{([^}]+)\}/g;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = colonnePattern.exec(expression)) !== null) {
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
    return { isValid: true, variables };
  }

  static verifierMesure(
    expression: string,
    valeurs: Record<string, number | null>,
    variableCible: string,
    tolerance: number
  ): {
    estValide: boolean;
    valeurCalculee: number | null;
    valeurReelle: number | null;
    ecart: number | null;
    corrections: Record<string, number>;
  } {
    const valeurReelle = valeurs[variableCible];
    const corrections: Record<string, number> = {};
    let valeurCalculee: number | null = null;

    // Remplacer les {colonne} par leurs valeurs
    let expr = expression;
    const colonnePattern = /\{([^}]+)\}/g;
    let match;
    while ((match = colonnePattern.exec(expression)) !== null) {
      const colName = match[1];
      let val = valeurs[colName];
      if (val === null || val === undefined) {
        return { estValide: false, valeurCalculee: null, valeurReelle, ecart: null, corrections };
      }
      let num: number;
      if (typeof val === 'number') num = val;
      else {
        const str = String(val).replace(',', '.');
        num = parseFloat(str);
        if (isNaN(num)) {
          return { estValide: false, valeurCalculee: null, valeurReelle, ecart: null, corrections };
        }
      }
      expr = expr.replace(new RegExp(`\\{${colName}\\}`, 'g'), num.toString());
    }

    // Remplacer les fonctions mathématiques
    expr = expr.replace(/\b(asin|acos|atan|sin|cos|tan|sqrt|exp|log|ln|abs|floor|ceil|round)\b/g, (m) => {
      if (m === 'ln') return 'Math.log';
      return `Math.${m}`;
    });
    expr = expr.replace(/\bpi\b/g, 'Math.PI');
    expr = expr.replace(/\be\b/g, 'Math.E');

    // Séparer les conditions (&&)
    const conditions = expr.split('&&').map(c => c.trim());
    let globalValide = true;
    let premiereCondition = true;

    for (const cond of conditions) {
      // Chercher un '=' simple
      let equalIndex = -1;
      for (let i = 0; i < cond.length; i++) {
        if (cond[i] === '=' && cond[i+1] !== '=' && cond[i-1] !== '=') {
          equalIndex = i;
          break;
        }
      }
      let condValide = false;
      if (equalIndex !== -1) {
        const left = cond.substring(0, equalIndex).trim();
        const right = cond.substring(equalIndex + 1).trim();
        try {
          const rightVal = eval(right);
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(left)) {
            const leftVal = valeurs[left];
            if (leftVal !== null && leftVal !== undefined) {
              const ecart = Math.abs(rightVal - leftVal);
              const toleranceAbs = (Math.abs(rightVal) * tolerance) / 100;
              condValide = ecart <= toleranceAbs;
              if (!condValide && typeof rightVal === 'number') {
                corrections[left] = rightVal;
              }
              if (left === variableCible && typeof rightVal === 'number') {
                valeurCalculee = rightVal;
              }
            } else {
              condValide = false;
            }
          } else {
            const leftVal = eval(left);
            const ecart = Math.abs(rightVal - leftVal);
            const toleranceAbs = (Math.abs(rightVal) * tolerance) / 100;
            condValide = ecart <= toleranceAbs;
          }
        } catch(e) {
          condValide = false;
        }
      } else {
        try {
          const evalResult = eval(cond);
          condValide = typeof evalResult === 'boolean' ? evalResult : !!evalResult;
        } catch(e) {
          condValide = false;
        }
      }
      if (premiereCondition) {
        globalValide = condValide;
        premiereCondition = false;
      } else {
        globalValide = globalValide && condValide;
      }
    }

    return {
      estValide: globalValide,
      valeurCalculee,
      valeurReelle,
      ecart: null,
      corrections
    };
  }

  private static decouperConditions(expr: string): string[] {
    return expr.split('&&').map(c => c.trim());
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