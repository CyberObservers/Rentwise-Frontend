import { type Dimension, type Neighborhood } from './types'

export const neighborhoods: Neighborhood[] = [
  {
    name: 'University Town Center',
    objective: {
      safety: 72,
      transit: 91,
      convenience: 90,
      parking: 54,
      environment: 78,
    },
    perception: {
      safety: 'Generally safe at night near main plazas, occasional bike theft concerns.',
      transit: 'Frequent buses and easy campus access; many users report low car dependence.',
      convenience: 'Very walkable for groceries, food, and study spots.',
      parking: 'Visitor parking can be expensive and difficult during peak hours.',
      environment: 'Active, student-centered area with moderate noise on weekends.',
    },
    redditSampleSize: 86,
    tradeoffNote: 'Excellent transit and convenience, but parking pressure is common.',
  },
  {
    name: 'Northwood',
    objective: {
      safety: 86,
      transit: 62,
      convenience: 70,
      parking: 84,
      environment: 88,
    },
    perception: {
      safety: 'Residents frequently describe it as quiet and family-friendly.',
      transit: 'Transit is workable but less frequent than central neighborhoods.',
      convenience: 'Good basics nearby, though some errands still require a short drive.',
      parking: 'Street and complex parking are usually easier than denser areas.',
      environment: 'Calm streets, lower noise, and more green space reported.',
    },
    redditSampleSize: 59,
    tradeoffNote: 'Strong safety and environment, weaker transit frequency.',
  },
  {
    name: 'Costa Mesa Border',
    objective: {
      safety: 64,
      transit: 58,
      convenience: 74,
      parking: null,
      environment: 68,
    },
    perception: {
      safety: 'Mixed opinions: some blocks feel safe, others mention late-night caution.',
      transit: 'Most discussions suggest relying on a car for daily routines.',
      convenience: 'Good shopping and food options if driving is available.',
      parking: 'Parking information is inconsistent across postings and complexes.',
      environment: 'More urban feel with variable noise depending on street proximity.',
    },
    redditSampleSize: 37,
    tradeoffNote: 'Decent convenience with higher uncertainty in parking data quality.',
  },
]

export const dimensions: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']
