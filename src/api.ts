import type { Dimension } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// ── TypeScript types mirroring backend Pydantic schemas ──────────────────────

export type ApiCommunity = {
  community_id: string
  name: string
  city: string | null
  state: string | null
  center_lat: number | null
  center_lng: number | null
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
  overall_confidence: number | null
}

export type ApiCommunityDetail = {
  community: ApiCommunity
  metrics: ApiMetrics | null
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

// ── Scoring formula (replicates scoring_service.py exactly) ──────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v))
}

export function computeDimensionScores(m: ApiMetrics): Record<string, number> {
  return {
    Cost:        clamp(100 - ((m.median_rent             ?? 2500) / 50)),
    Transit:     clamp(100 - (30                                  * 2.0)), // commute_minutes not in API; use default 30
    Convenience: clamp((m.grocery_density_per_km2         ?? 8)   * 6.5),
    Safety:      clamp(100 - ((m.crime_rate_per_100k      ?? 300) / 5)),
    Trend:       clamp(100 - Math.abs((m.rent_trend_12m_pct ?? 3.0) * 8)),
    Noise:       clamp(100 - ((m.noise_avg_db             ?? 55)  * 1.5)),
    Nightlife:   clamp((m.night_activity_index            ?? 50)  * 1.2),
    Reviews:     clamp(60), // review_signal_score not exposed by API
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
    parking:     scores['Cost']        ?? null, // Cost/affordability ≈ parking budget
    environment: scores['Noise']       ?? null, // Quieter = better environment
  }
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function fetchCommunityDetail(id: string): Promise<ApiCommunityDetail> {
  const res = await fetch(`${API_BASE}/communities/${id}`)
  if (!res.ok) throw new Error(`Community ${id}: HTTP ${res.status}`)
  return res.json() as Promise<ApiCommunityDetail>
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
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error(`Chat: HTTP ${res.status}`)
  return res.json() as Promise<ChatApiResponse>
}

export async function postCompare(
  communityAId: string,
  communityBId: string,
  weights?: Record<string, number>,
): Promise<ApiCompareResult> {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      community_a_id: communityAId,
      community_b_id: communityBId,
      weights: weights ?? {},
    }),
  })
  if (!res.ok) throw new Error(`Compare: HTTP ${res.status}`)
  return res.json() as Promise<ApiCompareResult>
}
