import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  ThemeProvider,
  Typography,
  alpha,
  createTheme,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useMemo, useState } from 'react'
import './App.css'

type Dimension = 'safety' | 'transit' | 'convenience' | 'parking' | 'environment'
type ProfileType = 'student' | 'professional' | 'family'

type Neighborhood = {
  name: string
  objective: Record<Dimension, number | null>
  perception: Record<Dimension, string>
  redditSampleSize: number
  tradeoffNote: string
}

const dimensionLabels: Record<Dimension, string> = {
  safety: 'Safety',
  transit: 'Transit Access',
  convenience: 'Daily Convenience',
  parking: 'Parking',
  environment: 'Environment',
}

const neighborhoods: Neighborhood[] = [
  {
    name: 'University Town Center',
    objective: {
      safety: 72,
      transit: 91,
      convenience: 90,
      parking: 54,
      environment: 78,
    },
    perception: {
      safety: 'Generally safe at night near main plazas, occasional bike theft concerns.',
      transit: 'Frequent buses and easy campus access; many users report low car dependence.',
      convenience: 'Very walkable for groceries, food, and study spots.',
      parking: 'Visitor parking can be expensive and difficult during peak hours.',
      environment: 'Active, student-centered area with moderate noise on weekends.',
    },
    redditSampleSize: 86,
    tradeoffNote: 'Excellent transit and convenience, but parking pressure is common.',
  },
  {
    name: 'Northwood',
    objective: {
      safety: 86,
      transit: 62,
      convenience: 70,
      parking: 84,
      environment: 88,
    },
    perception: {
      safety: 'Residents frequently describe it as quiet and family-friendly.',
      transit: 'Transit is workable but less frequent than central neighborhoods.',
      convenience: 'Good basics nearby, though some errands still require a short drive.',
      parking: 'Street and complex parking are usually easier than denser areas.',
      environment: 'Calm streets, lower noise, and more green space reported.',
    },
    redditSampleSize: 59,
    tradeoffNote: 'Strong safety and environment, weaker transit frequency.',
  },
  {
    name: 'Costa Mesa Border',
    objective: {
      safety: 64,
      transit: 58,
      convenience: 74,
      parking: null,
      environment: 68,
    },
    perception: {
      safety: 'Mixed opinions: some blocks feel safe, others mention late-night caution.',
      transit: 'Most discussions suggest relying on a car for daily routines.',
      convenience: 'Good shopping and food options if driving is available.',
      parking: 'Parking information is inconsistent across postings and complexes.',
      environment: 'More urban feel with variable noise depending on street proximity.',
    },
    redditSampleSize: 37,
    tradeoffNote: 'Decent convenience with higher uncertainty in parking data quality.',
  },
]

const dimensions: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']
const steps = ['Profile', 'Constraints', 'Dashboard']

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

const normalizeWeights = (weights: Record<Dimension, number>) => {
  const total = dimensions.reduce((sum, key) => sum + weights[key], 0)
  if (total === 0) {
    return {
      safety: 20,
      transit: 20,
      convenience: 20,
      parking: 20,
      environment: 20,
    }
  }

  const normalized = { ...weights }
  dimensions.forEach((key) => {
    normalized[key] = Math.round((weights[key] / total) * 100)
  })

  const diff = 100 - dimensions.reduce((sum, key) => sum + normalized[key], 0)
  normalized.safety += diff
  return normalized
}

const recommendedWeightsFromOnboarding = (params: {
  hasCar: boolean
  commuteDays: number
  safetyPriority: number
  parkingPriority: boolean
  profileType: ProfileType
  sharesHousing: boolean
  bikeComfort: boolean
  needsQuietArea: boolean
}) => {
  const draft: Record<Dimension, number> = {
    safety: 20,
    transit: 20,
    convenience: 20,
    parking: 20,
    environment: 20,
  }

  if (!params.hasCar) {
    draft.transit += 18
    draft.parking -= 10
    draft.environment -= 8
  }

  if (params.profileType === 'student') {
    draft.transit += 4
    draft.convenience += 6
    draft.parking -= 5
    draft.environment -= 5
  }

  if (params.profileType === 'professional') {
    draft.safety += 4
    draft.transit += 3
    draft.parking += 3
    draft.environment -= 5
    draft.convenience -= 5
  }

  if (params.profileType === 'family') {
    draft.safety += 10
    draft.environment += 8
    draft.transit -= 8
    draft.parking -= 5
    draft.convenience -= 5
  }

  if (params.sharesHousing) {
    draft.convenience += 6
    draft.safety -= 3
    draft.parking -= 3
  }

  if (!params.hasCar && params.bikeComfort) {
    draft.transit -= 6
    draft.convenience += 4
    draft.environment += 2
  }

  if (params.needsQuietArea) {
    draft.environment += 10
    draft.convenience -= 4
    draft.transit -= 3
    draft.parking -= 3
  }

  if (params.hasCar && params.parkingPriority) {
    draft.parking += 16
    draft.transit -= 8
    draft.convenience -= 8
  }

  if (params.commuteDays >= 4) {
    draft.transit += 10
    draft.environment -= 6
    draft.convenience -= 4
  }

  if (params.safetyPriority >= 4) {
    draft.safety += 12
    draft.convenience -= 6
    draft.environment -= 6
  }

  dimensions.forEach((key) => {
    draft[key] = Math.max(5, draft[key])
  })

  return normalizeWeights(draft)
}

