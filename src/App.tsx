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
import { useMemo, useState } from 'react'
import './App.css'

import { neighborhoods } from './data'
import {
  getTopDriverDimensions,
  scoreNeighborhood,
} from './logic'
import type { Dimension } from './types'
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
  const [modelPrompt, setModelPrompt] = useState('')
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

  const visibleNeighborhoods = useMemo(() => {
    if (mapZoom <= 11) return neighborhoods.slice(0, 3)
    if (mapZoom <= 13) return neighborhoods.slice(0, 4)
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

  const leftScore = useMemo(() => scoreNeighborhood(leftData, weights), [leftData, weights])
  const rightScore = useMemo(() => scoreNeighborhood(rightData, weights), [rightData, weights])

  const recommendation = useMemo(() => {
    if (leftScore === rightScore) {
      return `Both neighborhoods are tied at ${leftScore}/100 with your current weights.`
    }

    const preferred = leftScore > rightScore ? leftData.name : rightData.name
    const diff = Math.abs(leftScore - rightScore)
    return `${preferred} leads by ${diff} points and better matches the weights you set in Step 3.`
  }, [leftData.name, leftScore, rightData.name, rightScore])

  const topDrivers = useMemo(() => getTopDriverDimensions(weights), [weights])

  const handleWeightChange = (dimension: Dimension, value: number) => {
    setWeights((prev) => ({ ...prev, [dimension]: value }))
  }

  const handleGenerateRecommendation = () => {
    const prompt = modelPrompt.toLowerCase()
    let targetDimension: Dimension = 'convenience'

    if (prompt.includes('safety')) targetDimension = 'safety'
    if (prompt.includes('transit') || prompt.includes('commute')) targetDimension = 'transit'
    if (prompt.includes('parking') || prompt.includes('car')) targetDimension = 'parking'
    if (prompt.includes('quiet') || prompt.includes('environment')) {
      targetDimension = 'environment'
    }

    const ranked = [...neighborhoods]
      .sort(
        (a, b) =>
          (b.objective[targetDimension] ?? 0) - (a.objective[targetDimension] ?? 0),
      )
      .slice(0, 3)

    setRecommendedNeighborhoodNames(ranked.map((n) => n.name))
    if (ranked[0]) {
      setSelectedNeighborhood(ranked[0].name)
      setLeftNeighborhood(ranked[0].name)
    }
    if (ranked[1]) {
      setRightNeighborhood(ranked[1].name)
    }
  }

  const handleNeighborhoodSelect = (side: 'left' | 'right', event: SelectChangeEvent<string>) => {
    const value = event.target.value
    if (side === 'left') setLeftNeighborhood(value)
    if (side === 'right') setRightNeighborhood(value)
  }

  const isOnDashboard = activeStep === 2
  const isOnReviewPage = activeStep === 3

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
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
                  modelPrompt={modelPrompt}
                  setModelPrompt={setModelPrompt}
                  mapZoom={mapZoom}
                  setMapZoom={setMapZoom}
                  availableNeighborhoods={visibleNeighborhoods}
                  recommendedNeighborhoodNames={recommendedNeighborhoodNames}
                  onGenerateRecommendation={handleGenerateRecommendation}
                />
              </div>
            </Fade>
          )}

          {/* Step 2: Constraints & Weights */}
          {activeStep === 1 && (
            <Fade in={activeStep === 1}>
              <div>
                <ConstraintsForm
                  selectedNeighborhoodData={selectedNeighborhoodData}
                  topDrivers={topDrivers}
                  modelPrompt={modelPrompt}
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
                  onWeightChange={handleWeightChange}
                  leftData={leftData}
                  rightData={rightData}
                  leftScore={leftScore}
                  rightScore={rightScore}
                  recommendation={recommendation}
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
