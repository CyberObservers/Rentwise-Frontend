import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material'
import type { Dimension, Neighborhood } from '../types'
import { dimensionLabels, dimensions, neighborhoods } from '../data'
import type { ApiCompareResult } from '../api'

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
  compareResult: ApiCompareResult | null
  compareLoading: boolean
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
  compareResult,
  compareLoading,
}: DashboardProps) {
  const isSameNeighborhood = leftNeighborhood === rightNeighborhood
  const usedPoints = dimensions.reduce((sum, dimension) => sum + weights[dimension], 0)
  const remainingPoints = 100 - usedPoints
  const topDriverKey = [...dimensions].sort((a, b) => weights[b] - weights[a])[0]

  const handleAdjustWeight = (dimension: Dimension, delta: number) => {
    const current = weights[dimension]
    const maxAllowed = current + Math.max(0, remainingPoints)
    const next = Math.max(0, Math.min(maxAllowed, current + delta))
    onWeightChange(dimension, next)
  }

  const handleInputWeight = (dimension: Dimension, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10)
    if (Number.isNaN(parsed)) {
      onWeightChange(dimension, 0)
      return
    }

    const current = weights[dimension]
    const maxAllowed = current + Math.max(0, remainingPoints)
    const next = Math.max(0, Math.min(maxAllowed, parsed))
    onWeightChange(dimension, next)
  }

  const statRows = dimensions.map((dimension) => {
    const leftRaw = leftData.objective[dimension] ?? 0
    const rightRaw = rightData.objective[dimension] ?? 0
    const clampToScoreRange = (value: number) => Math.max(0, Math.min(100, value))
    const leftClamped = clampToScoreRange(leftRaw)
    const rightClamped = clampToScoreRange(rightRaw)

    return {
      key: dimension,
      label: dimensionLabels[dimension],
      leftValue: leftRaw,
      rightValue: rightRaw,
      leftPercent: leftClamped,
      rightPercent: rightClamped,
      isLeftWinner: leftRaw > rightRaw,
      isRightWinner: rightRaw > leftRaw,
    }
  })
  return (
    <Stack spacing={3}>
      <Card
        sx={{
          border: '2px solid',
          borderColor: 'secondary.main',
          boxShadow: '0 6px 16px rgba(0,157,119,0.12)',
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>
              Preference weight tuning (100-point budget)
            </Typography>
            <Typography color="text.secondary">Top drivers: {topDrivers.join(' • ')}</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Used points: ${usedPoints}/100`} color="primary" />
              <Chip
                label={`Remaining points: ${remainingPoints}`}
                color={remainingPoints === 0 ? 'success' : 'default'}
                variant={remainingPoints === 0 ? 'filled' : 'outlined'}
              />
            </Stack>
            {remainingPoints < 0 && (
              <Alert severity="error" variant="outlined">
                Total points exceed 100. Reduce one or more dimensions.
              </Alert>
            )}
            {dimensions.map((dimension) => (
              <Box key={dimension}>
                <Typography fontWeight={700}>{dimensionLabels[dimension]}</Typography>
                <Stack direction="column" sx={{ mt: 1 }} spacing={1}>
                  <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Button
                      variant="outlined"
                      onClick={() => handleAdjustWeight(dimension, -1)}
                      disabled={weights[dimension] <= 0}
                    >
                      -1
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleAdjustWeight(dimension, -5)}
                      disabled={weights[dimension] <= 0}
                    >
                      -5
                    </Button>
                    <OutlinedInput
                      size="small"
                      value={weights[dimension]}
                      onChange={(event) => handleInputWeight(dimension, event.target.value)}
                      inputProps={{ min: 0, max: weights[dimension] + Math.max(0, remainingPoints) }}
                      endAdornment={<InputAdornment position="end">%</InputAdornment>}
                      sx={{ width: 110 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => handleAdjustWeight(dimension, 5)}
                      disabled={remainingPoints <= 0}
                    >
                      +5
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleAdjustWeight(dimension, 1)}
                      disabled={remainingPoints <= 0}
                    >
                      +1
                    </Button>
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 180,
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: '#D9DDE5',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${weights[dimension]}%`,
                          backgroundColor:
                            dimension === topDriverKey ? '#0B5FFF' : '#8F99AA',
                        }}
                      />
                    </Box>
                    <Chip label={`${weights[dimension]}%`} sx={{ fontWeight: 700 }} />
                  </Stack>
                </Stack>
              </Box>
            ))}
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
                  Match Score {leftScore}/100
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
                  Match Score {rightScore}/100
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: '#F7F9FC',
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Overall score (0-100)
                </Typography>

                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600}>
                          {leftData.name}
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {leftScore}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: '#D9DDE5',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${leftScore}%`,
                            backgroundColor: '#0B5FFF',
                          }}
                        />
                      </Box>
                    </Stack>

                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600}>
                          {rightData.name}
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {rightScore}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: '#D9DDE5',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${rightScore}%`,
                            backgroundColor: '#009D77',
                          }}
                        />
                      </Box>
                    </Stack>
              </Stack>
            </Box>

            {statRows.map((row) => (
              <Stack key={row.key} spacing={0.9}>
                    <Stack direction="row" alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body1"
                          fontWeight={row.isLeftWinner ? 700 : 500}
                          textAlign="left"
                        >
                          {row.leftValue}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        textAlign="center"
                        sx={{ width: { xs: 112, md: 160 } }}
                      >
                        {row.label}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body1"
                          fontWeight={row.isRightWinner ? 700 : 500}
                          textAlign="right"
                        >
                          {row.rightValue}
                        </Typography>
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
                            backgroundColor: row.isLeftWinner ? '#0B5FFF' : '#8F99AA',
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
                            backgroundColor: row.isRightWinner ? '#0B5FFF' : '#8F99AA',
                          }}
                        />
                      </Box>
                    </Stack>
              </Stack>
            ))}

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={leftScore >= rightScore ? `${leftData.name} is leading` : `${rightData.name} is leading`}
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
            {!compareLoading && !compareResult && (
              <Typography>{recommendation}</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
