import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type ApiAgentTraceStep,
  type ApiCommunityReport,
  postCommunityReport,
} from '../api'
import { loadGoogleMapsScript } from '../googleMapsLoader'
import type { Dimension, Neighborhood } from '../types'
import { dimensionLabels, dimensions, dimensionStyles } from '../types'
import { DimensionRadarChart } from './DimensionRadarChart'

type CommunityReportPageProps = {
  selectedNeighborhoodData: Neighborhood
  weights: Record<Dimension, number>
}

const sectionOrder = [
  'overview',
  'fit',
  'dimensions',
  'risk_alerts',
  'viewing_checklist',
  'sources',
]

function formatStepLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function traceColor(status: ApiAgentTraceStep['status']) {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'default'
  return 'warning'
}

function formatConfidence(value: number | null): string {
  if (value == null) return 'N/A'
  const normalized = value <= 1 ? value * 100 : value
  return `${Math.round(normalized)}%`
}

function sectionAccent(type: string): string {
  switch (type) {
    case 'overview':
      return '#5865F2'
    case 'fit':
      return '#1FA67A'
    case 'dimensions':
      return '#3A84E8'
    case 'risk_alerts':
      return '#E67E3A'
    case 'viewing_checklist':
      return '#7BAA47'
    default:
      return '#667085'
  }
}

type ParsedReviewItem = {
  platform: string
  author: string
  body: string
  linkLabel: string
  url: string
}

type ReportMapPosition = {
  lat: number
  lng: number
}

type ReportMapLike = {
  setCenter: (position: ReportMapPosition) => void
  setZoom: (zoom: number) => void
}

type ReportMarkerLike = {
  setMap: (map: ReportMapLike | null) => void
  setPosition: (position: ReportMapPosition) => void
}

type ReportGoogleMapsApi = {
  Map: new (container: HTMLDivElement, options: {
    center: ReportMapPosition
    zoom: number
    mapTypeControl: boolean
    streetViewControl: boolean
    gestureHandling: string
    zoomControl: boolean
  }) => ReportMapLike
  Marker: new (options: {
    map: ReportMapLike | null
    position: ReportMapPosition
    title: string
    icon: {
      path: unknown
      fillColor: string
      fillOpacity: number
      strokeColor: string
      strokeWeight: number
      scale: number
    }
  }) => ReportMarkerLike
  SymbolPath: {
    CIRCLE: unknown
  }
}

function parseMarkdownLink(input: string): { text: string; label: string; url: string } | null {
  const match = input.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/)
  if (!match) return null

  return {
    text: input.slice(0, match.index).trim(),
    label: match[1],
    url: match[2],
  }
}

