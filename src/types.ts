export type Dimension = 'safety' | 'transit' | 'convenience' | 'parking' | 'environment'
export type ProfileType = 'student' | 'professional' | 'family'

export type Neighborhood = {
  name: string
  objective: Record<Dimension, number | null>
  perception: Record<Dimension, string>
  redditSampleSize: number
  tradeoffNote: string
}

export const dimensionLabels: Record<Dimension, string> = {
  safety: 'Safety',
  transit: 'Transit Access',
  convenience: 'Daily Convenience',
  parking: 'Parking',
  environment: 'Environment',
}
