import React from 'react';

interface Step {
  label: string;
  number: number;
}

interface StepProgressBarProps {
  steps: Step[];
  currentStep: number;
}

const StepProgressBar: React.FC<StepProgressBarProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex flex-col w-full mb-6">
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step, idx) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold
                  ${currentStep === step.number
                    ? 'bg-blue-600 text-white shadow-lg'
                    : currentStep > step.number
                    ? 'bg-blue-100 text-blue-600 border border-blue-300'
                    : 'bg-gray-200 text-gray-500'}
                `}
              >
                {step.number}
              </div>
              <div className={`mt-2 text-sm font-medium ${currentStep === step.number ? 'text-blue-700' : 'text-gray-700'}`}>{step.label}</div>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-1 bg-gray-200 mx-2 w-12 rounded">
                <div
                  className={`h-1 rounded ${currentStep > step.number ? 'bg-blue-500' : ''}`}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepProgressBar; 