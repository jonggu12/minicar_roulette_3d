/**
 * Weight normalization utilities specifically for racing applications
 * Handles integer-based weight normalization for car counts
 */

import { ParticipantEntry } from '../types/nameParser';

export interface NormalizationResult {
  participants: ParticipantEntry[];
  totalCars: number;
  originalTotal: number;
  adjustmentsMade: boolean;
  adjustmentDetails: string[];
}

/**
 * Normalize weights to integer car counts with a target total
 * This ensures each participant gets a whole number of cars
 * @param participants - Array of participant entries
 * @param targetTotal - Target total number of cars (default: 20 for a typical race)
 * @returns Normalization result with integer car counts
 */
export function normalizeToCarCounts(
  participants: ParticipantEntry[],
  targetTotal: number = 20
): NormalizationResult {
  if (participants.length === 0) {
    return {
      participants: [],
      totalCars: 0,
      originalTotal: 0,
      adjustmentsMade: false,
      adjustmentDetails: [],
    };
  }

  const originalTotal = participants.reduce((sum, p) => sum + p.weight, 0);
  const adjustmentDetails: string[] = [];
  let adjustmentsMade = false;

  // If original total equals target, no normalization needed
  if (originalTotal === targetTotal) {
    return {
      participants: [...participants],
      totalCars: targetTotal,
      originalTotal,
      adjustmentsMade: false,
      adjustmentDetails: ['No normalization needed - weights already sum to target'],
    };
  }

  // Calculate proportional distribution
  const normalizedParticipants = participants.map(p => {
    const proportion = p.weight / originalTotal;
    const idealCars = proportion * targetTotal;
    const carCount = Math.max(1, Math.round(idealCars)); // Ensure at least 1 car
    
    return {
      ...p,
      weight: carCount,
    };
  });

  // Check if total matches target after rounding
  let currentTotal = normalizedParticipants.reduce((sum, p) => sum + p.weight, 0);
  
  if (currentTotal !== targetTotal) {
    adjustmentsMade = true;
    adjustmentDetails.push(`Initial rounding resulted in ${currentTotal} cars, target is ${targetTotal}`);
    
    // Adjust to match target total
    const difference = targetTotal - currentTotal;
    
    if (difference > 0) {
      // Need to add cars - give to participants with highest fractional parts
      const fractionalParts = participants.map((p, index) => ({
        index,
        fractionalPart: (p.weight / originalTotal * targetTotal) % 1,
        participant: normalizedParticipants[index],
      })).sort((a, b) => b.fractionalPart - a.fractionalPart);

      for (let i = 0; i < difference; i++) {
        fractionalParts[i % fractionalParts.length].participant.weight += 1;
        adjustmentDetails.push(`Added 1 car to ${fractionalParts[i % fractionalParts.length].participant.name}`);
      }
    } else {
      // Need to remove cars - take from participants with most cars first
      const sortedByWeight = normalizedParticipants
        .map((p, index) => ({ index, participant: p }))
        .sort((a, b) => b.participant.weight - a.participant.weight);

      for (let i = 0; i < Math.abs(difference); i++) {
        const target = sortedByWeight[i % sortedByWeight.length].participant;
        if (target.weight > 1) { // Never go below 1 car
          target.weight -= 1;
          adjustmentDetails.push(`Removed 1 car from ${target.name}`);
        }
      }
    }

    currentTotal = normalizedParticipants.reduce((sum, p) => sum + p.weight, 0);
  }

  return {
    participants: normalizedParticipants,
    totalCars: currentTotal,
    originalTotal,
    adjustmentsMade,
    adjustmentDetails,
  };
}

/**
 * Normalize weights while preserving relative proportions as much as possible
 * Uses the largest remainder method for fair distribution
 * @param participants - Array of participant entries
 * @param targetTotal - Target total number of cars
 * @returns Normalization result with fair integer distribution
 */
export function normalizeWithLargestRemainder(
  participants: ParticipantEntry[],
  targetTotal: number = 20
): NormalizationResult {
  if (participants.length === 0) {
    return {
      participants: [],
      totalCars: 0,
      originalTotal: 0,
      adjustmentsMade: false,
      adjustmentDetails: [],
    };
  }

  const originalTotal = participants.reduce((sum, p) => sum + p.weight, 0);
  const adjustmentDetails: string[] = [];

  // Calculate exact proportional shares
  const shares = participants.map(p => ({
    participant: p,
    exactShare: (p.weight / originalTotal) * targetTotal,
    floorShare: Math.floor((p.weight / originalTotal) * targetTotal),
    remainder: ((p.weight / originalTotal) * targetTotal) % 1,
  }));

  // Assign floor values first, ensuring minimum of 1
  const normalizedParticipants = shares.map(share => ({
    ...share.participant,
    weight: Math.max(1, share.floorShare),
  }));

  // Calculate remaining cars to distribute
  const assignedTotal = normalizedParticipants.reduce((sum, p) => sum + p.weight, 0);
  const remaining = targetTotal - assignedTotal;

  if (remaining > 0) {
    // Sort by remainder (largest first) and distribute remaining cars
    const sortedByRemainder = shares
      .map((share, index) => ({ ...share, index }))
      .sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remaining; i++) {
      const targetIndex = sortedByRemainder[i].index;
      normalizedParticipants[targetIndex].weight += 1;
      adjustmentDetails.push(
        `Added 1 car to ${normalizedParticipants[targetIndex].name} (remainder: ${sortedByRemainder[i].remainder.toFixed(3)})`
      );
    }
  } else if (remaining < 0) {
    // Rare case: need to remove cars (shouldn't happen with proper floor calculation)
    adjustmentDetails.push('Warning: Over-allocation detected, manual adjustment needed');
  }

  const finalTotal = normalizedParticipants.reduce((sum, p) => sum + p.weight, 0);

  return {
    participants: normalizedParticipants,
    totalCars: finalTotal,
    originalTotal,
    adjustmentsMade: remaining !== 0,
    adjustmentDetails,
  };
}

/**
 * Calculate race probabilities based on car counts
 * @param participants - Array of participants with car counts
 * @returns Array with probability information
 */
export interface ParticipantProbability extends ParticipantEntry {
  probability: number;
  percentageChance: string;
}

export function calculateRaceProbabilities(
  participants: ParticipantEntry[]
): ParticipantProbability[] {
  const totalCars = participants.reduce((sum, p) => sum + p.weight, 0);
  
  if (totalCars === 0) {
    return participants.map(p => ({
      ...p,
      probability: 0,
      percentageChance: '0%',
    }));
  }

  return participants.map(p => ({
    ...p,
    probability: p.weight / totalCars,
    percentageChance: `${((p.weight / totalCars) * 100).toFixed(1)}%`,
  }));
}

/**
 * Integrate normalized weights back into parsing result
 * @param parsingResult - Original parsing result
 * @param normalizedParticipants - Participants with normalized weights
 * @returns Updated parsing result
 */
export function integrateNormalizedWeights(
  parsingResult: any,
  normalizedParticipants: ParticipantEntry[]
): any {
  return {
    ...parsingResult,
    participants: normalizedParticipants,
    stats: {
      ...parsingResult.stats,
      totalCars: normalizedParticipants.reduce((sum, p) => sum + p.weight, 0),
      normalized: true,
    },
  };
}