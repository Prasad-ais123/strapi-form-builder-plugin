import { describe, it, expect, vi } from 'vitest';
import submissionService from '../server/src/services/submission';

describe('Form Scheduling (Start Date & Expiry Date) validation', () => {
  function createMockStrapi(settings: Record<string, any>) {
    return {
      plugin: vi.fn().mockReturnValue({
        service: vi.fn((name: string) => {
          if (name === 'form') {
            return {
              findBySlug: vi.fn().mockResolvedValue({
                id: 1,
                slug: 'test-form',
                publishedAt: '2026-01-01T00:00:00.000Z',
                publishedData: {
                  fields: [],
                  settings,
                },
              }),
            };
          }
          if (name === 'validation') {
            return {
              validate: vi.fn().mockReturnValue({ valid: true, errors: {} }),
            };
          }
          return {};
        }),
      }),
      db: {
        query: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: 1 }),
        }),
      },
    } as any;
  }

  it('allows submission when neither startDate nor expiryDate is configured', async () => {
    const strapi = createMockStrapi({ startDate: null, expiryDate: null });
    const svc = submissionService({ strapi });
    const res = await svc.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' });
    expect(res.success).toBe(true);
  });

  it('rejects submission when startDate is in the future', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const strapi = createMockStrapi({ startDate: futureDate });
    const svc = submissionService({ strapi });

    await expect(svc.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' })).rejects.toMatchObject({
      name: 'FormNotStartedError',
      message: 'This form is not yet accepting responses.',
    });
  });

  it('allows submission when startDate is in the past and form has not expired', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const strapi = createMockStrapi({ startDate: pastDate, expiryDate: null });
    const svc = submissionService({ strapi });
    const res = await svc.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' });
    expect(res.success).toBe(true);
  });

  it('rejects submission when expiryDate is in the past', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const strapi = createMockStrapi({ expiryDate: pastDate });
    const svc = submissionService({ strapi });

    await expect(svc.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' })).rejects.toMatchObject({
      name: 'FormExpiredError',
      message: 'This form has expired and is no longer accepting responses.',
    });
  });

  it('exact boundary moments for start and expiry', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));

    // 1ms before start date -> not started yet
    const justBeforeStart = new Date(now + 1000).toISOString();
    const strapiBefore = createMockStrapi({ startDate: justBeforeStart });
    const svcBefore = submissionService({ strapi: strapiBefore });
    await expect(svcBefore.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' })).rejects.toMatchObject({
      name: 'FormNotStartedError',
      message: 'This form is not yet accepting responses.',
    });

    // Exactly at start date -> active
    const exactStart = new Date(now).toISOString();
    const strapiAtStart = createMockStrapi({ startDate: exactStart });
    const svcAtStart = submissionService({ strapi: strapiAtStart });
    const res = await svcAtStart.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' });
    expect(res.success).toBe(true);

    // Exactly at expiry date -> expired
    const exactExpiry = new Date(now).toISOString();
    const strapiAtExpiry = createMockStrapi({ expiryDate: exactExpiry });
    const svcAtExpiry = submissionService({ strapi: strapiAtExpiry });
    await expect(svcAtExpiry.submit('test-form', {}, { ip: '127.0.0.1', userAgent: 'test' })).rejects.toMatchObject({
      name: 'FormExpiredError',
      message: 'This form has expired and is no longer accepting responses.',
    });

    vi.useRealTimers();
  });
});
