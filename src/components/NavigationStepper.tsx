import { Card, CardContent, Step, StepLabel, Stepper } from '@mui/material'

type NavigationStepperProps = {
  activeStep: number
  steps: string[]
}

export function NavigationStepper({ activeStep, steps }: NavigationStepperProps) {
  return (
    <Card>
      <CardContent>
        <Stepper activeStep={activeStep} alternativeLabel>
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
