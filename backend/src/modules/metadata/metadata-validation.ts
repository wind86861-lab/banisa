/**
 * Shared validation for metadata values.
 *
 * Used both for per-appointment medical metadata (AppointmentMetadata)
 * and per-clinic-service filterable attributes (ClinicServiceMetadata),
 * so the rules stay consistent across the two flows.
 *
 * Returns an error message string when invalid, or `null` when valid.
 */

interface MetadataTemplateLike {
  inputType: string;
  validation?: unknown;
  labelUz?: string;
}

interface MetadataValidationRules {
  min?: number;
  max?: number;
  options?: string[];
  maxLength?: number;
  required?: boolean;
}

export function validateMetadataValue(
  value: string | null | undefined,
  template: MetadataTemplateLike,
): string | null {
  const rules = (template.validation || {}) as MetadataValidationRules;
  const label = template.labelUz || 'Maydon';
  const isEmpty = value === null || value === undefined || String(value).trim() === '';

  if (isEmpty) {
    return rules.required ? `${label}: majburiy maydon` : null;
  }

  const str = String(value);

  switch (template.inputType) {
    case 'NUMBER': {
      const num = Number(str);
      if (Number.isNaN(num)) return `${label}: noto'g'ri raqam`;
      if (rules.min !== undefined && num < rules.min) return `${label}: minimal qiymat ${rules.min}`;
      if (rules.max !== undefined && num > rules.max) return `${label}: maksimal qiymat ${rules.max}`;
      break;
    }

    case 'SELECT':
      if (rules.options && rules.options.length > 0 && !rules.options.includes(str)) {
        return `${label}: noto'g'ri variant`;
      }
      break;

    case 'CHECKBOX':
      if (str !== 'true' && str !== 'false') {
        return `${label}: faqat ha/yo'q bo'lishi mumkin`;
      }
      break;

    case 'DATE':
      if (Number.isNaN(Date.parse(str))) {
        return `${label}: noto'g'ri sana`;
      }
      break;

    case 'TEXT':
    case 'TEXTAREA':
      if (rules.maxLength && str.length > rules.maxLength) {
        return `${label}: maksimal uzunlik ${rules.maxLength} belgi`;
      }
      break;
  }

  return null;
}
