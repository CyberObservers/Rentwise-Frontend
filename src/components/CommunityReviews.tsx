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
import { useCallback, useEffect, useRef, useState } from 'react'

type Review = {
  post_id: string
  platform: string
  body_text: string
  posted_at: string | null
}

type CommunityReviewsProps = {
  communityId: string
}

const ITEMS_PER_PAGE = 5

export function CommunityReviews({ communityId }: CommunityReviewsProps) {
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const observerTarget = useRef(null)
  const theme = useTheme()

  // Fetch all reviews initially (client-side pagination)
  useEffect(() => {
    if (!communityId) return

    const fetchReviews = async () => {
      try {
        setLoading(true)
        setError(null)
        // Reset pagination when community changes
        setPage(1)
        
        const response = await fetch(
          `http://localhost:8000/communities/${communityId}/reviews`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch reviews')
        }

        const data = await response.json()
        setAllReviews(data)
        setDisplayedReviews(data.slice(0, ITEMS_PER_PAGE))
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

  // Handle loading more items
  const loadMore = useCallback(() => {
    const nextPage = page + 1
    const nextLimit = nextPage * ITEMS_PER_PAGE
    const nextReviews = allReviews.slice(0, nextLimit)
    
    if (displayedReviews.length < allReviews.length) {
      setDisplayedReviews(nextReviews)
      setPage(nextPage)
    }
  }, [allReviews, displayedReviews.length, page])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedReviews.length < allReviews.length) {
          loadMore()
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [loadMore, displayedReviews.length, allReviews.length])

  if (loading && page === 1) {
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

  if (allReviews.length === 0) {
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
      {displayedReviews.map((review) => (
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
      
      {/* Loading sentinel */}
      {displayedReviews.length < allReviews.length && (
        <Box 
          ref={observerTarget} 
          sx={{ display: 'flex', justifyContent: 'center', p: 2 }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
    </Stack>
  )
}
