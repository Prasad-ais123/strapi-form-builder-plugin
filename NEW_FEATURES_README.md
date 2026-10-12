# Strapi Form Builder — New Features & Extended Guide

This guide details all new fields, dynamic logic capabilities, payment integration, form scheduling, and submission management features added to the Strapi Form Builder plugin.

---

## Table of Contents

1. [Dynamic Select Field](#1-dynamic-select-field)
2. [States / Provinces Dropdown Field](#2-states--provinces-dropdown-field)
3. [PayPal Payment Button & Dynamic Pricing](#3-paypal-payment-button--dynamic-pricing)
4. [Field Logic & Real-Time Dynamic Constraints](#4-field-logic--real-time-dynamic-constraints)
5. [Form Scheduling (Start Date & Expiry Date)](#5-form-scheduling-start-date--expiry-date)
6. [Submissions Inbox & CSV Export Enhancements](#6-submissions-inbox--csv-export-enhancements)
7. [End-to-End Real World Example](#7-end-to-end-real-world-example)

---

## 1. Dynamic Select Field

The **Dynamic Select** field (`dynamic-select`) is an interactive quantity selector that automatically generates child input fields in real time based on the selected value.

### Key Capabilities
- **Preconfigured Range Dropdown**: Choose minimum and maximum allowed items (default: `1` to `4`, up to `100`). Options are generated dynamically without manual option entry.
- **Dynamic Child Inputs**: Selecting `3` renders 3 child inputs on the fly in a responsive 2-column grid layout.
- **Strict Validation**: All generated child inputs are unconditionally required.
- **Configurable Child Rules**:
  - **Child Item Label**: Custom label for each generated field (e.g. `Attendee`, `Store`, `Team Member`).
  - **Child Placeholder**: Custom placeholder (e.g. `Enter Attendee Name`).
  - **Child Input Type**: `text` or `number`.
  - **Child Constraints**: `childMinLength`, `childMaxLength`, and `childPattern` (regular expression).

### How to Use in the Builder
1. In the Form Builder palette under **Choice**, click **Dynamic Select**.
2. Click the field to open **Field settings**:
   - **General tab**:
     - **Label**: e.g. `Number of Attendees`.
     - **Name (technical)**: e.g. `attendees`.
     - **Min value** and **Max value**: Set lower and upper limit (e.g. `1` and `10`).
     - **Child item label**: e.g. `Attendee Name`.
     - **Child placeholder**: e.g. `Full Name`.
   - **Validation tab**:
     - Set **Child input type** (`Text` or `Number`).
     - Configure **Child min length**, **Child max length**, or **Child pattern (regex)**.
3. In preview or live forms, choosing a number immediately generates the corresponding child input rows.

---

## 2. States / Provinces Dropdown Field

The **States** field (`state`) provides a pre-populated dropdown for administrative subdivisions across 12 countries.

### Supported Countries
- **US** — United States (50 States + District of Columbia)
- **CA** — Canada (10 Provinces + 3 Territories)
- **IN** — India (28 States + 8 Union Territories)
- **GB** — United Kingdom (England, Scotland, Wales, Northern Ireland)
- **AU** — Australia (6 States + 2 Territories)
- **DE** — Germany (16 Federal States)
- **FR** — France (18 Administrative Regions)
- **MX** — Mexico (31 States + Mexico City)
- **BR** — Brazil (26 States + Federal District)
- **ES** — Spain (17 Autonomous Communities + 2 Autonomous Cities)
- **IT** — Italy (20 Regions)
- **JP** — Japan (47 Prefectures)

### How to Use in the Builder
1. In the Form Builder palette under **Choice**, click **States**.
2. In **Field settings** -> **General tab**:
   - Set **Label** (e.g. `State / Province`).
   - Under **Country**, pick the target country from the dropdown.
   - The dropdown options automatically populate with standard state names and ISO codes.

---

## 3. PayPal Payment Button & Dynamic Pricing

The **Payment** field (`payment`) integrates PayPal checkout directly into forms.

### Single Button Enforcement
To prevent conflicting transactions, forms are strictly capped to **a maximum of 1 payment button per form**. This limit is enforced across the admin palette, canvas drag-and-drop, backend form service, and API controller.

### Pricing Modes
1. **Fixed Mode**:
   - Charge a static fee (e.g. `$25.00`).
   - Specify fallback amount, description, and currency (USD).
2. **Dynamic Formula Mode**:
   - Calculate checkout price dynamically using references to preceding form fields.
   - Formula syntax uses `{field_name}` tokens:
     ```text
     ({tickets} * 50) + ({parking_passes} * 15)
     ```
   - **Link Preceding Field**: Select any preceding quantifiable field and click **+ Insert** to insert `{field_name}` directly into the formula.
   - **Visual Canvas Badges**: The canvas and preview display an indicator badge `ƒ = {formula}` showing the active dynamic price calculation.

### Tamper Protection
When a user checks out with PayPal, the backend re-evaluates the mathematical formula against the validated submission data. If the submitted payment amount does not match the server-calculated formula, the transaction is rejected with `400 Payment amount mismatch`.

---

## 4. Field Logic & Real-Time Dynamic Constraints

The **Logic** tab in the Field Settings panel unlocks advanced cross-field validation and reactive auto-computation.

### Visibility & Field Support
- Available on quantifiable input fields (`number`, `select`, `dynamic-select`, `radio`, `checkbox`, `checkbox-group`, `state`).
- Excluded on non-numeric or decorative fields (`text`, `email`, `password`, `url`, `textarea`, `phone`, `heading`, `paragraph`, `divider`, `hidden`, `payment`).

### Formula Engine & Math Helpers
Formulas support arithmetic operators (`+`, `-`, `*`, `/`) and safe standard `Math` functions:
- `Math.floor(x)` — Round down (ideal for ratio limits, e.g. 1 pass per 4 tickets)
- `Math.ceil(x)` — Round up
- `Math.round(x)` — Round to nearest integer
- `Math.min(a, b)` — Cap at maximum threshold
- `Math.max(a, b)` — Enforce minimum threshold
- `Math.abs(x)`, `Math.pow(x, y)`

*Note: Arbitrary JavaScript execution is strictly sanitized and blocked for security.*

### Features in the Logic Tab
1. **Dynamic Max Limit Constraint (`logicMaxFormula`)**:
   - Caps the allowed value of this field based on other inputs.
   - Example: 1 parking pass allowed per 4 tickets:
     ```text
     Math.floor({tickets} / 4)
     ```
   - **Error Message if Exceeded (`logicErrorMessage`)**: Custom message displayed when the limit is exceeded (e.g. `Parking passes cannot exceed 1 per 4 event tickets`).
2. **Auto-Compute Field Value (`logicFormula`)**:
   - Automatically computes this field's value live based on preceding fields.
   - Example: Auto-calculating total passes from stores:
     ```text
     {stores} * 2
     ```
   - Computed fields update automatically in the live preview and embedded form.

---

## 5. Form Scheduling (Start Date & Expiry Date)

Control the exact date and time window during which forms accept responses.

### Configuration
1. Open the form in the Form Builder.
2. Open the **Settings** drawer (top-right).
3. Under **Form Scheduling**:
   - **Start Date**: Datetime before which submissions are blocked.
   - **Expiry Date**: Datetime after which submissions are blocked.

### Runtime Guards
- **Live Form & Embed Script**:
  - Before Start Date: Renders `This form is not yet accepting responses.`
  - After Expiry Date: Renders `This form has expired and is no longer accepting responses.`
- **Backend API**:
  - If a submission is attempted outside the active window, the server returns a `400 Bad Request` with `FormNotStartedError` or `FormExpiredError`.

---

## 6. Submissions Inbox & CSV Export Enhancements

The Submissions view and export engine include several major workflow upgrades:

1. **Transaction ID & Payment Separation**:
   - **Transaction ID** column cleanly stores and displays the PayPal transaction / order ID.
   - **Payment** column displays the formatted currency amount (e.g. `USD 125.00`).
   - Normalizes legacy payment aliases (`orderId`, `paypal_payment`, `paymentId`, `payment_id`, `transaction_id`) to prevent duplicate columns.
2. **Vertically Stacked Array Display**:
   - Child inputs generated from Dynamic Select fields and multi-select Checkbox Groups display stacked vertically on individual rows instead of compressed comma-separated lines.
3. **Enhanced CSV Export**:
   - Dedicated columns for `paymentStatus`, `transactionId`, `amount`, `paymentCurrency`, `paymentProvider`.
   - Formatted payment totals and separated dynamic item keys.

---

## 7. End-to-End Real World Example

### Scenario: Event Registration with Passes, Parking Ratio & PayPal Checkout

| Field Order | Field Type | Field Label | Technical Name | Configuration |
|---|---|---|---|---|
| 1 | `dynamic-select` | Attendees | `attendees` | Min: `1`, Max: `8`, Child Label: `Attendee Name` |
| 2 | `number` | Event Passes | `passes` | General: Width `half`<br>Logic Tab: Auto-compute `logicFormula`: `{attendees} * 2` |
| 3 | `number` | Parking Passes | `parking` | General: Width `half`<br>Logic Tab: Max Limit `logicMaxFormula`: `Math.floor({passes} / 4)`<br>Error message: `Maximum 1 parking pass per 4 event passes.` |
| 4 | `state` | State | `state` | Country: `US` |
| 5 | `payment` | Checkout | `checkout` | Pricing Mode: `Dynamic Formula`<br>Formula: `({passes} * 25) + ({parking} * 10)`<br>Currency: `USD` |

### How It Functions
1. The visitor selects `3` attendees in the dropdown -> 3 name input fields appear.
2. `Event Passes` auto-calculates to `6` (3 * 2).
3. Under `Parking Passes`, entering `2` exceeds the limit (`Math.floor(6 / 4) = 1`). A red error message appears: *"Maximum 1 parking pass per 4 event passes."*
4. Changing parking passes to `1` clears the error.
5. The PayPal checkout button updates its badge in real-time: `USD 160.00` `ƒ = ({passes} * 25) + ({parking} * 10)`.
6. On submission, the backend verifies that all child inputs are filled, validates the ratio constraints, re-computes the $160.00 total, and records the PayPal transaction.
