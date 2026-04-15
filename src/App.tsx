import {
  Button,
  Container,
  createTheme,
  CssBaseline,
  Fade,
  Stack,
  ThemeProvider,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import {
  type ApiCommunityDetail,
  type ApiCommunityInsight,
  type ApiCompareResult,
  type ApiMetrics,
  type ApiRecommendationItem,
  type ChatApiResponse,
  computeDimensionScores,
  fetchCommunityDetail,
  fetchCommunityInsight,
  mapBackendScoresToFrontend,
  postCompare,
  postRecommend,
} from './api'
import { neighborhoods } from './data'
import {
  getTopDriverDimensions,
  normalizeWeights,
  scoreNeighborhood,
} from './logic'
import type { Dimension, Neighborhood } from './types'
import { ConstraintsForm } from './components/ConstraintsForm'
import { Dashboard } from './components/Dashboard'
import { NavigationStepper } from './components/NavigationStepper'
import { ProfileForm } from './components/ProfileForm'
import { ReviewPage } from './components/ReviewPage'

const steps = ['Explore', 'Insights', 'Compare', 'Reviews']
const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  safety: 20,
  transit: 20,
  convenience: 20,
  parking: 20,
  environment: 20,
}

function buildStaticRecommendationPreview(
  activeWeights: Record<Dimension, number>,
): ApiRecommendationItem[] {
  return [...neighborhoods]
    .map((neighborhood) => {
      const weightedContribution = (dimension: Dimension) => {
        const value = neighborhood.objective[dimension]
        if (value == null) return null
        return Math.round(value * activeWeights[dimension]) / 100
      }

      return {
        rank: 0,
        community_id: neighborhood.id,
        name: neighborhood.name,
        city: null,
        state: null,
        score: scoreNeighborhood(neighborhood, activeWeights),
        overall_confidence: null,
        dimension_scores: {
          safety: neighborhood.objective.safety,
          transit: neighborhood.objective.transit,
          convenience: neighborhood.objective.convenience,
          parking: neighborhood.objective.parking,
          environment: neighborhood.objective.environment,
        },
        weighted_contributions: {
          safety: weightedContribution('safety'),
          transit: weightedContribution('transit'),
          convenience: weightedContribution('convenience'),
          parking: weightedContribution('parking'),
          environment: weightedContribution('environment'),
        },
        metrics: {
          median_rent: null,
          grocery_density_per_km2: null,
          crime_rate_per_100k: null,
          noise_avg_db: null,
          night_activity_index: null,
          commute_minutes: null,
        },
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

const INITIAL_DEFAULT_RECOMMENDATIONS = buildStaticRecommendationPreview(DEFAULT_WEIGHTS)
const INITIAL_SELECTED_NEIGHBORHOOD =
  INITIAL_DEFAULT_RECOMMENDATIONS[0]?.name ?? neighborhoods[0].name
const INITIAL_RIGHT_NEIGHBORHOOD =
  INITIAL_DEFAULT_RECOMMENDATIONS.find((item) => item.name !== INITIAL_SELECTED_NEIGHBORHOOD)?.name
  ?? neighborhoods.find((item) => item.name !== INITIAL_SELECTED_NEIGHBORHOOD)?.name
  ?? neighborhoods[1].name

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0B5FFF',
    },
    secondary: {
      main: '#009D77',
    },
    background: {
      default: '#F3F5FA',
      paper: '#FFFFFF',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: 'Manrope, "IBM Plex Sans", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: -0.8,
    },
    h6: {
      fontWeight: 700,
      letterSpacing: -0.2,
    },
  },
})

