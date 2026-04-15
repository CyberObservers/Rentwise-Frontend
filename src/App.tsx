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
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

import {
  computeDimensionScores,
  fetchCommunityDetail,
  mapBackendScoresToFrontend,
  postCompare,
  type ApiCommunityDetail,
  type ApiCompareResult,
  type ApiMetrics,
  type ChatApiResponse,
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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(neighborhoods[0].name)
  const [communityInput, setCommunityInput] = useState('')
  const [modelPrompt] = useState('')
  const [mapZoom, setMapZoom] = useState(13)
  const [recommendedNeighborhoodNames, setRecommendedNeighborhoodNames] = useState<string[]>(
    [],
  )
  const [leftNeighborhood, setLeftNeighborhood] = useState(neighborhoods[0].name)
  const [rightNeighborhood, setRightNeighborhood] = useState(neighborhoods[1].name)
  const [weights, setWeights] = useState<Record<Dimension, number>>(
    {
      safety: 20,
      transit: 20,
      convenience: 20,
      parking: 20,
      environment: 20,
    },
  )

  // ── API state ───────────────────────────────────────────────────────────────
  const [communityDetails, setCommunityDetails] = useState<Record<string, ApiCommunityDetail>>({})
  const [, setCommunityLoadingIds] = useState<Set<string>>(new Set())
  const [compareResult, setCompareResult] = useState<ApiCompareResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // ── LLM chat state ──────────────────────────────────────────────────────────
  const [llmWeights, setLlmWeights] = useState<Record<Dimension, number> | null>(null)
  const [chatRecommendation, setChatRecommendation] = useState<{ name: string; score: number } | null>(null)

  // ── Community fetching ──────────────────────────────────────────────────────
  const loadCommunity = useCallback(async (id: string) => {
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
  }, [])

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

  // ── Preload community data as user progresses through steps ─────────────────
  useEffect(() => {
    // Preload all visible neighborhoods so map hover tooltip has rent data
    visibleNeighborhoods.forEach((n) => loadCommunity(n.id))
  }, [visibleNeighborhoods, loadCommunity])

  useEffect(() => {
    loadCommunity(selectedNeighborhoodData.id)
  }, [selectedNeighborhoodData.id, loadCommunity])

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

  const handleChatResponse = useCallback((response: ChatApiResponse) => {
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
      const ranked = [...neighborhoods]
        .map((n) => ({ n, score: scoreNeighborhood(enrichNeighborhood(n), normalized) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
      setRecommendedNeighborhoodNames(ranked.map(({ n }) => n.name))
      if (ranked[0]) {
        setSelectedNeighborhood(ranked[0].n.name)
        setCommunityInput(ranked[0].n.name)
        setChatRecommendation({ name: ranked[0].n.name, score: Math.round(ranked[0].score) })
      }
    } else {
      setChatRecommendation(null)
    }
  }, [enrichNeighborhood])

  const handleGenerateRecommendation = () => {
    const activeWeights = weights

    const ranked = [...neighborhoods]
      .map((n) => ({ n, score: scoreNeighborhood(enrichNeighborhood(n), activeWeights) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    setRecommendedNeighborhoodNames(ranked.map(({ n }) => n.name))
    if (ranked[0]) {
      setSelectedNeighborhood(ranked[0].n.name)
      setLeftNeighborhood(ranked[0].n.name)
    }
    if (ranked[1]) {
      setRightNeighborhood(ranked[1].n.name)
    }
  }

  const handleNeighborhoodSelect = (side: 'left' | 'right', event: SelectChangeEvent<string>) => {
    const value = event.target.value
    if (side === 'left') setLeftNeighborhood(value)
    if (side === 'right') setRightNeighborhood(value)
  }

  // ── Metrics for ConstraintsForm ─────────────────────────────────────────────
  const selectedMetrics: ApiMetrics | null =
    communityDetails[selectedNeighborhoodData.id]?.metrics ?? null

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
                  recommendedNeighborhoodNames={recommendedNeighborhoodNames}
                  onGenerateRecommendation={handleGenerateRecommendation}
                  onChatResponse={handleChatResponse}
                  communityDetails={communityDetails}
                  chatRecommendation={chatRecommendation}
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
                  topDrivers={topDrivers}
                  modelPrompt={modelPrompt}
                  metrics={selectedMetrics}
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
