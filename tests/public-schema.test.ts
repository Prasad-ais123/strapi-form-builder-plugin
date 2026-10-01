import { describe, it, expect } from 'vitest';
import { publicSchemaFrom } from '../server/src/services/form';

const baseForm = {
  id: 1,
  slug: 'contact',
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedData: {
    title: 'Contact',
    description: '',
    fields: [{ id: 'a', type: 'email', name: 'email' }],
    conditionalLogic: [],
    settings: {},
  },
};

describe('publicSchemaFrom (public form serialization)', () => {
  it('returns null for an unpublished form (drafts never leak)', () => {
    expect(publicSchemaFrom({ ...baseForm, publishedAt: null })).toBeNull();
    expect(publicSchemaFrom(null)).toBeNull();
  });

  it('NEVER exposes the CAPTCHA secret key, but keeps the public site key', () => {
    const form = {
      ...baseForm,
      publishedData: {
        ...baseForm.publishedData,
        settings: { captcha: { provider: 'turnstile', siteKey: 'PUBLIC', secretKey: 'TOP-SECRET' } },
      },
    };
    const out = publicSchemaFrom(form);
    const captcha = out!.data.settings.captcha;
    expect(captcha).toEqual({ provider: 'turnstile', siteKey: 'PUBLIC' });
    expect('secretKey' in captcha).toBe(false);
    // belt-and-suspenders: the secret must not appear anywhere in the serialized payload
    expect(JSON.stringify(out)).not.toContain('TOP-SECRET');
  });

  it('passes settings through untouched when no captcha is configured', () => {
    const out = publicSchemaFrom(baseForm);
    expect(out!.data.settings).toEqual({ startDate: null, expiryDate: null });
    expect(out!.data.slug).toBe('contact');
  });

  it('includes startDate and expiryDate when configured', () => {
    const form = {
      ...baseForm,
      publishedData: {
        ...baseForm.publishedData,
        settings: { startDate: '2026-10-01T00:00:00.000Z', expiryDate: '2026-10-30T23:59:59.000Z' },
      },
    };
    const out = publicSchemaFrom(form);
    expect(out!.data.settings.startDate).toBe('2026-10-01T00:00:00.000Z');
    expect(out!.data.settings.expiryDate).toBe('2026-10-30T23:59:59.000Z');
  });

  it('sets startDate and expiryDate to null when not configured', () => {
    const out = publicSchemaFrom(baseForm);
    expect(out!.data.settings.startDate).toBeNull();
    expect(out!.data.settings.expiryDate).toBeNull();
  });
});
