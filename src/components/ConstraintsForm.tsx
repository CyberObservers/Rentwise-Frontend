import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import type { ApiCommunityInsight, ApiMetrics } from '../api'
import { dimensionLabels, dimensions, dimensionStyles } from '../types'
import type { Dimension, Neighborhood } from '../types'
import { WeightEditorCard } from './WeightEditorCard'

function getBestFitProfile(objective: Record<Dimension, number | null>): {
  label: string
  dominantDimension: Dimension | null
} {
  const sorted = [...dimensions]
    .filter((dimension) => objective[dimension] != null)
    .sort((a, b) => (objective[b] ?? 0) - (objective[a] ?? 0))

  const top2 = sorted.slice(0, 2)
  const dominantDimension = top2[0] ?? null

  if (top2.length === 0) {
    return { label: 'Live profile unavailable', dominantDimension: null }
  }
  if (top2.includes('transit') && top2.includes('convenience')) {
    return { label: 'Car-free renters & students', dominantDimension }
  }
  if (top2.includes('safety') && top2.includes('environment')) {
    return { label: 'Families & quiet-seekers', dominantDimension }
  }
  if (top2.includes('safety') && top2.includes('convenience')) {
    return { label: 'Urban professionals', dominantDimension }
  }
  if (top2.includes('environment') && top2.includes('parking')) {
    return { label: 'Suburban residents', dominantDimension }
  }
  return {
    label: `Renters prioritizing ${dimensionLabels[top2[0] as Dimension]}`,
    dominantDimension,
  }
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

function buildMetricFallbackCommentary(
  dimension: Dimension,
  score: number | null,
  metrics: ApiMetrics | null,
): string {
  const metricLine = metrics ? formatMetricLine(dimension, metrics) : null

  if (score == null) {
    return metricLine
      ? `Live detail is limited right now. ${metricLine}.`
      : `Live insight for ${dimensionLabels[dimension]} is not available yet.`
  }

  const strengthLabel =
    score >= 75 ? 'looks comparatively strong' : score >= 50 ? 'looks mixed' : 'looks like a trade-off'

  if (!metricLine) {
    return `${dimensionLabels[dimension]} ${strengthLabel} based on the currently available backend metrics.`
  }

  return `${dimensionLabels[dimension]} ${strengthLabel}. ${metricLine}.`
}

function buildTradeoffCopy(
  selectedNeighborhoodData: Neighborhood,
  insightCommentary: Partial<Record<Dimension, string>>,
  metrics: ApiMetrics | null,
): string {
  const weakestDimension = [...dimensions].sort(
    (a, b) => (selectedNeighborhoodData.objective[a] ?? 0) - (selectedNeighborhoodData.objective[b] ?? 0),
  )[0]
  const weakestScore = selectedNeighborhoodData.objective[weakestDimension]
  const commentary =
    insightCommentary[weakestDimension]
    ?? buildMetricFallbackCommentary(weakestDimension, weakestScore, metrics)

  if (weakestScore == null) {
    return `Live trade-off insight is unavailable right now. ${commentary}`
  }

  return `${dimensionLabels[weakestDimension]} is currently the weakest signal at ${Math.round(weakestScore)}/100. ${commentary}`
}

function buildAffordabilityCopy(metrics: ApiMetrics | null): string {
  if (metrics?.median_rent == null) {
    return 'Live rent pricing is not available yet, so affordability cannot be estimated from backend rent data.'
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

function normalizeWebHighlights(insight: ApiCommunityInsight | null): string[] {
  return (insight?.community_web_info?.highlights ?? []).filter(
    (item): item is string => Boolean(item?.trim()),
  )
}

type InlineLink = {
  href: string
  label: string
}

type InlineContent = {
  text: string
  links: InlineLink[]
}

function extractInlineContent(content: string | null | undefined): InlineContent {
  if (!content?.trim()) {
    return { text: '', links: [] }
  }

  const links: InlineLink[] = []
  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g

  const text = content
    .replace(markdownLinkPattern, (_, label: string, href: string) => {
      links.push({ label: label.trim(), href: href.trim() })
      return ''
    })
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()

  return { text, links }
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
  const overallCommentary =
    insight?.overall_commentary
    ?? 'Live neighborhood insight is unavailable right now. The scorecards below are based on backend metrics only.'
  const communityWebInfo = insight?.community_web_info ?? null
  const communityOverviewSummary = extractInlineContent(communityWebInfo?.summary)
  const communityOverviewHighlights = normalizeWebHighlights(insight)
    .slice(0, 4)
    .map((highlight) => extractInlineContent(highlight))
    .filter((item) => item.text || item.links.length > 0)
  const hasCommunityWebInfo =
    Boolean(communityOverviewSummary.text)
    || communityOverviewSummary.links.length > 0
    || communityOverviewHighlights.length > 0
  const bestFitProfile = getBestFitProfile(selectedNeighborhoodData.objective)
  const tradeoffCopy = buildTradeoffCopy(selectedNeighborhoodData, insightCommentary, metrics)
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
                  Focus neighborhood:
                </Typography>
                <Chip
                  label={selectedNeighborhoodData.name}
                  sx={{ fontWeight: 800, fontSize: 14 }}
                  color="primary"
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

              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                <Typography variant="body1" color="text.secondary">
                  Best fit for:
                </Typography>
                <Chip
                  label={bestFitProfile.label}
                  sx={{
                    backgroundColor: bestFitProfile.dominantDimension
                      ? dimensionStyles[bestFitProfile.dominantDimension].solid
                      : '#0F9F76',
                    color: bestFitProfile.dominantDimension
                      ? dimensionStyles[bestFitProfile.dominantDimension].contrastText
                      : '#FFFFFF',
                    fontWeight: 700,
                  }}
                />
                {insight && (
                  <>
                    <Chip
                      label={`${insight.posts_analyzed} community posts analyzed`}
                      variant="outlined"
                      sx={{
                        borderColor: '#C7CEDB',
                        color: '#344054',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <Chip
                      size="small"
                      label="Backend insight live"
                      sx={{
                        backgroundColor: '#E8F7F1',
                        color: '#0F7A59',
                        fontWeight: 700,
                      }}
                    />
                  </>
                )}
                {!insight && insightLoading && (
                  <CircularProgress
                    size={22}
                    thickness={4.5}
                    aria-label="Loading live insight"
                    sx={{
                      color: '#1849A9',
                    }}
                  />
                )}
                {!insight && !insightLoading && (
                  <Chip
                    size="small"
                    label="Backend insight unavailable"
                    variant="outlined"
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

            {hasCommunityWebInfo && (
              <Card
                variant="outlined"
                sx={{
                  borderColor: '#D7DDE8',
                  backgroundColor: '#F8FAFC',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Community Overview
                    </Typography>

                    {(communityOverviewSummary.text || communityOverviewSummary.links.length > 0) && (
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ lineHeight: 1.8, fontSize: { xs: '1.02rem', md: '1.08rem' } }}
                      >
                        {communityOverviewSummary.text}
                        {communityOverviewSummary.links.map((link, index) => (
                          <Box component="span" key={`${link.href}-${link.label}`} sx={{ ml: 0.75 }}>
                            <Link
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              underline="hover"
                              sx={{ fontSize: 'inherit', fontWeight: 600 }}
                            >
                              {link.label}
                            </Link>
                            {index < communityOverviewSummary.links.length - 1 ? ',' : ''}
                          </Box>
                        ))}
                      </Typography>
                    )}

                    {communityOverviewHighlights.length > 0 && (
                      <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
                        {communityOverviewHighlights.map((highlight, index) => (
                          <Box component="li" key={`${highlight.text}-${index}`} sx={{ mb: 1 }}>
                            <Typography
                              variant="body1"
                              color="inherit"
                              sx={{ lineHeight: 1.8, fontSize: { xs: '1rem', md: '1.05rem' } }}
                            >
                              {highlight.text}
                              {highlight.links.map((link, linkIndex) => (
                                <Box component="span" key={`${link.href}-${link.label}`} sx={{ ml: 0.75 }}>
                                  <Link
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    underline="hover"
                                    sx={{ fontSize: 'inherit', fontWeight: 600 }}
                                  >
                                    {link.label}
                                  </Link>
                                  {linkIndex < highlight.links.length - 1 ? ',' : ''}
                                </Box>
                              ))}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Divider />

            <Stack spacing={2.5}>
              <Typography variant="subtitle1" fontWeight={800}>
                How this neighborhood matches your priorities
              </Typography>

              {dimensions.map((dimension) => {
                const score = selectedNeighborhoodData.objective[dimension]
                const normalizedValue = Math.max(0, Math.min(100, score ?? 0))
                const metricLine = metrics ? formatMetricLine(dimension, metrics) : null
                const commentary =
                  insightCommentary[dimension]
                  ?? buildMetricFallbackCommentary(dimension, score, metrics)
                const { label, sx } = getMatchChip(score)
                const dimensionStyle = dimensionStyles[dimension]
                const supportingMetricLine = insightCommentary[dimension] ? metricLine : null

                return (
                  <Box
                    key={dimension}
                    sx={{
                      p: { xs: 1.5, md: 2 },
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: dimensionStyle.border,
                      background: `linear-gradient(180deg, ${dimensionStyle.soft} 0%, rgba(255,255,255,0.96) 100%)`,
                    }}
                  >
                    <Stack spacing={1.2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1.25}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontSize: '1rem', color: dimensionStyle.text }}
                        >
                          {dimensionLabels[dimension]}
                        </Typography>

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

                      <LinearProgress
                        variant="determinate"
                        value={normalizedValue}
                        sx={{
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: dimensionStyle.track,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            backgroundColor: dimensionStyle.solid,
                          },
                        }}
                      />

                      {supportingMetricLine && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: dimensionStyle.text, fontWeight: 600 }}
                        >
                          {supportingMetricLine}
                        </Typography>
                      )}

                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ lineHeight: 1.65, maxWidth: 960 }}
                      >
                        {commentary}
                      </Typography>
                    </Stack>
                  </Box>
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
