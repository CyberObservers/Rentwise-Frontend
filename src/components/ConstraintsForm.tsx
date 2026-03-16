import {
  Alert,
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
            <Typography variant="h6">LLM insight panel (prototype)</Typography>
            <Alert severity="info" variant="outlined">
              This is frontend-only prototype text. You can replace it with real LLM output later.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              User prompt: {modelPrompt || 'No prompt provided. Using default interpretation.'}
            </Typography>
            <Divider />
            <Typography variant="body2">
              Best fit: renters who prioritize {topDrivers[0]}; this neighborhood performs well for convenience and commute efficiency.
            </Typography>
            <Typography variant="body2">
              Key strength: {selectedNeighborhoodData.perception.convenience}
            </Typography>
            <Typography variant="body2">
              Potential risk: {selectedNeighborhoodData.tradeoffNote}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
