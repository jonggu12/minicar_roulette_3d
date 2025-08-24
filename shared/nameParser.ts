/**
 * Name input parsing utilities for racing participant management
 * Handles parsing of 'name*weight' format inputs with comprehensive validation
 */

import {
  RawNameInput,
  ParticipantEntry,
  ParsingOptions,
  ValidationError,
  ValidationErrorType,
  ParsingResult,
  DEFAULT_PARSING_OPTIONS,
} from './types/nameParser';

/**
 * Regular expression patterns for parsing name*weight inputs
 */
const PARSING_PATTERNS = {
  // Matches: "name*weight" format (e.g., "Alice*2", "Bob*3") - INTEGER WEIGHTS ONLY
  WITH_WEIGHT: /^(.+?)\*([1-9][0-9]*)$/,
  
  // Matches: just name without weight (e.g., "Alice", "Bob")
  NAME_ONLY: /^(.+)$/,
  
  // Validates name contains only allowed characters (letters, numbers, spaces, basic punctuation)
  VALID_NAME: /^[a-zA-Z0-9가-힣\s\-_.,!?()]+$/,
  
  // Validates weight is a positive integer (no decimals, no zero)
  VALID_WEIGHT: /^[1-9][0-9]*$/,
} as const;

/**
 * Parse a single name input string into a ParticipantEntry
 * @param input - Raw input string in format 'name*weight' or just 'name'
 * @param options - Parsing configuration options
 * @returns Parsed participant entry or validation error
 */
export function parseSingleInput(
  input: RawNameInput,
  options: ParsingOptions = DEFAULT_PARSING_OPTIONS
): { entry?: ParticipantEntry; error?: ValidationError } {
  const trimmedInput = input.trim();
  
  // Check for empty input
  if (!trimmedInput) {
    return {
      error: {
        type: ValidationErrorType.EMPTY_NAME,
        message: 'Input cannot be empty. Please provide a participant name.',
        originalInput: input,
      },
    };
  }

  // Check for inputs that are too long (prevent abuse)
  if (trimmedInput.length > 100) {
    return {
      error: {
        type: ValidationErrorType.INVALID_FORMAT,
        message: 'Input is too long (max 100 characters). Please use a shorter name.',
        originalInput: input,
      },
    };
  }

  // Check for suspicious patterns that might indicate malicious input
  if (trimmedInput.includes('<script') || trimmedInput.includes('javascript:') || trimmedInput.includes('data:')) {
    return {
      error: {
        type: ValidationErrorType.INVALID_FORMAT,
        message: 'Input contains prohibited characters or patterns.',
        originalInput: input,
      },
    };
  }

  let name: string;
  let weight: number = 1.0; // Default weight

  // Try to match name*weight pattern first
  const withWeightMatch = trimmedInput.match(PARSING_PATTERNS.WITH_WEIGHT);
  if (withWeightMatch) {
    name = withWeightMatch[1].trim();
    const weightString = withWeightMatch[2];
    
    // Validate weight format
    if (!PARSING_PATTERNS.VALID_WEIGHT.test(weightString)) {
      return {
        error: {
          type: ValidationErrorType.INVALID_WEIGHT,
          message: `Invalid weight format: "${weightString}". Weight must be a positive integer (1, 2, 3, etc.).`,
          originalInput: input,
        },
      };
    }
    
    weight = parseInt(weightString, 10);
  } else {
    // Try name-only pattern
    const nameOnlyMatch = trimmedInput.match(PARSING_PATTERNS.NAME_ONLY);
    if (nameOnlyMatch) {
      name = nameOnlyMatch[1].trim();
    } else {
      return {
        error: {
          type: ValidationErrorType.INVALID_FORMAT,
          message: `Invalid input format: "${input}"`,
          originalInput: input,
        },
      };
    }
  }

  // Validate name
  if (!name || name.trim() === '') {
    return {
      error: {
        type: ValidationErrorType.EMPTY_NAME,
        message: 'Name cannot be empty. Please provide a valid participant name.',
        originalInput: input,
      },
    };
  }

  // Check name length limits
  if (name.length < 1 || name.length > 50) {
    return {
      error: {
        type: ValidationErrorType.INVALID_FORMAT,
        message: `Name "${name}" must be between 1 and 50 characters long.`,
        originalInput: input,
      },
    };
  }

  if (!PARSING_PATTERNS.VALID_NAME.test(name)) {
    return {
      error: {
        type: ValidationErrorType.INVALID_FORMAT,
        message: `Name "${name}" contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed.`,
        originalInput: input,
      },
    };
  }

  // Check for names that are just whitespace or special characters
  if (!/[a-zA-Z0-9가-힣]/.test(name)) {
    return {
      error: {
        type: ValidationErrorType.INVALID_FORMAT,
        message: `Name "${name}" must contain at least one letter or number.`,
        originalInput: input,
      },
    };
  }

  // Validate weight range
  if (weight < options.minWeight || weight > options.maxWeight) {
    return {
      error: {
        type: ValidationErrorType.WEIGHT_OUT_OF_RANGE,
        message: `Weight ${weight} is outside allowed range (${options.minWeight}-${options.maxWeight}). Each participant can have between ${options.minWeight} and ${options.maxWeight} cars.`,
        originalInput: input,
      },
    };
  }

  return {
    entry: {
      name,
      weight,
      originalInput: input,
    },
  };
}

