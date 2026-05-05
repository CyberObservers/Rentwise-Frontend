import type { Dimension, Neighborhood } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// ── TypeScript types mirroring backend Pydantic schemas ──────────────────────

export type ApiCommunity = {
  community_id: string
  name: string
  city: string | null
  state: string | null
  center_lat: number | null
  center_lng: number | null
  updated_at?: string | null
}

export type ApiMetrics = {
  community_id: string
  median_rent: number | null
  rent_2b2b: number | null
  rent_1b1b: number | null
  avg_sqft: number | null
  grocery_density_per_km2: number | null
  crime_rate_per_100k: number | null
  rent_trend_12m_pct: number | null
  night_activity_index: number | null
  noise_avg_db: number | null
  noise_p90_db: number | null
  commute_minutes: number | null
  parking_lot_density_per_km2: number | null
  parking_capacity_per_km2: number | null
  poi_demand_density_per_km2: number | null
  overall_confidence: number | null
  updated_at?: string | null
}

export type ApiCommunityDetail = {
  community: ApiCommunity
  metrics: ApiMetrics | null
}

export type ApiInsightDimension = {
  dimension: Dimension
  commentary: string
}

export type ApiCommunityWebInfoSource =
  | string
  | {
      title?: string | null
      label?: string | null
      url: string
    }

export type ApiCommunityWebInfo = {
  summary: string | null
  highlights: string[] | null
  sources: ApiCommunityWebInfoSource[] | null
}

export type ApiCommunityInsight = {
  community_id: string
  name: string
  city: string | null
  state: string | null
  posts_analyzed: number
  dimensions: ApiInsightDimension[]
  overall_commentary: string
  community_web_info?: ApiCommunityWebInfo | null
}

export type ApiCompareResult = {
  comparison_id: string
  community_a_id: string
  community_b_id: string
  status: string
  short_summary: string
  structured_diff: Record<string, { a: number; b: number; winner: string; delta: number }>
  tradeoffs: {
    community_a_strengths: string[]
    community_b_strengths: string[]
  }
}

export type ApiRecommendationMetricsPreview = {
  median_rent: number | null
  grocery_density_per_km2: number | null
  crime_rate_per_100k: number | null
  noise_avg_db: number | null
  night_activity_index: number | null
  commute_minutes: number | null
}

export type ApiRecommendationItem = {
  rank: number
  community_id: string
  name: string
  city: string | null
  state: string | null
  score: number
  overall_confidence: number | null
  dimension_scores: PreferenceWeights
  weighted_contributions: PreferenceWeights
  metrics: ApiRecommendationMetricsPreview
}

export type ApiRecommendationResponse = {
  weights_used: PreferenceWeights
  total_candidates: number
  scored_communities: number
  skipped_missing_metrics: number
  ranked_communities: ApiRecommendationItem[]
}

export type ApiAgentTraceStep = {
  step: string
  status: 'success' | 'partial' | 'failed' | 'skipped'
  message: string
  detail: Record<string, unknown> | null
}

export type ApiCommunityReportSection = {
  type:
    | 'overview'
    | 'fit'
    | 'dimensions'
    | 'risk_alerts'
    | 'viewing_checklist'
    | 'sources'
  title: string
  content: string | null
  items: string[]
}

export type ApiCommunityReportLocation = {
  name: string
  city: string | null
  state: string | null
  center_lat: number | null
  center_lng: number | null
}

export type ApiCommunityReportMetricSnapshot = {
  median_rent: number | null
  commute_minutes: number | null
  grocery_density_per_km2: number | null
  crime_rate_per_100k: number | null
  noise_avg_db: number | null
  night_activity_index: number | null
  parking_lot_density_per_km2: number | null
  parking_capacity_per_km2: number | null
  poi_demand_density_per_km2: number | null
  overall_confidence: number | null
}

export type ApiCommunityReportDimension = {
  dimension: Dimension
  score_0_100: number | null
  summary: string | null
  data_origin: string | null
}

