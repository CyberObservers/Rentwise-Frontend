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
import type { Neighborhood } from '../types'

type ConstraintsFormProps = {
  selectedNeighborhoodData: Neighborhood
  topDrivers: string[]
  modelPrompt: string
}

export function ConstraintsForm({
  selectedNeighborhoodData,
  topDrivers,
  modelPrompt,
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
            </Stack>
            {dimensions.map((dimension) => {
              const value = selectedNeighborhoodData.objective[dimension]
              const normalizedValue = Math.max(0, Math.min(100, value ?? 0))
              return (
                <Box key={dimension}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700}>{dimensionLabels[dimension]}</Typography>
                    <Chip
                      color="primary"
                      label={value === null ? 'N/A' : `${value}/100`}
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
