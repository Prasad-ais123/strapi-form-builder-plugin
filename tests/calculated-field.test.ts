import { describe, it, expect } from 'vitest';
import { FIELD_CATEGORIES } from '../admin/src/ui';
import { evaluateFormula, extractFormulaTokens, formatCalculatedValue } from '../admin/src/utils/formula';
import validationFactory from '../server/src/services/validation';

describe('Field Logic & Dynamic Validation Rules', () => {
  it('extracts tokens from formula expression', () => {
    const tokens = extractFormulaTokens('({total_passes} * 25) + ({parking_passes} * 15) - {discount}');
    expect(tokens).toEqual(['total_passes', 'parking_passes', 'discount']);
  });

  it('evaluates basic arithmetic and multiplier formulas', () => {
    const res = evaluateFormula('{stores} * 2', { stores: 3 });
    expect(res).toBe(6);
  });

  it('evaluates Math functions (floor, min, max) for ratio constraints', () => {
    // 6 passes -> Math.floor(6 / 4) = 1 parking pass
    const parking = evaluateFormula('Math.floor({passes} / 4)', { passes: 6 });
    expect(parking).toBe(1);

    // 8 passes -> Math.floor(8 / 4) = 2 parking passes
    const parking2 = evaluateFormula('Math.floor({passes} / 4)', { passes: 8 });
    expect(parking2).toBe(2);
  });

  it('evaluates chained cross-field calculation (total payment amount)', () => {
    const data = {
      stores: 3,
      total_passes: 6,
      parking_passes: 1,
    };
    // (6 passes * $25) + (1 parking * $15) = $165
    const total = evaluateFormula('({total_passes} * 25) + ({parking_passes} * 15)', data);
    expect(total).toBe(165);
  });

  it('enforces min and max clamping on calculated values', () => {
    // 7 stores * 2 = 14, capped to max: 10
    const capped = evaluateFormula('{stores} * 2', { stores: 7 }, undefined, 10);
    expect(capped).toBe(10);

    // negative clamped to min: 0
    const minClamped = evaluateFormula('{value} - 50', { value: 20 }, 0, undefined);
    expect(minClamped).toBe(0);
  });

  it('handles missing or empty fields safely by defaulting to 0', () => {
    const res = evaluateFormula('{missing_field} * 10 + 5', {});
    expect(res).toBe(5);
  });

  it('blocks unsafe code injection attempts', () => {
    const malicious = evaluateFormula('alert("hack") || {stores} * 2', { stores: 3 });
    expect(malicious).toBe(0);
  });

  it('formats calculated values with prefix, suffix, and decimal precision', () => {
    expect(formatCalculatedValue(6, '', ' passes', 0)).toBe('6 passes');
    expect(formatCalculatedValue(165, '$', '', 2)).toBe('$165');
  });

  it('validates field logic dynamic max constraint (e.g. parking passes ratio)', () => {
    const fields: any[] = [
      {
        id: '1',
        type: 'select',
        name: 'passes',
        label: 'Passes',
        required: true,
      },
      {
        id: '2',
        type: 'number',
        name: 'parking_passes',
        label: 'Parking Passes',
        required: false,
        logicMaxFormula: 'Math.floor({passes} / 4)',
        logicErrorMessage: 'You must have at least 4 passes per parking pass',
      },
    ];

    const validator = validationFactory();

    // 6 passes, 2 parking passes (max allowed is Math.floor(6/4) = 1) -> Invalid!
    const invalidRes = validator.validate(fields, { passes: 6, parking_passes: 2 });
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors.parking_passes).toContain('You must have at least 4 passes per parking pass');

    // 8 passes, 2 parking passes (max allowed is Math.floor(8/4) = 2) -> Valid!
    const validRes = validator.validate(fields, { passes: 8, parking_passes: 2 });
    expect(validRes.valid).toBe(true);
  });

  it('validates field logic auto-compute and dynamic payment calculation', () => {
    const fields: any[] = [
      {
        id: '1',
        type: 'select',
        name: 'stores',
        label: 'Stores',
        required: true,
      },
      {
        id: '2',
        type: 'number',
        name: 'total_passes',
        label: 'Total Passes',
        logicFormula: '{stores} * 2',
      },
      {
        id: '3',
        type: 'payment',
        name: 'payment',
        label: 'Payment',
        payment: {
          provider: 'paypal',
          amountType: 'calculated',
          amountFormula: '{total_passes} * 25',
          currency: 'USD',
        },
      },
    ];

    const validator = validationFactory();
    const validData: any = { stores: 3 };
    const validRes = validator.validate(fields, validData);
    expect(validRes.valid).toBe(true);
    expect(validData.total_passes).toBe(6);

    // Payment amount mismatch check
    const mismatchData: any = { stores: 3, amount: 100 }; // expected 6 * 25 = 150
    const mismatchRes = validator.validate(fields, mismatchData);
    expect(mismatchRes.valid).toBe(false);
    expect(mismatchRes.errors.payment).toContain('Payment amount mismatch: expected 150, got 100');
  });
});
