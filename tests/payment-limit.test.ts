import { describe, it, expect, vi } from 'vitest';
import formServiceFactory from '../server/src/services/form';
import formController from '../server/src/controllers/form';

describe('Payment button limit (only allow one payment button per form)', () => {
  const createMockStrapi = () => {
    return {
      db: {
        query: vi.fn().mockReturnValue({
          create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 1, ...data })),
          update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 1, ...data })),
        }),
      },
      plugin: vi.fn().mockReturnValue({
        service: vi.fn(() => ({
          create: vi.fn().mockImplementation((data: any) => Promise.resolve({ id: 1, ...data })),
          update: vi.fn().mockImplementation((id: number, data: any) => Promise.resolve({ id, ...data })),
        })),
      }),
    } as any;
  };

  it('form service allows form creation with zero or one payment button', async () => {
    const strapi = createMockStrapi();
    const service = formServiceFactory({ strapi });

    await expect(
      service.create({
        title: 'Form with no payment',
        fields: [{ id: '1', type: 'text', name: 'text' }],
      })
    ).resolves.toBeDefined();

    await expect(
      service.create({
        title: 'Form with 1 payment',
        fields: [
          { id: '1', type: 'text', name: 'text' },
          { id: '2', type: 'payment', name: 'pay' },
        ],
      })
    ).resolves.toBeDefined();
  });

  it('form service rejects form creation with multiple payment buttons', async () => {
    const strapi = createMockStrapi();
    const service = formServiceFactory({ strapi });

    await expect(
      service.create({
        title: 'Form with 2 payments',
        fields: [
          { id: '1', type: 'payment', name: 'pay1' },
          { id: '2', type: 'payment', name: 'pay2' },
        ],
      })
    ).rejects.toThrow('Only one payment button is allowed per form');
  });

  it('form service rejects form update with multiple payment buttons', async () => {
    const strapi = createMockStrapi();
    const service = formServiceFactory({ strapi });

    await expect(
      service.update(1, {
        fields: [
          { id: '1', type: 'payment', name: 'pay1' },
          { id: '2', type: 'payment', name: 'pay2' },
        ],
      })
    ).rejects.toThrow('Only one payment button is allowed per form');
  });

  it('form controller rejects create request with multiple payment buttons', async () => {
    (global as any).strapi = createMockStrapi();
    const badRequest = vi.fn();
    const ctx = {
      request: {
        body: {
          fields: [
            { id: '1', type: 'payment' },
            { id: '2', type: 'payment' },
          ],
        },
      },
      badRequest,
    };

    await formController.create(ctx);
    expect(badRequest).toHaveBeenCalledWith('Only one payment button is allowed per form');
  });

  it('form controller rejects update request with multiple payment buttons', async () => {
    (global as any).strapi = createMockStrapi();
    const badRequest = vi.fn();
    const ctx = {
      params: { id: '1' },
      request: {
        body: {
          fields: [
            { id: '1', type: 'payment' },
            { id: '2', type: 'payment' },
          ],
        },
      },
      badRequest,
    };

    await formController.update(ctx);
    expect(badRequest).toHaveBeenCalledWith('Only one payment button is allowed per form');
  });
});
