import {
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useState } from 'react'
import type { Neighborhood } from '../types'
import { CommunityReviews } from './CommunityReviews'

type ReviewPageProps = {
  neighborhoods: Neighborhood[]
}

export function ReviewPage({ neighborhoods }: ReviewPageProps) {
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string | null>(null)

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedNeighborhoodId(event.target.value)
  }

  if (neighborhoods.length === 0) {
    return <Alert severity="warning">No backend communities are available for reviews yet.</Alert>
  }

  const resolvedSelectedNeighborhoodId =
    selectedNeighborhoodId && neighborhoods.some((item) => item.id === selectedNeighborhoodId)
      ? selectedNeighborhoodId
      : neighborhoods[0].id

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Community Reviews</Typography>
            <Typography color="text.secondary">
              See what real residents are saying on Youtube.
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel id="review-neighborhood-select-label">Select Neighborhood</InputLabel>
              <Select
                labelId="review-neighborhood-select-label"
                id="review-neighborhood-select"
                value={resolvedSelectedNeighborhoodId}
                label="Select Neighborhood"
                onChange={handleChange}
              >
                {neighborhoods.map((n) => (
                  <MenuItem key={n.id} value={n.id}>
                    {n.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <CommunityReviews communityId={resolvedSelectedNeighborhoodId} />
    </Stack>
  )
}