export type ApiCommunityReportReview = {
  platform: string | null
  author_name: string | null
  body_text: string
  posted_at: string | null
  source_url: string | null
}

export type ApiCommunityReport = {
  intent: 'community_report'
  community_id: string
  title: string
  summary: string
  location: ApiCommunityReportLocation
  metrics: ApiCommunityReportMetricSnapshot
  dimensions: ApiCommunityReportDimension[]
  reviews: ApiCommunityReportReview[]
  user_preferences: Record<string, number>
  sections: ApiCommunityReportSection[]
  html_fragment: string | null
  agent_trace: ApiAgentTraceStep[]
}

// ── Scoring formula (replicates scoring_service.py exactly) ──────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v))
}

const DEFAULT_GROCERY_DENSITY = 0.25
const CONVENIENCE_BASE_SCORE = 40
const CONVENIENCE_FULL_SCORE_DENSITY = 0.5
const PARKING_LOT_DENSITY_FULL_SCORE = 1.5
const PARKING_CAPACITY_DENSITY_FULL_SCORE = 250
const POI_DEMAND_DENSITY_HIGH_PRESSURE = 6

function computeParkingScore(m: ApiMetrics): number {
  const lotSupplyScore = clamp(
    ((m.parking_lot_density_per_km2 ?? 0) / PARKING_LOT_DENSITY_FULL_SCORE) *
      100,
  )
  const capacitySupplyScore = clamp(
    ((m.parking_capacity_per_km2 ?? 0) /
      PARKING_CAPACITY_DENSITY_FULL_SCORE) *
      100,
  )
  const parkingSupplyScore = lotSupplyScore * 0.7 + capacitySupplyScore * 0.3
  const demandPressure = clamp(
    ((m.poi_demand_density_per_km2 ?? 1) / POI_DEMAND_DENSITY_HIGH_PRESSURE) *
      100,
  )
  const nightPressure = clamp(m.night_activity_index ?? 50)
  const noisePressure = clamp((((m.noise_avg_db ?? 55) - 55) / 20) * 100)

  return clamp(
    parkingSupplyScore * 0.5 +
      (100 - demandPressure) * 0.2 +
      (100 - nightPressure) * 0.15 +
      (100 - noisePressure) * 0.15,
  )
}

function computeQuietScore(noiseAvgDb: number | null): number {
  return clamp(100 - Math.max(0, (noiseAvgDb ?? 55) - 55) * 4)
}

function computeEnvironmentScore(m: ApiMetrics): number {
  const quietScore = computeQuietScore(m.noise_avg_db)
  const calmNightScore = clamp(100 - (m.night_activity_index ?? 50))
  return clamp(quietScore * 0.7 + calmNightScore * 0.3)
}

export function computeDimensionScores(m: ApiMetrics): Record<string, number> {
  return {
    Cost:        clamp(100 - ((m.median_rent             ?? 2500) / 50)),
    Transit:     clamp(100 - ((m.commute_minutes          ?? 30)   * 2.0)),
    Convenience: clamp(
      CONVENIENCE_BASE_SCORE +
        (((m.grocery_density_per_km2 ?? DEFAULT_GROCERY_DENSITY) /
          CONVENIENCE_FULL_SCORE_DENSITY) *
          (100 - CONVENIENCE_BASE_SCORE)),
    ),
    Safety:      clamp(100 - ((m.crime_rate_per_100k      ?? 300) / 5)),
    Trend:       clamp(100 - Math.abs((m.rent_trend_12m_pct ?? 3.0) * 8)),
    Noise:       computeQuietScore(m.noise_avg_db),
    Nightlife:   clamp((m.night_activity_index            ?? 50)  * 1.2),
    Reviews:     clamp(60), // review_signal_score not exposed by API
    Parking:     computeParkingScore(m),
    Environment: computeEnvironmentScore(m),
  }
}

