import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { dimensionLabels, dimensions } from '../data'
import type { ApiMetrics } from '../api'
import type { Dimension, Neighborhood } from '../types'

function getBestFitProfile(objective: Record<Dimension, number | null>): string {
  const sorted = [...dimensions]
    .filter((d) => objective[d] != null)
    .sort((a, b) => (objective[b] ?? 0) - (objective[a] ?? 0))
  const top2 = sorted.slice(0, 2)
  if (top2.includes('transit') && top2.includes('convenience')) return 'Car-free renters & students'
  if (top2.includes('safety') && top2.includes('environment')) return 'Families & quiet-seekers'
  if (top2.includes('safety') && top2.includes('convenience')) return 'Urban professionals'
  if (top2.includes('environment') && top2.includes('parking')) return 'Suburban residents'
  return `Renters prioritizing ${dimensionLabels[top2[0] as Dimension]}`
}

function getMatchChip(score: number | null): { label: string; color: 'success' | 'warning' | 'error' | 'default' } {
  if (score == null) return { label: 'No data', color: 'default' }
  if (score >= 75) return { label: 'Strong match', color: 'success' }
  if (score >= 50) return { label: 'Fair', color: 'warning' }
  return { label: 'Weak match', color: 'error' }
}

type ConstraintsFormProps = {
  selectedNeighborhoodData: Neighborhood
  topDrivers: string[]
  modelPrompt: string
  metrics: ApiMetrics | null
}

function formatMetricLine(dim: Dimension, metrics: ApiMetrics): string | null {
  switch (dim) {
    case 'safety':
      return metrics.crime_rate_per_100k != null
        ? `Crime rate: ${metrics.crime_rate_per_100k.toFixed(0)} per 100k`
        : null
    case 'transit':
      return null // commute_minutes not available in API
    case 'convenience':
      return metrics.grocery_density_per_km2 != null
        ? `Grocery density: ${metrics.grocery_density_per_km2.toFixed(1)}/km²`
        : null
    case 'parking':
      return metrics.median_rent != null
        ? `Median rent: $${metrics.median_rent.toLocaleString()}/mo`
        : null
    case 'environment':
      return metrics.noise_avg_db != null
        ? `Noise avg: ${metrics.noise_avg_db.toFixed(1)} dB`
        : null
  }
}

export function ConstraintsForm({
  selectedNeighborhoodData,
  topDrivers,
  modelPrompt,
  metrics,
}: ConstraintsFormProps) {
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Step 2: Neighborhood metrics and charts</Typography>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography color="text.secondary">Focus neighborhood:</Typography>
              <Chip
                color="primary"
                label={selectedNeighborhoodData.name}
                sx={{ fontWeight: 800, fontSize: 14 }}
              />
              {metrics && (
                <Chip
                  label="Live data"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
            {dimensions.map((dimension) => {
              const value = selectedNeighborhoodData.objective[dimension]
              const normalizedValue = Math.max(0, Math.min(100, value ?? 0))
              const metricLine = metrics ? formatMetricLine(dimension, metrics) : null
              return (
                <Box key={dimension}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700}>{dimensionLabels[dimension]}</Typography>
                    <Chip
                      color="primary"
                      label={value === null ? 'N/A' : `${Math.round(value)}/100`}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={normalizedValue}
                    sx={{
                      mt: 1,
                      height: 12,
                      borderRadius: 999,
                      backgroundColor: '#B7C6F2',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        backgroundColor: '#2F62EA',
                      },
                    }}
                  />
                  {metricLine && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {metricLine}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Neighborhood Insight</Typography>

            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">Best fit for:</Typography>
              <Chip size="small" label={getBestFitProfile(selectedNeighborhoodData.objective)} color="secondary" />
              <Chip size="small" label={`${selectedNeighborhoodData.redditSampleSize} community posts analyzed`} variant="outlined" />
            </Stack>

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              How this neighborhood matches your priorities
            </Typography>
            {topDrivers.map((driver) => {
              const dim = driver.split(' ')[0] as Dimension
              const score = selectedNeighborhoodData.objective[dim]
              const { label, color } = getMatchChip(score)
              return (
                <Stack key={dim} spacing={0.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {dimensionLabels[dim]}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {score != null ? `${Math.round(score)}/100` : 'N/A'}
                      </Typography>
                      <Chip size="small" label={label} color={color} />
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {selectedNeighborhoodData.perception[dim]}
                  </Typography>
                </Stack>
              )
            })}

            <Divider />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>Key trade-off</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedNeighborhoodData.tradeoffNote}
              </Typography>
            </Stack>

            {metrics?.median_rent != null && (
              <>
                <Divider />
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight={700}>Affordability</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Median rent is ${metrics.median_rent.toLocaleString()}/mo.{' '}
                    {metrics.median_rent < 2000
                      ? 'Below the Irvine average — good value for this area.'
                      : metrics.median_rent < 2800
                        ? 'Near market average for Irvine.'
                        : 'Above average; budget carefully before committing.'}
                  </Typography>
                </Stack>
              </>
            )}

            {modelPrompt && (
              <>
                <Divider />
                <Typography variant="caption" color="text.secondary">
                  Your search: "{modelPrompt}"
                </Typography>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
