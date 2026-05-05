import { Box, Stack, Typography } from '@mui/material'
import { dimensionLabels, dimensions, dimensionStyles } from '../types'
import type { Dimension } from '../types'

type RadarDataset = {
  label: string
  values: Record<Dimension, number | null>
  color: string
  fill?: string
}

type DimensionRadarChartProps = {
  datasets: RadarDataset[]
  size?: number
  showLegend?: boolean
}

const center = 140
const maxRadius = 110

function clampScore(value: number | null): number {
  if (value == null) return 0
  return Math.max(0, Math.min(100, value))
}

function polarPoint(index: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / dimensions.length
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  }
}

function pointsToString(points: { x: number; y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
}

function datasetPoints(values: Record<Dimension, number | null>): string {
  return pointsToString(
    dimensions.map((dimension, index) =>
      polarPoint(index, (clampScore(values[dimension]) / 100) * maxRadius),
    ),
  )
}

export function DimensionRadarChart({
  datasets,
  size = 320,
  showLegend = true,
}: DimensionRadarChartProps) {
  const rings = [20, 40, 60, 80, 100]

  return (
    <Stack spacing={1.5} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: size,
          aspectRatio: '1 / 1',
          mx: 'auto',
          minHeight: { xs: 240, md: Math.min(size, 320) },
        }}
      >
        <svg
          viewBox="-48 -28 376 336"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Five-dimension radar chart"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {rings.map((ring) => (
            <polygon
              key={ring}
              points={pointsToString(
                dimensions.map((_, index) => polarPoint(index, (ring / 100) * maxRadius)),
              )}
              fill="none"
              stroke={ring === 100 ? 'rgba(15, 23, 42, 0.22)' : 'rgba(15, 23, 42, 0.08)'}
              strokeWidth={ring === 100 ? 1.5 : 1}
            />
          ))}

          {dimensions.map((dimension, index) => {
            const axisEnd = polarPoint(index, maxRadius)
            const labelPoint = polarPoint(index, maxRadius + 28)
            const textAnchor = Math.abs(labelPoint.x - center) < 8
              ? 'middle'
              : labelPoint.x > center
                ? 'start'
                : 'end'

            return (
              <g key={dimension}>
                <line
                  x1={center}
                  y1={center}
                  x2={axisEnd.x}
                  y2={axisEnd.y}
                  stroke="rgba(15, 23, 42, 0.1)"
                  strokeWidth="1"
                />
                <circle cx={axisEnd.x} cy={axisEnd.y} r="3" fill={dimensionStyles[dimension].solid} />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  fill={dimensionStyles[dimension].text}
                  fontSize="13"
                  fontWeight="800"
                >
                  {dimensionLabels[dimension]}
                </text>
              </g>
            )
          })}

          {datasets.map((dataset) => (
            <g key={dataset.label}>
              <polygon
                points={datasetPoints(dataset.values)}
                fill={dataset.fill ?? dataset.color}
                fillOpacity="0.18"
                stroke={dataset.color}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {dimensions.map((dimension, index) => {
                const point = polarPoint(
                  index,
                  (clampScore(dataset.values[dimension]) / 100) * maxRadius,
                )
                return (
                  <circle
                    key={dimension}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke={dataset.color}
                    strokeWidth="2.5"
                  />
                )
              })}
            </g>
          ))}
        </svg>
      </Box>

      {showLegend && datasets.length > 0 && (
        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" justifyContent="center">
          {datasets.map((dataset) => (
            <Stack key={dataset.label} direction="row" spacing={0.75} alignItems="center">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: dataset.color,
                }}
              />
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                {dataset.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