// ── Dimension mapping: backend (8 dims) → frontend (5 dims) ──────────────────

export function mapBackendScoresToFrontend(
  scores: Record<string, number>,
): Record<Dimension, number | null> {
  return {
    safety:      scores['Safety']      ?? null,
    transit:     scores['Transit']     ?? null,
    convenience: scores['Convenience'] ?? null,
    parking:     scores['Parking']     ?? null,
    environment: scores['Environment'] ?? null,
  }
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export function createEmptyObjective(): Record<Dimension, number | null> {
  return {
    safety: null,
    transit: null,
    convenience: null,
    parking: null,
    environment: null,
  }
}

export function buildNeighborhood(detail: ApiCommunityDetail): Neighborhood {
  const { community, metrics } = detail
  const center =
    community.center_lat != null && community.center_lng != null
      ? { lat: community.center_lat, lng: community.center_lng }
      : null

  return {
    id: community.community_id,
    name: community.name,
    city: community.city,
    state: community.state,
    center,
    objective: metrics
      ? mapBackendScoresToFrontend(computeDimensionScores(metrics))
      : createEmptyObjective(),
  }
}

export async function fetchCommunities(): Promise<ApiCommunityDetail[]> {
  const res = await fetch(`${API_BASE}/communities`)
  if (!res.ok) throw new Error(`Communities: HTTP ${res.status}`)
  return res.json() as Promise<ApiCommunityDetail[]>
}

export async function fetchCommunityDetail(id: string): Promise<ApiCommunityDetail> {
  const res = await fetch(`${API_BASE}/communities/${id}`)
  if (!res.ok) throw new Error(`Community ${id}: HTTP ${res.status}`)
  return res.json() as Promise<ApiCommunityDetail>
}

export async function fetchCommunityInsight(
  id: string,
  maxReviews = 20,
): Promise<ApiCommunityInsight> {
  const res = await fetch(`${API_BASE}/communities/${id}/insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_reviews: maxReviews }),
  })
  if (!res.ok) throw new Error(`Community insight ${id}: HTTP ${res.status}`)
  return res.json() as Promise<ApiCommunityInsight>
}

export async function postRecommend(
  weights?: Record<string, number>,
  topK = 3,
): Promise<ApiRecommendationResponse> {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weights: weights ?? {},
      top_k: topK,
    }),
  })
  if (!res.ok) throw new Error(`Recommend: HTTP ${res.status}`)
  return res.json() as Promise<ApiRecommendationResponse>
}

// ── Chat API ──────────────────────────────────────────────────────────────────

export type ChatMessagePayload = {
  role: 'user' | 'assistant'
  content: string
}

export type PreferenceWeights = {
  safety: number | null
  transit: number | null
  convenience: number | null
  parking: number | null
  environment: number | null
}

export type ChatApiResponse = {
  reply: string
  weights: PreferenceWeights
  ready_to_recommend: boolean
}

export async function postChat(messages: ChatMessagePayload[]): Promise<ChatApiResponse> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Chat request timed out', 'TimeoutError')),
    60_000,
  )
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Chat: HTTP ${res.status}`)
    return await res.json() as ChatApiResponse
  } finally {
    clearTimeout(timer)
  }
}

export async function postCompare(
  communityAId: string,
  communityBId: string,
  weights: Record<string, number>,
): Promise<ApiCompareResult> {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      community_a_id: communityAId,
      community_b_id: communityBId,
      weights,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Compare failed: ${res.status}${text ? ` ${text}` : ''}`)
  }

  return res.json() as Promise<ApiCompareResult>
}

export async function postCommunityReport(
  communityId: string,
  userPreferences: Record<string, number>,
): Promise<ApiCommunityReport> {
  const res = await fetch(`${API_BASE}/agent/community-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      community_id: communityId,
      user_preferences: userPreferences,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Community report failed: ${res.status}${text ? ` ${text}` : ''}`)
  }

  return res.json() as Promise<ApiCommunityReport>
}
