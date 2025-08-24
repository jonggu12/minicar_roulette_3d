/**
 * Type definitions for name input parsing system
 * Handles parsing of 'name*weight' format inputs for racing participants
 */

/**
 * Raw input string in the format 'name*weight' or just 'name'
 * Examples: 'Alice*2', 'Bob*1.5', 'Charlie'
 */
export type RawNameInput = string;

/**
 * Parsed individual participant entry
 */
export interface ParticipantEntry {
  /** The participant's name (trimmed and validated) */
  name: string;
  /** 
   * The participant's weight/probability multiplier
   * Default is 1.0 if not specified in input
   */
  weight: number;
  /** 
   * Original input string for reference and error reporting
   */
  originalInput: string;
}

/**
 * Result of parsing a batch of name inputs
 */
export interface ParsedParticipants {
  /** Successfully parsed participants */
  participants: ParticipantEntry[];
  /** Number of participants */
  count: number;
  /** Sum of all weights before normalization */
  totalWeight: number;
  /** Whether any duplicates were found and handled */
  hasDuplicates: boolean;
}

/**
 * Configuration options for parsing behavior
 */
export interface ParsingOptions {
  /** How to handle duplicate names */
  duplicateHandling: 'merge' | 'replace' | 'error';
  /** Whether to normalize weights to sum to 1.0 */
  normalizeWeights: boolean;
  /** Minimum allowed weight value */
  minWeight: number;
  /** Maximum allowed weight value */
  maxWeight: number;
  /** Whether to allow empty names */
  allowEmptyNames: boolean;
}

/**
 * Default parsing options
 */
export const DEFAULT_PARSING_OPTIONS: ParsingOptions = {
  duplicateHandling: 'merge',
  normalizeWeights: true,
  minWeight: 1,     // Minimum 1 car per participant
  maxWeight: 10,    // Maximum 10 cars per participant (integer only)
  allowEmptyNames: false,
};

/**
 * Validation error types
 */
export enum ValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  EMPTY_NAME = 'EMPTY_NAME',
  INVALID_WEIGHT = 'INVALID_WEIGHT',
  WEIGHT_OUT_OF_RANGE = 'WEIGHT_OUT_OF_RANGE',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
}

/**
 * Detailed validation error information
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  originalInput: string;
  index?: number;
}

/**
 * Result of parsing with validation errors
 */
export interface ParsingResult {
  /** Successfully parsed participants */
  participants: ParticipantEntry[];
  /** Any validation errors encountered */
  errors: ValidationError[];
  /** Whether parsing was completely successful */
  isValid: boolean;
  /** Summary statistics */
  stats: {
    totalInputs: number;
    successfullyParsed: number;
    errorCount: number;
    duplicatesHandled: number;
  };
}