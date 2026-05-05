import {
  Alert,
  Button,
  CircularProgress,
  Container,
  createTheme,
  CssBaseline,
  Fade,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import {
  type ApiCommunityDetail,
  type ApiCompareResult,
  type ApiRecommendationItem,
  type ChatApiResponse,
  buildNeighborhood,
  fetchCommunities,
  fetchCommunityDetail,
  postCompare,
  postRecommend,
} from './api'
import {
  getTopDriverDimensions,
  normalizeWeights,
  scoreNeighborhood,
} from './logic'
import type { Dimension, Neighborhood } from './types'
import { NavigationStepper } from './components/NavigationStepper'
import { ProfileForm } from './components/ProfileForm'
import { loadGoogleMapsScript } from './googleMapsLoader'

const ConstraintsForm = lazy(async () => ({
  default: (await import('./components/ConstraintsForm')).ConstraintsForm,
}))
void ConstraintsForm
const Dashboard = lazy(async () => ({
  default: (await import('./components/Dashboard')).Dashboard,
}))
const CommunityReportPage = lazy(async () => ({
  default: (await import('./components/CommunityReportPage')).CommunityReportPage,
}))
const ReviewPage = lazy(async () => ({
  default: (await import('./components/ReviewPage')).ReviewPage,
}))

const steps = ['Explore', 'Insights', 'Compare', 'Reviews']
const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  safety: 20,
  transit: 20,
  convenience: 20,
  parking: 20,
  environment: 20,
}

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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function mapCommunityDetailsById(
  details: ApiCommunityDetail[],
): Record<string, ApiCommunityDetail> {
  return Object.fromEntries(details.map((detail) => [detail.community.community_id, detail]))
}

function replaceNeighborhood(
  neighborhoods: Neighborhood[],
  detail: ApiCommunityDetail,
): Neighborhood[] {
  const nextNeighborhood = buildNeighborhood(detail)
  let changed = false
  const nextNeighborhoods = neighborhoods.map((item) => {
    if (item.id !== nextNeighborhood.id) return item
    changed = true
    return nextNeighborhood
  })
  return changed ? nextNeighborhoods : neighborhoods
}

function StepFallback() {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
      <CircularProgress size={28} />
      <Typography color="text.secondary">Loading step...</Typography>
    </Stack>
  )
}