const scoreNeighborhood = (neighborhood: Neighborhood, weights: Record<Dimension, number>) => {
  let weightedSum = 0
  let usedWeight = 0

  dimensions.forEach((dimension) => {
    const value = neighborhood.objective[dimension]
    if (value !== null) {
      weightedSum += value * weights[dimension]
      usedWeight += weights[dimension]
    }
  })

  if (usedWeight === 0) return 0
  return Math.round(weightedSum / usedWeight)
}

const getTopDriverDimensions = (weights: Record<Dimension, number>) =>
  [...dimensions]
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, 3)
    .map((dimension) => `${dimensionLabels[dimension]} (${weights[dimension]}%)`)

function App() {
  const [activeStep, setActiveStep] = useState(0)
  const [hasCar, setHasCar] = useState(false)
  const [profileType, setProfileType] = useState<ProfileType>('student')
  const [sharesHousing, setSharesHousing] = useState(true)
  const [bikeComfort, setBikeComfort] = useState(true)
  const [needsQuietArea, setNeedsQuietArea] = useState(false)
  const [commuteDays, setCommuteDays] = useState(4)
  const [safetyPriority, setSafetyPriority] = useState(4)
  const [parkingPriority, setParkingPriority] = useState(false)
  const [leftNeighborhood, setLeftNeighborhood] = useState(neighborhoods[0].name)
  const [rightNeighborhood, setRightNeighborhood] = useState(neighborhoods[1].name)
  const [weights, setWeights] = useState<Record<Dimension, number>>(
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

  const leftData = useMemo(
    () => neighborhoods.find((n) => n.name === leftNeighborhood) ?? neighborhoods[0],
    [leftNeighborhood],
  )
  const rightData = useMemo(
    () => neighborhoods.find((n) => n.name === rightNeighborhood) ?? neighborhoods[1],
    [rightNeighborhood],
  )

  const leftScore = useMemo(() => scoreNeighborhood(leftData, weights), [leftData, weights])
  const rightScore = useMemo(() => scoreNeighborhood(rightData, weights), [rightData, weights])

  const recommendation = useMemo(() => {
    if (leftScore === rightScore) {
      return `Both neighborhoods are currently tied at ${leftScore}/100 under your weights.`
    }

    const preferred = leftScore > rightScore ? leftData.name : rightData.name
    const diff = Math.abs(leftScore - rightScore)
    return `${preferred} leads by ${diff} points based on your personalized objective weighting.`
  }, [leftData.name, leftScore, rightData.name, rightScore])

  const topDrivers = useMemo(() => getTopDriverDimensions(weights), [weights])

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
          <Card
            sx={{
              overflow: 'hidden',
              background: `linear-gradient(130deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(
                theme.palette.secondary.main,
                0.13,
              )})`,
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
                  <Chip label={`Top weight: ${topDrivers[0]}`} color="primary" />
                  <Chip label="Prototype focus: explainability" variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

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

          {activeStep === 0 && (
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
                    <Switch checked={sharesHousing} onChange={(e) => setSharesHousing(e.target.checked)} />
                  </Stack>

                  {!hasCar && (
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography>Comfortable biking for part of commute</Typography>
                      <Switch checked={bikeComfort} onChange={(e) => setBikeComfort(e.target.checked)} />
                    </Stack>
                  )}

                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography>Prefer a low-noise neighborhood</Typography>
                    <Switch checked={needsQuietArea} onChange={(e) => setNeedsQuietArea(e.target.checked)} />
                  </Stack>

                  <Alert severity="info" variant="outlined">
                    These profile conditions feed recommended baseline weights before manual tuning.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && (
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
                      <Switch checked={parkingPriority} onChange={(e) => setParkingPriority(e.target.checked)} />
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
          )}

          {isOnDashboard && (
            <Stack spacing={3}>
              <Alert severity="info">
                Objective scores below are API-based metrics. Perception text is AI-generated from
                Reddit discussions and shown separately.
              </Alert>

              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">Current weighting snapshot</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {dimensions.map((dimension) => (
                        <Chip key={dimension} label={`${dimensionLabels[dimension]} ${weights[dimension]}%`} size="small" />
                      ))}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Top drivers: {topDrivers.join(' • ')}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

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

              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">Manual weight adjustment</Typography>
                    <Typography color="text.secondary">
                      Override recommended weights to explore trade-offs.
                    </Typography>
                    {dimensions.map((dimension) => (
                      <Box key={dimension}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography>{dimensionLabels[dimension]}</Typography>
                          <Chip label={`${weights[dimension]}%`} size="small" />
                        </Stack>
                        <Slider
                          value={weights[dimension]}
                          min={5}
                          max={60}
                          step={1}
                          onChange={(_, value) => handleWeightChange(dimension, value as number)}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Grid container spacing={2}>
                {[leftData, rightData].map((neighborhood, index) => {
                  const score = index === 0 ? leftScore : rightScore
                  return (
                    <Grid key={neighborhood.name} size={{ xs: 12, md: 6 }}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Typography variant="h6">{neighborhood.name}</Typography>
                            <Box>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography fontWeight={600}>Personalized objective score</Typography>
                                <Typography fontWeight={700}>{score}/100</Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={score}
                                sx={{
                                  mt: 1,
                                  height: 9,
                                  borderRadius: 999,
                                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
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
          )}

          <Stack direction="row" justifyContent="space-between">
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
