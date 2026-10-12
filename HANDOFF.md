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

9. Added "Dynamic Select" component to the "Choice" category: creates a native `select` field (`type: 'select'`) pre-configured with default min: 1 and max: 4 (options 1..4). Enforced that all generated child inputs are strictly required unconditionally across admin settings, embed runtime HTML attributes, and server-side submission validation, with configurable child input constraints (type, minLength, maxLength, pattern) in the Validation tab.

10. Dynamic select validation max value capped to 100 with graceful NaN handling in `rangeOptions.ts`.
11. Removed manual options configuration list for Dynamic Select fields in `FieldSettingsPanel.tsx`.
12. Enforced child inputs are unconditionally required (`required = true`), validating each individual child input and all child inputs on submit in `validation.ts`.
13. Styled child inputs as half-width (2-column CSS grid `repeat(2, 1fr)`) across `FORM_CSS`, embed runtime in `form.ts`, and `FormPreview.tsx`.
14. Submissions table: only `Transaction ID` column kept for payments (removed `paymentStatus` and `paymentProvider`).
15. Submissions table & drawer: array values display stacked vertically one below the other instead of comma-separated on a single line.
17. Added dedicated "Logic" Tab in `FieldSettingsPanel.tsx` for all form fields with preceding field link dropdown, token inserter (`{field_name}`), and math operator shortcuts (`+`, `-`, `*`, `/`, `Math.floor`, `Math.min`, `Math.max`).
18. Dynamic Max & Min Constraint Validation: added `logicMaxFormula`, `logicMinFormula`, and `logicErrorMessage` allowing fields (e.g. parking passes) to be constrained dynamically by other fields (e.g. `Math.floor({passes} / 4)`).
19. Dynamic Field Auto-Computation: added optional `logicFormula` to automatically compute field values on the fly without phantom/calculated preview fields.
21. Real-time Reactive Validation & Recalculation: updated `FormPreview.tsx`, public embed script in `server/src/controllers/form.ts`, and server validation in `server/src/services/validation.ts` to enforce dynamic logic limits live and block submissions if constraints are violated.
22. Fixed `updatePayment` state retention bug in `FieldSettingsPanel.tsx`: `amountType: 'calculated'` was being dropped on patch updates when clicking "+ Insert into Price Formula", reverting the mode to Fixed. Spreading existing payment properties and explicitly preserving `amountType: 'calculated'` resolved the issue.
23. Restricted "Logic" Tab visibility in `FieldSettingsPanel.tsx`: hidden for non-numeric/text fields, decorative fields, dynamic select, and payment (`text`, `email`, `password`, `url`, `textarea`, `phone`, `heading`, `paragraph`, `divider`, `hidden`, `dynamic-select`, `payment`). Auto-resets tab to General if switching to a non-logic field.
24. Moved Payment Pricing Mode (Fixed vs Dynamic Formula), field token insertion, and Amount Formula directly into the General tab of the Payment field in `FieldSettingsPanel.tsx`. Added dynamic formula badges (`ƒ = ...`) to the payment field in the builder canvas (`DropZone.tsx`), Form Preview (`FormPreview.tsx`), and Style Mode (`StyleMode.tsx`).
25. Restricted field linking dropdown (`priorFields`) in `FieldSettingsPanel.tsx`: excluded non-numeric/text fields (`text`, `email`, `password`, `url`, `textarea`, `phone`, `heading`, `paragraph`, `divider`, `hidden`, `payment`), so only quantifiable inputs (`number`, `select`, `dynamic-select`, `radio`, `checkbox`, `checkbox-group`, `state`) appear in formula link dropdowns.
26. Separated Payment Amount from Transaction ID in Submissions: `transactionId` strictly displays the transaction/order ID (`getTxId`), while the `Payment` column and submitted data display the formatted payment amount (e.g. `USD 230.00`). Persisted formatted amount in `clean[paymentField.name]` and formatted payment amounts in CSV export.

27. Resolved TypeScript compilation errors in `FieldSettingsPanel.tsx`, `SubmissionsPage.tsx`, and `server/src/services/submission.ts` (`npm run test:ts:front` and `npm run test:ts:back` passing cleanly).
28. Created comprehensive new features user guide `NEW_FEATURES_README.md` and updated `README.md` covering Dynamic Select child inputs, States dropdown, PayPal dynamic pricing formulas, Field Logic tab dynamic limits, Form Scheduling (Start/Expiry dates), and Submissions management.

## Modified Files

- `admin/src/types.ts`
- `admin/src/ui.ts`
- `admin/src/utils/formula.ts`
- `admin/src/pages/FormBuilderPage.tsx`
- `admin/src/components/DropZone.tsx`
- `admin/src/components/FieldSettingsPanel.tsx`
- `admin/src/components/FormPreview.tsx`
- `admin/src/components/StyleMode.tsx`
- `admin/src/pages/SubmissionsPage.tsx`
- `server/src/utils/formula.ts`
- `server/src/controllers/form.ts`
- `server/src/services/validation.ts`
- `server/src/services/submission.ts`
- `tests/calculated-field.test.ts`
- `NEW_FEATURES_README.md`
- `README.md`
- `HANDOFF.md`

## Next 3 Tasks

1. Build and verify production bundle (`npm run build`).
2. Test live form embed script rendering with PayPal button and Dynamic Select inputs.
3. Verify server submission handling of dynamic formula payments and date-scheduled forms.


