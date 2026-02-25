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
  author_name?: string
  like_count?: number
  parent_id?: string
  external_id?: string
}

type CommunityReviewsProps = {
  communityId: string
}

type Thread = {
  parent: Review
  replies: Review[]
}

const ITEMS_PER_PAGE = 5

function uniqueByPostId(reviews: Review[]): Review[] {
  const seen = new Set<string>()
  return reviews.filter(function(r) {
    if (seen.has(r.post_id)) { return false }
    seen.add(r.post_id)
    return true
  })
}

function organizeThreads(reviews: Review[]): Thread[] {
  // 1. Separate parents and replies
  const parents = reviews.filter((r) => !r.parent_id)
  const replies = reviews.filter((r) => !!r.parent_id)
  
  // 2. Map replies to their parent's external_id
  const replyMap = new Map<string, Review[]>()
  replies.forEach((r) => {
    if (!r.parent_id) return
    const list = replyMap.get(r.parent_id) || []
    list.push(r)
    replyMap.set(r.parent_id, list)
  })

  // 3. Sort parents: prioritize those with replies, then by date (newest first)
  parents.sort((a, b) => {
    // Check if parent has replies in the map
    const repliesA = a.external_id ? replyMap.get(a.external_id) : undefined
    const hasRepliesA = repliesA && repliesA.length > 0;

    const repliesB = b.external_id ? replyMap.get(b.external_id) : undefined
    const hasRepliesB = repliesB && repliesB.length > 0;

    if (hasRepliesA && !hasRepliesB) return -1
    if (!hasRepliesA && hasRepliesB) return 1

    const timeA = a.posted_at ? new Date(a.posted_at).getTime() : 0
    const timeB = b.posted_at ? new Date(b.posted_at).getTime() : 0
    return timeB - timeA
  })
  
  // 4. Create Threads
  const threads: Thread[] = []
  parents.forEach((p) => {
    let children: Review[] = []
    if (p.external_id) {
        const found = replyMap.get(p.external_id)
        if (found) {
            children = found
            // Sort replies older -> newer
            children.sort((a, b) => {
                const timeA = a.posted_at ? new Date(a.posted_at).getTime() : 0
                const timeB = b.posted_at ? new Date(b.posted_at).getTime() : 0
                return timeA - timeB
            })
        }
    }
    threads.push({ parent: p, replies: children })
  })

  // 5. Handle orphaned replies
  const processedPostIds = new Set<string>()
  threads.forEach(t => {
      processedPostIds.add(t.parent.post_id)
      t.replies.forEach(r => processedPostIds.add(r.post_id))
  })

  replies.forEach(r => {
      if (!processedPostIds.has(r.post_id)) {
          threads.push({ parent: r, replies: [] })
      }
  })
  
  return threads
}

export function CommunityReviews({ communityId }: CommunityReviewsProps) {
  const [allThreads, setAllThreads] = useState<Thread[]>([])
  const [displayedThreads, setDisplayedThreads] = useState<Thread[]>([])
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
        setDisplayedThreads([])
        
        const response = await fetch(
          `http://localhost:8000/communities/${communityId}/reviews`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch reviews')
        }

        const data: Review[] = await response.json()
        const sortedThreads = organizeThreads(uniqueByPostId(data))
        setAllThreads(sortedThreads)
        setDisplayedThreads(sortedThreads.slice(0, ITEMS_PER_PAGE))
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
    const nextThreads = allThreads.slice(0, nextLimit)

    if (displayedThreads.length < allThreads.length) {
      setDisplayedThreads(nextThreads)
      setPage(nextPage)
    }
  }, [allThreads, displayedThreads.length, page])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedThreads.length < allThreads.length) {
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
  }, [loadMore, displayedThreads.length, allThreads.length])

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

  if (allThreads.length === 0) {
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
      {displayedThreads.map((thread) => (
        <Box key={thread.parent.post_id}>
            <ReviewCard review={thread.parent} isReply={false} />
            {thread.replies.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1, ml: 4, pl: 2, borderLeft: `2px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                    {thread.replies.map((reply) => (
                        <ReviewCard key={reply.post_id} review={reply} isReply={true} />
                    ))}
                </Stack>
            )}
        </Box>
      ))}
      
      {/* Loading sentinel */}
      {displayedThreads.length < allThreads.length && (
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

function ReviewCard({ review, isReply }: { review: Review, isReply: boolean }) {
    const theme = useTheme()
    return (
        <Card
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
                  width: isReply ? 24 : 32,
                  height: isReply ? 24 : 32,
                  fontSize: isReply ? '0.6rem' : '0.8rem',
                }}
              >
                {(review.author_name || review.platform)[0].toUpperCase()}
              </Avatar>
            }
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: isReply ? '0.85rem' : '0.95rem' }}>
                  {review.author_name || `${review.platform} User`}
                </Typography>
                {review.posted_at && (
                  <Typography variant="caption" color="text.secondary">
                    • {new Date(review.posted_at).toLocaleDateString()}
                  </Typography>
                )}
                {review.like_count !== undefined && review.like_count > 0 && (
                   <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                     • 👍 {review.like_count}
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
    )
}
