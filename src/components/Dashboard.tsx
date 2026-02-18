import {
  Alert,
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Slider,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import type { Dimension, Neighborhood } from '../types'
import { dimensionLabels, dimensions, neighborhoods } from '../data'

type DashboardProps = {
  weights: Record<Dimension, number>
  topDrivers: string[]
  leftNeighborhood: string
  rightNeighborhood: string
  onNeighborhoodChange: (side: 'left' | 'right', event: SelectChangeEvent<string>) => void
  onWeightChange: (dimension: Dimension, value: number) => void
  leftData: Neighborhood
  rightData: Neighborhood
  leftScore: number
  rightScore: number
  recommendation: string
}

export function Dashboard({
  weights,
  topDrivers,
  leftNeighborhood,
  rightNeighborhood,
  onNeighborhoodChange,
  onWeightChange,
  leftData,
  rightData,
  leftScore,
  rightScore,
  recommendation,
}: DashboardProps) {
  const theme = useTheme()
  const isSameNeighborhood = leftNeighborhood === rightNeighborhood

  return (
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
                  color="default"
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
                    onChange={(event) => onNeighborhoodChange('left', event)}
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
                    onChange={(event) => onNeighborhoodChange('right', event)}
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
                  onChange={(_, value) => onWeightChange(dimension, value as number)}
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
  )
}
