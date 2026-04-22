export type Dimension = 'safety' | 'transit' | 'convenience' | 'parking' | 'environment'
export type ProfileType = 'student' | 'professional' | 'family'

export const dimensions: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']

export type Neighborhood = {
  id: string
  name: string
  city: string | null
  state: string | null
  center: {
    lat: number
    lng: number
  } | null
  objective: Record<Dimension, number | null>
}

export const dimensionLabels: Record<Dimension, string> = {
  safety: 'Safety',
  transit: 'Transit',
  convenience: 'Convenience',
  parking: 'Parking',
  environment: 'Environment',
}
