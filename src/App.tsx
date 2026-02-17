import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  createTheme,
  CssBaseline,
  Divider,
  Fade,
  FormControl,
  // Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  ThemeProvider,
  Typography,
  Grid,
} from '@mui/material'
import { useMemo, useState } from 'react'

// Import separate data and logic modules to keep the component clean
import { dimensions, neighborhoods } from './data'
import {
  getTopDriverDimensions,
  normalizeWeights,
  recommendedWeightsFromOnboarding,
  scoreNeighborhood,
} from './logic'
import type { Dimension, ProfileType } from './types'

import './App.css'

// Map each dimension to a user-friendly label
const dimensionLabels: Record<Dimension, string> = {
  safety: 'Safety',
  transit: 'Transit',
  convenience: 'Convenience',
  parking: 'Parking',
  environment: 'Environment',
}

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
  const isSameNeighborhood = leftNeighborhood === rightNeighborhood

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          {/* Header Card */}
          <Card
            elevation={0}
            sx={{
              overflow: 'hidden',
              background: `linear-gradient(130deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(
                theme.palette.secondary.main,
                0.13,
              )})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h4">RentWise Prototype</Typography>
                <Typography color="text.secondary">
                  Explainable neighborhood comparison combining objective API metrics with
                  AI-generated Reddit perception summaries.
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip
                    label={`Top weight: ${topDrivers[0]}`}
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip label="Prototype focus: explainability" variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Stepper Navigation */}
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>

          {/* Step 1: Profile Selection */}
          {activeStep === 0 && (
            <Fade in={activeStep === 0}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Typography variant="h6">Adaptive onboarding: profile</Typography>

                    <FormControl fullWidth>
                      <InputLabel>Profile type</InputLabel>
                      <Select
                        label="Profile type"
                        value={profileType}
                        onChange={(event) => setProfileType(event.target.value as ProfileType)}
                      >
                        <MenuItem value="student">Student</MenuItem>
                        <MenuItem value="professional">Working professional</MenuItem>
                        <MenuItem value="family">Family household</MenuItem>
                      </Select>
                    </FormControl>

                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography>Do you currently have a car?</Typography>
                      <Switch checked={hasCar} onChange={(e) => setHasCar(e.target.checked)} />
                    </Stack>

                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography>You are sharing housing with roommates</Typography>
                      <Switch
                        checked={sharesHousing}
                        onChange={(e) => setSharesHousing(e.target.checked)}
                      />
                    </Stack>

                    {/* Conditional input: Only show bike comfort if no car */}
                    {!hasCar && (
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography>Comfortable biking for part of commute</Typography>
                        <Switch
                          checked={bikeComfort}
                          onChange={(e) => setBikeComfort(e.target.checked)}
                        />
                      </Stack>
                    )}

                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography>Prefer a low-noise neighborhood</Typography>
                      <Switch
                        checked={needsQuietArea}
                        onChange={(e) => setNeedsQuietArea(e.target.checked)}
                      />
                    </Stack>

                    <Alert severity="info" variant="outlined">
                      These profile conditions feed recommended baseline weights before manual tuning.
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          )}

          {/* Step 2: Constraints & Weights */}
          {activeStep === 1 && (
            <Fade in={activeStep === 1}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Typography variant="h6">Adaptive onboarding: constraints</Typography>

                    <Box>
                      <Typography gutterBottom>How many days per week do you commute?</Typography>
                      <Slider
                        value={commuteDays}
                        min={0}
                        max={7}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        onChange={(_, value) => setCommuteDays(value as number)}
                      />
                    </Box>

                    <Box>
                      <Typography gutterBottom>How important is nighttime safety?</Typography>
                      <Slider
                        value={safetyPriority}
                        min={1}
                        max={5}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        onChange={(_, value) => setSafetyPriority(value as number)}
                      />
                    </Box>

                    {hasCar && (
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography>Parking availability is a high priority</Typography>
                        <Switch
                          checked={parkingPriority}
                          onChange={(e) => setParkingPriority(e.target.checked)}
                        />
                      </Stack>
                    )}

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button variant="contained" onClick={applyRecommendedWeights}>
                        Apply recommended weights
                      </Button>
                      <Button variant="outlined" onClick={resetWeights}>
                        Reset to even weights
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          )}

          {/* Step 3: Dashboard & Comparison */}
          {isOnDashboard && (
            <Fade in={isOnDashboard}>
              <Stack spacing={3}>
                <Alert severity="info">
                  Objective scores below are API-based metrics. Perception text is AI-generated from
                  Reddit discussions and shown separately.
                </Alert>

                {/* Weight Snapshot */}
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">Current weighting snapshot</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {dimensions.map((dimension) => (
                          <Chip
                            key={dimension}
                            label={`${dimensionLabels[dimension]} ${weights[dimension]}%`}
                            size="small"
                            color="default" // Neutral color for overview
                          />
                        ))}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Top drivers: {topDrivers.join(' • ')}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Neighborhood Selectors */}
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">Select neighborhoods</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Neighborhood A</InputLabel>
                            <Select
                              label="Neighborhood A"
                              value={leftNeighborhood}
                              onChange={(event) => handleNeighborhoodSelect('left', event)}
                            >
                              {neighborhoods.map((n) => (
                                <MenuItem key={n.name} value={n.name}>
                                  {n.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Neighborhood B</InputLabel>
                            <Select
                              label="Neighborhood B"
                              value={rightNeighborhood}
                              onChange={(event) => handleNeighborhoodSelect('right', event)}
                            >
                              {neighborhoods.map((n) => (
                                <MenuItem key={n.name} value={n.name}>
                                  {n.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      {isSameNeighborhood && (
                        <Alert severity="warning" variant="outlined">
                          You selected the same neighborhood on both sides. Choose different options
                          to get a meaningful comparison.
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Fine-tuning Slider Controls */}
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">Manual weight adjustment</Typography>
                      <Typography color="text.secondary">
                        Override recommended weights to explore trade-offs.
                      </Typography>
                      {dimensions.map((dimension) => (
                        <Box key={dimension}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography>{dimensionLabels[dimension]}</Typography>
                            <Chip label={`${weights[dimension]}%`} size="small" />
                          </Stack>
                          <Slider
                            value={weights[dimension]}
                            min={5}
                            max={60}
                            step={1}
                            color="primary"
                            onChange={(_, value) => handleWeightChange(dimension, value as number)}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Compare Cards Side-by-Side */}
                <Grid container spacing={2}>
                  {[leftData, rightData].map((neighborhood, index) => {
                    const score = index === 0 ? leftScore : rightScore
                    // Highlight the winner if scores differ
                    const isWinner =
                      (index === 0 && leftScore > rightScore) ||
                      (index === 1 && rightScore > leftScore)

                    return (
                      <Grid key={neighborhood.name} size={{ xs: 12, md: 6 }}>
                        <Card
                          sx={{
                            height: '100%',
                            border: isWinner
                              ? `2px solid ${theme.palette.primary.main}`
                              : undefined,
                            boxShadow: isWinner ? 4 : 1,
                            transition: 'box-shadow 0.3s ease',
                          }}
                        >
                          <CardContent>
                            <Stack spacing={2}>
                              <Typography variant="h6">{neighborhood.name}</Typography>
                              <Box>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography fontWeight={600}>
                                    Personalized objective score
                                  </Typography>
                                  <Typography
                                    fontWeight={700}
                                    color={isWinner ? 'primary.main' : 'text.primary'}
                                  >
                                    {score}/100
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={score}
                                  sx={{
                                    mt: 1,
                                    height: 9,
                                    borderRadius: 999,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 999,
                                    },
                                  }}
                                />
                              </Box>

                              <Divider />

                              <Typography variant="subtitle1" fontWeight={600}>
                                Objective API metrics
                              </Typography>
                              {dimensions.map((dimension) => {
                                const value = neighborhood.objective[dimension]
                                const display = value === null ? 'N/A' : `${value}/100`
                                return (
                                  <Stack
                                    key={dimension}
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography>{dimensionLabels[dimension]}</Typography>
                                    <Chip
                                      label={display}
                                      color={value === null ? 'default' : 'primary'}
                                      variant={value === null ? 'outlined' : 'filled'}
                                      size="small"
                                    />
                                  </Stack>
                                )
                              })}

                              <Divider />

                              <Typography variant="subtitle1" fontWeight={600}>
                                AI-generated perception summary (Reddit)
                              </Typography>
                              <Typography color="text.secondary" variant="body2">
                                Based on {neighborhood.redditSampleSize} upvote-weighted discussion
                                snippets.
                              </Typography>
                              {dimensions.map((dimension) => (
                                <Box key={dimension}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {dimensionLabels[dimension]}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {neighborhood.perception[dimension]}
                                  </Typography>
                                </Box>
                              ))}

                              <Alert severity="warning" variant="outlined">
                                {neighborhood.tradeoffNote}
                              </Alert>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>

                {/* Final Recommendation Card */}
                <Card>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant="h6">Structured trade-off summary</Typography>
                      <Typography>{recommendation}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        This prototype focuses on neighborhood-level decision support and handles
                        incomplete data by excluding missing metrics from weighted score
                        calculations.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
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
