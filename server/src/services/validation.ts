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
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

const validation = {
  validate(fields: FormField[], data: Record<string, any>): ValidationResult {
    const errors: Record<string, string[]> = {};
    const decorative = ['heading', 'paragraph', 'divider', 'hidden', 'payment'];

    for (const field of fields) {
      if (decorative.includes(field.type)) continue;

      const value = data[field.name];
      const fieldErrors: string[] = [];

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

        for (let idx = 0; idx < expectedCount; idx++) {
          const valStr = String(items[idx] ?? '').trim();
          if (!valStr) {
            hasEmptyChild = true;
            fieldErrors.push(`${field.label}: ${labelPrefix} #${idx + 1} is required`);
          }
        }
        if (
          hasEmptyChild &&
          !fieldErrors.includes(
            `${field.label}: all ${expectedCount} ${field.itemLabel ? field.itemLabel.toLowerCase() + 's' : 'items'} are required`
          )
        ) {
          fieldErrors.push(
            `${field.label}: all ${expectedCount} ${field.itemLabel ? field.itemLabel.toLowerCase() + 's' : 'items'} are required`
          );
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
