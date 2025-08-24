/**
 * Additional validation helper functions for name parsing
 */

import { ValidationError, ValidationErrorType } from '../types/nameParser';

/**
 * Check if input contains potentially dangerous content
 * @param input - The input string to validate
 * @returns ValidationError if dangerous content found, null otherwise
 */
export function validateSafety(input: string): ValidationError | null {
  // Check for script injection attempts
  if (input.toLowerCase().includes('<script')) {
    return {
      type: ValidationErrorType.INVALID_FORMAT,
      message: 'Input contains potentially dangerous script tags.',
      originalInput: input,
    };
  }

  // Check for javascript protocols
  if (input.toLowerCase().includes('javascript:')) {
    return {
      type: ValidationErrorType.INVALID_FORMAT,
      message: 'Input contains potentially dangerous JavaScript code.',
      originalInput: input,
    };
  }

  // Check for data URLs that could contain executable content
  if (input.toLowerCase().includes('data:')) {
    return {
      type: ValidationErrorType.INVALID_FORMAT,
      message: 'Input contains potentially dangerous data URLs.',
      originalInput: input,
    };
  }

  return null;
}

/**
 * Validate that name contains meaningful content
 * @param name - The name to validate
 * @returns ValidationError if invalid, null otherwise
 */
export function validateNameContent(name: string): ValidationError | null {
  // Check if name is just special characters or whitespace
  if (!/[a-zA-Z0-9가-힣]/.test(name)) {
    return {
      type: ValidationErrorType.INVALID_FORMAT,
      message: `Name "${name}" must contain at least one letter or number.`,
      originalInput: name,
    };
  }

  // Check for excessive special characters (more than 50% of the name)
  const specialCharCount = (name.match(/[^a-zA-Z0-9가-힣\s]/g) || []).length;
  const totalLength = name.length;
  
  if (specialCharCount / totalLength > 0.5) {
    return {
      type: ValidationErrorType.INVALID_FORMAT,
      message: `Name "${name}" contains too many special characters. Please use mostly letters and numbers.`,
      originalInput: name,
    };
  }

  return null;
}

/**
 * Generate helpful suggestions for common input errors
 * @param error - The validation error
 * @returns Helpful suggestion string
 */
export function generateErrorSuggestion(error: ValidationError): string {
  switch (error.type) {
    case ValidationErrorType.INVALID_WEIGHT:
      return 'Try using a positive whole number like: Alice*2, Bob*5, Charlie*1';
    
    case ValidationErrorType.WEIGHT_OUT_OF_RANGE:
      return 'Use a number between 1 and 10. For example: Alice*3, Bob*1, Charlie*7';
    
    case ValidationErrorType.INVALID_FORMAT:
      if (error.originalInput.includes('*')) {
        return 'Check the format. Use: Name*Number (like Alice*2) or just Name (like Bob)';
      }
      return 'Use simple names with letters, numbers, and basic punctuation only.';
    
    case ValidationErrorType.EMPTY_NAME:
      return 'Please enter a participant name. Examples: Alice, Bob*2, Charlie*3';
    
    case ValidationErrorType.DUPLICATE_NAME:
      return 'Each participant name should be unique. Try adding a number or identifier.';
    
    default:
      return 'Please check your input format and try again.';
  }
}

/**
 * Batch validate an array of inputs and return detailed error report
 * @param inputs - Array of input strings to validate
 * @returns Summary of validation results
 */
export interface ValidationSummary {
  totalInputs: number;
  validInputs: number;
  errorsByType: Record<ValidationErrorType, number>;
  suggestions: string[];
}

export function validateInputBatch(inputs: string[]): ValidationSummary {
  const summary: ValidationSummary = {
    totalInputs: inputs.length,
    validInputs: 0,
    errorsByType: {
      [ValidationErrorType.INVALID_FORMAT]: 0,
      [ValidationErrorType.EMPTY_NAME]: 0,
      [ValidationErrorType.INVALID_WEIGHT]: 0,
      [ValidationErrorType.WEIGHT_OUT_OF_RANGE]: 0,
      [ValidationErrorType.DUPLICATE_NAME]: 0,
    },
    suggestions: [],
  };

  const seenErrors = new Set<ValidationErrorType>();

  inputs.forEach(input => {
    const trimmed = input.trim();
    
    if (!trimmed) {
      summary.errorsByType[ValidationErrorType.EMPTY_NAME]++;
      seenErrors.add(ValidationErrorType.EMPTY_NAME);
      return;
    }

    // Basic format check
    const hasWeight = /\*/.test(trimmed);
    if (hasWeight) {
      const weightMatch = trimmed.match(/\*([^*]+)$/);
      if (!weightMatch || !/^[1-9][0-9]*$/.test(weightMatch[1])) {
        summary.errorsByType[ValidationErrorType.INVALID_WEIGHT]++;
        seenErrors.add(ValidationErrorType.INVALID_WEIGHT);
        return;
      }
    }

    summary.validInputs++;
  });

  // Generate suggestions based on errors found
  seenErrors.forEach(errorType => {
    const mockError: ValidationError = {
      type: errorType,
      message: '',
      originalInput: '',
    };
    summary.suggestions.push(generateErrorSuggestion(mockError));
  });

  return summary;
}