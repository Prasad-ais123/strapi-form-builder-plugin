/**
 * Shared Formula Evaluator for Server-Side Validation
 */

export function extractFormulaTokens(formula: string): string[] {
  if (!formula || typeof formula !== 'string') return [];
  const matches = formula.match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
}

export function evaluateFormula(
  formula: string,
  data: Record<string, any>,
  min?: number,
  max?: number
): number {
  if (!formula || typeof formula !== 'string' || !formula.trim()) {
    return 0;
  }

  // 1. Replace tokens with numeric values
  const expression = formula.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, key) => {
    let raw = data[key];
    if (raw === undefined || raw === null || raw === '') {
      return '0';
    }
    if (Array.isArray(raw)) {
      return String(raw.length);
    }
    const num = Number(raw);
    return isNaN(num) ? '0' : String(num);
  });

  // 2. Security sanity check: only allow safe Math identifiers, numbers, arithmetic symbols
  const stripped = expression.replace(
    /\bMath\.(floor|ceil|round|abs|min|max|pow)\b/g,
    ''
  );

  // If any unallowed letters or forbidden characters remain, reject
  if (/[a-zA-Z_$]/.test(stripped)) {
    return 0;
  }

  // 3. Evaluate the safe mathematical expression
  let result = 0;
  try {
    const fn = new Function('Math', `return (${expression});`);
    const val = fn(Math);
    result = typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0;
  } catch {
    result = 0;
  }

  // 4. Apply optional min/max clamping if specified
  if (min !== undefined && !isNaN(Number(min))) {
    result = Math.max(Number(min), result);
  }
  if (max !== undefined && !isNaN(Number(max))) {
    result = Math.min(Number(max), result);
  }

  return result;
}

export function formatCalculatedValue(
  value: number,
  prefix = '',
  suffix = '',
  decimals = 0
): string {
  const rounded = Number(value.toFixed(decimals));
  return `${prefix}${rounded.toLocaleString()}${suffix}`;
}
