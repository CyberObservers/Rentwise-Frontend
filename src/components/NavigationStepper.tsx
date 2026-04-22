import { Box, Card, CardContent, Step, StepLabel, Stepper, alpha } from '@mui/material'

type NavigationStepperProps = {
  activeStep: number
  steps: string[]
}

export function NavigationStepper({ activeStep, steps }: NavigationStepperProps) {
  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        position: 'sticky',
        top: { xs: 8, md: 12 },
        zIndex: theme.zIndex.appBar - 1,
        border: `1px solid ${alpha(theme.palette.common.black, 0.12)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(8px)',
      })}
    >
      <CardContent sx={{ py: { xs: 0.75, md: 1 }, px: { xs: 1, md: 2 }, '&:last-child': { pb: { xs: 0.75, md: 1 } } }}>
        <Box
          sx={{
            overflowX: { xs: 'auto', md: 'visible' },
            overflowY: 'hidden',
            mx: { xs: -0.25, md: 0 },
            px: { xs: 0.25, md: 0 },
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Stepper
            activeStep={activeStep}
            sx={{
              minWidth: { xs: 'max-content', md: 'auto' },
              '& .MuiStep-root': {
                px: { xs: 0.15, md: 0.8 },
                flexShrink: 0,
              },
              '& .MuiStepConnector-root': {
                mx: { xs: 0.15, md: 0.45 },
              },
              '& .MuiStepConnector-line': {
                borderColor: 'rgba(0,0,0,0.18)',
                borderTopWidth: 1,
              },
              '& .MuiStepLabel-root': {
                mt: 0,
                py: { xs: 0.35, md: 0.45 },
                px: { xs: 0.5, md: 1 },
                borderRadius: 999,
                transition: 'all 0.2s ease',
              },
              '& .MuiStepLabel-root.Mui-active': {
                backgroundColor: 'rgba(11,95,255,0.12)',
                outline: '1px solid rgba(11,95,255,0.36)',
              },
              '& .MuiStepLabel-label': {
                mt: 0,
                fontSize: { xs: 12, md: 14 },
                fontWeight: 500,
                color: 'text.secondary',
                whiteSpace: 'nowrap',
              },
              '& .MuiStepLabel-label.Mui-active': {
                color: 'primary.main',
                fontWeight: 800,
              },
              '& .MuiStepLabel-label.Mui-completed': {
                color: 'text.primary',
                fontWeight: 600,
              },
              '& .MuiStepIcon-root': {
                color: 'rgba(0,0,0,0.28)',
                fontSize: { xs: '1.8rem', md: '2rem' },
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: 'primary.main',
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: 'secondary.main',
              },
              '& .MuiStepIcon-text': {
                fill: '#fff',
                fontSize: '0.72rem',
                fontWeight: 700,
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </CardContent>
    </Card>
  )
}
