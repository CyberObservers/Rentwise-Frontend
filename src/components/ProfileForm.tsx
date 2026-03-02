import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Slider,
  Stack,
  TextField,
  Switch,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Neighborhood } from '../types'

type ProfileFormProps = {
  selectedNeighborhood: string
  setSelectedNeighborhood: (value: string) => void
  communityInput: string
  setCommunityInput: (value: string) => void
  modelPrompt: string
  setModelPrompt: (value: string) => void
  mapZoom: number
  setMapZoom: (value: number) => void
  availableNeighborhoods: Neighborhood[]
  recommendedNeighborhoodNames: string[]
  onApplyCommunityInput: () => void
  onGenerateRecommendation: () => void
}

export function ProfileForm({
  selectedNeighborhood,
  setSelectedNeighborhood,
  communityInput,
  setCommunityInput,
  modelPrompt,
  setModelPrompt,
  mapZoom,
  setMapZoom,
  availableNeighborhoods,
  recommendedNeighborhoodNames,
  onApplyCommunityInput,
  onGenerateRecommendation,
}: ProfileFormProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const [mapError, setMapError] = useState<string | null>(null)

  const neighborhoodCoordinates = useMemo(
    () =>
      new Map<string, { lat: number; lng: number }>([
        ['University Town Center', { lat: 33.6497, lng: -117.8408 }],
        ['Northwood', { lat: 33.7088, lng: -117.7616 }],
        ['Costa Mesa Border', { lat: 33.667, lng: -117.899 }],
        ['Irvine Spectrum', { lat: 33.6505, lng: -117.7437 }],
        ['Woodbridge', { lat: 33.677, lng: -117.7929 }],
      ]),
    [],
  )

  const selectedPosition = neighborhoodCoordinates.get(selectedNeighborhood)

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
      })

      mapRef.current.addListener('zoom_changed', () => {
        const nextZoom = mapRef.current?.getZoom?.()
        if (typeof nextZoom === 'number') {
          setMapZoom(nextZoom)
        }
      })

      availableNeighborhoods.forEach((neighborhood) => {
        const position = neighborhoodCoordinates.get(neighborhood.name)
        if (!position) return

        const marker = new googleMaps.Marker({
          map: mapRef.current,
          position,
          title: neighborhood.name,
        })

        marker.addListener('click', () => setSelectedNeighborhood(neighborhood.name))
        markersRef.current[neighborhood.name] = marker
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
  ])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setZoom(mapZoom)
  }, [mapZoom])

  useEffect(() => {
    if (!mapRef.current || !selectedPosition) return
    mapRef.current.panTo(selectedPosition)
  }, [selectedPosition])

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([name, marker]) => {
      marker.setVisible(availableNeighborhoods.some((n) => n.name === name))
      marker.setLabel(name === selectedNeighborhood ? 'Selected' : null)
    })
  }, [availableNeighborhoods, selectedNeighborhood])

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Step 1: Map exploration and neighborhood input</Typography>

          <Alert severity="info" variant="outlined">
            Select a neighborhood on the map, type a neighborhood name, or use AI prompt-based recommendation.
          </Alert>

          <Box
            sx={{
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
              p: 2,
              background:
                'linear-gradient(140deg, rgba(11,95,255,0.08), rgba(0,157,119,0.08))',
            }}
          >
            <Stack spacing={2}>
              <Typography fontWeight={600}>Google Map</Typography>
              {mapError && <Alert severity="error">{mapError}</Alert>}
              <Box
                ref={mapContainerRef}
                sx={{
                  width: '100%',
                  height: { xs: 280, md: 360 },
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Typography color="text.secondary" variant="body2">
                Map zoom controls visible neighborhoods in this prototype. Click a marker to select a neighborhood.
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
                {availableNeighborhoods.map((n) => (
                  <Chip
                    key={n.id}
                    label={n.name}
                    color={selectedNeighborhood === n.name ? 'primary' : 'default'}
                    onClick={() => setSelectedNeighborhood(n.name)}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Neighborhood name"
              value={communityInput}
              onChange={(event) => setCommunityInput(event.target.value)}
              placeholder="e.g. Woodbridge"
            />
            <Button variant="outlined" onClick={onApplyCommunityInput}>
              Apply neighborhood
            </Button>
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Prompt for LLM recommendation"
            value={modelPrompt}
            onChange={(event) => setModelPrompt(event.target.value)}
            placeholder="e.g. I commute 5 days/week and prefer safe, quiet neighborhoods with strong transit."
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Enable model-based neighborhood recommendation</Typography>
            <Switch defaultChecked />
          </Stack>

          <Button variant="contained" onClick={onGenerateRecommendation}>
            Generate recommendations (prototype rules)
          </Button>

          {recommendedNeighborhoodNames.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Recommended neighborhoods (replace with real LLM output later):
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {recommendedNeighborhoodNames.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    variant={selectedNeighborhood === name ? 'filled' : 'outlined'}
                    color={selectedNeighborhood === name ? 'primary' : 'default'}
                    onClick={() => setSelectedNeighborhood(name)}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
