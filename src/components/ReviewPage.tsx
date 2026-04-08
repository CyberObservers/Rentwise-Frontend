import {
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
import { neighborhoods } from '../data'
import { CommunityReviews } from './CommunityReviews'

export function ReviewPage() {
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState(neighborhoods[0].id)

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedNeighborhoodId(event.target.value)
  }

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
                value={selectedNeighborhoodId}
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

      <CommunityReviews communityId={selectedNeighborhoodId} />
    </Stack>
  )
}
