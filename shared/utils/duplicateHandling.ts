/**
 * Enhanced duplicate handling utilities for name parsing
 * Provides additional functions for managing duplicate entries
 */

import { ParticipantEntry, ValidationError, ValidationErrorType } from '../types/nameParser';

/**
 * Find all duplicate names in a list of entries (case-insensitive)
 * @param entries - Array of participant entries to check
 * @returns Object with duplicate names and their counts
 */
export function findDuplicates(entries: ParticipantEntry[]): Record<string, ParticipantEntry[]> {
  const duplicates: Record<string, ParticipantEntry[]> = {};
  const nameCount: Record<string, ParticipantEntry[]> = {};

  // Group entries by lowercase name
  entries.forEach(entry => {
    const nameLower = entry.name.toLowerCase();
    if (!nameCount[nameLower]) {
      nameCount[nameLower] = [];
    }
    nameCount[nameLower].push(entry);
  });

  // Find names that appear more than once
  Object.entries(nameCount).forEach(([nameLower, entryList]) => {
    if (entryList.length > 1) {
      duplicates[nameLower] = entryList;
    }
  });

  return duplicates;
}

/**
 * Generate suggestions for resolving duplicate names
 * @param duplicates - Object from findDuplicates function
 * @returns Array of suggestion strings
 */
export function generateDuplicateResolutions(duplicates: Record<string, ParticipantEntry[]>): string[] {
  const suggestions: string[] = [];

  Object.entries(duplicates).forEach(([nameLower, entries]) => {
    const originalName = entries[0].name;
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    
    suggestions.push(
      `"${originalName}" appears ${entries.length} times. ` +
      `Consider: "${originalName}*${totalWeight}" (merged) or ` +
      `"${originalName}1", "${originalName}2", etc. (numbered)`
    );
  });

  return suggestions;
}

/**
 * Merge duplicate entries by combining their weights
 * @param entries - Array of entries that are duplicates of each other
 * @returns Single merged entry
 */
export function mergeDuplicateEntries(entries: ParticipantEntry[]): ParticipantEntry {
  if (entries.length === 0) {
    throw new Error('Cannot merge empty array of entries');
  }

  if (entries.length === 1) {
    return entries[0];
  }

  const mergedWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const mergedInput = entries.map(entry => entry.originalInput).join(', ');

  return {
    name: entries[0].name, // Use the first entry's name (preserving case)
    weight: mergedWeight,
    originalInput: mergedInput,
  };
}

/**
 * Create numbered versions of duplicate names
 * @param entries - Array of entries that are duplicates of each other
 * @returns Array of entries with numbered names
 */
export function numberDuplicateEntries(entries: ParticipantEntry[]): ParticipantEntry[] {
  if (entries.length <= 1) {
    return entries;
  }

  return entries.map((entry, index) => ({
    ...entry,
    name: `${entry.name}${index + 1}`,
  }));
}

/**
 * Validate that duplicate handling was successful
 * @param entries - Array of participant entries to validate
 * @returns Array of validation errors if duplicates still exist
 */
export function validateNoDuplicates(entries: ParticipantEntry[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenNames = new Set<string>();

  entries.forEach((entry, index) => {
    const nameLower = entry.name.toLowerCase();
    if (seenNames.has(nameLower)) {
      errors.push({
        type: ValidationErrorType.DUPLICATE_NAME,
        message: `Duplicate name still exists after processing: "${entry.name}"`,
        originalInput: entry.originalInput,
        index,
      });
    }
    seenNames.add(nameLower);
  });

  return errors;
}

/**
 * Get statistics about duplicate handling
 * @param originalCount - Original number of entries before deduplication
 * @param finalCount - Final number of entries after deduplication
 * @param duplicatesHandled - Number of duplicate entries that were processed
 * @returns Statistics object
 */
export interface DuplicateStats {
  originalCount: number;
  finalCount: number;
  duplicatesHandled: number;
  duplicatesRemoved: number;
  compressionRatio: number;
}

export function getDuplicateStats(
  originalCount: number,
  finalCount: number,
  duplicatesHandled: number
): DuplicateStats {
  const duplicatesRemoved = originalCount - finalCount;
  const compressionRatio = finalCount / originalCount;

  return {
    originalCount,
    finalCount,
    duplicatesHandled,
    duplicatesRemoved,
    compressionRatio,
  };
}