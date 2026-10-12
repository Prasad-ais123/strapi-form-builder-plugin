import { evaluateFormula } from '../utils/formula';

const PLUGIN_ID = 'strapi-plugin-form-builder-cms';

export interface ValidationRule {
  type: string;
  value?: any;
  message?: string;
}

export interface PaymentConfig {
  provider: 'paypal';
  amount: number;
  currency: string;
  description?: string;
  amountType?: 'fixed' | 'calculated';
  amountFormula?: string;
}

export interface FormField {
  id: string;
  type: string;
  name: string;
  label: string;
  required: boolean;
  validation?: ValidationRule[];
  payment?: PaymentConfig;
  min?: number;
  max?: number;
  itemLabel?: string;
  itemPlaceholder?: string;
  itemRequired?: boolean;
  childType?: 'text' | 'number';
  childMinLength?: number;
  childMaxLength?: number;
  childPattern?: string;
  logicFormula?: string;
  logicMaxFormula?: string;
  logicMinFormula?: string;
  logicErrorMessage?: string;
  formula?: string;
  formulaPrefix?: string;
  formulaSuffix?: string;
  formulaDecimals?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

const validation = {
  validate(fields: FormField[], data: Record<string, any>): ValidationResult {
    const errors: Record<string, string[]> = {};
    const decorative = ['heading', 'paragraph', 'divider', 'hidden'];

    // Pre-pass: Auto-evaluate any field with logicFormula
    for (const field of fields) {
      if (field.logicFormula) {
        data[field.name] = evaluateFormula(field.logicFormula, data);
      } else if (field.type === 'calculated') {
        data[field.name] = evaluateFormula(field.formula || '', data);
      }
    }

    for (const field of fields) {
      if (decorative.includes(field.type)) continue;

      if (field.type === 'calculated') {
        const computed = Number(data[field.name] ?? 0);
        const fieldErrors: string[] = [];
        if (field.max !== undefined && computed > field.max) {
          fieldErrors.push(`${field.label} exceeds maximum allowed (${field.max})`);
        }
        if (field.min !== undefined && computed < field.min) {
          fieldErrors.push(`${field.label} is below minimum allowed (${field.min})`);
        }
        if (fieldErrors.length > 0) {
          errors[field.name] = fieldErrors;
        }
        continue;
      }

      if (field.type === 'payment') {
        if (field.payment?.amountType === 'calculated' && field.payment.amountFormula) {
          const expectedAmt = evaluateFormula(field.payment.amountFormula, data);
          const submittedAmt = data.amount !== undefined ? Number(data.amount) : undefined;
          if (submittedAmt !== undefined && Math.abs(submittedAmt - expectedAmt) > 0.01) {
            errors[field.name] = [`Payment amount mismatch: expected ${expectedAmt}, got ${submittedAmt}`];
          }
        }
        continue;
      }

      const value = data[field.name];
      const fieldErrors: string[] = [];

      // Field Logic Tab Dynamic Constraints
      if (field.logicMaxFormula) {
        const maxLimit = evaluateFormula(field.logicMaxFormula, data);
        const numVal = Number(value);
        if (!isNaN(numVal) && numVal > maxLimit) {
          fieldErrors.push(field.logicErrorMessage || `${field.label} cannot exceed ${maxLimit}`);
        }
      }
      if (field.logicMinFormula) {
        const minLimit = evaluateFormula(field.logicMinFormula, data);
        const numVal = Number(value);
        if (!isNaN(numVal) && numVal < minLimit) {
          fieldErrors.push(field.logicErrorMessage || `${field.label} must be at least ${minLimit}`);
        }
      }

      if (field.required && this.isEmpty(value)) {
        const reqRule = field.validation?.find((v) => v.type === 'required');
        fieldErrors.push(reqRule?.message || `${field.label} is required`);
      }

      if (this.isEmpty(value) && !field.required) {
        const hasLengthOrValueRule = (field.validation || []).some((r) =>
          ['minLength', 'min'].includes(r.type)
        );
        if (!hasLengthOrValueRule) continue;
      }

      // auto-validate based on field type
      if (!this.isEmpty(value)) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          fieldErrors.push(`${field.label}: enter a valid email address`);
        }
        if (field.type === 'url') {
          try {
            new URL(String(value));
          } catch {
            fieldErrors.push(`${field.label}: enter a valid URL`);
          }
        }
        if (field.type === 'number' && isNaN(Number(value))) {
          fieldErrors.push(`${field.label}: enter a valid number`);
        }
      }

      for (const rule of field.validation || []) {
        if (rule.type === 'required') continue; // handled above
        const error = this.runRule(rule, value, field, data);
        if (error) fieldErrors.push(error);
      }

      // dynamic select child inputs validation
      if (field.min !== undefined && field.max !== undefined && Number(value) > 0) {
        const childKey = field.itemLabel || field.name;
        const rawItems = data[childKey] ?? data[field.name + '[]'] ?? data[childKey + '[]'];
        const items = Array.isArray(rawItems) ? rawItems : rawItems != null ? [rawItems] : [];
        const expectedCount = Number(value);
        const labelPrefix = field.itemLabel || 'Item';
        let hasEmptyChild = false;
        if (items.length < expectedCount) {
          fieldErrors.push(
            `${field.label}: please provide all ${expectedCount} ${field.itemLabel ? field.itemLabel.toLowerCase() + 's' : 'items'}`
          );
          hasEmptyChild = true;
        }

        const emptyIndices: number[] = [];
        for (let idx = 0; idx < expectedCount; idx++) {
          const valStr = String(items[idx] ?? '').trim();
          if (!valStr) {
            emptyIndices.push(idx);
          }
        }
        if (emptyIndices.length > 0) {
          fieldErrors.push(
            `${field.label}: all ${expectedCount} ${field.itemLabel ? field.itemLabel.toLowerCase() + 's' : 'items'} are required`
          );
          for (const idx of emptyIndices) {
            fieldErrors.push(`${field.label}: ${labelPrefix} #${idx + 1} is required`);
          }
        }

        // Validate child input constraints (type, minLength, maxLength, pattern)
        items.slice(0, expectedCount).forEach((it: any, idx: number) => {
          const valStr = String(it ?? '').trim();
          if (!valStr) return;

          if (field.childType === 'number' && isNaN(Number(valStr))) {
            fieldErrors.push(`${field.label}: ${labelPrefix} #${idx + 1} must be a valid number`);
          }
          if (field.childMinLength && valStr.length < field.childMinLength) {
            fieldErrors.push(
              `${field.label}: ${labelPrefix} #${idx + 1} must be at least ${field.childMinLength} characters`
            );
          }
          if (field.childMaxLength && valStr.length > field.childMaxLength) {
            fieldErrors.push(
              `${field.label}: ${labelPrefix} #${idx + 1} must be at most ${field.childMaxLength} characters`
            );
          }
          if (field.childPattern) {
            try {
              if (!new RegExp(field.childPattern).test(valStr)) {
                fieldErrors.push(`${field.label}: ${labelPrefix} #${idx + 1} is invalid`);
              }
            } catch {
              // ignore malformed regex
            }
          }
        });
      }

      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },

  runRule(
    rule: ValidationRule,
    value: any,
    field: FormField,
    allData: Record<string, any>
  ): string | null {
    switch (rule.type) {
      case 'minLength':
        if (String(value).length < Number(rule.value))
          return rule.message || `Minimum ${rule.value} characters`;
        break;
      case 'maxLength':
        if (String(value).length > Number(rule.value))
          return rule.message || `Maximum ${rule.value} characters`;
        break;
      case 'min':
        if (Number(value) < Number(rule.value))
          return rule.message || `Minimum value is ${rule.value}`;
        break;
      case 'max':
        if (Number(value) > Number(rule.value))
          return rule.message || `Maximum value is ${rule.value}`;
        break;
      case 'pattern':
        if (!new RegExp(rule.value).test(String(value))) return rule.message || `Invalid format`;
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))
          return rule.message || `Enter a valid email address`;
        break;
      case 'url':
        try {
          new URL(String(value));
        } catch {
          return rule.message || `Enter a valid URL`;
        }
        break;
      case 'matchField':
        if (value !== allData[rule.value]) return rule.message || `Fields do not match`;
        break;
    }
    return null;
  },

  isEmpty(value: any): boolean {
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  },
};

export default () => validation;
