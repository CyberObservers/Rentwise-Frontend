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
  topDrivers: Dimension[]
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
  topDrivers,
  leftNeighborhood,
  rightNeighborhood,
  onNeighborhoodChange,
  leftData,
  rightData,
  recommendation,
  compareResult,
  compareLoading,
  compareError,
}: DashboardProps) {
  const isSameNeighborhood = leftNeighborhood === rightNeighborhood
  const formatScore = (score: number) => score.toFixed(1)
  const formatRawValue = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1)
  const neutralWeight = 100 / dimensions.length

  const statRows = dimensions.map((dimension) => {
    const leftRaw = leftData.objective[dimension] ?? 0
    const rightRaw = rightData.objective[dimension] ?? 0
    const clampToScoreRange = (value: number) => Math.max(0, Math.min(100, value))
    const leftClamped = clampToScoreRange(leftRaw)
    const rightClamped = clampToScoreRange(rightRaw)
    const leftContribution = Number(((leftClamped * weights[dimension]) / 100).toFixed(1))
    const rightContribution = Number(((rightClamped * weights[dimension]) / 100).toFixed(1))
    const leftWeightedScore = Number(
      Math.min(100, (leftClamped * weights[dimension]) / neutralWeight).toFixed(1),
    )
    const rightWeightedScore = Number(
      Math.min(100, (rightClamped * weights[dimension]) / neutralWeight).toFixed(1),
    )

    return {
      key: dimension,
      label: dimensionLabels[dimension],
      style: dimensionStyles[dimension],
      weight: weights[dimension],
      leftValue: leftRaw,
      rightValue: rightRaw,
      leftContribution,
      rightContribution,
      leftWeightedScore,
      rightWeightedScore,
      leftPercent: leftWeightedScore,
      rightPercent: rightWeightedScore,
      isLeftWinner: leftRaw > rightRaw,
      isRightWinner: rightRaw > leftRaw,
    }
  })

  const overallLeftScore = Number(
    statRows.reduce((sum, row) => sum + row.leftContribution, 0).toFixed(1),
  )
  const overallRightScore = Number(
    statRows.reduce((sum, row) => sum + row.rightContribution, 0).toFixed(1),
  )

  return (
    <Stack spacing={3}>
      <WeightEditorCard
        title="Tune priorities live on this page"
        description="Adjust any weight here and the comparison scores below will update immediately."
        weights={weights}
        onChange={onWeightsChange}
      />

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Current priorities</Typography>
            <Typography color="text.secondary">
              These weights were tuned in Step 2 and are already applied to the comparison below.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Top drivers:
              </Typography>
              {topDrivers.map((driver) => {
                const style = dimensionStyles[driver]
                return (
                  <Chip
                    key={driver}
                    label={`${dimensionLabels[driver]} ${weights[driver]}%`}
                    sx={{
                      backgroundColor: style.soft,
                      color: style.text,
                      border: '1px solid',
                      borderColor: style.border,
                      fontWeight: 700,
                    }}
                  />
                )
              })}
              {dimensions.map((dimension) => (
                <Chip
                  key={dimension}
                  label={`${dimensionLabels[dimension]} ${weights[dimension]}%`}
                  sx={{
                    backgroundColor: dimensionStyles[dimension].soft,
                    color: dimensionStyles[dimension].text,
                    border: '1px solid',
                    borderColor: dimensionStyles[dimension].border,
                    fontWeight: 600,
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Choose neighborhoods to compare</Typography>
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
                You selected the same neighborhood on both sides. Pick different ones for meaningful results.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {leftData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Match Score {formatScore(overallLeftScore)}/100
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ color: 'text.secondary', minWidth: 72, textAlign: 'center' }}
              >
                VS
              </Typography>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {rightData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Match Score {formatScore(overallRightScore)}/100
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', xl: 'row' }}
              spacing={2.5}
              alignItems="center"
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 2,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                backgroundColor: '#F7F9FC',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: 380, flex: '0 0 auto' }}>
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
                  size={360}
                />
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1.25,
                }}
              >
                <Box
                  sx={{
                    border: '1px solid rgba(11, 95, 255, 0.18)',
                    borderRadius: 2,
                    backgroundColor: '#F5F8FF',
                    p: 1.75,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {leftData.name}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, color: '#0B5FFF', fontWeight: 850 }}>
                    {formatScore(overallLeftScore)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Weighted match score
                  </Typography>
                </Box>
                <Box
                  sx={{
                    border: '1px solid rgba(0, 157, 119, 0.18)',
                    borderRadius: 2,
                    backgroundColor: '#F0FAF6',
                    p: 1.75,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {rightData.name}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, color: '#009D77', fontWeight: 850 }}>
                    {formatScore(overallRightScore)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Weighted match score
                  </Typography>
                </Box>
                {statRows.map((row) => (
                  <Box
                    key={row.key}
                    sx={{
                      border: '1px solid',
                      borderColor: row.style.border,
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      p: 1.5,
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={850} sx={{ color: row.style.text }}>
                          {row.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Weight {row.weight}%
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          A {formatRawValue(row.leftValue)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          B {formatRawValue(row.rightValue)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Stack>

            {statRows.map((row) => (
              <Stack key={row.key} spacing={0.9}>
                    <Stack direction="row" alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="body1"
                            fontWeight={row.isLeftWinner ? 700 : 500}
                            textAlign="left"
                          >
                            {formatScore(row.leftWeightedScore)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" textAlign="left">
                            Raw {formatRawValue(row.leftValue)} · {formatScore(row.leftContribution)} pts
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack spacing={0.25} sx={{ width: { xs: 112, md: 160 } }}>
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          textAlign="center"
                          sx={{ color: row.style.text }}
                        >
                          {row.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                          Weight {row.weight}%
                        </Typography>
                      </Stack>
                      <Box sx={{ flex: 1 }}>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="body1"
                            fontWeight={row.isRightWinner ? 700 : 500}
                            textAlign="right"
                          >
                            {formatScore(row.rightWeightedScore)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" textAlign="right">
                            Raw {formatRawValue(row.rightValue)} · {formatScore(row.rightContribution)} pts
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          flex: 1,
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

                      <Box sx={{ width: { xs: 16, md: 24 } }} />

                      <Box
                        sx={{
                          flex: 1,
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
                    </Stack>
              </Stack>
            ))}

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={
                  overallLeftScore >= overallRightScore
                    ? `${leftData.name} is leading`
                    : `${rightData.name} is leading`
                }
                color="primary"
              />
              <Chip label="Head-to-head comparison view" variant="outlined" />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Comparison summary</Typography>
            {compareLoading && <CircularProgress size={20} />}
            {!compareLoading && compareResult && (
              <>
                <Typography>{compareResult.short_summary}</Typography>
                {compareResult.tradeoffs.community_a_strengths.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {leftData.name} strengths:
                    </Typography>
                    {compareResult.tradeoffs.community_a_strengths.map((s) => (
                      <Chip key={s} size="small" label={s} color="primary" variant="outlined" />
                    ))}
                  </Stack>
                )}
                {compareResult.tradeoffs.community_b_strengths.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {rightData.name} strengths:
                    </Typography>
                    {compareResult.tradeoffs.community_b_strengths.map((s) => (
                      <Chip key={s} size="small" label={s} color="secondary" variant="outlined" />
                    ))}
                  </Stack>
                )}
              </>
            )}
            {!compareLoading && !compareResult && compareError && (
              <Typography color="error">{compareError}</Typography>
            )}
            {!compareLoading && !compareResult && !compareError && (
              <Typography>{recommendation}</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
