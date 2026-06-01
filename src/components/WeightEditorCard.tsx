import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { dimensionLabels, dimensions, dimensionStyles } from '../types'
import type { Dimension } from '../types'

const weightsEqual = (
  first: Record<Dimension, number>,
  second: Record<Dimension, number>,
) => dimensions.every((dimension) => first[dimension] === second[dimension])

function WeightBar({
  weights,
  onChange,
  compact = false,
}: {
  weights: Record<Dimension, number>
  onChange: (next: Record<Dimension, number>) => void
  compact?: boolean
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ idx: number; startX: number; startWeights: number[] } | null>(null)
  const draftWeightsRef = useRef(weights)
  const [draftWeights, setDraftWeights] = useState(weights)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (dragRef.current) return
    draftWeightsRef.current = weights
    setDraftWeights(weights)
  }, [weights])

  const updateDraftWeights = useCallback((next: Record<Dimension, number>) => {
    draftWeightsRef.current = next
    setDraftWeights(next)
  }, [])

  const handlePointerDown = useCallback(
    (idx: number, e: PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const bar = barRef.current
      if (!bar) return
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsDragging(true)
      dragRef.current = {
        idx,
        startX: e.clientX,
        startWeights: dimensions.map((d) => draftWeightsRef.current[d]),
      }
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current
      const bar = barRef.current
      if (!drag || !bar) return

      const totalWidth = bar.getBoundingClientRect().width
      const deltaPx = e.clientX - drag.startX
      const deltaPct = Math.round((deltaPx / totalWidth) * 100)

      const left = drag.startWeights[drag.idx]
      const right = drag.startWeights[drag.idx + 1]
      const available = left + right

      const newLeft = Math.max(0, Math.min(available, left + deltaPct))
      const newRight = available - newLeft

      const next = { ...draftWeightsRef.current }
      dimensions.forEach((d, i) => {
        if (i === drag.idx) next[d] = newLeft
        else if (i === drag.idx + 1) next[d] = newRight
        else next[d] = drag.startWeights[i]
      })
      updateDraftWeights(next)
    },
    [updateDraftWeights],
  )

  const handlePointerUp = useCallback(() => {
    const next = draftWeightsRef.current
    dragRef.current = null
    setIsDragging(false)
    if (!weightsEqual(weights, next)) {
      onChange(next)
    }
  }, [onChange, weights])

  const shouldUseLegend = compact && dimensions.some((dim) => draftWeights[dim] < 8)

  return (
    <Box>
      {shouldUseLegend && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          justifyContent="flex-end"
          sx={{ mb: 0.5 }}
        >
          {dimensions.map((dim) => (
            <Stack key={dim} direction="row" spacing={0.4} alignItems="center">
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: dimensionStyles[dim].solid,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ color: dimensionStyles[dim].text, whiteSpace: 'nowrap' }}
              >
                {dimensionLabels[dim]} {draftWeights[dim]}%
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <Box
        ref={barRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        sx={{
          display: 'flex',
          height: compact ? 40 : 48,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'default',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {dimensions.map((dim, idx) => {
          const pct = draftWeights[dim]
          const canShowPercent = pct >= (compact ? 4 : 3)
          return (
            <Box
              key={dim}
              sx={{
                flex: `${pct} 1 0`,
                minWidth: compact ? 14 : 18,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: dimensionStyles[dim].solid,
                color: dimensionStyles[dim].contrastText,
                fontSize: 13,
                fontWeight: 600,
                position: 'relative',
                transition: isDragging ? 'none' : 'flex 0.15s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {canShowPercent ? `${pct}%` : ''}
              {idx < dimensions.length - 1 && (
                <Box
                  onPointerDown={(e) => handlePointerDown(idx, e)}
                  sx={{
                    position: 'absolute',
                    right: -14,
                    top: 0,
                    width: 28,
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 2,
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 12,
                      top: '20%',
                      height: '60%',
                      width: 3,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                    },
                  }}
                />
              )}
            </Box>
          )
        })}
      </Box>
      {!shouldUseLegend && (
        <Box sx={{ display: 'flex', mt: 0.5 }}>
          {dimensions.map((dim) => (
            <Box
              key={dim}
              sx={{
                flex: `${draftWeights[dim]} 1 0`,
                minWidth: compact ? 14 : 18,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: dimensionStyles[dim].text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {dimensionLabels[dim]}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

type WeightEditorCardProps = {
  title: string
  description: string
  weights: Record<Dimension, number>
  onChange: (nextWeights: Record<Dimension, number>) => void
  aiSuggestedWeights?: Record<Dimension, number> | null
  aiSuggestedLabel?: string
  compact?: boolean
  embedded?: boolean
  showHeader?: boolean
}

export function WeightEditorCard({
  title,
  description,
  weights,
  onChange,
  aiSuggestedWeights = null,
  aiSuggestedLabel = 'Started from LLM chat preferences',
  compact = false,
  embedded = false,
  showHeader = true,
}: WeightEditorCardProps) {
  const content = (
    <Stack spacing={compact ? 1.1 : 2}>
      {showHeader && (
        <Stack
          direction={compact ? { xs: 'column', sm: 'row' } : 'column'}
          spacing={compact ? { xs: 0.15, sm: 1.25 } : 0.75}
          alignItems={compact ? { xs: 'flex-start', sm: 'baseline' } : undefined}
        >
          <Typography variant="h6">
            {title}
          </Typography>
          <Typography color="text.secondary">
            {description}
          </Typography>
        </Stack>
      )}

      {!compact && (
        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
          {dimensions.map((dim) => (
            <Stack key={dim} direction="row" spacing={0.75} alignItems="center">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: dimensionStyles[dim].solid,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ whiteSpace: 'nowrap', color: dimensionStyles[dim].text }}
              >
                {dimensionLabels[dim]}
              </Typography>
            </Stack>
          ))}
          {aiSuggestedWeights && (
            <>
              <Chip label={aiSuggestedLabel} color="secondary" variant="outlined" size="small" />
              <Button size="small" variant="text" onClick={() => onChange(aiSuggestedWeights)}>
                Restore AI weights
              </Button>
            </>
          )}
        </Stack>
      )}

      {compact && aiSuggestedWeights && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip label={aiSuggestedLabel} color="secondary" variant="outlined" size="small" />
          <Button size="small" variant="text" onClick={() => onChange(aiSuggestedWeights)}>
            Restore AI weights
          </Button>
        </Stack>
      )}

      <WeightBar weights={weights} onChange={onChange} compact={compact} />
    </Stack>
  )

  if (embedded) return content

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
      }}
    >
      <CardContent
        sx={
          compact
            ? { p: { xs: 2, md: 2.25 }, '&:last-child': { pb: { xs: 2, md: 2.25 } } }
            : undefined
        }
      >
        {content}
      </CardContent>
    </Card>
  )
}
