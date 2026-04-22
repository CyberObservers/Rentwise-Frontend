import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useRef, useState } from 'react'
import { dimensionLabels, dimensions, dimensionStyles } from '../types'
import type { Dimension } from '../types'

function WeightBar({
  weights,
  onChange,
}: {
  weights: Record<Dimension, number>
  onChange: (next: Record<Dimension, number>) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ idx: number; startX: number; startWeights: number[] } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = useCallback(
    (idx: number, e: React.PointerEvent) => {
      e.preventDefault()
      const bar = barRef.current
      if (!bar) return
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsDragging(true)
      dragRef.current = {
        idx,
        startX: e.clientX,
        startWeights: dimensions.map((d) => weights[d]),
      }
    },
    [weights],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      const bar = barRef.current
      if (!drag || !bar) return

      const totalWidth = bar.getBoundingClientRect().width
      const deltaPx = e.clientX - drag.startX
      const deltaPct = Math.round((deltaPx / totalWidth) * 100)

      const left = drag.startWeights[drag.idx]
      const right = drag.startWeights[drag.idx + 1]
      const available = left + right

      const newLeft = Math.max(1, Math.min(available - 1, left + deltaPct))
      const newRight = available - newLeft

      const next = { ...weights }
      dimensions.forEach((d, i) => {
        if (i === drag.idx) next[d] = newLeft
        else if (i === drag.idx + 1) next[d] = newRight
        else next[d] = drag.startWeights[i]
      })
      onChange(next)
    },
    [weights, onChange],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  return (
    <Box>
      <Box
        ref={barRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        sx={{
          display: 'flex',
          height: 48,
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
          const pct = weights[dim]
          return (
            <Box
              key={dim}
              sx={{
                width: `${pct}%`,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: dimensionStyles[dim].solid,
                color: dimensionStyles[dim].contrastText,
                fontSize: 13,
                fontWeight: 600,
                position: 'relative',
                transition: isDragging ? 'none' : 'width 0.15s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {`${pct}%`}
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
      <Box sx={{ display: 'flex', mt: 0.5 }}>
        {dimensions.map((dim) => (
          <Box
            key={dim}
            sx={{
              width: `${weights[dim]}%`,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: dimensionStyles[dim].text,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {weights[dim] >= 8 ? dimensionLabels[dim] : ''}
          </Box>
        ))}
      </Box>
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
}

export function WeightEditorCard({
  title,
  description,
  weights,
  onChange,
  aiSuggestedWeights = null,
  aiSuggestedLabel = 'Started from LLM chat preferences',
}: WeightEditorCardProps) {
  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h6">{title}</Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Stack>

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

          <WeightBar weights={weights} onChange={onChange} />
        </Stack>
      </CardContent>
    </Card>
  )
}
