import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { ApiCompareResult } from '../api'
import { dimensionLabels, dimensions, dimensionStyles } from '../types'
import type { Dimension, Neighborhood } from '../types'
import { DimensionRadarChart } from './DimensionRadarChart'
import { WeightEditorCard } from './WeightEditorCard'

type DashboardProps = {
  neighborhoods: Neighborhood[]
  weights: Record<Dimension, number>
  onWeightsChange: (nextWeights: Record<Dimension, number>) => void
  leftNeighborhood: string
  rightNeighborhood: string
  onNeighborhoodChange: (side: 'left' | 'right', event: SelectChangeEvent<string>) => void
  leftData: Neighborhood
  rightData: Neighborhood
  leftScore: number
  rightScore: number
  recommendation: string
  compareResult: ApiCompareResult | null
  compareLoading: boolean
  compareError: string | null
}

export function Dashboard({
  neighborhoods,
  weights,
  onWeightsChange,
  leftNeighborhood,
  rightNeighborhood,
  onNeighborhoodChange,
  leftData,
  rightData,
  compareResult,
  compareLoading,
  compareError,
}: DashboardProps) {
  const isSameNeighborhood = leftNeighborhood === rightNeighborhood
  const formatScore = (score: number) => score.toFixed(1)

  const statRows = dimensions.map((dimension) => {
    const leftRaw = leftData.objective[dimension] ?? 0
    const rightRaw = rightData.objective[dimension] ?? 0
    const clampToScoreRange = (value: number) => Math.max(0, Math.min(100, value))
    const leftClamped = clampToScoreRange(leftRaw)
    const rightClamped = clampToScoreRange(rightRaw)
    const leftContribution = Number(((leftClamped * weights[dimension]) / 100).toFixed(1))
    const rightContribution = Number(((rightClamped * weights[dimension]) / 100).toFixed(1))
    const isLeftWinner = leftRaw > rightRaw
    const isRightWinner = rightRaw > leftRaw

    return {
      key: dimension,
      label: dimensionLabels[dimension],
      style: dimensionStyles[dimension],
      weight: weights[dimension],
      leftValue: leftRaw,
      rightValue: rightRaw,
      leftScore: leftClamped,
      rightScore: rightClamped,
      leftContribution,
      rightContribution,
      leftPercent: leftClamped,
      rightPercent: rightClamped,
      isLeftWinner,
      isRightWinner,
    }
  })

  const overallLeftScore = Number(
    statRows.reduce((sum, row) => sum + row.leftContribution, 0).toFixed(1),
  )
  const overallRightScore = Number(
    statRows.reduce((sum, row) => sum + row.rightContribution, 0).toFixed(1),
  )
  const scoreDelta = Number(Math.abs(overallLeftScore - overallRightScore).toFixed(1))
  const isScoreTie = scoreDelta < 0.1
  const isLeftLeading = overallLeftScore > overallRightScore
  const winnerName = isScoreTie ? 'Tie' : isLeftLeading ? leftData.name : rightData.name
  const winnerColor = isLeftLeading ? '#0B5FFF' : '#009D77'
  const impactRows = [...statRows]
    .map((row) => ({
      ...row,
      contributionDelta: Number(Math.abs(row.leftContribution - row.rightContribution).toFixed(1)),
    }))
    .sort((a, b) => b.contributionDelta - a.contributionDelta)
  const topImpact = impactRows[0]
  const highestWeight = [...statRows].sort((a, b) => b.weight - a.weight)[0]
  const allowedStrengthLabels = new Set(dimensions.map((dimension) => dimensionLabels[dimension]))
  const fallbackLeftStrengths = statRows.filter((row) => row.isLeftWinner).map((row) => row.label)
  const fallbackRightStrengths = statRows.filter((row) => row.isRightWinner).map((row) => row.label)
  const leftStrengths =
    compareResult?.tradeoffs.community_a_strengths?.filter((label) =>
      allowedStrengthLabels.has(label),
    ) ?? fallbackLeftStrengths
  const rightStrengths =
    compareResult?.tradeoffs.community_b_strengths?.filter((label) =>
      allowedStrengthLabels.has(label),
    ) ?? fallbackRightStrengths
  const topImpactLeader =
    topImpact.leftContribution > topImpact.rightContribution
      ? leftData.name
      : topImpact.rightContribution > topImpact.leftContribution
        ? rightData.name
        : 'Neither neighborhood'
  const topImpactDetail =
    topImpactLeader === leftData.name
      ? `${leftData.name} gets ${formatScore(topImpact.leftContribution)} pts while ${rightData.name} gets ${formatScore(topImpact.rightContribution)} pts.`
      : topImpactLeader === rightData.name
        ? `${rightData.name} gets ${formatScore(topImpact.rightContribution)} pts while ${leftData.name} gets ${formatScore(topImpact.leftContribution)} pts.`
        : `Both neighborhoods get ${formatScore(topImpact.leftContribution)} pts.`
  const weightedSummary = isScoreTie
    ? `The result is almost tied. You gave ${highestWeight.label} the most weight (${highestWeight.weight}%), so changing that slider will affect the final score the most.`
    : `${winnerName} is ahead by ${formatScore(scoreDelta)} points. The biggest reason is ${topImpact.label}: with its current ${topImpact.weight}% weight, ${topImpactDetail}`
  const summaryText = compareResult?.short_summary || weightedSummary

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.25 }, '&:last-child': { pb: { xs: 2, md: 2.25 } } }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Comparison setup</Typography>
              <Tooltip
                placement="right-start"
                title="Priority changes here only apply on this comparison page. Going back keeps the AI-generated recommendation weights."
                slotProps={{
                  tooltip: {
                    sx: {
                      maxWidth: 320,
                      backgroundColor: 'background.paper',
                      color: 'text.primary',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.14)',
                      fontSize: 13,
                      lineHeight: 1.45,
                    },
                  },
                  popper: {
                    modifiers: [
                      {
                        name: 'offset',
                        options: {
                          offset: [0, 8],
                        },
                      },
                    ],
                  },
                }}
              >
                <Box
                  component="span"
                  tabIndex={0}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    backgroundColor: 'rgba(11, 95, 255, 0.06)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    lineHeight: 1,
                    cursor: 'help',
                  }}
                >
                  i
                </Box>
              </Tooltip>
            </Stack>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Neighborhood A</InputLabel>
                  <Select
                    label="Neighborhood A"
                    value={leftNeighborhood}
                    onChange={(event) => onNeighborhoodChange('left', event)}
                    sx={{ '.MuiSelect-select': { py: 1.25 } }}
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
                <FormControl fullWidth size="small">
                  <InputLabel>Neighborhood B</InputLabel>
                  <Select
                    label="Neighborhood B"
                    value={rightNeighborhood}
                    onChange={(event) => onNeighborhoodChange('right', event)}
                    sx={{ '.MuiSelect-select': { py: 1.25 } }}
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
                You selected the same neighborhood on both sides. Pick different ones for meaningful results.
              </Alert>
            )}
            <WeightEditorCard
              title="Priorities"
              description="Temporary for this comparison"
              weights={weights}
              onChange={onWeightsChange}
              compact
              embedded
              showHeader={false}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.25 }, '&:last-child': { pb: { xs: 2, md: 2.25 } } }}>
          <Stack spacing={1.35}>
            <Stack spacing={1}>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                textAlign="center"
                sx={{ color: isScoreTie ? 'text.primary' : winnerColor }}
              >
                {isScoreTie ? 'Both neighborhoods are tied' : `${winnerName} leads by ${formatScore(scoreDelta)} pts`}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.4,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isLeftLeading ? '#AFC7FF' : 'divider',
                    backgroundColor: isLeftLeading ? '#F5F8FF' : '#FFFFFF',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {leftData.name}
                  </Typography>
                  <Typography variant="h4" fontWeight={850} sx={{ color: '#0B5FFF', lineHeight: 1.05 }}>
                    {formatScore(overallLeftScore)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Match score /100
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.4,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: !isScoreTie && !isLeftLeading ? '#A8DDCF' : 'divider',
                    backgroundColor: !isScoreTie && !isLeftLeading ? '#F0FAF6' : '#FFFFFF',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {rightData.name}
                  </Typography>
                  <Typography variant="h4" fontWeight={850} sx={{ color: '#009D77', lineHeight: 1.05 }}>
                    {formatScore(overallRightScore)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Match score /100
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Stack spacing={0}>
              {statRows.map((row) => (
                <Box
                  key={row.key}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'minmax(88px, 0.45fr) minmax(180px, 1fr) 150px minmax(180px, 1fr) minmax(88px, 0.45fr)',
                    },
                    gap: { xs: 0.75, md: 1.5 },
                    alignItems: 'center',
                    py: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={0} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      fontWeight={row.isLeftWinner ? 800 : 600}
                      sx={{ lineHeight: 1.15 }}
                    >
                      {formatScore(row.leftScore)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Weighted {formatScore(row.leftContribution)} pts
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      position: 'relative',
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: '#D9DDE5',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: `${row.leftPercent}%`,
                        backgroundColor: row.isLeftWinner ? row.style.solid : row.style.track,
                      }}
                    />
                  </Box>

                  <Stack spacing={0.1} sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight={800} sx={{ color: row.style.text }}>
                      {row.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Weight {row.weight}%
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      position: 'relative',
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: '#D9DDE5',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${row.rightPercent}%`,
                        backgroundColor: row.isRightWinner ? row.style.solid : row.style.track,
                      }}
                    />
                  </Box>

                  <Stack spacing={0} sx={{ minWidth: 0, textAlign: { xs: 'left', md: 'right' } }}>
                    <Typography
                      variant="body1"
                      fontWeight={row.isRightWinner ? 800 : 600}
                      sx={{ lineHeight: 1.15 }}
                    >
                      {formatScore(row.rightScore)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Weighted {formatScore(row.rightContribution)} pts
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Comparison summary</Typography>
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', lg: 'center' }}
            >
              <Box sx={{ width: { xs: '100%', lg: 300 }, flex: '0 0 auto', alignSelf: 'center' }}>
                <DimensionRadarChart
                  datasets={[
                    {
                      label: leftData.name,
                      values: leftData.objective,
                      color: '#0B5FFF',
                      fill: '#0B5FFF',
                    },
                    {
                      label: rightData.name,
                      values: rightData.objective,
                      color: '#009D77',
                      fill: '#009D77',
                    },
                  ]}
                  size={280}
                />
              </Box>
              <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                <Typography>{summaryText}</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {leftData.name} scores higher in:
                  </Typography>
                  {leftStrengths.length > 0 ? (
                    leftStrengths.map((label) => {
                      const style = statRows.find((row) => row.label === label)?.style
                      return (
                      <Chip
                        key={label}
                        size="small"
                        label={label}
                        sx={{
                          color: style?.text,
                          borderColor: style?.border,
                          backgroundColor: style?.soft,
                          fontWeight: 700,
                        }}
                        variant="outlined"
                      />
                      )
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      None
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {rightData.name} scores higher in:
                  </Typography>
                  {rightStrengths.length > 0 ? (
                    rightStrengths.map((label) => {
                      const style = statRows.find((row) => row.label === label)?.style
                      return (
                      <Chip
                        key={label}
                        size="small"
                        label={label}
                        sx={{
                          color: style?.text,
                          borderColor: style?.border,
                          backgroundColor: style?.soft,
                          fontWeight: 700,
                        }}
                        variant="outlined"
                      />
                      )
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      None
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Stack>
            {compareLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Generating AI summary...
                </Typography>
              </Stack>
            )}
            {!compareLoading && compareError && (
              <Typography variant="body2" color="text.secondary">
                AI summary is unavailable right now, so this section is using the current five-dimension scores.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
