import type { Dimension, ProfileType } from './types'
import { dimensions } from './types'
import type { Neighborhood } from './types'

/**
 * Normalizes a set of weights so that they sum to 100.
 * Useful when users adjust sliders to keep the total percentage consistent.
 */
export const normalizeWeights = (weights: Record<Dimension, number>): Record<Dimension, number> => {
  const total = dimensions.reduce((sum, key) => sum + weights[key], 0)
  if (total === 0) {
    // Default fallback if all weights are zeroed out
    return {
      safety: 20,
      transit: 20,
      convenience: 20,
      parking: 20,
      environment: 20,
    }
  }

  const normalized = { ...weights }
  dimensions.forEach((key) => {
    // Calculate percentage contribution of each dimension
    normalized[key] = Math.round((weights[key] / total) * 100)
  })

  // Adjust for rounding errors to ensure exact 100 sum
  const diff = 100 - dimensions.reduce((sum, key) => sum + normalized[key], 0)
  normalized.safety += diff
  return normalized
}

type OnboardingParams = {
  hasCar: boolean
  commuteDays: number
  safetyPriority: number
  parkingPriority: boolean
  profileType: ProfileType
  sharesHousing: boolean
  bikeComfort: boolean
  needsQuietArea: boolean
}

/**
 * Generates recommended weights based on user onboarding inputs.
 * This logic translates user preferences (e.g., "I have a car") into 
 * specific dimension weight adjustments.
 */
export const recommendedWeightsFromOnboarding = (params: OnboardingParams): Record<Dimension, number> => {
  // Start with a balanced baseline
  const draft: Record<Dimension, number> = {
    safety: 20,
    transit: 20,
    convenience: 20,
    parking: 20,
    environment: 20,
  }

  // Adjust based on car ownership
  if (!params.hasCar) {
    draft.transit += 18
    draft.parking -= 10
    draft.environment -= 8
  }

  // Adjust based on profile type
  if (params.profileType === 'student') {
    draft.transit += 4
    draft.convenience += 6
    draft.parking -= 5
    draft.environment -= 5
  }

  if (params.profileType === 'professional') {
    draft.safety += 4
    draft.transit += 3
    draft.parking += 3
    draft.environment -= 5
    draft.convenience -= 5
  }

  if (params.profileType === 'family') {
    draft.safety += 10
    draft.environment += 8
    draft.transit -= 8
    draft.parking -= 5
    draft.convenience -= 5
  }

  // Housing situation adjustments
  if (params.sharesHousing) {
    draft.convenience += 6
    draft.safety -= 3
    draft.parking -= 3
  }

  // Alternative transport preferences
  if (!params.hasCar && params.bikeComfort) {
    draft.transit -= 6
    draft.convenience += 4
    draft.environment += 2
  }

  // Environment preferences
  if (params.needsQuietArea) {
    draft.environment += 10
    draft.convenience -= 4
    draft.transit -= 3
    draft.parking -= 3
  }

  if (params.hasCar && params.parkingPriority) {
    draft.parking += 16
    draft.transit -= 8
    draft.convenience -= 8
  }

  // Commute frequency impact
  if (params.commuteDays >= 4) {
    draft.transit += 10
    draft.environment -= 6
    draft.convenience -= 4
  }

  // Safety priority impact
  if (params.safetyPriority >= 4) {
    draft.safety += 12
    draft.convenience -= 6
    draft.environment -= 6
  }

  // Ensure no weight drops below threshold
  dimensions.forEach((key) => {
    draft[key] = Math.max(5, draft[key])
  })

  return normalizeWeights(draft)
}

const clampWeight = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const distributeWeight = (
  keys: Dimension[],
  reference: Record<Dimension, number>,
  total: number,
): Record<Dimension, number> => {
  const safeTotal = Math.max(0, Math.round(total))
  const result = {} as Record<Dimension, number>

  if (keys.length === 0) return result

  const referenceTotal = keys.reduce((sum, key) => sum + Math.max(0, reference[key]), 0)

  if (referenceTotal === 0) {
    const base = Math.floor(safeTotal / keys.length)
    let remainder = safeTotal - base * keys.length
    keys.forEach((key) => {
      result[key] = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder -= 1
    })
    return result
  }

  const rawAllocations = keys.map((key) => {
    const raw = (Math.max(0, reference[key]) / referenceTotal) * safeTotal
    const base = Math.floor(raw)
    return { key, base, fraction: raw - base }
  })

  rawAllocations.forEach(({ key, base }) => {
    result[key] = base
  })

  let remainder = safeTotal - rawAllocations.reduce((sum, item) => sum + item.base, 0)
  rawAllocations
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ key }) => {
      if (remainder <= 0) return
      result[key] += 1
      remainder -= 1
    })

  return result
}

export const rebalanceWeights = (
  weights: Record<Dimension, number>,
  targetDimension: Dimension,
  nextValue: number,
): Record<Dimension, number> => {
  const targetIndex = dimensions.indexOf(targetDimension)
  const previousDimensions = dimensions.slice(0, targetIndex)
  const laterDimensions = dimensions.slice(targetIndex + 1)
  const fixedTotal = previousDimensions.reduce((sum, dimension) => sum + clampWeight(weights[dimension]), 0)
  const maxTarget = Math.max(0, 100 - fixedTotal)

  if (laterDimensions.length === 0) {
    return {
      ...weights,
      [targetDimension]: maxTarget,
    }
  }

  const clampedTarget = Math.min(clampWeight(nextValue), maxTarget)
  const redistributed = distributeWeight(laterDimensions, weights, 100 - fixedTotal - clampedTarget)

  return {
    ...weights,
    [targetDimension]: clampedTarget,
    ...redistributed,
  }
}

/**
 * Calculates a score (0-100) for a neighborhood based on user weights.
 * Handles null values for missing data points by redistributing weight.
 */
export const scoreNeighborhood = (neighborhood: Neighborhood, weights: Record<Dimension, number>): number => {
  let weightedSum = 0
  let usedWeight = 0

  dimensions.forEach((dimension) => {
    const value = neighborhood.objective[dimension]
    // If data is missing (null), skip this dimension in calculations
    if (value !== null) {
      weightedSum += value * weights[dimension]
      usedWeight += weights[dimension]
    }
  })

  // Prevent division by zero
  if (usedWeight === 0) return 0
  
  // Keep one decimal place so UI score bars respond to smaller weight changes.
  return Number((weightedSum / usedWeight).toFixed(1))
}

/**
 * Identifies the top factors driving the recommendation.
 */
export const getTopDriverDimensions = (weights: Record<Dimension, number>): Dimension[] =>
  [...dimensions]
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, 3)
