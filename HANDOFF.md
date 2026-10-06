# Handoff

## Status

Completed:

1. Enforced single payment button limit per form across admin UI palette, form builder addField handler, backend service, and form controller.
2. Form-level "Start Date" and "Expiry Date" settings implemented with admin UI, public schema serialization, backend submission guards, embed script rendering, and tests.
3. Updated "Redirect URL after submit" default to `null` so forms display success screens by default instead of redirecting.
4. Restricted payment currency options to USD only in the admin field settings panel.
5. Added dedicated payment columns (`paymentStatus`, `transactionId`, `amount`, `paymentCurrency`, `paymentProvider`) to the `form-submission` schema, submission persistence, CSV export, and the admin Submissions table and drawer.

6. Added HTML validation attributes (`min`, `max`, `minLength`, `maxLength`, `pattern`) and `data-validation` JSON to embed script fields in form controller.

7. Unified payment and transaction id: resolved all aliases (`payment`, `orderId`, `paypal_payment`, `paymentId`, `transaction_id`) directly into `transactionId`, eliminating duplicate "Payment" columns in the admin Submissions table, CSV export, and detail drawer.

8. Added "States" component to the "Choice" category: creates a native `select` field pre-configured with country state options and a configurable Country selector in field settings (US, CA, IN, GB, AU, DE, FR, MX, BR, ES, IT, JP) that automatically populates the dropdown options with that country's states/provinces.

## Modified Files

- `admin/src/data/countriesStates.ts`
- `admin/src/types.ts`
- `admin/src/ui.ts`
- `admin/src/pages/FormBuilderPage.tsx`
- `admin/src/components/FieldSettingsPanel.tsx`
- `admin/src/components/FormPreview.tsx`
- `admin/src/components/StyleMode.tsx`
- `server/src/controllers/form.ts`
- `tests/state-field.test.ts`
- `HANDOFF.md`

## Next 3 Tasks

1. Test adding the "States" field from the "Choice" palette in the admin builder.
2. Verify switching the country in Field Settings re-populates the state options (e.g. US, Canada, India).
3. Test embedding the form and verify the states dropdown renders and submits selected state correctly.