function App() {
  const [activeStep, setActiveStep] = useState(0)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [communityInput, setCommunityInput] = useState('')
  const [mapZoom, setMapZoom] = useState(13)
  const [recommendedCommunities, setRecommendedCommunities] = useState<ApiRecommendationItem[]>(
    [],
  )
  const [leftNeighborhood, setLeftNeighborhood] = useState('')
  const [rightNeighborhood, setRightNeighborhood] = useState('')
  const [weights, setWeights] = useState<Record<Dimension, number>>(DEFAULT_WEIGHTS)

  const [communities, setCommunities] = useState<Neighborhood[]>([])
  const [communitiesLoading, setCommunitiesLoading] = useState(true)
  const [communitiesError, setCommunitiesError] = useState<string | null>(null)
  const [communityListReloadKey, setCommunityListReloadKey] = useState(0)

  const [communityDetails, setCommunityDetails] = useState<Record<string, ApiCommunityDetail>>({})
  const [compareResult, setCompareResult] = useState<ApiCompareResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)

  const [llmWeights, setLlmWeights] = useState<Record<Dimension, number> | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)
  const recommendationRequestIdRef = useRef(0)
  const defaultRecommendationRequestedRef = useRef(false)

  useEffect(() => {
    // Start downloading the Maps SDK as soon as the app boots so it can load in
    // parallel with the community list request instead of after it.
    void loadGoogleMapsScript().catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCommunities = async () => {
      setCommunitiesLoading(true)
      setCommunitiesError(null)
      setRecommendedCommunities([])
      setRecommendationsError(null)
      defaultRecommendationRequestedRef.current = false

      try {
        const details = await fetchCommunities()
        if (cancelled) return
        if (details.length === 0) {
          throw new Error('Communities: backend returned an empty list')
        }

        const nextCommunities = details.map(buildNeighborhood)
        const nextDetails = mapCommunityDetailsById(details)
        const defaultSelection = nextCommunities[0].name
        const defaultRightSelection =
          nextCommunities.find((item) => item.name !== defaultSelection)?.name
          ?? defaultSelection

        setCommunities(nextCommunities)
        setCommunityDetails(nextDetails)
        setSelectedNeighborhood(defaultSelection)
        setCommunityInput(defaultSelection)
        setLeftNeighborhood(defaultSelection)
        setRightNeighborhood(defaultRightSelection)
      } catch (error) {
        if (cancelled) return

        setCommunities([])
        setCommunityDetails({})
        setSelectedNeighborhood('')
        setCommunityInput('')
        setLeftNeighborhood('')
        setRightNeighborhood('')
        setCommunitiesError(
          getErrorMessage(error, 'Unable to load communities from the backend.'),
        )
      } finally {
        if (!cancelled) {
          setCommunitiesLoading(false)
        }
      }
    }

    void loadCommunities()

    return () => {
      cancelled = true
    }
  }, [communityListReloadKey])

  const refreshCommunity = useCallback(async (id: string) => {
    try {
      const detail = await fetchCommunityDetail(id)
      setCommunityDetails((prev) => ({ ...prev, [id]: detail }))
      setCommunities((prev) => replaceNeighborhood(prev, detail))
    } catch (error) {
      console.error('[community] refresh failed', error)
    }
  }, [])

  const visibleNeighborhoods = useMemo(() => {
    if (mapZoom <= 11) return communities.slice(0, 6)
    if (mapZoom <= 12) return communities.slice(0, 12)
    if (mapZoom <= 13) return communities.slice(0, 18)
    return communities
  }, [communities, mapZoom])

  const selectedNeighborhoodData = useMemo(
    () => communities.find((item) => item.name === selectedNeighborhood) ?? communities[0] ?? null,
    [communities, selectedNeighborhood],
  )

  const leftData = useMemo(
    () => communities.find((item) => item.name === leftNeighborhood) ?? selectedNeighborhoodData,
    [communities, leftNeighborhood, selectedNeighborhoodData],
  )
  const rightData = useMemo(
    () => communities.find((item) => item.name === rightNeighborhood)
      ?? communities.find((item) => item.name !== leftNeighborhood)
      ?? selectedNeighborhoodData,
    [communities, leftNeighborhood, rightNeighborhood, selectedNeighborhoodData],
  )
  const selectedNeighborhoodId = selectedNeighborhoodData?.id ?? ''
  const leftNeighborhoodId = leftData?.id ?? ''
  const rightNeighborhoodId = rightData?.id ?? ''

  const leftScore = useMemo(
    () => (leftData ? scoreNeighborhood(leftData, weights) : 0),
    [leftData, weights],
  )
  const rightScore = useMemo(
    () => (rightData ? scoreNeighborhood(rightData, weights) : 0),
    [rightData, weights],
  )

  const recommendation = useMemo(() => {
    if (!leftData || !rightData) return 'Live comparison is not ready yet.'
    if (Math.abs(leftScore - rightScore) < 0.1) {
      return `Both neighborhoods are tied at ${leftScore.toFixed(1)}/100 with your current weights.`
    }

    const preferred = leftScore > rightScore ? leftData.name : rightData.name
    const diff = Math.abs(leftScore - rightScore).toFixed(1)
    return `${preferred} leads by ${diff} points based on the current backend metrics and your selected weights.`
  }, [leftData, leftScore, rightData, rightScore])

  const topDrivers = useMemo(() => getTopDriverDimensions(weights), [weights])
  const recommendationScores = useMemo(
    () =>
      Object.fromEntries(
        communities.map((neighborhood) => [
          neighborhood.name,
          scoreNeighborhood(neighborhood, weights),
        ]),
      ),
    [communities, weights],
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
        ?? communities.find((item) => item.name !== topChoice.name)?.name
        ?? topChoice.name
      setRightNeighborhood(secondaryChoice)
    },
    [communities],
  )

  const requestRecommendations = useCallback(
    async (
      activeWeights: Record<Dimension, number>,
      options?: { updateCompareSelections?: boolean },
    ) => {
      const requestId = recommendationRequestIdRef.current + 1
      recommendationRequestIdRef.current = requestId
      setRecommendationsLoading(true)
      setRecommendationsError(null)

      try {
        const response = await postRecommend(activeWeights, 3)
        if (recommendationRequestIdRef.current !== requestId) return

        const items = response.ranked_communities
        setRecommendedCommunities(items)
        applyRecommendedCommunities(items, options?.updateCompareSelections ?? false)

        if (items.length === 0) {
          setRecommendationsError('Backend returned no ranked communities for the current request.')
        }
      } catch (error) {
        if (recommendationRequestIdRef.current !== requestId) return

        setRecommendedCommunities([])
        setRecommendationsError(
          getErrorMessage(error, 'Unable to load recommendations from the backend.'),
        )
      } finally {
        if (recommendationRequestIdRef.current === requestId) {
          setRecommendationsLoading(false)
        }
      }
    },
    [applyRecommendedCommunities],
  )

  useEffect(() => {
    if (communities.length === 0) return
    if (defaultRecommendationRequestedRef.current) return

    defaultRecommendationRequestedRef.current = true
    void requestRecommendations(DEFAULT_WEIGHTS, { updateCompareSelections: true })
  }, [communities.length, requestRecommendations])

  useEffect(() => {
    if (selectedNeighborhoodId) {
      void refreshCommunity(selectedNeighborhoodId)
    }
  }, [refreshCommunity, selectedNeighborhoodId])

  useEffect(() => {
    if (activeStep < 2 || !leftNeighborhoodId || !rightNeighborhoodId) return
    void refreshCommunity(leftNeighborhoodId)
    void refreshCommunity(rightNeighborhoodId)
  }, [activeStep, leftNeighborhoodId, refreshCommunity, rightNeighborhoodId])

  useEffect(() => {
    if (llmWeights) {
      setWeights(llmWeights)
    }
  }, [llmWeights])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeStep])

  const isOnDashboard = activeStep === 2
  const isOnReviewPage = activeStep === 3

  useEffect(() => {
    if (!isOnDashboard || !leftNeighborhoodId || !rightNeighborhoodId) return
    if (leftNeighborhoodId === rightNeighborhoodId) return

    let cancelled = false
    setCompareLoading(true)
    setCompareResult(null)
    setCompareError(null)

    postCompare(leftNeighborhoodId, rightNeighborhoodId, weights)
      .then((result) => {
        if (!cancelled) setCompareResult(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setCompareError(
            getErrorMessage(error, 'Unable to load live comparison data from the backend.'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOnDashboard, leftNeighborhoodId, rightNeighborhoodId, weights])

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

    const hasAnyPreference = (Object.keys(w) as (keyof typeof w)[]).some((key) => {
      const value = w[key]
      return value !== null && Math.abs(value - 20) > 3
    })

    if (response.ready_to_recommend || hasAnyPreference) {
      await requestRecommendations(normalized, { updateCompareSelections: true })
      return
    }

    await requestRecommendations(DEFAULT_WEIGHTS, { updateCompareSelections: true })
  }, [requestRecommendations])

  const handleNeighborhoodSelect = (side: 'left' | 'right', event: SelectChangeEvent<string>) => {
    const value = event.target.value
    if (side === 'left') setLeftNeighborhood(value)
    if (side === 'right') setRightNeighborhood(value)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          {communitiesLoading && (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
              <CircularProgress />
              <Typography color="text.secondary">
                Loading communities from the backend...
              </Typography>
            </Stack>
          )}

          {!communitiesLoading && communitiesError && (
            <Stack spacing={2} sx={{ py: 4 }}>
              <Alert severity="error">{communitiesError}</Alert>
              <Stack direction="row">
                <Button variant="contained" onClick={() => setCommunityListReloadKey((value) => value + 1)}>
                  Retry Backend Load
                </Button>
              </Stack>
            </Stack>
          )}

          {!communitiesLoading && !communitiesError && selectedNeighborhoodData && leftData && rightData && (
            <>
              <NavigationStepper activeStep={activeStep} steps={steps} />

              {activeStep === 0 && (
                <Fade in={activeStep === 0}>
                  <div>
                    <Stack spacing={2}>
                      <ProfileForm
                        neighborhoods={communities}
                        selectedNeighborhood={selectedNeighborhood}
                        setSelectedNeighborhood={setSelectedNeighborhood}
                        communityInput={communityInput}
                        setCommunityInput={setCommunityInput}
                        mapZoom={mapZoom}
                        setMapZoom={setMapZoom}
                        availableNeighborhoods={visibleNeighborhoods}
                        recommendationItems={recommendedCommunities}
                        recommendationsLoading={recommendationsLoading}
                        onChatResponse={handleChatResponse}
                        communityDetails={communityDetails}
                        recommendationScores={recommendationScores}
                      />
                      {recommendationsError && (
                        <Alert severity="error">{recommendationsError}</Alert>
                      )}
                    </Stack>
                  </div>
                </Fade>
              )}

              {activeStep === 1 && (
                <Suspense fallback={<StepFallback />}>
                  <Fade in={activeStep === 1}>
                    <div>
                      <CommunityReportPage
                        selectedNeighborhoodData={selectedNeighborhoodData}
                        weights={weights}
                      />
                    </div>
                  </Fade>
                </Suspense>
              )}

              {isOnDashboard && (
                <Suspense fallback={<StepFallback />}>
                  <Fade in={isOnDashboard}>
                    <div>
                      <Dashboard
                        neighborhoods={communities}
                        weights={weights}
                        onWeightsChange={handleWeightsChange}
                        topDrivers={topDrivers}
                        leftNeighborhood={leftNeighborhood}
                        rightNeighborhood={rightNeighborhood}
                        onNeighborhoodChange={handleNeighborhoodSelect}
                        leftData={leftData}
                        rightData={rightData}
                        leftScore={leftScore}
                        rightScore={rightScore}
                        recommendation={recommendation}
                        compareResult={compareResult}
                        compareLoading={compareLoading}
                        compareError={compareError}
                      />
                    </div>
                  </Fade>
                </Suspense>
              )}

              {isOnReviewPage && (
                <Suspense fallback={<StepFallback />}>
                  <Fade in={isOnReviewPage}>
                    <div>
                      <ReviewPage neighborhoods={communities} />
                    </div>
                  </Fade>
                </Suspense>
              )}

              <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
                <Button disabled={activeStep === 0} onClick={() => setActiveStep((step) => step - 1)}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep((step) => Math.min(3, step + 1))}
                  disabled={activeStep === 3}
                >
                  Continue
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Container>
    </ThemeProvider>
  )
}

export default App
