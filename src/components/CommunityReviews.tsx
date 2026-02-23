import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'

type Review = {
  post_id: string
  platform: string
  body_text: string
  posted_at: string | null
}

type CommunityReviewsProps = {
  communityId: string
}

export function CommunityReviews({ communityId }: CommunityReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const theme = useTheme()

  useEffect(() => {
    if (!communityId) return

    const fetchReviews = async () => {
      try {
        setLoading(true)
        // Adjust the base URL if needed, assuming proxy or same origin usually
        // If your backend is at 8000 and frontend 5173, you might need full URL
        const response = await fetch(
          `http://localhost:8000/communities/${communityId}/reviews`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch reviews')
        }

        const data = await response.json()
        setReviews(data)
      } catch (err: unknown) {
        console.error(err)
        const message = err instanceof Error ? err.message : 'Error loading reviews'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [communityId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </Box>
    )
  }

  if (reviews.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No reviews found for this community yet.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          (Try "Irvine Spectrum" or "Woodbridge" for sample data)
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={2}>
      {reviews.map((review) => (
        <Card
          key={review.post_id}
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <CardHeader
            avatar={
              <Avatar
                sx={{
                  bgcolor:
                    review.platform === 'youtube'
                      ? '#FF0000'
                      : theme.palette.primary.main,
                  width: 32,
                  height: 32,
                  fontSize: '0.8rem',
                }}
              >
                {review.platform[0].toUpperCase()}
              </Avatar>
            }
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {review.platform} User
                </Typography>
                {review.posted_at && (
                  <Typography variant="caption" color="text.secondary">
                    • {new Date(review.posted_at).toLocaleDateString()}
                  </Typography>
                )}
              </Stack>
            }
          />
          <CardContent sx={{ pt: 0, pb: '16px !important' }}>
            <Typography variant="body2" color="text.primary">
              {review.body_text}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