function parseReviewItem(input: string): ParsedReviewItem | null {
  const linked = parseMarkdownLink(input)
  if (!linked) return null

  const match = linked.text.match(/^(.+?)\s+by\s+([^:]+):\s*['"]?(.*?)['"]?\.?$/i)
  if (!match) return null

  return {
    platform: match[1].trim(),
    author: match[2].trim(),
    body: match[3].trim(),
    linkLabel: linked.label,
    url: linked.url,
  }
}

function isSourceLikeSection(type: string, title: string): boolean {
  const normalizedTitle = title.toLowerCase()
  return type === 'sources' || normalizedTitle.includes('review') || normalizedTitle.includes('source')
}

function getReportGoogleMaps(): ReportGoogleMapsApi | undefined {
  return (window as Window & { google?: { maps?: ReportGoogleMapsApi } }).google?.maps
}

function CommunityLocationMap({
  lat,
  lng,
  name,
}: {
  lat: number | null
  lng: number | null
  name: string
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<ReportMapLike | null>(null)
  const markerRef = useRef<ReportMarkerLike | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  const position = useMemo<ReportMapPosition | null>(() => {
    if (lat == null || lng == null) return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [lat, lng])

  useEffect(() => {
    if (!position) return

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setMapError('Google Maps API key is missing.')
      return
    }

    let cancelled = false

    const initializeMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey)
        if (cancelled || !mapContainerRef.current) return

        const googleMaps = getReportGoogleMaps()
        if (!googleMaps) return

        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapContainerRef.current, {
            center: position,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            gestureHandling: 'cooperative',
            zoomControl: true,
          })
        } else {
          mapRef.current.setCenter(position)
          mapRef.current.setZoom(14)
        }

        if (!markerRef.current) {
          markerRef.current = new googleMaps.Marker({
            map: mapRef.current,
            position,
            title: name,
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              fillColor: '#0B5FFF',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
              scale: 9,
            },
          })
        } else {
          markerRef.current.setMap(mapRef.current)
          markerRef.current.setPosition(position)
        }

        setMapError(null)
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : 'Failed to load Google Maps.')
        }
      }
    }

    void initializeMap()

    return () => {
      cancelled = true
    }
  }, [name, position])

  if (!position) {
    return (
      <Box
        sx={{
          minHeight: 220,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: 2,
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Typography color="text.secondary" variant="body2">
          Location unavailable
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={1}>
      {mapError && <Alert severity="warning">{mapError}</Alert>}
      <Box
        ref={mapContainerRef}
        sx={{
          width: '100%',
          minHeight: { xs: 220, md: 240 },
          border: '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: 2,
          backgroundColor: '#F8FAFC',
          overflow: 'hidden',
        }}
      />
    </Stack>
  )
}

export function CommunityReportPage({
  selectedNeighborhoodData,
  weights,
}: CommunityReportPageProps) {
  const [report, setReport] = useState<ApiCommunityReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preferenceItems = useMemo(
    () =>
      Object.entries(weights)
        .sort(([, a], [, b]) => b - a)
        .map(([dimension, value]) => ({
          dimension: dimension as Dimension,
          value,
        })),
    [weights],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    postCommunityReport(selectedNeighborhoodData.id, weights)
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport)
      })
      .catch((err) => {
        if (!cancelled) {
          setReport(null)
          setError(err instanceof Error ? err.message : 'Unable to load report.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedNeighborhoodData.id, weights])

  const sortedSections = useMemo(() => {
    if (!report) return []
    return [...report.sections].sort(
      (a, b) => sectionOrder.indexOf(a.type) - sectionOrder.indexOf(b.type),
    )
  }, [report])

  const dimensionScores = useMemo<Record<Dimension, number | null>>(() => {
    const reportScores = Object.fromEntries(
      (report?.dimensions ?? []).map((item) => [item.dimension, item.score_0_100]),
    ) as Partial<Record<Dimension, number | null>>

    return {
      safety: reportScores.safety ?? selectedNeighborhoodData.objective.safety,
      transit: reportScores.transit ?? selectedNeighborhoodData.objective.transit,
      convenience: reportScores.convenience ?? selectedNeighborhoodData.objective.convenience,
      parking: reportScores.parking ?? selectedNeighborhoodData.objective.parking,
      environment: reportScores.environment ?? selectedNeighborhoodData.objective.environment,
    }
  }, [report?.dimensions, selectedNeighborhoodData.objective])

  const dimensionSummaries = useMemo(() => {
    return Object.fromEntries(
      (report?.dimensions ?? []).map((item) => [item.dimension, item.summary]),
    ) as Partial<Record<Dimension, string | null>>
  }, [report?.dimensions])

  return (
    <Stack spacing={3.5}>
      <Card
        elevation={0}
        sx={{
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(241,246,255,0.96) 52%, rgba(236,248,244,0.95) 100%)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.25, md: 3.5 } }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2.5}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'flex-start' }}
            >
              <Box sx={{ maxWidth: 760 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#0B5FFF',
                    fontWeight: 800,
                    letterSpacing: 1.2,
                  }}
                >
                  Personalized community insight
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    mt: 0.35,
                    fontSize: { xs: '2rem', md: '2.75rem' },
                    lineHeight: 1.05,
                    color: '#101828',
                  }}
                >
                  {selectedNeighborhoodData.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, fontSize: '1.02rem' }}>
                  {selectedNeighborhoodData.city || 'Unknown city'}
                  {selectedNeighborhoodData.state ? `, ${selectedNeighborhoodData.state}` : ''}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, maxWidth: 480 }}
              >
                {preferenceItems.slice(0, 3).map((item) => (
                  <Chip
                    key={item.dimension}
                    label={`${dimensionLabels[item.dimension]} ${Math.round(item.value)}`}
                    sx={{
                      height: 34,
                      borderColor: dimensionStyles[item.dimension].border,
                      backgroundColor: dimensionStyles[item.dimension].soft,
                      color: dimensionStyles[item.dimension].text,
                      fontWeight: 800,
                    }}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>

      <Card
        elevation={0}
        sx={{
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 18px 48px rgba(15, 23, 42, 0.07)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={1.75}>
            <Typography variant="h6" sx={{ color: '#101828' }}>Metric Snapshot</Typography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 1.5, md: 2 }}
              alignItems="stretch"
            >
              <Box
                sx={{
                  flex: { xs: 'none', md: '0 0 50%', lg: '0 0 52%' },
                  minWidth: 0,
                  minHeight: { xs: 280, md: 340, lg: 360 },
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: 2,
                  backgroundColor: '#F8FAFC',
                  px: { xs: 1, md: 1.5 },
                  py: { xs: 1, md: 1.25 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& > *': {
                    width: '100%',
                  },
                }}
              >
                <DimensionRadarChart
                  datasets={[
                    {
                      label: selectedNeighborhoodData.name,
                      values: dimensionScores,
                      color: '#0B5FFF',
                      fill: '#0B5FFF',
                    },
                  ]}
                  size={360}
                  showLegend={false}
                />
              </Box>
              <Box
                sx={{
                  flex: { xs: 'none', md: '1 1 0' },
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 0.85,
                }}
              >
                {dimensions.map((dimension) => {
                  const style = dimensionStyles[dimension]
                  return (
                    <Box
                      key={dimension}
                      sx={{
                        border: '1px solid',
                        borderColor: style.border,
                        borderRadius: 2,
                        backgroundColor: style.soft,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <Stack spacing={0.35}>
                        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                          <Typography variant="body2" fontWeight={850} sx={{ color: style.text }}>
                            {dimensionLabels[dimension]}
                          </Typography>
                          <Typography fontWeight={850} sx={{ color: '#101828' }}>
                            {dimensionScores[dimension] == null
                              ? 'N/A'
                              : Math.round(dimensionScores[dimension] as number)}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            lineHeight: 1.55,
                            overflow: 'hidden',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 1,
                          }}
                        >
                          {dimensionSummaries[dimension]
                            ?? `${dimensionLabels[dimension]} score based on the current backend dimension model.`}
                        </Typography>
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            </Stack>
            {loading && (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1.25}
                sx={{
                  width: 'fit-content',
                  alignSelf: 'center',
                  border: '1px solid rgba(11, 95, 255, 0.16)',
                  borderRadius: 2,
                  backgroundColor: '#FFFFFF',
                  px: 1.5,
                  py: 0.8,
                }}
              >
                <CircularProgress size={20} />
                <Typography color="text.secondary" variant="body2">
                  Generating personalized report...
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {report && (
        <>
          <Card
            elevation={0}
            sx={{
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 18px 48px rgba(15, 23, 42, 0.07)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={{ xs: 2.25, lg: 3 }}
                alignItems="stretch"
              >
                <Stack spacing={2.2} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 850, color: '#101828' }}>
                    {report.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 980 }}>
                    {report.summary}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`Confidence: ${formatConfidence(report.metrics.overall_confidence)}`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 800, backgroundColor: '#F5F8FF' }}
                    />
                  </Stack>
                </Stack>
                <Box sx={{ width: { xs: '100%', lg: 420 }, flexShrink: 0 }}>
                  <CommunityLocationMap
                    lat={report.location.center_lat}
                    lng={report.location.center_lng}
                    name={report.location.name}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
            <Card
              elevation={0}
              sx={{
                flex: 1,
                width: '100%',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: '0 18px 48px rgba(15, 23, 42, 0.07)',
              }}
            >
              <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                <Stack spacing={3}>
                  {/* <Typography variant="h6" sx={{ color: '#101828' }}>Five Dimensions</Typography>
                  {report.dimensions.map((dimension) => {
                    const value = dimension.score_0_100 ?? 0
                    const style = dimensionStyles[dimension.dimension]
                    return (
                      <Box
                        key={dimension.dimension}
                        sx={{
                          p: { xs: 1.5, md: 2 },
                          border: '1px solid',
                          borderColor: style.border,
                          borderRadius: 2,
                          background: `linear-gradient(180deg, ${style.soft} 0%, rgba(255,255,255,0.94) 100%)`,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                          <Typography fontWeight={850} sx={{ color: style.text }}>
                            {dimensionLabels[dimension.dimension]}
                          </Typography>
                          <Typography fontWeight={850} sx={{ color: '#101828' }}>
                            {dimension.score_0_100 == null ? 'N/A' : Math.round(value)}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(100, value))}
                          sx={{
                            my: 1.25,
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: style.track,
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 999,
                              backgroundColor: style.solid,
                            },
                          }}
                        />
                        {dimension.summary && (
                          <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.65 }}>
                            {dimension.summary}
                          </Typography>
                        )}
                      </Box>
                    )
                  })}
                  <Divider sx={{ borderColor: 'rgba(15, 23, 42, 0.08)' }} /> */}

                  <Typography variant="h6" sx={{ color: '#101828' }}>Report Sections</Typography>
                  {sortedSections.map((section) => {
                    const sourceLikeSection = isSourceLikeSection(section.type, section.title)

                    return (
                      <Box
                        key={section.type}
                        sx={{
                          position: 'relative',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          borderRadius: 2,
                          backgroundColor: '#FFFFFF',
                          p: { xs: 1.5, md: 2 },
                          pl: { xs: 2, md: 2.5 },
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 14,
                            bottom: 14,
                            width: 4,
                            borderRadius: '0 999px 999px 0',
                            backgroundColor: sectionAccent(section.type),
                          },
                        }}
                      >
                        <Typography fontWeight={850} sx={{ color: '#101828' }}>{section.title}</Typography>
                        {section.content && (
                          <Typography color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>
                            {section.content}
                          </Typography>
                        )}
                        {section.items.length > 0 && sourceLikeSection && (
                          <Stack spacing={1} sx={{ mt: 1.25 }}>
                            {section.items.map((item) => {
                              const parsedReview = parseReviewItem(item)
                              const linkedItem = parseMarkdownLink(item)
                              const itemText = parsedReview?.body ?? linkedItem?.text ?? item
                              const itemUrl = parsedReview?.url ?? linkedItem?.url ?? null
                              const itemLinkLabel = parsedReview?.linkLabel ?? linkedItem?.label ?? 'Open source'

                              return (
                                <Stack
                                  key={item}
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={1}
                                  justifyContent="space-between"
                                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                                  sx={{
                                    border: '1px solid rgba(15, 23, 42, 0.08)',
                                    borderRadius: 2,
                                    backgroundColor: '#F8FAFC',
                                    px: 1.5,
                                    py: 1.2,
                                  }}
                                >
                                  <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                                    {parsedReview && (
                                      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                        <Chip
                                          size="small"
                                          label={parsedReview.platform}
                                          sx={{
                                            backgroundColor: '#EEF4FF',
                                            color: '#1849A9',
                                            fontWeight: 800,
                                          }}
                                        />
                                        <Typography variant="body2" fontWeight={800} sx={{ color: '#344054' }}>
                                          {parsedReview.author}
                                        </Typography>
                                      </Stack>
                                    )}
                                    <Typography
                                      color="text.secondary"
                                      sx={{
                                        lineHeight: 1.55,
                                        overflowWrap: 'anywhere',
                                      }}
                                    >
                                      {itemText}
                                    </Typography>
                                  </Stack>
                                  {itemUrl && (
                                    <Link
                                      href={itemUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      underline="none"
                                      sx={{
                                        flexShrink: 0,
                                        border: '1px solid rgba(11, 95, 255, 0.22)',
                                        borderRadius: 999,
                                        color: '#0B5FFF',
                                        fontSize: 13,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        px: 1.25,
                                        py: 0.75,
                                        backgroundColor: '#FFFFFF',
                                      }}
                                    >
                                      {itemLinkLabel}
                                    </Link>
                                  )}
                                </Stack>
                              )
                            })}
                          </Stack>
                        )}
                        {section.items.length > 0 && !sourceLikeSection && (
                          <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, my: 1.25 }}>
                            {section.items.map((item) => (
                              <Typography
                                component="li"
                                key={item}
                                color="text.secondary"
                                sx={{ lineHeight: 1.6, overflowWrap: 'anywhere' }}
                              >
                                {item}
                              </Typography>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{
                width: { xs: '100%', lg: 360 },
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: '0 18px 48px rgba(15, 23, 42, 0.07)',
                position: { lg: 'sticky' },
                top: { lg: 24 },
              }}
            >
              <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
                <Stack spacing={2}>
                  {/* <Typography variant="h6" sx={{ color: '#101828' }}>Review Sources</Typography>
                  {report.reviews.length === 0 && (
                    <Typography color="text.secondary" variant="body2">
                      No sourced review snippets are available yet.
                    </Typography>
                  )}
                  {report.reviews.map((review) => (
                    <Stack
                      key={`${review.platform}-${review.body_text}`}
                      spacing={1}
                      sx={{
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        borderRadius: 2,
                        backgroundColor: '#F8FAFC',
                        p: 1.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {review.body_text}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={review.platform ?? 'source'} />
                        {review.source_url && (
                          <Button
                            size="small"
                            href={review.source_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Source
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  ))} */}
                  {/* <Divider sx={{ borderColor: 'rgba(15, 23, 42, 0.08)' }} /> */}

                  <Typography variant="h6" sx={{ color: '#101828' }}>Agent Trace</Typography>
                  {report.agent_trace.map((step) => (
                    <Stack
                      key={`${step.step}-${step.message}`}
                      spacing={0.75}
                      sx={{
                        borderLeft: '3px solid rgba(11, 95, 255, 0.18)',
                        pl: 1.25,
                        py: 0.5,
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={step.status}
                          color={traceColor(step.status)}
                          variant={step.status === 'success' ? 'filled' : 'outlined'}
                        />
                        <Typography fontWeight={850} sx={{ color: '#101828' }}>{formatStepLabel(step.step)}</Typography>
                      </Stack>
                      <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.55 }}>
                        {step.message}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </>
      )}
    </Stack>
  )
}
