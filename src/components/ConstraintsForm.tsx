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
import type { ApiCommunityInsight, ApiMetrics } from '../api'
import { dimensionLabels, dimensions } from '../data'
import type { Dimension, Neighborhood } from '../types'
import { WeightEditorCard } from './WeightEditorCard'

function getBestFitProfile(objective: Record<Dimension, number | null>): string {
  const sorted = [...dimensions]
    .filter((dimension) => objective[dimension] != null)
    .sort((a, b) => (objective[b] ?? 0) - (objective[a] ?? 0))

  const top2 = sorted.slice(0, 2)
  if (top2.includes('transit') && top2.includes('convenience')) return 'Car-free renters & students'
  if (top2.includes('safety') && top2.includes('environment')) return 'Families & quiet-seekers'
  if (top2.includes('safety') && top2.includes('convenience')) return 'Urban professionals'
  if (top2.includes('environment') && top2.includes('parking')) return 'Suburban residents'
  return `Renters prioritizing ${dimensionLabels[top2[0] as Dimension]}`
}

function getMatchChip(score: number | null): {
  label: string
  sx: {
    backgroundColor: string
    color: string
  }
} {
  if (score == null) {
    return {
      label: 'No data',
      sx: {
        backgroundColor: '#E5E7EB',
        color: '#475467',
      },
    }
  }

  if (score >= 75) {
    return {
      label: 'Strong match',
      sx: {
        backgroundColor: '#0F9F76',
        color: '#FFFFFF',
      },
    }
  }

  if (score >= 50) {
    return {
      label: 'Fair',
      sx: {
        backgroundColor: '#F57C00',
        color: '#FFFFFF',
      },
    }
  }

  return {
    label: 'Weak match',
    sx: {
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
    },
  }
}

