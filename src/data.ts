import { type Dimension, type Neighborhood } from './types'

export const neighborhoods: Neighborhood[] = [
  {
    id: 'university-town-center',
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
    id: 'northwood',
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
  {id: 'costa-mesa-border',
    
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
  {
    id: 'irvine-spectrum',
    name: 'Irvine Spectrum',
    objective: {
      safety: 80,
      transit: 85,
      convenience: 95,
      parking: 60,
      environment: 75,
    },
    perception: {
      safety: 'Very safe, well-lit, and patrolled, though busy with visitors.',
      transit: 'Excellent access to train station and freeways.',
      convenience: 'Unbeatable access to shopping, dining, and entertainment.',
      parking: 'Apartment structures have parking, but guest parking is tight.',
      environment: 'Modern and vibrant, but can be noisy due to freeway and crowds.',
    },
    redditSampleSize: 112,
    tradeoffNote: 'Top-tier convenience and modern living at a higher cost and noise level.',
  },
  {
    id: 'woodbridge',
    name: 'Woodbridge',
    objective: {
      safety: 88,
      transit: 65,
      convenience: 78,
      parking: 80,
      environment: 92,
    },
    perception: {
      safety: 'Extremely safe, family-oriented feel with active neighborhood watch.',
      transit: 'Some bus routes, but mostly car-dependent for commuting.',
      convenience: 'Good access to grocery stores and community centers within the loop.',
      parking: 'Generally good street and driveway parking options.',
      environment: 'Beautiful lakes, walking trails, and mature trees define the area.',
    },
    redditSampleSize: 78,
    tradeoffNote: 'Scenic and quiet family atmosphere, but further from major transit hubs.',
  },
]

export const dimensions: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']

// Map each dimension to a user-friendly label
export const dimensionLabels: Record<Dimension, string> = {
  safety: 'Safety',
  transit: 'Transit',
  convenience: 'Convenience',
  parking: 'Parking',
  environment: 'Environment',
}