/**
 * Parse multiple name inputs with comprehensive error handling
 * @param inputs - Array of raw input strings
 * @param options - Parsing configuration options
 * @returns Complete parsing result with entries and errors
 */
export function parseNameInputs(
  inputs: RawNameInput[],
  options: ParsingOptions = DEFAULT_PARSING_OPTIONS
): ParsingResult {
  const participants: ParticipantEntry[] = [];
  const errors: ValidationError[] = [];
  const seenNames = new Set<string>();
  let duplicatesHandled = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const parseResult = parseSingleInput(input, options);

    if (parseResult.error) {
      errors.push({
        ...parseResult.error,
        index: i,
      });
      continue;
    }

    if (!parseResult.entry) {
      continue; // Should not happen, but safety check
    }

    const entry = parseResult.entry;
    const nameLower = entry.name.toLowerCase();

    // Handle duplicates
    if (seenNames.has(nameLower)) {
      duplicatesHandled++;
      
      switch (options.duplicateHandling) {
        case 'error':
          errors.push({
            type: ValidationErrorType.DUPLICATE_NAME,
            message: `Duplicate name found: "${entry.name}"`,
            originalInput: input,
            index: i,
          });
          continue;

        case 'replace':
          // Remove previous entry with same name
          const existingIndex = participants.findIndex(
            p => p.name.toLowerCase() === nameLower
          );
          if (existingIndex !== -1) {
            participants.splice(existingIndex, 1);
          }
          break;

        case 'merge':
          // Find existing entry and merge weights
          const existingEntry = participants.find(
            p => p.name.toLowerCase() === nameLower
          );
          if (existingEntry) {
            existingEntry.weight += entry.weight;
            existingEntry.originalInput += `, ${entry.originalInput}`;
            continue;
          }
          break;
          
        default:
          // Default behavior is to merge
          const defaultExistingEntry = participants.find(
            p => p.name.toLowerCase() === nameLower
          );
          if (defaultExistingEntry) {
            defaultExistingEntry.weight += entry.weight;
            defaultExistingEntry.originalInput += `, ${entry.originalInput}`;
            continue;
          }
          break;
      }
    }

    seenNames.add(nameLower);
    participants.push(entry);
  }

  // Apply weight normalization if requested
  let finalParticipants = participants;
  if (options.normalizeWeights && participants.length > 0) {
    finalParticipants = normalizeWeights(participants, 1.0);
  }

  return {
    participants: finalParticipants,
    errors,
    isValid: errors.length === 0,
    stats: {
      totalInputs: inputs.length,
      successfullyParsed: participants.length,
      errorCount: errors.length,
      duplicatesHandled,
    },
  };
}

/**
 * Convenience function to parse a single string with multiple entries
 * Supports comma, semicolon, or newline separated entries
 * @param inputString - Single string containing multiple entries
 * @param options - Parsing configuration options
 * @returns Complete parsing result
 */
export function parseNameString(
  inputString: string,
  options: ParsingOptions = DEFAULT_PARSING_OPTIONS
): ParsingResult {
  // Split by common separators
  const inputs = inputString
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return parseNameInputs(inputs, options);
}

/**
 * Normalize weights so they sum to 1.0 (or specified target)
 * @param participants - Array of participant entries to normalize
 * @param targetSum - Target sum for all weights (default: 1.0)
 * @returns New array with normalized weights
 */
export function normalizeWeights(
  participants: ParticipantEntry[],
  targetSum: number = 1.0
): ParticipantEntry[] {
  if (participants.length === 0) {
    return [];
  }

  const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
  
  if (totalWeight === 0) {
    // If all weights are 0, distribute equally
    const equalWeight = targetSum / participants.length;
    return participants.map(p => ({
      ...p,
      weight: equalWeight,
    }));
  }

  const factor = targetSum / totalWeight;
  return participants.map(p => ({
    ...p,
    weight: p.weight * factor,
  }));
}