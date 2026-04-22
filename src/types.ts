export type Dimension = 'safety' | 'transit' | 'convenience' | 'parking' | 'environment'
export type ProfileType = 'student' | 'professional' | 'family'

export const dimensions: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']

export type DimensionStyle = {
  solid: string
  soft: string
  text: string
  track: string
  border: string
  contrastText: string
}

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

export const dimensionStyles: Record<Dimension, DimensionStyle> = {
  safety: {
    solid: '#5865F2',
    soft: '#EEF0FF',
    text: '#3F4CD4',
    track: '#CCD3FF',
    border: '#CDD4FF',
    contrastText: '#FFFFFF',
  },
  transit: {
    solid: '#1FA67A',
    soft: '#E8F8F1',
    text: '#147B59',
    track: '#C5EAD9',
    border: '#C7E6D9',
    contrastText: '#FFFFFF',
  },
  convenience: {
    solid: '#E67E3A',
    soft: '#FFF2E8',
    text: '#B85A22',
    track: '#F7D8C2',
    border: '#F4D6C0',
    contrastText: '#FFFFFF',
  },
  parking: {
    solid: '#3A84E8',
    soft: '#EAF3FF',
    text: '#2B67BB',
    track: '#C9DDF9',
    border: '#CCDEFA',
    contrastText: '#FFFFFF',
  },
  environment: {
    solid: '#7BAA47',
    soft: '#F0F7E8',
    text: '#5D7B2F',
    track: '#D7E8BF',
    border: '#D8E6C4',
    contrastText: '#FFFFFF',
  },
}
