import {
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'

type HeaderProps = {
  topDriver: string
}

export function Header({ topDriver }: HeaderProps) {
  const theme = useTheme()
  
  return (
    <Card
      elevation={0}
      sx={{
        overflow: 'hidden',
        background: `linear-gradient(130deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(
          theme.palette.secondary.main,
          0.13,
        )})`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h4">RentWise Prototype</Typography>
          <Typography color="text.secondary">
            Explainable neighborhood comparison combining objective API metrics with
            AI-generated Reddit perception summaries.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              label={`Top weight: ${topDriver}`}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
            <Chip label="Prototype focus: explainability" variant="outlined" />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
