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
        <Stack spacing={2}>
          <Stack spacing={0.75}>
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
                p: 1.5,
                backgroundColor: '#FBFCFE',
              }}
            >
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  spacing={1.25}
                  alignItems={{ lg: 'center' }}
                >
                  <Box sx={{ width: { lg: 280 }, flexShrink: 0 }}>
                    <Typography fontWeight={700}>{dimensionLabels[dimension]}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: { lg: 'nowrap' } }}
                    >
                      {dimensionHints[dimension]}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, px: { lg: 1 } }}>
                    <Slider
                      value={weights[dimension]}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(_, value) => commitWeight(dimension, value as number)}
                      valueLabelDisplay="auto"
                      color={dimension === topDrivers[0]?.split(' ')[0] ? 'primary' : 'secondary'}
                      sx={{ my: { xs: 0.5, lg: 0 } }}
                    />
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent={{ xs: 'space-between', lg: 'flex-end' }}
                    sx={{ width: { lg: 460 }, flexShrink: 0 }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAdjust(dimension, -5)}
                      disabled={weights[dimension] <= 0}
                      sx={{ minWidth: 56 }}
                    >
                      -5
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAdjust(dimension, -1)}
                      disabled={weights[dimension] <= 0}
                      sx={{ minWidth: 56 }}
                    >
                      -1
                    </Button>
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
                      sx={{ width: 96 }}
                    />
                    <Chip label={`${weights[dimension]}%`} size="small" sx={{ fontWeight: 800 }} />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleAdjust(dimension, 1)}
                      disabled={weights[dimension] >= 100}
                      sx={{ minWidth: 56 }}
                    >
                      +1
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      onClick={() => handleAdjust(dimension, 5)}
                      disabled={weights[dimension] >= 100}
                      sx={{ minWidth: 56 }}
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
