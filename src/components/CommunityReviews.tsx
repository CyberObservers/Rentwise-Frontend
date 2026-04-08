import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cloud from 'd3-cloud'

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

type WordCloudEntry = {
  term: string
  score: number
  mentions: number
}

type CloudLayoutWord = {
  text: string
  value: number
  size: number
  mentions: number
  threadCount: number
  x?: number
  y?: number
  rotate?: number
}

const ITEMS_PER_PAGE = 5
const MAX_WORDS = 36
const MIN_CLOUD_WORDS = 14
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'almost', 'also', 'always', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'can',
  'could', 'did', 'do', 'does', 'doing', 'done', 'down', 'during', 'each', 'few', 'for', 'from',
  'get', 'got', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just',
  'let', 'me', 'more', 'most', 'my', 'myself', 'no', 'not', 'now', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'really', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // common connector in place names; we keep full phrases separately
  'del',
  // low-signal platform words
  'youtube', 'video', 'comment', 'comments', 'channel', 'subscribe', 'watch',
])

const SHORT_WORD_WHITELIST = new Set(['ac', 'hvac', 'hoa', 'gym', 'bus', 'laundry'])

const RENTAL_PHRASES = [
  'pet friendly',
  'in unit laundry',
  'washer dryer',
  'parking garage',
  'street parking',
  'guest parking',
  'property manager',
  'management office',
  'security deposit',
  'month to month',
  'lease renewal',
  'late night',
  'noise level',
  'walkable distance',
  'gated community',
  'maintenance request',
  'public transit',
  'bus stop',
  'commute time',
  'move in',
]

const LOCATION_PHRASES = [
  'camino del sol',
  'vista del campo',
  'vista del campo norte',
  'arroyo vista',
  'university town center',
  'irvine spectrum',
  'costa mesa border',
]

const RENTAL_SIGNAL_TERMS = new Set([
  'rent', 'rental', 'apartment', 'apartments', 'housing', 'lease', 'sublease', 'deposit', 'utility',
  'utilities', 'room', 'roommate', 'roommates', 'shared', 'parking', 'garage', 'street', 'commute',
  'transit', 'bus', 'walkable', 'quiet', 'noise', 'safe', 'safety', 'management', 'maintenance',
  'landlord', 'campus', 'dorm', 'dorms', 'acc', 'utc', 'camino', 'vista', 'arroyo',
])

const NON_RENTAL_TERMS = new Set([
  'accepted', 'acceptance', 'admitted', 'admission', 'waitlisted', 'committed', 'ucla', 'berkeley',
  'stats', 'program', 'drama', 'entertainment', 'video', 'sound', 'freshman', 'research',
])

const EXCLUDED_NOISE_TOKENS = new Set([
  'accepted', 'waitlisted', 'committed', 'ucla', 'berkeley', 'stats', 'program', 'video', 'sound',
  'funny', 'entertainment', 'freshman', 'omg', 'pls',
  // low-value generic words that drown rental signals
  'area', 'live', 'far', 'sure', 'pretty', 'options', 'guys', 'help', 'today', 'anymore',
  'thanks', 'thank', 'really', 'actually', 'going', 'whole', 'give', 'giving', 'got',
])

