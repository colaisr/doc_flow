/**
 * Merge Fields utility functions
 * Handles detection, validation, and management of merge fields in templates
 */

import { LEAD_FIELD_SECTIONS } from './leadFields';

export interface MergeField {
  fieldKey: string;
  label: string;
  section: string;
}

const MERGE_FIELD_REGEX = /\{\{lead\.(\w+)\}\}/g;

/**
 * Detect all merge fields in content
 */
export function detectMergeFields(content: string): string[] {
  const matches: string[] = [];
  let match;
  
  while ((match = MERGE_FIELD_REGEX.exec(content)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Get all available lead fields as merge field options
 */
export function getAvailableMergeFields(): MergeField[] {
  const fields: MergeField[] = [];
  
  LEAD_FIELD_SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      fields.push({
        fieldKey: field.key,
        label: field.label,
        section: section.name,
      });
    });
  });
  
  return fields;
}

/**
 * Get merge field info by key
 */
export function getMergeFieldInfo(fieldKey: string): MergeField | null {
  const allFields = getAvailableMergeFields();
  return allFields.find(f => f.fieldKey === fieldKey) || null;
}

/**
 * Validate that all merge fields in content exist in available fields
 */
export function validateMergeFields(content: string): {
  valid: boolean;
  invalidFields: string[];
} {
  const detectedFields = detectMergeFields(content);
  const availableFieldKeys = getAvailableMergeFields().map(f => f.fieldKey);
  
  const invalidFields = detectedFields.filter(
    fieldKey => !availableFieldKeys.includes(fieldKey)
  );
  
  return {
    valid: invalidFields.length === 0,
    invalidFields,
  };
}

/**
 * Format merge field for display (convert key to Hebrew label)
 */
export function formatMergeFieldForDisplay(fieldKey: string): string {
  const fieldInfo = getMergeFieldInfo(fieldKey);
  return fieldInfo ? fieldInfo.label : `[שדה לא נמצא: ${fieldKey}]`;
}

/**
 * Create merge field placeholder text
 */
export function createMergeFieldPlaceholder(fieldKey: string): string {
  return `{{lead.${fieldKey}}}`;
}

