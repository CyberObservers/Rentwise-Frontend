import {
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import type { ProfileType } from '../types'

type ProfileFormProps = {
  profileType: ProfileType
  setProfileType: (value: ProfileType) => void
  hasCar: boolean
  setHasCar: (value: boolean) => void
  sharesHousing: boolean
  setSharesHousing: (value: boolean) => void
  bikeComfort: boolean
  setBikeComfort: (value: boolean) => void
  needsQuietArea: boolean
  setNeedsQuietArea: (value: boolean) => void
}

export function ProfileForm({
  profileType,
  setProfileType,
  hasCar,
  setHasCar,
  sharesHousing,
  setSharesHousing,
  bikeComfort,
  setBikeComfort,
  needsQuietArea,
  setNeedsQuietArea,
}: ProfileFormProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Adaptive onboarding: profile</Typography>

          <FormControl fullWidth>
            <InputLabel>Profile type</InputLabel>
            <Select
              label="Profile type"
              value={profileType}
              onChange={(event) => setProfileType(event.target.value as ProfileType)}
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="professional">Working professional</MenuItem>
              <MenuItem value="family">Family household</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography>Do you currently have a car?</Typography>
            <Switch checked={hasCar} onChange={(e) => setHasCar(e.target.checked)} />
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography>You are sharing housing with roommates</Typography>
            <Switch
              checked={sharesHousing}
              onChange={(e) => setSharesHousing(e.target.checked)}
            />
          </Stack>

          {/* Conditional input: Only show bike comfort if no car */}
          {!hasCar && (
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography>Comfortable biking for part of commute</Typography>
              <Switch
                checked={bikeComfort}
                onChange={(e) => setBikeComfort(e.target.checked)}
              />
            </Stack>
          )}

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography>Prefer a low-noise neighborhood</Typography>
            <Switch
              checked={needsQuietArea}
              onChange={(e) => setNeedsQuietArea(e.target.checked)}
            />
          </Stack>

          <Alert severity="info" variant="outlined">
            These profile conditions feed recommended baseline weights before manual tuning.
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  )
}
