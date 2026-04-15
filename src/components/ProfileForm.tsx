import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputBase,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { neighborhoods } from '../data'
import {
  postChat,
  type ApiCommunityDetail,
  type ApiRecommendationItem,
  type ChatApiResponse,
  type PreferenceWeights,
} from '../api'
import type { Dimension, Neighborhood } from '../types'

type ProfileFormProps = {
  selectedNeighborhood: string
  setSelectedNeighborhood: (value: string) => void
  communityInput: string
  setCommunityInput: (value: string) => void
  mapZoom: number
  setMapZoom: (value: number) => void
  availableNeighborhoods: Neighborhood[]
  recommendationItems: ApiRecommendationItem[]
  recommendationsLoading: boolean
  onChatResponse: (response: ChatApiResponse) => Promise<void> | void
  communityDetails: Record<string, ApiCommunityDetail>
  recommendationScores: Record<string, number>
}

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

const DEFAULT_PREFERENCE_WEIGHTS: PreferenceWeights = {
  safety: 20,
  transit: 20,
  convenience: 20,
  parking: 20,
  environment: 20,
}
const PREFERENCE_DIMENSIONS: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']
const PREFERENCE_LABELS: Record<Dimension, string> = {
  safety: 'Safety',
  transit: 'Transit',
  convenience: 'Convenience',
  parking: 'Parking',
  environment: 'Environment',
}

const quickPrompts = [
  'Which neighborhoods are best for a budget under $2,000 with easy commuting?',
  'I care most about safety and quiet. Recommend your top 3.',
  'I have a car, so parking convenience is my top priority.',
]

type RgbColor = {
  r: number
  g: number
  b: number
}

const MAP_LIGHT_RED: RgbColor = { r: 248, g: 113, b: 113 }
const MAP_DARK_RED: RgbColor = { r: 153, g: 27, b: 27 }
const RECOMMENDATION_GREEN: RgbColor = { r: 16, g: 185, b: 129 }
const RECOMMENDATION_MARKER_COLORS: Record<number, RgbColor> = {
  1: RECOMMENDATION_GREEN,
  2: RECOMMENDATION_GREEN,
  3: RECOMMENDATION_GREEN,
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const interpolateColor = (start: RgbColor, end: RgbColor, progress: number): RgbColor => {
  const t = clamp(progress, 0, 1)
  return {
    r: Math.round(start.r + (end.r - start.r) * t),
    g: Math.round(start.g + (end.g - start.g) * t),
    b: Math.round(start.b + (end.b - start.b) * t),
  }
}

const darkenColor = (color: RgbColor, amount: number): RgbColor => {
  const factor = 1 - clamp(amount, 0, 1)
  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor),
  }
}

const toRgbString = ({ r, g, b }: RgbColor) => `rgb(${r}, ${g}, ${b})`

const getMapColor = (score: number, isSelected: boolean) => {
  const normalizedScore = clamp((score - 40) / 60, 0, 1)
  const baseColor = interpolateColor(MAP_LIGHT_RED, MAP_DARK_RED, normalizedScore)
  return toRgbString(isSelected ? darkenColor(baseColor, 0.08) : baseColor)
}

const getMarkerStyle = (
  score: number,
  isSelected: boolean,
  recommendationRank?: number,
) => {
  if (recommendationRank != null) {
    const baseColor = RECOMMENDATION_MARKER_COLORS[recommendationRank] ?? RECOMMENDATION_MARKER_COLORS[3]
    const fillColor = toRgbString(isSelected ? darkenColor(baseColor, 0.05) : baseColor)
    const strokeColor = toRgbString(darkenColor(baseColor, isSelected ? 0.45 : 0.35))

    return {
      fillColor,
      strokeColor,
      strokeWeight: isSelected ? 3 : 2.5,
    }
  }

  const normalizedScore = clamp((score - 40) / 60, 0, 1)
  const baseColor = interpolateColor(MAP_LIGHT_RED, MAP_DARK_RED, normalizedScore)

  return {
    fillColor: toRgbString(isSelected ? darkenColor(baseColor, 0.08) : baseColor),
    strokeColor: toRgbString(darkenColor(baseColor, isSelected ? 0.45 : 0.3)),
    strokeWeight: isSelected ? 3 : 2.25,
  }
}

