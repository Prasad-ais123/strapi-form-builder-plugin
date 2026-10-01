# Handoff

## Status

Completed:
1. Form-level "Start Date" and "Expiry Date" settings implemented with admin UI, public schema serialization, backend submission guards, embed script rendering, and tests.
2. Updated "Redirect URL after submit" default to `"/"`.

## Modified Files

- `admin/src/types.ts`
- `admin/src/pages/FormBuilderPage.tsx`
- `server/src/content-types/form/schema.json`
- `server/src/services/form.ts`
- `server/src/services/submission.ts`
- `server/src/controllers/submission.ts`
- `server/src/controllers/form.ts`
- `tests/public-schema.test.ts`
- `tests/expiry.test.ts`
- `tests/redirect.test.ts`

## Next 3 Tasks

1. Verify form submission redirect flow navigating to `"/"` upon success.
2. Test schedule boundary transitions (`startDate` and `expiryDate`) in live Strapi app.
3. Validate alert / notification feedback in Next.js frontend embedding.
