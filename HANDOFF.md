# Handoff

## Status

Completed: Payment field icon updated from rupee (`₹`) to dollar (`$`) in the card palette.

## Modified Files

- `admin/src/types.ts`
- `admin/src/ui.ts`
- `admin/src/pages/FormBuilderPage.tsx`
- `admin/src/pages/FormListPage.tsx`
- `admin/src/components/FieldSettingsPanel.tsx`
- `admin/src/components/FormPreview.tsx`
- `admin/src/components/StyleMode.tsx`
- `server/src/controllers/form.ts`
- `server/src/services/validation.ts`

## Next 3 Tasks

1. Implement Next.js client-side rendering for `field.type === 'payment'`.
2. Add PayPal SDK / order creation & capture endpoints.
3. Add Payment Transaction schema and submission synchronization.
