import {
  Box,
  Button,
  Card,
  CardContent,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material'

type ConstraintsFormProps = {
  commuteDays: number
  setCommuteDays: (value: number) => void
  safetyPriority: number
  setSafetyPriority: (value: number) => void
  parkingPriority: boolean
  setParkingPriority: (value: boolean) => void
  hasCar: boolean
  onApplyRecommendedWeights: () => void
  onResetWeights: () => void
}

export function ConstraintsForm({
  commuteDays,
  setCommuteDays,
  safetyPriority,
  setSafetyPriority,
  parkingPriority,
  setParkingPriority,
  hasCar,
  onApplyRecommendedWeights,
  onResetWeights,
}: ConstraintsFormProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Adaptive onboarding: constraints</Typography>

          <Box>
            <Typography gutterBottom>How many days per week do you commute?</Typography>
            <Slider
              value={commuteDays}
              min={0}
              max={7}
              marks
              step={1}
              valueLabelDisplay="auto"
              onChange={(_, value) => setCommuteDays(value as number)}
            />
          </Box>

          <Box>
            <Typography gutterBottom>How important is nighttime safety?</Typography>
            <Slider
              value={safetyPriority}
              min={1}
              max={5}
              marks
              step={1}
              valueLabelDisplay="auto"
              onChange={(_, value) => setSafetyPriority(value as number)}
            />
          </Box>

          {hasCar && (
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography>Parking availability is a high priority</Typography>
              <Switch
                checked={parkingPriority}
                onChange={(e) => setParkingPriority(e.target.checked)}
              />
            </Stack>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={onApplyRecommendedWeights}>
              Apply recommended weights
            </Button>
            <Button variant="outlined" onClick={onResetWeights}>
              Reset to even weights
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
