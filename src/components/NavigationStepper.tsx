import { Card, CardContent, Step, StepLabel, Stepper, alpha } from '@mui/material'

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
      <CardContent sx={{ py: 1, px: { xs: 1.25, md: 2 }, '&:last-child': { pb: 1 } }}>
        <Stepper
          activeStep={activeStep}
          sx={{
            '& .MuiStep-root': {
              px: { xs: 0.3, md: 0.8 },
            },
            '& .MuiStepConnector-line': {
              borderColor: 'rgba(0,0,0,0.18)',
              borderTopWidth: 1,
            },
            '& .MuiStepLabel-root': {
              mt: 0,
              py: 0.45,
              px: { xs: 0.7, md: 1 },
              borderRadius: 999,
              transition: 'all 0.2s ease',
            },
            '& .MuiStepLabel-root.Mui-active': {
              backgroundColor: 'rgba(11,95,255,0.12)',
              outline: '1px solid rgba(11,95,255,0.36)',
            },
            '& .MuiStepLabel-label': {
              mt: 0,
              fontSize: { xs: 13, md: 14 },
              fontWeight: 500,
              color: 'text.secondary',
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
      </CardContent>
    </Card>
  )
}