const getCircleStyle = (
  score: number,
  isSelected: boolean,
  recommendationRank?: number,
) => {
  if (recommendationRank != null) {
    const baseColor = RECOMMENDATION_GREEN
    const circleColor = toRgbString(isSelected ? darkenColor(baseColor, 0.1) : baseColor)

    return {
      fillColor: circleColor,
      fillOpacity: isSelected ? 0.2 : 0.12,
      strokeColor: circleColor,
      strokeWeight: isSelected ? 2.5 : 1.5,
    }
  }

  const mapColor = getMapColor(score, isSelected)
  return {
    fillColor: mapColor,
    fillOpacity: isSelected ? 0.18 : 0.1,
    strokeColor: mapColor,
    strokeWeight: isSelected ? 2 : 1,
  }
}

const getMarkerScale = (isSelected: boolean, recommendationRank?: number) => {
  if (recommendationRank != null) return isSelected ? 14 : 12
  return isSelected ? 12 : 9.5
}

const getMarkerLabel = (recommendationRank?: number, isSelected = false) => (
  recommendationRank != null
    ? {
        text: String(recommendationRank),
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: isSelected ? '13px' : '11px',
      }
    : undefined
)

export function ProfileForm({
  selectedNeighborhood,
  setSelectedNeighborhood,
  communityInput,
  setCommunityInput,
  mapZoom,
  setMapZoom,
  availableNeighborhoods,
  recommendationItems,
  recommendationsLoading,
  onChatResponse,
  communityDetails,
  recommendationScores,
}: ProfileFormProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const circlesRef = useRef<Record<string, any>>({})
  const infoWindowRef = useRef<any>(null)
  const lastAutoFocusedRecommendationRef = useRef<string | null>(null)
  const communityDetailsRef = useRef(communityDetails)
  const recommendationScoresRef = useRef(recommendationScores)
  useEffect(() => { communityDetailsRef.current = communityDetails }, [communityDetails])
  useEffect(() => { recommendationScoresRef.current = recommendationScores }, [recommendationScores])
  const [mapError, setMapError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [localWeights, setLocalWeights] = useState<PreferenceWeights>(DEFAULT_PREFERENCE_WEIGHTS)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Share your budget, commute, and preferences, and I will recommend neighborhoods.',
    },
  ])

  const neighborhoodCoordinates = useMemo(
    () =>
      new Map<string, { lat: number; lng: number }>([
        ['University Town Center', { lat: 33.6497, lng: -117.8408 }],
        ['Northwood', { lat: 33.7088, lng: -117.7616 }],
        ['Costa Mesa Border', { lat: 33.667, lng: -117.899 }],
        ['Irvine Spectrum', { lat: 33.6505, lng: -117.7437 }],
        ['Woodbridge', { lat: 33.677, lng: -117.7929 }],
        ['Turtle Rock', { lat: 33.6381, lng: -117.8107 }],
        ['Portola Springs', { lat: 33.6974, lng: -117.7156 }],
        ['Great Park', { lat: 33.6673, lng: -117.7243 }],
        ['Quail Hill', { lat: 33.6495, lng: -117.7750 }],
        ['Oak Creek', { lat: 33.6719, lng: -117.7754 }],
        ['Woodbury', { lat: 33.6973, lng: -117.7505 }],
      ]),
    [],
  )

  const selectedPosition = neighborhoodCoordinates.get(selectedNeighborhood)
  const matchedNeighborhood = neighborhoods.find(
    (item) => item.name.toLowerCase() === communityInput.trim().toLowerCase(),
  )
  const topRecommendation = recommendationItems[0] ?? null
  const displayWeights = {
    safety: localWeights.safety ?? 20,
    transit: localWeights.transit ?? 20,
    convenience: localWeights.convenience ?? 20,
    parking: localWeights.parking ?? 20,
    environment: localWeights.environment ?? 20,
  }
  const recommendationRankByName = useMemo(
    () =>
      Object.fromEntries(
        recommendationItems.slice(0, 3).map((item) => [item.name, item.rank]),
      ) as Record<string, number>,
    [recommendationItems],
  )

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isGenerating])

  const syncSelectionFromInput = () => {
    const exactMatch = neighborhoods.find(
      (item) => item.name.toLowerCase() === communityInput.trim().toLowerCase(),
    )
    if (exactMatch) {
      setSelectedNeighborhood(exactMatch.name)
      setCommunityInput(exactMatch.name)
    }
  }

  const handleSendChat = async () => {
    const prompt = chatInput.trim()
    if (!prompt || isGenerating) return

    const userMessage: ChatMessage = { role: 'user', content: prompt }
    const updatedMessages = [...chatMessages, userMessage]
    setChatMessages(updatedMessages)
    setChatInput('')
    setIsGenerating(true)

    try {
      // Send all messages except the initial greeting (index 0)
      const history = updatedMessages.slice(1)
      console.log('[chat] sending', history)
      const response = await postChat(history)
      console.log('[chat] response', response)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response.reply }])
      setLocalWeights({
        safety: response.weights.safety ?? 20,
        transit: response.weights.transit ?? 20,
        convenience: response.weights.convenience ?? 20,
        parking: response.weights.parking ?? 20,
        environment: response.weights.environment ?? 20,
      })
      await onChatResponse(response)
    } catch (err) {
      console.error('[chat] error', err)
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError'
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isTimeout
            ? 'The request timed out — the server may be busy. Please try again.'
            : 'Sorry, I could not reach the server. Please try again.',
        },
      ])
    } finally {
      console.log('[chat] finally, setting isGenerating=false')
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setMapError(
        'Google Maps API key is missing. Add VITE_GOOGLE_MAPS_API_KEY to .env.local.',
      )
      return
    }

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return

      const googleMaps = (window as any).google?.maps
      if (!googleMaps) return

      mapRef.current = new googleMaps.Map(mapContainerRef.current, {
        center: selectedPosition ?? { lat: 33.6846, lng: -117.8265 },
        zoom: mapZoom,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy',
        zoomControl: true,
      })

      mapRef.current.addListener('zoom_changed', () => {
        const nextZoom = mapRef.current?.getZoom?.()
        if (typeof nextZoom === 'number') {
          setMapZoom(nextZoom)
        }
      })

      infoWindowRef.current = new googleMaps.InfoWindow()

      neighborhoods.forEach((neighborhood) => {
        const position = neighborhoodCoordinates.get(neighborhood.name)
        if (!position) return

        const isSelected = neighborhood.name === selectedNeighborhood
        const recommendationRank = recommendationRankByName[neighborhood.name]
        const score = recommendationScores[neighborhood.name] ?? 0
        const markerStyle = getMarkerStyle(score, isSelected, recommendationRank)
        const circleStyle = getCircleStyle(score, isSelected, recommendationRank)
        const marker = new googleMaps.Marker({
          map: mapRef.current,
          position,
          title: neighborhood.name,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            fillColor: markerStyle.fillColor,
            fillOpacity: 1,
            strokeColor: markerStyle.strokeColor,
            strokeWeight: markerStyle.strokeWeight,
            scale: getMarkerScale(isSelected, recommendationRank),
          },
          label: getMarkerLabel(recommendationRank, isSelected),
        })

        const circle = new googleMaps.Circle({
          map: mapRef.current,
          center: position,
          radius: isSelected ? 1200 : 850,
          fillColor: circleStyle.fillColor,
          fillOpacity: circleStyle.fillOpacity,
          strokeColor: circleStyle.strokeColor,
          strokeOpacity: 0.8,
          strokeWeight: circleStyle.strokeWeight,
        })

        marker.addListener('click', () => {
          setSelectedNeighborhood(neighborhood.name)
          setCommunityInput(neighborhood.name)
        })

        marker.addListener('mouseover', () => {
          const safety = neighborhood.objective.safety ?? 0
          const transit = neighborhood.objective.transit ?? 0
          const overallScore = recommendationScoresRef.current[neighborhood.name] ?? 0
          const rent = communityDetailsRef.current[neighborhood.id]?.metrics?.median_rent
          const rentLine = rent != null
            ? `<div style="font-size:12px;color:#4b5563">Median Rent: $${Math.round(rent).toLocaleString()}/mo</div>`
            : ''
          infoWindowRef.current?.setContent(
            `<div style="min-width:170px;font-family:Arial,sans-serif">
              <div style="font-weight:700;margin-bottom:6px">${neighborhood.name}</div>
              <div style="font-size:12px;color:#4b5563">Recommendation Score: ${overallScore}/100</div>
              <div style="font-size:12px;color:#4b5563">Transit: ${transit}/100</div>
              <div style="font-size:12px;color:#4b5563">Safety: ${safety}/100</div>
              ${rentLine}
            </div>`,
          )
          infoWindowRef.current?.open({ anchor: marker, map: mapRef.current })
        })

        marker.addListener('mouseout', () => {
          infoWindowRef.current?.close()
        })
        markersRef.current[neighborhood.name] = marker
        circlesRef.current[neighborhood.name] = circle
      })
    }

    const existingScript = document.getElementById('google-maps-script')
    if ((window as any).google?.maps) {
      initializeMap()
      return
    }

    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
      script.async = true
      script.defer = true
      script.onload = initializeMap
      script.onerror = () => setMapError('Failed to load Google Maps script.')
      document.head.appendChild(script)
      return
    }

    existingScript.addEventListener('load', initializeMap)
    return () => {
      existingScript.removeEventListener('load', initializeMap)
    }
  }, [
    availableNeighborhoods,
    mapZoom,
    neighborhoodCoordinates,
    recommendationRankByName,
    recommendationScores,
    selectedPosition,
    selectedNeighborhood,
    setMapZoom,
    setSelectedNeighborhood,
    setCommunityInput,
  ])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setZoom(mapZoom)
  }, [mapZoom])

  useEffect(() => {
    if (!mapRef.current || !selectedPosition) return
    mapRef.current.panTo(selectedPosition)
  }, [selectedPosition])

  // Zoom in and pan when a chat recommendation is set
  useEffect(() => {
    if (!mapRef.current || !topRecommendation?.name) return
    if (lastAutoFocusedRecommendationRef.current === topRecommendation.name) return

    const pos = neighborhoodCoordinates.get(topRecommendation.name)
    if (!pos) return

    lastAutoFocusedRecommendationRef.current = topRecommendation.name
    mapRef.current.panTo(pos)
    mapRef.current.setZoom(14)
  }, [neighborhoodCoordinates, topRecommendation?.name])

  useEffect(() => {
    const googleMaps = (window as any).google?.maps
    if (!googleMaps) return

    Object.entries(markersRef.current).forEach(([name, marker]) => {
      const isVisible =
        availableNeighborhoods.some((n) => n.name === name)
        || recommendationRankByName[name] != null
      const isSelected = name === selectedNeighborhood
      const recommendationRank = recommendationRankByName[name]
      const score = recommendationScores[name] ?? 0
      const markerStyle = getMarkerStyle(score, isSelected, recommendationRank)
      marker.setVisible(isVisible)
      marker.setIcon({
        path: googleMaps.SymbolPath.CIRCLE,
        fillColor: markerStyle.fillColor,
        fillOpacity: 1,
        strokeColor: markerStyle.strokeColor,
        strokeWeight: markerStyle.strokeWeight,
        scale: getMarkerScale(isSelected, recommendationRank),
      })
      marker.setLabel(getMarkerLabel(recommendationRank, isSelected))
    })

    Object.entries(circlesRef.current).forEach(([name, circle]) => {
      const isVisible =
        availableNeighborhoods.some((n) => n.name === name)
        || recommendationRankByName[name] != null
      const isSelected = name === selectedNeighborhood
      const recommendationRank = recommendationRankByName[name]
      const score = recommendationScores[name] ?? 0
      const circleStyle = getCircleStyle(score, isSelected, recommendationRank)
      circle.setVisible(isVisible)
      circle.setOptions({
        radius: isSelected ? 1200 : 850,
        fillColor: circleStyle.fillColor,
        fillOpacity: circleStyle.fillOpacity,
        strokeColor: circleStyle.strokeColor,
        strokeWeight: circleStyle.strokeWeight,
      })
    })
  }, [availableNeighborhoods, recommendationRankByName, recommendationScores, selectedNeighborhood])

  const recommendationSection = (
    <>
      {recommendationsLoading && recommendationItems.length === 0 && (
        <Chip
          label="Loading top recommendations..."
          color="secondary"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
        />
      )}

      {recommendationItems.length > 0 && (
        <Stack
          direction="row"
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
          sx={{ alignItems: 'stretch' }}
        >
          {recommendationItems.slice(0, 3).map((item) => {
            const isActive = selectedNeighborhood === item.name

            return (
              <Box
                key={item.community_id}
                sx={{
                  flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 10px)' },
                  minWidth: 0,
                  borderRadius: 2,
                  border: '1.5px solid',
                  borderColor: isActive ? 'secondary.main' : 'divider',
                  p: 1.5,
                  backgroundColor:
                    isActive ? 'rgba(0,157,119,0.07)' : 'rgba(11,95,255,0.04)',
                  display: 'flex',
                  flexDirection: { xs: 'row', md: 'column' },
                  alignItems: { xs: 'center', md: 'stretch' },
                  justifyContent: 'space-between',
                  gap: 1.25,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={isActive ? 'secondary.main' : 'text.primary'}
                    sx={{ mb: 0.35 }}
                  >
                    #{item.rank} {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Score {Math.round(item.score)}/100
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color={isActive ? 'secondary' : 'primary'}
                  sx={{ alignSelf: { xs: 'center', md: 'flex-start' }, flexShrink: 0 }}
                  onClick={() => {
                    setSelectedNeighborhood(item.name)
                    setCommunityInput(item.name)
                  }}
                >
                  View
                </Button>
              </Box>
            )
          })}
        </Stack>
      )}
    </>
  )

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2.5fr) minmax(320px, 1fr)' },
              alignItems: 'stretch',
            }}
          >
            <Stack spacing={2}>
              <Box
                sx={{
                  border: 'none',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: 'background.paper',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                    <Autocomplete
                      freeSolo
                      options={neighborhoods.map((n) => n.name)}
                      value={communityInput}
                      inputValue={communityInput}
                      onInputChange={(_, value) => setCommunityInput(value)}
                      onChange={(_, value) => {
                        if (typeof value !== 'string') return
                        setCommunityInput(value)
                        const exactMatch = neighborhoods.find(
                          (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
                        )
                        if (exactMatch) setSelectedNeighborhood(exactMatch.name)
                      }}
                      sx={{ flex: 1 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Type or select a neighborhood"
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            syncSelectionFromInput()
                          }}
                        />
                      )}
                    />
                    <Button variant="contained" onClick={syncSelectionFromInput}>
                      Search
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCommunityInput('')
                        setSelectedNeighborhood(neighborhoods[0].name)
                      }}
                    >
                      Clear
                    </Button>
                  </Stack>
                  {communityInput.trim() && !matchedNeighborhood && (
                    <Alert severity="info" variant="outlined">
                      Custom input captured: "{communityInput}". No exact match in the current dataset yet.
                    </Alert>
                  )}
                </Stack>
              </Box>

              <Box
                sx={{
                  borderRadius: 2,
                  border: 'none',
                  borderColor: 'divider',
                  p: 2,
                  background:
                    'linear-gradient(140deg, rgba(11,95,255,0.08), rgba(0,157,119,0.08))',
                }}
              >
                <Stack spacing={1.5}>
                  {/* <Typography fontWeight={700}>Map</Typography> */}
                  {mapError && <Alert severity="error">{mapError}</Alert>}
                  <Box
                    ref={mapContainerRef}
                    sx={{
                      width: '100%',
                      height: { xs: 320, md: 430, lg: 480 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: '#F7F9FC',
                    }}
                  />
                  <Slider
                    value={mapZoom}
                    min={10}
                    max={16}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    onChange={(_, value) => setMapZoom(value as number)}
                  />
                </Stack>
              </Box>

              {recommendationSection}

            </Stack>

            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                backgroundColor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                minHeight: { xs: 360, md: 560 },
              }}
            >
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                {quickPrompts.map((prompt) => (
                  <Chip
                    key={prompt}
                    label={prompt}
                    onClick={() => setChatInput(prompt)}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>

              <Box
                sx={{
                  flex: 1,
                  minHeight: 280,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.2,
                  backgroundColor: '#F8FAFF',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Stack spacing={1} sx={{ flex: 1 }}>
                  {chatMessages.map((message, index) => (
                    <Box
                      key={`${message.role}-${index}`}
                      sx={{
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '92%',
                        px: 1.2,
                        py: 0.9,
                        borderRadius: 1.5,
                        backgroundColor:
                          message.role === 'user' ? 'rgba(11,95,255,0.12)' : 'white',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2">{message.content}</Typography>
                    </Box>
                  ))}
                  {isGenerating && <Chip label="Thinking..." color="secondary" size="small" />}
                  <div ref={chatEndRef} />
                </Stack>
              </Box>

              <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                {(() => {
                  const covered = PREFERENCE_DIMENSIONS.filter((key) => Math.abs(displayWeights[key] - 20) > 5)
                  const hasPreference = covered.length > 0

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                        {PREFERENCE_DIMENSIONS.map((key) => {
                          const value = displayWeights[key]
                          const active = Math.abs(value - 20) > 5
                          return (
                            <Chip
                              key={key}
                              label={`${PREFERENCE_LABELS[key]} ${Math.round(value)}%`}
                              size="small"
                              color={active ? 'primary' : 'default'}
                              variant={active ? 'filled' : 'outlined'}
                            />
                          )
                        })}
                      </Stack>
                      <Typography variant="caption" color={hasPreference ? 'success.main' : 'text.secondary'}>
                        {hasPreference
                          ? `✓ ${covered.length}/5 preferences set — recommendations are updating automatically`
                          : '0/5 preferences set — current defaults are evenly balanced'}
                      </Typography>
                    </Box>
                  )
                })()}

                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '28px',
                    px: 2,
                    py: 1.5,
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)',
                    boxShadow: '0 14px 28px rgba(15, 23, 42, 0.06)',
                  }}
                >
                  <InputBase
                    multiline
                    minRows={3}
                    maxRows={8}
                    fullWidth
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        handleSendChat()
                      }
                    }}
                    placeholder="Ask the assistant..."
                    sx={{
                      width: '100%',
                      alignItems: 'flex-start',
                      fontSize: '1.05rem',
                      lineHeight: 1.6,
                      color: 'text.primary',
                      '& textarea': {
                        resize: 'none !important',
                      },
                    }}
                  />

                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      mt: 1.25,
                      pt: 1.1,
                      borderTop: '1px solid',
                      borderColor: 'rgba(152, 162, 179, 0.22)',
                    }}
                  >
                    <Button
                      variant="text"
                      onClick={() => {
                        setChatMessages([
                          {
                            role: 'assistant',
                            content:
                              'Share your budget, commute, and preferences, and I will recommend neighborhoods.',
                          },
                        ])
                        setChatInput('')
                        setLocalWeights(DEFAULT_PREFERENCE_WEIGHTS)
                        onChatResponse({ reply: '', weights: { safety: null, transit: null, convenience: null, parking: null, environment: null }, ready_to_recommend: false })
                      }}
                      sx={{
                        minWidth: 0,
                        px: 1,
                        color: 'text.secondary',
                        borderRadius: 999,
                      }}
                    >
                      New Chat
                    </Button>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Enter to send
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || isGenerating || recommendationsLoading}
                        sx={{
                          minWidth: 48,
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          p: 0,
                          fontSize: '1.2rem',
                          boxShadow: '0 10px 22px rgba(11, 95, 255, 0.28)',
                        }}
                      >
                        ↑
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
