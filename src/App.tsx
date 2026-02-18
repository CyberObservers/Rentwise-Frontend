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

// Import separate data and logic modules
import { neighborhoods } from './data'
import {
  getTopDriverDimensions,
  normalizeWeights,
  recommendedWeightsFromOnboarding,
  scoreNeighborhood,
} from './logic'
import type { Dimension, ProfileType } from './types'

// Import new components
import { ConstraintsForm } from './components/ConstraintsForm'
import { Dashboard } from './components/Dashboard'
import { Header } from './components/Header'
import { NavigationStepper } from './components/NavigationStepper'
import { ProfileForm } from './components/ProfileForm'

// Define the steps for the stepper
const steps = ['Profile', 'Constraints', 'Dashboard']

// Create a custom MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0B5FFF', // Vibrant blue for primary actions
    },
    secondary: {
      main: '#009D77', // Green for secondary accents
    },
    background: {
      default: '#F3F5FA', // Light gray background
      paper: '#FFFFFF',
    },
  },
  shape: {
    borderRadius: 14, // Softer corners for cards
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
  // --- State Management ---

  // Stepper state
  const [activeStep, setActiveStep] = useState(0)

  // Profile Step State
  const [profileType, setProfileType] = useState<ProfileType>('student')
  const [hasCar, setHasCar] = useState(false)
  const [sharesHousing, setSharesHousing] = useState(true)
  const [bikeComfort, setBikeComfort] = useState(true)
  const [needsQuietArea, setNeedsQuietArea] = useState(false)

  // Constraints Step State
  const [commuteDays, setCommuteDays] = useState(4)
  const [safetyPriority, setSafetyPriority] = useState(4)
  const [parkingPriority, setParkingPriority] = useState(false)

  // Dashboard State
  const [leftNeighborhood, setLeftNeighborhood] = useState(neighborhoods[0].name)
  const [rightNeighborhood, setRightNeighborhood] = useState(neighborhoods[1].name)
  const [weights, setWeights] = useState<Record<Dimension, number>>(
    // Initialize weights based on default profile settings
    recommendedWeightsFromOnboarding({
      hasCar: false,
      commuteDays: 4,
      safetyPriority: 4,
      parkingPriority: false,
      profileType: 'student',
      sharesHousing: true,
      bikeComfort: true,
      needsQuietArea: false,
    }),
  )

  // --- Derived State (Memoized) ---

  const leftData = useMemo(
    () => neighborhoods.find((n) => n.name === leftNeighborhood) ?? neighborhoods[0],
    [leftNeighborhood],
  )
  const rightData = useMemo(
    () => neighborhoods.find((n) => n.name === rightNeighborhood) ?? neighborhoods[1],
    [rightNeighborhood],
  )

  // Calculate scores dynamically based on current weights
  const leftScore = useMemo(() => scoreNeighborhood(leftData, weights), [leftData, weights])
  const rightScore = useMemo(() => scoreNeighborhood(rightData, weights), [rightData, weights])

  // Generate a text recommendation summarizing the comparison
  const recommendation = useMemo(() => {
    if (leftScore === rightScore) {
      return `Both neighborhoods are currently tied at ${leftScore}/100 under your weights.`
    }

    const preferred = leftScore > rightScore ? leftData.name : rightData.name
    const diff = Math.abs(leftScore - rightScore)
    return `${preferred} leads by ${diff} points based on your personalized objective weighting.`
  }, [leftData.name, leftScore, rightData.name, rightScore])

  // Identify leading factors in the current weight configuration
  const topDrivers = useMemo(() => getTopDriverDimensions(weights), [weights])

  // --- Event Handlers ---

  const applyRecommendedWeights = () => {
    setWeights(
      recommendedWeightsFromOnboarding({
        hasCar,
        commuteDays,
        safetyPriority,
        parkingPriority,
        profileType,
        sharesHousing,
        bikeComfort,
        needsQuietArea,
      }),
    )
  }

  const resetWeights = () => {
    setWeights({
      safety: 20,
      transit: 20,
      convenience: 20,
      parking: 20,
      environment: 20,
    })
  }

  const handleWeightChange = (dimension: Dimension, value: number) => {
    // Update one weight and re-normalize the rest to keep sum at 100%
    const draft = { ...weights, [dimension]: value }
    setWeights(normalizeWeights(draft))
  }

  const handleNeighborhoodSelect = (side: 'left' | 'right', event: SelectChangeEvent<string>) => {
    const value = event.target.value
    if (side === 'left') setLeftNeighborhood(value)
    if (side === 'right') setRightNeighborhood(value)
  }

  const isOnDashboard = activeStep === 2

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          {/* Header Card */}
          <Header topDriver={topDrivers[0]} />

          {/* Stepper Navigation */}
          <NavigationStepper activeStep={activeStep} steps={steps} />

          {/* Step 1: Profile Selection */}
          {activeStep === 0 && (
            <Fade in={activeStep === 0}>
              <div>
                <ProfileForm
                  profileType={profileType}
                  setProfileType={setProfileType}
                  hasCar={hasCar}
                  setHasCar={setHasCar}
                  sharesHousing={sharesHousing}
                  setSharesHousing={setSharesHousing}
                  bikeComfort={bikeComfort}
                  setBikeComfort={setBikeComfort}
                  needsQuietArea={needsQuietArea}
                  setNeedsQuietArea={setNeedsQuietArea}
                />
              </div>
            </Fade>
          )}

          {/* Step 2: Constraints & Weights */}
          {activeStep === 1 && (
            <Fade in={activeStep === 1}>
              <div>
                <ConstraintsForm
                  commuteDays={commuteDays}
                  setCommuteDays={setCommuteDays}
                  safetyPriority={safetyPriority}
                  setSafetyPriority={setSafetyPriority}
                  parkingPriority={parkingPriority}
                  setParkingPriority={setParkingPriority}
                  hasCar={hasCar}
                  onApplyRecommendedWeights={applyRecommendedWeights}
                  onResetWeights={resetWeights}
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

          {/* Navigation Buttons */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep((s) => Math.min(2, s + 1))}
              disabled={activeStep === 2}
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
