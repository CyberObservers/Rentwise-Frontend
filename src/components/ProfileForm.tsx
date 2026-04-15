import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { neighborhoods } from '../data'
import { postChat, type ApiCommunityDetail, type ChatApiResponse, type PreferenceWeights } from '../api'
import type { Dimension, Neighborhood } from '../types'

type ProfileFormProps = {
  selectedNeighborhood: string
  setSelectedNeighborhood: (value: string) => void
  communityInput: string
  setCommunityInput: (value: string) => void
  mapZoom: number
  setMapZoom: (value: number) => void
  availableNeighborhoods: Neighborhood[]
  recommendedNeighborhoodNames: string[]
  onGenerateRecommendation: () => void
  onChatResponse: (response: ChatApiResponse) => void
  communityDetails: Record<string, ApiCommunityDetail>
  chatRecommendation: { name: string; score: number } | null
  recommendationScores: Record<string, number>
}

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
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

const MAP_LIGHT_RED: RgbColor = { r: 252, g: 211, b: 211 }
const MAP_DARK_RED: RgbColor = { r: 185, g: 28, b: 28 }

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
  return toRgbString(isSelected ? darkenColor(baseColor, 0.14) : baseColor)
}

export function ProfileForm({
  selectedNeighborhood,
  setSelectedNeighborhood,
  communityInput,
  setCommunityInput,
  mapZoom,
  setMapZoom,
  availableNeighborhoods,
  recommendedNeighborhoodNames,
  onGenerateRecommendation,
  onChatResponse,
  communityDetails,
  chatRecommendation,
  recommendationScores,
}: ProfileFormProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const circlesRef = useRef<Record<string, any>>({})
  const infoWindowRef = useRef<any>(null)
  const communityDetailsRef = useRef(communityDetails)
  const recommendationScoresRef = useRef(recommendationScores)
  useEffect(() => { communityDetailsRef.current = communityDetails }, [communityDetails])
  useEffect(() => { recommendationScoresRef.current = recommendationScores }, [recommendationScores])
  const [mapError, setMapError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [localWeights, setLocalWeights] = useState<PreferenceWeights | null>(null)
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
  const displayedNeighborhoods = useMemo(() => {
    if (recommendedNeighborhoodNames.length === 0) return availableNeighborhoods
    const recommendedSet = new Set(recommendedNeighborhoodNames)
    return neighborhoods.filter((item) => recommendedSet.has(item.name))
  }, [availableNeighborhoods, recommendedNeighborhoodNames])

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
      setLocalWeights(response.weights)
      onChatResponse(response)
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
        gestureHandling: 'cooperative',
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
        const score = recommendationScores[neighborhood.name] ?? 0
        const mapColor = getMapColor(score, isSelected)
        const marker = new googleMaps.Marker({
          map: mapRef.current,
          position,
          title: neighborhood.name,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            fillColor: mapColor,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: isSelected ? 11 : 8,
          },
        })

        const circle = new googleMaps.Circle({
          map: mapRef.current,
          center: position,
          radius: isSelected ? 1200 : 850,
          fillColor: mapColor,
          fillOpacity: isSelected ? 0.18 : 0.1,
          strokeColor: mapColor,
          strokeOpacity: 0.8,
          strokeWeight: isSelected ? 2 : 1,
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
    selectedPosition,
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
    if (!mapRef.current || !chatRecommendation) return
    const pos = neighborhoodCoordinates.get(chatRecommendation.name)
    if (!pos) return
    mapRef.current.panTo(pos)
    mapRef.current.setZoom(14)
  }, [chatRecommendation, neighborhoodCoordinates])

  useEffect(() => {
    const googleMaps = (window as any).google?.maps
    if (!googleMaps) return

    Object.entries(markersRef.current).forEach(([name, marker]) => {
      const isVisible = availableNeighborhoods.some((n) => n.name === name)
      const isSelected = name === selectedNeighborhood
      const score = recommendationScores[name] ?? 0
      const mapColor = getMapColor(score, isSelected)
      marker.setVisible(isVisible)
      marker.setIcon({
        path: googleMaps.SymbolPath.CIRCLE,
        fillColor: mapColor,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: isSelected ? 11 : 8,
      })
    })

    Object.entries(circlesRef.current).forEach(([name, circle]) => {
      const isVisible = availableNeighborhoods.some((n) => n.name === name)
      const isSelected = name === selectedNeighborhood
      const score = recommendationScores[name] ?? 0
      const mapColor = getMapColor(score, isSelected)
      circle.setVisible(isVisible)
      circle.setOptions({
        radius: isSelected ? 1200 : 850,
        fillColor: mapColor,
        fillOpacity: isSelected ? 0.18 : 0.1,
        strokeColor: mapColor,
        strokeWeight: isSelected ? 2 : 1,
      })
    })
  }, [availableNeighborhoods, recommendationScores, selectedNeighborhood])

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
                  <Typography color="text.secondary" variant="body2">
                    Use two fingers to move or zoom the map, or click a marker to switch neighborhoods.
                  </Typography>
                  <Slider
                    value={mapZoom}
                    min={10}
                    max={16}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    onChange={(_, value) => setMapZoom(value as number)}
                  />
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {displayedNeighborhoods.map((n) => (
                      <Chip
                        key={n.id}
                        label={n.name}
                        color={selectedNeighborhood === n.name ? 'primary' : 'default'}
                        onClick={() => {
                          setSelectedNeighborhood(n.name)
                          setCommunityInput(n.name)
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </Box>

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
                gap: 1.5,
                minHeight: { xs: 360, md: 560 },
              }}
            >
              <Typography variant="h6">LLM Chat</Typography>

              {/* Preference progress */}
              {(() => {
                if (!localWeights) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      Tell the assistant what matters to you — safety, commute, parking, quiet, or convenience. After a few messages the <strong>Apply</strong> button will unlock.
                    </Typography>
                  )
                }
                const dimKeys: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']
                const dimLabels: Record<Dimension, string> = { safety: 'Safety', transit: 'Transit', convenience: 'Convenience', parking: 'Parking', environment: 'Environment' }
                const covered = dimKeys.filter((k) => {
                  const v = localWeights[k]
                  return v !== null && Math.abs(v - 20) > 5
                })
                const hasPreference = covered.length > 0
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                      {dimKeys.map((k) => {
                        const v = localWeights[k]
                        const active = v !== null && Math.abs(v - 20) > 5
                        return (
                          <Chip
                            key={k}
                            label={`${dimLabels[k]} ${v !== null ? Math.round(v) + '%' : '—'}`}
                            size="small"
                            color={active ? 'primary' : 'default'}
                            variant={active ? 'filled' : 'outlined'}
                          />
                        )
                      })}
                    </Stack>
                    <Typography variant="caption" color={hasPreference ? 'success.main' : 'text.secondary'}>
                      {hasPreference
                        ? `✓ ${covered.length}/5 preferences set — Apply is ready`
                        : `0/5 preferences set — share what matters to you`}
                    </Typography>
                  </Box>
                )
              })()}

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
                  height: 280,
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

              {chatRecommendation && (
                <Box
                  sx={{
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: 'secondary.main',
                    p: 1.5,
                    backgroundColor: 'rgba(0,157,119,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="secondary.main">
                      Best match: {chatRecommendation.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Score {chatRecommendation.score}/100 based on your preferences · Map updated
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      setSelectedNeighborhood(chatRecommendation.name)
                      setCommunityInput(chatRecommendation.name)
                    }}
                  >
                    View
                  </Button>
                </Box>
              )}

              <TextField
                multiline
                minRows={2}
                label="Ask the assistant"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSendChat()
                  }
                }}
                placeholder="e.g. I commute 5 days/week and prefer safe, quiet neighborhoods."
              />

              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setChatMessages([
                      {
                        role: 'assistant',
                        content:
                          'Share your budget, commute, and preferences, and I will recommend neighborhoods.',
                      },
                    ])
                    setChatInput('')
                    setLocalWeights(null)
                    onChatResponse({ reply: '', weights: { safety: null, transit: null, convenience: null, parking: null, environment: null }, ready_to_recommend: false })
                  }}
                >
                  New Chat
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isGenerating}
                >
                  Send
                </Button>
              </Stack>

              {(() => {
                const dimKeys: Dimension[] = ['safety', 'transit', 'convenience', 'parking', 'environment']
                const hasPreference = localWeights !== null && dimKeys.some((k) => {
                  const v = localWeights[k]
                  return v !== null && Math.abs(v - 20) > 5
                })
                return (
                  <Box>
                    {!hasPreference && (
                      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mb={0.5}>
                        {!localWeights ? 'Chat with the assistant to unlock' : 'Tell us more about your preferences to unlock'}
                      </Typography>
                    )}
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      onClick={onGenerateRecommendation}
                      disabled={!hasPreference}
                      sx={hasPreference ? {
                        animation: 'pulse 1.5s ease-in-out 3',
                        '@keyframes pulse': {
                          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,157,119,0.5)' },
                          '50%': { boxShadow: '0 0 0 8px rgba(0,157,119,0)' },
                        },
                      } : {}}
                    >
                      Apply Prompt To Recommendations
                    </Button>
                  </Box>
                )
              })()}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
