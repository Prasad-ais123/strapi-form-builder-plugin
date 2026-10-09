import { describe, it, expect } from 'vitest';
import { getRangeOptions } from '../admin/src/data/rangeOptions';
import { FIELD_CATEGORIES } from '../admin/src/ui';

describe('Dynamic Select (range dropdown) field', () => {
  it('adds Dynamic Select to the Choice category in FIELD_CATEGORIES', () => {
    const choiceCat = FIELD_CATEGORIES.find((c) => c.cat === 'Choice');
    expect(choiceCat).toBeDefined();
    const dynamicItem = choiceCat?.items.find((item) => item.type === 'dynamic-select');
    expect(dynamicItem).toBeDefined();
    expect(dynamicItem?.name).toBe('Dynamic Select');
  });

  it('generates default options from min 1 to max 4', () => {
    const options = getRangeOptions(1, 4);
    expect(options).toHaveLength(4);
    expect(options).toEqual([
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
    ]);
  });

  it('generates options dynamically when min and max change', () => {
    const customRange = getRangeOptions(1, 10);
    expect(customRange).toHaveLength(10);
    expect(customRange[0]).toEqual({ label: '1', value: '1' });
    expect(customRange[9]).toEqual({ label: '10', value: '10' });

    const offsetRange = getRangeOptions(5, 8);
    expect(offsetRange).toHaveLength(4);
    expect(offsetRange.map((o) => o.value)).toEqual(['5', '6', '7', '8']);
  });

  it('caps max options to 100', () => {
    const range100 = getRangeOptions(1, 100);
    expect(range100).toHaveLength(100);
    expect(range100[99]).toEqual({ label: '100', value: '100' });

    const cappedRange = getRangeOptions(1, 200);
    expect(cappedRange).toHaveLength(100);
  });

  it('handles invalid or inverted ranges gracefully', () => {
    expect(getRangeOptions(5, 2)).toEqual([]);
    expect(getRangeOptions(NaN as any, 4)).toEqual([]);
  });

  it('validates required child inputs on submit', async () => {
    const { default: validationFactory } = await import('../server/src/services/validation');
    const validator = validationFactory();
    const dynamicField: any = {
      id: 'ds_1',
      type: 'select',
      name: 'stores',
      label: 'Stores',
      required: true,
      min: 1,
      max: 4,
      itemLabel: 'Store',
      itemRequired: true,
    };

    // Missing child inputs when store count is 2
    const failMissing = validator.validate([dynamicField], { stores: '2', 'stores[]': ['Store #1'] });
    expect(failMissing.valid).toBe(false);
    expect(failMissing.errors.stores[0]).toContain('please provide all 2 stores');

    // Empty child input in array
    const failEmpty = validator.validate([dynamicField], { stores: '2', 'stores[]': ['Store #1', '   '] });
    expect(failEmpty.valid).toBe(false);
    expect(failEmpty.errors.stores[0]).toContain('all 2 stores are required');

    // Valid child inputs
    const pass = validator.validate([dynamicField], { stores: '2', 'stores[]': ['Store #1', 'Store #2'] });
    expect(pass.valid).toBe(true);

    // Child input min length validation
    const lengthField = { ...dynamicField, childMinLength: 4 };
    const failLength = validator.validate([lengthField], { stores: '1', 'stores[]': ['12'] });
    expect(failLength.valid).toBe(false);
    expect(failLength.errors.stores[0]).toContain('must be at least 4 characters');

    // Child input regex pattern validation
    const patternField = { ...dynamicField, childPattern: '^[0-9]+$' };
    const failPattern = validator.validate([patternField], { stores: '1', 'stores[]': ['abc'] });
    expect(failPattern.valid).toBe(false);
    expect(failPattern.errors.stores[0]).toContain('is invalid');
  });
});
