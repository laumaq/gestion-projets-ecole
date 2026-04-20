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
  ): { estValide: boolean; valeurCalculee: number | null; valeurReelle: number | null; ecart: number | null } {
    const valeurReelle = valeurs[variableCible];
    if (valeurReelle === null || valeurReelle === undefined) {
      return { estValide: false, valeurCalculee: null, valeurReelle: null, ecart: null };
    }

    // Extraire les colonnes
    const colonnePattern = /\{([^}]+)\}/g;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = colonnePattern.exec(expression)) !== null) {
      matches.push(match);
    }
    const variables = matches.map(m => m[1]);

    // Vérifier que toutes les colonnes sont présentes
    for (const varName of variables) {
      if (valeurs[varName] === null || valeurs[varName] === undefined) {
        return { estValide: false, valeurCalculee: null, valeurReelle: valeurReelle, ecart: null };
      }
    }

    // Construire l'expression en remplaçant les {colonne} par les valeurs (avec conversion virgule->point)
    let expr: string = expression;
    for (const varName of variables) {
      let valeur = valeurs[varName];
      let valeurStr: string;
      if (typeof valeur === 'number') {
        valeurStr = valeur.toString();
      } else {
        valeurStr = String(valeur).replace(',', '.');
      }
      // S'assurer que c'est un nombre valide
      const num = parseFloat(valeurStr);
      if (isNaN(num)) {
        console.warn(`Valeur invalide pour ${varName}:`, valeur);
        return { estValide: false, valeurCalculee: null, valeurReelle, ecart: null };
      }
      const regex = new RegExp(`\\{${varName}\\}`, 'g');
      expr = expr.replace(regex, num.toString());
    }

    // Gérer l'égalité
    if (expr.includes('=')) {
      const parts = expr.split('=');
      if (parts.length === 2) {
        expr = parts[1].trim();
      }
    }

    // Évaluer l'expression
    try {
      // Remplacer les fonctions mathématiques par Math.fn
      expr = expr.replace(/\b(asin|acos|atan|sin|cos|tan|sqrt|exp|log|ln|abs|floor|ceil|round)\b/g, (m) => {
        if (m === 'ln') return 'Math.log';
        return `Math.${m}`;
      });
      expr = expr.replace(/\bpi\b/g, 'Math.PI');
      expr = expr.replace(/\be\b/g, 'Math.E');

      console.log('Expression évaluée:', expr);
      // eslint-disable-next-line no-eval
      const valeurCalculee = eval(expr);
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
      console.error('Erreur évaluation:', error, 'Expression:', expr);
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