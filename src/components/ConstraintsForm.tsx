import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { dimensionLabels, dimensions } from '../data'
import type { Dimension, Neighborhood } from '../types'

type ConstraintsFormProps = {
  selectedNeighborhoodData: Neighborhood
  weights: Record<Dimension, number>
  topDrivers: string[]
  modelPrompt: string
  onWeightChange: (dimension: Dimension, value: number) => void
}

export function ConstraintsForm({
  selectedNeighborhoodData,
  weights,
  topDrivers,
  modelPrompt,
  onWeightChange,
}: ConstraintsFormProps) {
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Step 2: Neighborhood metrics and charts</Typography>
            <Typography color="text.secondary">
              Neighborhood in focus: {selectedNeighborhoodData.name}
            </Typography>

            {dimensions.map((dimension) => {
              const value = selectedNeighborhoodData.objective[dimension]
              return (
                <Box key={dimension}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>{dimensionLabels[dimension]}</Typography>
                    <Chip
                      size="small"
                      label={value === null ? 'N/A' : `${value}/100`}
                      color={value === null ? 'default' : 'primary'}
                      variant={value === null ? 'outlined' : 'filled'}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={value ?? 0}
                    sx={{ mt: 1, height: 8, borderRadius: 999 }}
                  />
                </Box>
              )
            })}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Preference weight tuning (for comparison)</Typography>
            <Typography color="text.secondary">
              Top drivers: {topDrivers.join(' • ')}
            </Typography>
            {dimensions.map((dimension) => (
              <Box key={dimension}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography>{dimensionLabels[dimension]}</Typography>
                  <Chip label={`${weights[dimension]}%`} size="small" />
                </Stack>
                <Slider
                  value={weights[dimension]}
                  min={5}
                  max={60}
                  step={1}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => onWeightChange(dimension, value as number)}
                />
              </Box>
            ))}
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