function App() {
  const [activeStep, setActiveStep] = useState(0)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(INITIAL_SELECTED_NEIGHBORHOOD)
  const [communityInput, setCommunityInput] = useState('')
  const [modelPrompt] = useState('')
  const [mapZoom, setMapZoom] = useState(13)
  const [recommendedCommunities, setRecommendedCommunities] = useState<ApiRecommendationItem[]>(
    [],
  )
  const [leftNeighborhood, setLeftNeighborhood] = useState(INITIAL_SELECTED_NEIGHBORHOOD)
  const [rightNeighborhood, setRightNeighborhood] = useState(INITIAL_RIGHT_NEIGHBORHOOD)
  const [weights, setWeights] = useState<Record<Dimension, number>>(DEFAULT_WEIGHTS)

  // ── API state ───────────────────────────────────────────────────────────────
  const [communityDetails, setCommunityDetails] = useState<Record<string, ApiCommunityDetail>>({})
  const [communityRequestedIds, setCommunityRequestedIds] = useState<Set<string>>(new Set())
  const [, setCommunityLoadingIds] = useState<Set<string>>(new Set())
  const [communityInsights, setCommunityInsights] = useState<Record<string, ApiCommunityInsight>>(
    {},
  )
  const [communityInsightRequestedIds, setCommunityInsightRequestedIds] = useState<Set<string>>(
    new Set(),
  )
  const [communityInsightLoadingIds, setCommunityInsightLoadingIds] = useState<Set<string>>(
    new Set(),
  )
  const [compareResult, setCompareResult] = useState<ApiCompareResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // ── LLM chat state ──────────────────────────────────────────────────────────
  const [llmWeights, setLlmWeights] = useState<Record<Dimension, number> | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const recommendationRequestIdRef = useRef(0)

  // ── Community fetching ──────────────────────────────────────────────────────
  const loadCommunity = useCallback(async (id: string) => {
    if (communityDetails[id] || communityRequestedIds.has(id)) return

    setCommunityRequestedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setCommunityLoadingIds((prev) => {
      if (prev.has(id)) return prev // already loading
      const next = new Set(prev)
      next.add(id)
      return next
    })

    try {
      const detail = await fetchCommunityDetail(id)
      setCommunityDetails((prev) => ({ ...prev, [id]: detail }))
    } catch {
      // silently fall back to hardcoded data
    } finally {
      setCommunityLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [communityDetails, communityRequestedIds])

  const loadCommunityInsight = useCallback(async (id: string) => {
    if (communityInsightRequestedIds.has(id)) return

    setCommunityInsightRequestedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setCommunityInsightLoadingIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

    try {
      const insight = await fetchCommunityInsight(id)
      setCommunityInsights((prev) => ({ ...prev, [id]: insight }))
    } catch {
      // silently fall back to local copy
    } finally {
      setCommunityInsightLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [communityInsightRequestedIds])

  // ── Enrichment: overlay backend scores onto hardcoded Neighborhood ──────────
  const enrichNeighborhood = useCallback(
    (base: Neighborhood): Neighborhood => {
      const detail = communityDetails[base.id]
      if (!detail?.metrics) return base
      const backendScores = computeDimensionScores(detail.metrics)
      const mappedObjective = mapBackendScoresToFrontend(backendScores)
      return { ...base, objective: mappedObjective }
    },
    [communityDetails],
  )

  const visibleNeighborhoods = useMemo(() => {
    if (mapZoom <= 11) return neighborhoods.slice(0, 4)
    if (mapZoom <= 13) return neighborhoods.slice(0, 7)
    return neighborhoods
  }, [mapZoom])

  const selectedNeighborhoodData = useMemo(
    () => neighborhoods.find((n) => n.name === selectedNeighborhood) ?? neighborhoods[0],
    [selectedNeighborhood],
  )

  const leftData = useMemo(
    () => neighborhoods.find((n) => n.name === leftNeighborhood) ?? selectedNeighborhoodData,
    [leftNeighborhood, selectedNeighborhoodData],
  )
  const rightData = useMemo(
    () => neighborhoods.find((n) => n.name === rightNeighborhood) ?? neighborhoods[1],
    [rightNeighborhood],
  )

  const enrichedSelectedData = useMemo(
    () => enrichNeighborhood(selectedNeighborhoodData),
    [selectedNeighborhoodData, enrichNeighborhood],
  )
  const enrichedLeftData = useMemo(
    () => enrichNeighborhood(leftData),
    [leftData, enrichNeighborhood],
  )
  const enrichedRightData = useMemo(
    () => enrichNeighborhood(rightData),
    [rightData, enrichNeighborhood],
  )

  const leftScore = useMemo(() => scoreNeighborhood(enrichedLeftData, weights), [enrichedLeftData, weights])
  const rightScore = useMemo(() => scoreNeighborhood(enrichedRightData, weights), [enrichedRightData, weights])

  const recommendation = useMemo(() => {
    if (leftScore === rightScore) {
      return `Both neighborhoods are tied at ${leftScore}/100 with your current weights.`
    }

    const preferred = leftScore > rightScore ? leftData.name : rightData.name
    const diff = Math.abs(leftScore - rightScore)
    return `${preferred} leads by ${diff} points and better matches the weights you tuned in Step 2.`
  }, [leftData.name, leftScore, rightData.name, rightScore])

  const topDrivers = useMemo(() => getTopDriverDimensions(weights), [weights])
  const recommendationScores = useMemo(
    () =>
      Object.fromEntries(
        neighborhoods.map((neighborhood) => [
          neighborhood.name,
          scoreNeighborhood(enrichNeighborhood(neighborhood), weights),
        ]),
      ),
    [enrichNeighborhood, weights],
  )

  const buildLocalRecommendationPreview = useCallback(
    (activeWeights: Record<Dimension, number>): ApiRecommendationItem[] =>
      [...neighborhoods]
        .map((neighborhood) => {
          const enriched = enrichNeighborhood(neighborhood)
          const score = scoreNeighborhood(enriched, activeWeights)
          const metrics = communityDetails[neighborhood.id]?.metrics ?? null
          const weightedContribution = (dimension: Dimension) => {
            const value = enriched.objective[dimension]
            if (value == null) return null
            return Math.round(value * activeWeights[dimension]) / 100
          }

          return {
            rank: 0,
            community_id: neighborhood.id,
            name: neighborhood.name,
            city: null,
            state: null,
            score,
            overall_confidence: metrics?.overall_confidence ?? null,
            dimension_scores: {
              safety: enriched.objective.safety,
              transit: enriched.objective.transit,
              convenience: enriched.objective.convenience,
              parking: enriched.objective.parking,
              environment: enriched.objective.environment,
            },
            weighted_contributions: {
              safety: weightedContribution('safety'),
              transit: weightedContribution('transit'),
              convenience: weightedContribution('convenience'),
              parking: weightedContribution('parking'),
              environment: weightedContribution('environment'),
            },
            metrics: {
              median_rent: metrics?.median_rent ?? null,
              grocery_density_per_km2: metrics?.grocery_density_per_km2 ?? null,
              crime_rate_per_100k: metrics?.crime_rate_per_100k ?? null,
              noise_avg_db: metrics?.noise_avg_db ?? null,
              night_activity_index: metrics?.night_activity_index ?? null,
              commute_minutes: null,
            },
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item, index) => ({ ...item, rank: index + 1 })),
    [communityDetails, enrichNeighborhood],
  )
  const defaultRecommendationPreview = useMemo(
    () => buildLocalRecommendationPreview(DEFAULT_WEIGHTS),
    [buildLocalRecommendationPreview],
  )
  const displayedRecommendedCommunities = useMemo(
    () => (recommendedCommunities.length > 0 ? recommendedCommunities : defaultRecommendationPreview),
    [defaultRecommendationPreview, recommendedCommunities],
  )

  const applyRecommendedCommunities = useCallback(
    (items: ApiRecommendationItem[], updateCompareSelections = false) => {
      const topChoice = items[0]
      if (!topChoice) return

      setSelectedNeighborhood(topChoice.name)
      setCommunityInput(topChoice.name)

      if (!updateCompareSelections) return

      setLeftNeighborhood(topChoice.name)
      const secondaryChoice =
        items.find((item) => item.name !== topChoice.name)?.name
        ?? neighborhoods.find((item) => item.name !== topChoice.name)?.name
        ?? topChoice.name
      setRightNeighborhood(secondaryChoice)
    },
    [],
  )

  const requestRecommendations = useCallback(
    async (
      activeWeights: Record<Dimension, number>,
      options?: { updateCompareSelections?: boolean },
    ) => {
      const requestId = recommendationRequestIdRef.current + 1
      recommendationRequestIdRef.current = requestId
      setRecommendationsLoading(true)

      try {
        const response = await postRecommend(activeWeights, 3)
        if (recommendationRequestIdRef.current !== requestId) return

        const items = response.ranked_communities
        setRecommendedCommunities(items)
        applyRecommendedCommunities(items, options?.updateCompareSelections ?? false)
      } catch {
        if (recommendationRequestIdRef.current !== requestId) return

        const fallbackItems = buildLocalRecommendationPreview(activeWeights)
        setRecommendedCommunities(fallbackItems)
        applyRecommendedCommunities(
          fallbackItems,
          options?.updateCompareSelections ?? false,
        )
      } finally {
        if (recommendationRequestIdRef.current === requestId) {
          setRecommendationsLoading(false)
        }
      }
    },
    [applyRecommendedCommunities, buildLocalRecommendationPreview],
  )

  // ── Preload community data as user progresses through steps ─────────────────
  useEffect(() => {
    // Preload all visible neighborhoods so map hover tooltip has rent data
    visibleNeighborhoods.forEach((n) => loadCommunity(n.id))
  }, [visibleNeighborhoods, loadCommunity])

  useEffect(() => {
    loadCommunity(selectedNeighborhoodData.id)
  }, [selectedNeighborhoodData.id, loadCommunity])

  useEffect(() => {
    if (activeStep < 1) return
    loadCommunityInsight(selectedNeighborhoodData.id)
  }, [activeStep, selectedNeighborhoodData.id, loadCommunityInsight])

  useEffect(() => {
    if (activeStep >= 2) {
      loadCommunity(leftData.id)
      loadCommunity(rightData.id)
    }
  }, [activeStep, leftData.id, rightData.id, loadCommunity])

  useEffect(() => {
    if (llmWeights) {
      setWeights(llmWeights)
    }
  }, [llmWeights])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeStep])

  // ── Trigger POST /compare when on Dashboard with two different neighborhoods ─
  const isOnDashboard = activeStep === 2
  const isOnReviewPage = activeStep === 3

  useEffect(() => {
    if (!isOnDashboard) return
    if (leftData.id === rightData.id) return

    let cancelled = false
    setCompareLoading(true)
    setCompareResult(null)

    postCompare(leftData.id, rightData.id)
      .then((result) => {
        if (!cancelled) setCompareResult(result)
      })
      .catch(() => {
        // silently fall back to local recommendation
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOnDashboard, leftData.id, rightData.id])

  const handleWeightsChange = (nextWeights: Record<Dimension, number>) => {
    setWeights(nextWeights)
  }

  const handleChatResponse = useCallback(async (response: ChatApiResponse) => {
    const w = response.weights
    const resolved: Record<Dimension, number> = {
      safety: w.safety ?? 20,
      transit: w.transit ?? 20,
      convenience: w.convenience ?? 20,
      parking: w.parking ?? 20,
      environment: w.environment ?? 20,
    }
    const normalized = normalizeWeights(resolved)
    setLlmWeights(normalized)

    const hasAnyPreference = (Object.keys(w) as (keyof typeof w)[]).some((k) => {
      const v = w[k]
      return v !== null && Math.abs(v - 20) > 3
    })

    if (response.ready_to_recommend || hasAnyPreference) {
      await requestRecommendations(normalized, { updateCompareSelections: true })
    } else {
      recommendationRequestIdRef.current += 1
      setRecommendationsLoading(false)
      setRecommendedCommunities([])
      applyRecommendedCommunities(defaultRecommendationPreview, true)
    }
  }, [applyRecommendedCommunities, defaultRecommendationPreview, requestRecommendations])

  const handleNeighborhoodSelect = (side: 'left' | 'right', event: SelectChangeEvent<string>) => {
    const value = event.target.value
    if (side === 'left') setLeftNeighborhood(value)
    if (side === 'right') setRightNeighborhood(value)
  }

  // ── Metrics for ConstraintsForm ─────────────────────────────────────────────
  const selectedMetrics: ApiMetrics | null =
    communityDetails[selectedNeighborhoodData.id]?.metrics ?? null
  const selectedInsight: ApiCommunityInsight | null =
    communityInsights[selectedNeighborhoodData.id] ?? null
  const selectedInsightLoading = communityInsightLoadingIds.has(selectedNeighborhoodData.id)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          {/* Stepper Navigation */}
          <NavigationStepper activeStep={activeStep} steps={steps} />

          {/* Step 1: Profile Selection */}
          {activeStep === 0 && (
            <Fade in={activeStep === 0}>
              <div>
                <ProfileForm
                  selectedNeighborhood={selectedNeighborhood}
                  setSelectedNeighborhood={setSelectedNeighborhood}
                  communityInput={communityInput}
                  setCommunityInput={setCommunityInput}
                  mapZoom={mapZoom}
                  setMapZoom={setMapZoom}
                  availableNeighborhoods={visibleNeighborhoods}
                  recommendationItems={displayedRecommendedCommunities}
                  recommendationsLoading={recommendationsLoading}
                  onChatResponse={handleChatResponse}
                  communityDetails={communityDetails}
                  recommendationScores={recommendationScores}
                />
              </div>
            </Fade>
          )}

          {/* Step 2: Constraints & Weights */}
          {activeStep === 1 && (
            <Fade in={activeStep === 1}>
              <div>
                <ConstraintsForm
                  selectedNeighborhoodData={enrichedSelectedData}
                  weights={weights}
                  onWeightsChange={handleWeightsChange}
                  aiSuggestedWeights={llmWeights}
                  modelPrompt={modelPrompt}
                  metrics={selectedMetrics}
                  insight={selectedInsight}
                  insightLoading={selectedInsightLoading}
                />
              </div>
            </Fade>
          )}

          {/* Step 3: Dashboard & Comparison */}
          {isOnDashboard && (
            <Fade in={isOnDashboard}>
              <div>
                <Dashboard
                  weights={weights}
                  topDrivers={topDrivers}
                  leftNeighborhood={leftNeighborhood}
                  rightNeighborhood={rightNeighborhood}
                  onNeighborhoodChange={handleNeighborhoodSelect}
                  leftData={enrichedLeftData}
                  rightData={enrichedRightData}
                  leftScore={leftScore}
                  rightScore={rightScore}
                  recommendation={recommendation}
                  compareResult={compareResult}
                  compareLoading={compareLoading}
                />
              </div>
            </Fade>
          )}

          {/* Step 4: Community Reviews */}
          {isOnReviewPage && (
            <Fade in={isOnReviewPage}>
              <div>
                <ReviewPage />
              </div>
            </Fade>
          )}

          {/* Navigation Buttons */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep((s) => Math.min(3, s + 1))}
              disabled={activeStep === 3}
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Container>
    </ThemeProvider>
  )
}

export default App