function formatMetricLine(dim: Dimension, metrics: ApiMetrics): string | null {
  switch (dim) {
    case 'safety':
      return metrics.crime_rate_per_100k != null
        ? `Crime rate: ${metrics.crime_rate_per_100k.toFixed(0)} per 100k`
        : null
    case 'transit':
      return null
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

function buildInsightCommentaryMap(
  insight: ApiCommunityInsight | null,
): Partial<Record<Dimension, string>> {
  if (!insight) return {}

  return insight.dimensions.reduce<Partial<Record<Dimension, string>>>((acc, item) => {
    acc[item.dimension] = item.commentary
    return acc
  }, {})
}

function buildTradeoffCopy(
  selectedNeighborhoodData: Neighborhood,
  insightCommentary: Partial<Record<Dimension, string>>,
): string {
  const weakestDimension = [...dimensions].sort(
    (a, b) => (selectedNeighborhoodData.objective[a] ?? 0) - (selectedNeighborhoodData.objective[b] ?? 0),
  )[0]
  const weakestScore = selectedNeighborhoodData.objective[weakestDimension]
  const commentary =
    insightCommentary[weakestDimension] ?? selectedNeighborhoodData.perception[weakestDimension]

  if (weakestScore == null || weakestScore >= 70) {
    return selectedNeighborhoodData.tradeoffNote
  }

  return `${dimensionLabels[weakestDimension]} is the main trade-off here. ${commentary}`
}

function buildAffordabilityCopy(metrics: ApiMetrics | null): string {
  if (metrics?.median_rent == null) {
    return 'Live rent pricing is not available yet, so affordability is estimated from broader neighborhood signals.'
  }

  const medianRent = `$${Math.round(metrics.median_rent).toLocaleString()}/mo`
  if (metrics.median_rent < 2000) {
    return `Median rent is ${medianRent}. This looks below the typical Irvine range and may offer stronger value.`
  }
  if (metrics.median_rent < 2800) {
    return `Median rent is ${medianRent}. Pricing looks close to the broader Irvine market.`
  }
  return `Median rent is ${medianRent}. This area looks premium-priced, so budget headroom matters before committing.`
}

type ConstraintsFormProps = {
  selectedNeighborhoodData: Neighborhood
  weights: Record<Dimension, number>
  onWeightsChange: (nextWeights: Record<Dimension, number>) => void
  aiSuggestedWeights: Record<Dimension, number> | null
  modelPrompt: string
  metrics: ApiMetrics | null
  insight: ApiCommunityInsight | null
  insightLoading: boolean
}

export function ConstraintsForm({
  selectedNeighborhoodData,
  weights,
  onWeightsChange,
  aiSuggestedWeights,
  modelPrompt,
  metrics,
  insight,
  insightLoading,
}: ConstraintsFormProps) {
  const insightCommentary = buildInsightCommentaryMap(insight)
  const postsAnalyzed = insight?.posts_analyzed ?? selectedNeighborhoodData.redditSampleSize
  const overallCommentary = insight?.overall_commentary ?? selectedNeighborhoodData.tradeoffNote
  const tradeoffCopy = buildTradeoffCopy(selectedNeighborhoodData, insightCommentary)
  const affordabilityCopy = buildAffordabilityCopy(metrics)

  return (
    <Stack spacing={3}>
      <WeightEditorCard
        title="Step 2: Tune what matters most"
        description={
          aiSuggestedWeights
            ? 'We prefilled these weights from your LLM chat. Adjust any number with the slider, buttons, or direct input and the rest will rebalance automatically.'
            : 'Adjust any number with the slider, buttons, or direct input and the rest will rebalance automatically. If you use the LLM chat first, its suggested weights will appear here automatically.'
        }
        weights={weights}
        onChange={onWeightsChange}
        aiSuggestedWeights={aiSuggestedWeights}
      />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Neighborhood metrics and charts</Typography>
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
                      label={value == null ? 'N/A' : `${Math.round(value)}/100`}
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

      <Card
        sx={{
          border: '1px solid #D7DDE8',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Stack spacing={1.5}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1.8rem', md: '2.2rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                Neighborhood Insight
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                <Typography variant="body1" color="text.secondary">
                  Best fit for:
                </Typography>
                <Chip
                  label={getBestFitProfile(selectedNeighborhoodData.objective)}
                  sx={{
                    backgroundColor: '#0F9F76',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                />
                <Chip
                  label={`${postsAnalyzed} community posts analyzed`}
                  variant="outlined"
                  sx={{
                    borderColor: '#C7CEDB',
                    color: '#344054',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                {insight && (
                  <Chip
                    size="small"
                    label="Backend insight live"
                    sx={{
                      backgroundColor: '#E8F7F1',
                      color: '#0F7A59',
                      fontWeight: 700,
                    }}
                  />
                )}
                {!insight && insightLoading && (
                  <Chip
                    size="small"
                    label="Loading live insight"
                    sx={{
                      backgroundColor: '#EEF4FF',
                      color: '#1849A9',
                      fontWeight: 700,
                    }}
                  />
                )}
              </Stack>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  maxWidth: 980,
                  lineHeight: 1.7,
                }}
              >
                {overallCommentary}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={2.5}>
              <Typography variant="subtitle1" fontWeight={800}>
                How this neighborhood matches your priorities
              </Typography>

              {dimensions.map((dimension) => {
                const score = selectedNeighborhoodData.objective[dimension]
                const commentary =
                  insightCommentary[dimension] ?? selectedNeighborhoodData.perception[dimension]
                const { label, sx } = getMatchChip(score)

                return (
                  <Stack
                    key={dimension}
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 0.5 }}>
                        {dimensionLabels[dimension]}
                      </Typography>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ lineHeight: 1.65, maxWidth: 960 }}
                      >
                        {commentary}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ minWidth: { md: 200 }, justifyContent: 'flex-end' }}
                    >
                      <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1rem' }}>
                        {score != null ? `${Math.round(score)}/100` : 'N/A'}
                      </Typography>
                      <Chip
                        size="small"
                        label={label}
                        sx={{
                          ...sx,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                  </Stack>
                )
              })}
            </Stack>

            <Divider />

            <Stack spacing={0.75}>
              <Typography variant="subtitle1" fontWeight={800}>
                Key trade-off
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {tradeoffCopy}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={0.75}>
              <Typography variant="subtitle1" fontWeight={800}>
                Affordability
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {affordabilityCopy}
              </Typography>
            </Stack>

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