function normalizeReviewText(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/www\.\S+/g, ' ')
    .replace(/[@#][a-z0-9_]+/g, ' ')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getReviewRelevanceMultiplier(normalized: string): number {
  const words = normalized.match(/[a-z][a-z'-]{1,24}/g) ?? []
  if (words.length === 0) return 0

  const uniqueWords = new Set(words)
  let rentalHits = 0
  let noiseHits = 0

  uniqueWords.forEach((word) => {
    if (RENTAL_SIGNAL_TERMS.has(word)) rentalHits += 1
    if (NON_RENTAL_TERMS.has(word)) noiseHits += 1
  })

  RENTAL_PHRASES.forEach((phrase) => {
    if (normalized.includes(phrase)) rentalHits += 2
  })

  if (rentalHits === 0) return 0
  if (rentalHits <= noiseHits) return 0.4

  return 1 + Math.min(rentalHits, 6) * 0.08
}

function extractWordCloudEntries(reviews: Review[]): WordCloudEntry[] {
  const scoreByTerm = new Map<string, number>()
  const mentionsByTerm = new Map<string, number>()

  reviews.forEach((review) => {
    const normalized = normalizeReviewText(review.body_text)
    if (!normalized) return

    const relevance = getReviewRelevanceMultiplier(normalized)
    if (relevance === 0) return

    const reviewWeight = (1 + Math.min(Math.max(review.like_count ?? 0, 0), 20) / 20) * relevance
    const seenThisReview = new Set<string>()
    const blockedTokensInReview = new Set<string>()

    LOCATION_PHRASES.forEach((phrase) => {
      if (normalized.includes(phrase) && !seenThisReview.has(phrase)) {
        seenThisReview.add(phrase)
        scoreByTerm.set(phrase, (scoreByTerm.get(phrase) ?? 0) + reviewWeight * 2.2)
        mentionsByTerm.set(phrase, (mentionsByTerm.get(phrase) ?? 0) + 1)

        phrase.split(' ').forEach((part) => {
          if (part.length >= 3) blockedTokensInReview.add(part)
        })
      }
    })

    const tokens = normalized.match(/[a-z][a-z'-]{1,24}/g) ?? []
    tokens.forEach((tokenRaw) => {
      const token = tokenRaw.replace(/(^'+|'+$)/g, '')
      if (!token) return
      if (token.length < 3 && !SHORT_WORD_WHITELIST.has(token)) return
      if (STOP_WORDS.has(token)) return
      if (EXCLUDED_NOISE_TOKENS.has(token)) return
      if (blockedTokensInReview.has(token)) return
      if (/^\d+$/.test(token)) return
      if (seenThisReview.has(token)) return

      seenThisReview.add(token)
      scoreByTerm.set(token, (scoreByTerm.get(token) ?? 0) + reviewWeight)
      mentionsByTerm.set(token, (mentionsByTerm.get(token) ?? 0) + 1)
    })

    RENTAL_PHRASES.forEach((phrase) => {
      if (normalized.includes(phrase) && !seenThisReview.has(phrase)) {
        seenThisReview.add(phrase)
        scoreByTerm.set(phrase, (scoreByTerm.get(phrase) ?? 0) + reviewWeight * 1.8)
        mentionsByTerm.set(phrase, (mentionsByTerm.get(phrase) ?? 0) + 1)
      }
    })
  })

  const ranked = [...scoreByTerm.entries()]
    .map(([term, score]) => ({
      term,
      score,
      mentions: mentionsByTerm.get(term) ?? 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.mentions - a.mentions
    })

  const strict = ranked.filter((item) => item.mentions >= 2 || item.score >= 2.6)
  if (strict.length >= MIN_CLOUD_WORDS) {
    return strict.slice(0, MAX_WORDS)
  }

  // For small datasets, relax thresholds so cloud doesn't look empty.
  const relaxed = ranked.filter((item) => item.mentions >= 1 || item.score >= 1.2)
  const merged = [...strict]
  const seen = new Set(strict.map((item) => item.term))
  relaxed.forEach((item) => {
    if (seen.has(item.term)) return
    if (merged.length >= Math.min(MAX_WORDS, MIN_CLOUD_WORDS)) return
    seen.add(item.term)
    merged.push(item)
  })

  return merged.slice(0, MAX_WORDS)
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildTermRegex(term: string, flags = 'i'): RegExp {
  const escaped = escapeRegExp(term.trim()).replace(/\s+/g, '\\s+')
  return new RegExp(`\\b${escaped}\\b`, flags)
}

function reviewContainsTerm(review: Review, term: string): boolean {
  return buildTermRegex(term).test(normalizeReviewText(review.body_text))
}

function threadContainsTerm(thread: Thread, term: string): boolean {
  if (reviewContainsTerm(thread.parent, term)) return true
  return thread.replies.some((reply) => reviewContainsTerm(reply, term))
}

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
    const hasRepliesA = repliesA && repliesA.length > 0

    const repliesB = b.external_id ? replyMap.get(b.external_id) : undefined
    const hasRepliesB = repliesB && repliesB.length > 0

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
  threads.forEach((t) => {
    processedPostIds.add(t.parent.post_id)
    t.replies.forEach((r) => processedPostIds.add(r.post_id))
  })

  replies.forEach((r) => {
    if (!processedPostIds.has(r.post_id)) {
      threads.push({ parent: r, replies: [] })
    }
  })

  return threads
}

export function CommunityReviews({ communityId }: CommunityReviewsProps) {
  const [allThreads, setAllThreads] = useState<Thread[]>([])
  const [displayedThreads, setDisplayedThreads] = useState<Thread[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement | null>(null)
  const theme = useTheme()
  const allReviews = useMemo(
    () => allThreads.flatMap((thread) => [thread.parent, ...thread.replies]),
    [allThreads],
  )
  const filteredThreads = useMemo(() => {
    if (!selectedTerm) return displayedThreads
    return allThreads.filter((thread) => threadContainsTerm(thread, selectedTerm))
  }, [allThreads, displayedThreads, selectedTerm])

  // Fetch all reviews initially (client-side pagination)
  useEffect(() => {
    if (!communityId) return

    const fetchReviews = async () => {
      try {
        setLoading(true)
        setError(null)
        setSelectedTerm(null)
        // Reset pagination when community changes
        setPage(1)
        setDisplayedThreads([])

        const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
        const response = await fetch(`${apiBase}/communities/${communityId}/reviews`)

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

    const target = observerTarget.current
    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
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
      <ReviewWordCloud
        reviews={allReviews}
        threads={allThreads}
        selectedTerm={selectedTerm}
        onSelectTerm={setSelectedTerm}
        onClearTerm={() => setSelectedTerm(null)}
      />

      {selectedTerm && (
        <Card elevation={0} sx={{ border: `1px dashed ${theme.palette.divider}` }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                Showing comments matched with:
              </Typography>
              <Chip size="small" color="primary" label={selectedTerm} />
              <Typography variant="body2" color="text.secondary">
                ({filteredThreads.length} threads)
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label="Show all comments"
                onClick={() => setSelectedTerm(null)}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {selectedTerm && filteredThreads.length === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No comment text matched "{selectedTerm}". Try another keyword in the cloud.
          </Typography>
        </Box>
      )}

      {filteredThreads.map((thread) => (
        <Box key={thread.parent.post_id}>
          <ReviewCard review={thread.parent} isReply={false} highlightedTerm={selectedTerm} />
          {thread.replies.length > 0 && (
            <Stack
              spacing={1}
              sx={{ mt: 1, ml: 4, pl: 2, borderLeft: `2px solid ${alpha(theme.palette.divider, 0.5)}` }}
            >
              {thread.replies.map((reply) => (
                <ReviewCard
                  key={reply.post_id}
                  review={reply}
                  isReply={true}
                  highlightedTerm={selectedTerm}
                />
              ))}
            </Stack>
          )}
        </Box>
      ))}

      {/* Loading sentinel */}
      {!selectedTerm && displayedThreads.length < allThreads.length && (
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

function ReviewWordCloud({
  reviews,
  threads,
  selectedTerm,
  onSelectTerm,
  onClearTerm,
}: {
  reviews: Review[]
  threads: Thread[]
  selectedTerm: string | null
  onSelectTerm: (term: string) => void
  onClearTerm: () => void
}) {
  const theme = useTheme()
  const entries = useMemo(() => extractWordCloudEntries(reviews), [reviews])
  const cloudRef = useRef<HTMLDivElement | null>(null)
  const [cloudWidth, setCloudWidth] = useState(760)
  const [layoutWords, setLayoutWords] = useState<CloudLayoutWord[]>([])
  const threadCountByTerm = useMemo(() => {
    const map = new Map<string, number>()
    entries.forEach((entry) => {
      const count = threads.filter((thread) => threadContainsTerm(thread, entry.term)).length
      map.set(entry.term, count)
    })
    return map
  }, [entries, threads])
  const cloudData = useMemo(
    () => {
      const maxScore = entries[0]?.score ?? 1
      const minScore = entries[entries.length - 1]?.score ?? 0
      const spread = Math.max(maxScore - minScore, 0.01)

      return entries.map((entry) => {
        const normalized = (entry.score - minScore) / spread
        const size = Math.round(15 + normalized * 16)
        return {
          text: entry.term,
          value: size,
          size,
          mentions: entry.mentions,
          threadCount: threadCountByTerm.get(entry.term) ?? 0,
        }
      })
    },
    [entries, threadCountByTerm],
  )
  const cloudHeight = entries.length < 10 ? 180 : entries.length < 16 ? 220 : 260

  useEffect(() => {
    const node = cloudRef.current
    if (!node) return

    const updateWidth = () => {
      const width = Math.max(300, Math.floor(node.clientWidth))
      setCloudWidth(width)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (cloudData.length === 0 || cloudWidth <= 0) {
      setLayoutWords([])
      return
    }

    const width = Math.max(300, cloudWidth - 12)
    const height = cloudHeight
    const layout = cloud<CloudLayoutWord>()
      .size([width, height])
      .words(cloudData.map((word) => ({ ...word, size: word.value })))
      .padding(3)
      .rotate((_word: CloudLayoutWord, index: number) => (index % 8 === 0 ? 90 : 0))
      .font('Manrope')
      .fontSize((word: CloudLayoutWord) => word.size)
      .on('end', (words: CloudLayoutWord[]) => setLayoutWords(words))

    layout.start()
    return () => layout.stop()
  }, [cloudData, cloudWidth, cloudHeight])

  if (entries.length === 0) {
    return null
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Box
            ref={cloudRef}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.light, 0.06),
              minHeight: cloudHeight + 20,
            }}
          >
            {cloudWidth > 0 && layoutWords.length > 0 && (
              <svg width="100%" height={cloudHeight} viewBox={`0 0 ${Math.max(300, cloudWidth - 12)} ${cloudHeight}`}>
                <g transform={`translate(${Math.max(300, cloudWidth - 12) / 2},${cloudHeight / 2})`}>
                  {layoutWords.map((word, index) => {
                    const tone = index % 3 === 0
                      ? theme.palette.primary.main
                      : index % 3 === 1
                        ? theme.palette.secondary.main
                        : theme.palette.text.primary

                    return (
                      <text
                        key={`cloud-${word.text}`}
                        textAnchor="middle"
                        transform={`translate(${word.x ?? 0},${word.y ?? 0}) rotate(${word.rotate ?? 0})`}
                        style={{
                          fontSize: `${word.size}px`,
                          fontFamily: 'Manrope, sans-serif',
                          fill: selectedTerm === word.text ? theme.palette.primary.dark : tone,
                          cursor: 'pointer',
                          opacity: selectedTerm && selectedTerm !== word.text ? 0.6 : 0.95,
                          fontWeight: word.text.includes(' ') ? 700 : 600,
                        }}
                        onClick={() => onSelectTerm(word.text)}
                      >
                        <title>{`Threads: ${word.threadCount} • Mentions: ${word.mentions}`}</title>
                        {word.text}
                      </text>
                    )
                  })}
                </g>
              </svg>
            )}
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {selectedTerm && (
              <Chip
                size="small"
                color="primary"
                variant="filled"
                label="Clear filter"
                onClick={onClearTerm}
              />
            )}
            {entries.slice(0, 8).map((entry) => (
              <Chip
                key={`chip-${entry.term}`}
                size="small"
                color={selectedTerm === entry.term ? 'primary' : 'default'}
                variant={selectedTerm === entry.term ? 'filled' : 'outlined'}
                label={`${entry.term} (${threadCountByTerm.get(entry.term) ?? 0})`}
                onClick={() => onSelectTerm(entry.term)}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function HighlightedCommentText({ text, term }: { text: string, term: string | null }) {
  if (!term) {
    return <>{text}</>
  }

  const regex = new RegExp(`(${buildTermRegex(term, 'gi').source})`, 'gi')
  const parts = text.split(regex)
  const exactRegex = buildTermRegex(term)

  return (
    <>
      {parts.map((part, index) => (
        exactRegex.test(normalizeReviewText(part))
          ? (
            <Box
              component="mark"
              key={`${part}-${index}`}
              sx={{
                bgcolor: 'rgba(11, 95, 255, 0.18)',
                color: 'inherit',
                px: 0.3,
                borderRadius: 0.5,
              }}
            >
              {part}
            </Box>
          )
          : <span key={`${part}-${index}`}>{part}</span>
      ))}
    </>
  )
}

function ReviewCard({ review, isReply, highlightedTerm }: { review: Review, isReply: boolean, highlightedTerm: string | null }) {
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
          <HighlightedCommentText text={review.body_text} term={highlightedTerm} />
        </Typography>
      </CardContent>
    </Card>
  )
}
