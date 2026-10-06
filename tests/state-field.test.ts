import { describe, it, expect } from 'vitest';
import { COUNTRIES, getStatesForCountry, STATES_BY_COUNTRY } from '../admin/src/data/countriesStates';
import { FIELD_CATEGORIES } from '../admin/src/ui';

describe('State field and country dataset', () => {
  it('adds States to the Choice category in FIELD_CATEGORIES', () => {
    const choiceCat = FIELD_CATEGORIES.find((c) => c.cat === 'Choice');
    expect(choiceCat).toBeDefined();
    const stateItem = choiceCat?.items.find((item) => item.type === 'state');
    expect(stateItem).toBeDefined();
    expect(stateItem?.name).toBe('States');
  });

  it('provides a list of countries including US, CA, IN, GB, AU', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(10);
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes).toContain('US');
    expect(codes).toContain('CA');
    expect(codes).toContain('IN');
    expect(codes).toContain('GB');
    expect(codes).toContain('AU');
  });

  it('returns US states by default or when requested', () => {
    const usStates = getStatesForCountry('US');
    expect(usStates.length).toBe(51); // 50 states + DC
    expect(usStates.find((s) => s.value === 'CA')?.label).toBe('California');
    expect(usStates.find((s) => s.value === 'NY')?.label).toBe('New York');
    expect(usStates.find((s) => s.value === 'TX')?.label).toBe('Texas');
  });

  it('returns India states when requested', () => {
    const inStates = getStatesForCountry('IN');
    expect(inStates.length).toBeGreaterThanOrEqual(28);
    expect(inStates.find((s) => s.label === 'Maharashtra')?.value).toBe('MH');
    expect(inStates.find((s) => s.label === 'Delhi')?.value).toBe('DL');
  });

  it('returns Canada provinces when requested', () => {
    const caProvinces = getStatesForCountry('CA');
    expect(caProvinces.length).toBe(13); // 10 provinces + 3 territories
    expect(caProvinces.find((s) => s.label === 'Ontario')?.value).toBe('ON');
  });

  it('falls back to US states for unknown country code', () => {
    const fallback = getStatesForCountry('UNKNOWN');
    expect(fallback).toEqual(STATES_BY_COUNTRY.US);
  });
});
