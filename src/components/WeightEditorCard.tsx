import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  OutlinedInput,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { getTopDriverDimensions, rebalanceWeights } from '../logic'
import { dimensionLabels, dimensions } from '../types'
import type { Dimension } from '../types'

type WeightEditorCardProps = {
  title: string
  description: string
  weights: Record<Dimension, number>
  onChange: (nextWeights: Record<Dimension, number>) => void
  aiSuggestedWeights?: Record<Dimension, number> | null
  aiSuggestedLabel?: string
}

const dimensionHints: Record<Dimension, string> = {
  safety: 'Safer streets and lower-crime areas',
  transit: 'Commute time and transit access',
  convenience: 'Groceries, dining, and daily errands',
  parking: 'Parking ease for cars and guests',
  environment: 'Quiet, greenery, and overall feel',
}

const buildInputState = (weights: Record<Dimension, number>) =>
  Object.fromEntries(dimensions.map((dimension) => [dimension, String(weights[dimension])])) as Record<
    Dimension,
    string
  >

export function WeightEditorCard({
  title,
  description,
  weights,
  onChange,
  aiSuggestedWeights = null,
  aiSuggestedLabel = 'Started from LLM chat preferences',
}: WeightEditorCardProps) {
  const [inputValues, setInputValues] = useState<Record<Dimension, string>>(buildInputState(weights))
  const topDrivers = getTopDriverDimensions(weights)

  useEffect(() => {
    setInputValues(buildInputState(weights))
  }, [weights])

  const commitWeight = (dimension: Dimension, value: number) => {
    onChange(rebalanceWeights(weights, dimension, value))
  }

  const handleAdjust = (dimension: Dimension, delta: number) => {
    commitWeight(dimension, weights[dimension] + delta)
  }

  const handleInputCommit = (dimension: Dimension) => {
    const rawValue = inputValues[dimension].trim()
    if (rawValue === '') {
      setInputValues((prev) => ({ ...prev, [dimension]: String(weights[dimension]) }))
      return
    }

    const parsed = Number.parseInt(rawValue, 10)
    if (Number.isNaN(parsed)) {
      setInputValues((prev) => ({ ...prev, [dimension]: String(weights[dimension]) }))
      return
    }

    commitWeight(dimension, parsed)
  }

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
      }}
    >
      <CardContent>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <Typography variant="h6">{title}</Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label="Always balanced to 100%" color="primary" />
            <Chip label={`Top drivers: ${topDrivers.join(' • ')}`} variant="outlined" />
            {aiSuggestedWeights && <Chip label={aiSuggestedLabel} color="secondary" variant="outlined" />}
            {aiSuggestedWeights && (
              <Button size="small" variant="text" onClick={() => onChange(aiSuggestedWeights)}>
                Restore AI weights
              </Button>
            )}
          </Stack>

          {dimensions.map((dimension) => (
            <Box
              key={dimension}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                backgroundColor: '#FBFCFE',
              }}
            >
              <Stack spacing={1.4}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box>
                    <Typography fontWeight={700}>{dimensionLabels[dimension]}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dimensionHints[dimension]}
                    </Typography>
                  </Box>
                  <Chip label={`${weights[dimension]}%`} sx={{ fontWeight: 800 }} />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ md: 'center' }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => handleAdjust(dimension, -5)}
                      disabled={weights[dimension] <= 0}
                    >
                      -5
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleAdjust(dimension, -1)}
                      disabled={weights[dimension] <= 0}
                    >
                      -1
                    </Button>
                  </Stack>

                  <Box sx={{ flex: 1, px: { md: 1 } }}>
                    <Slider
                      value={weights[dimension]}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(_, value) => commitWeight(dimension, value as number)}
                      valueLabelDisplay="auto"
                      color={dimension === topDrivers[0]?.split(' ')[0] ? 'primary' : 'secondary'}
                    />
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <OutlinedInput
                      size="small"
                      value={inputValues[dimension]}
                      onChange={(event) =>
                        setInputValues((prev) => ({ ...prev, [dimension]: event.target.value }))
                      }
                      onBlur={() => handleInputCommit(dimension)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleInputCommit(dimension)
                      }}
                      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 0, max: 100 }}
                      endAdornment={<InputAdornment position="end">%</InputAdornment>}
                      sx={{ width: 112 }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleAdjust(dimension, 1)}
                      disabled={weights[dimension] >= 100}
                    >
                      +1
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleAdjust(dimension, 5)}
                      disabled={weights[dimension] >= 100}
                    >
                      +5
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
