import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: "Upload Document" },
  { id: 2, name: "Process & Extract" },
  { id: 3, name: "Select Sections" },
  { id: 4, name: "Review & Edit" },
  { id: 5, name: "Generate & Save" },
];

export default function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    step.id < currentStep
                      ? "bg-success text-white"
                      : step.id === currentStep
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-500"
                  )}
                  data-testid={`step-indicator-${step.id}`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    step.id < currentStep
                      ? "text-gray-900"
                      : step.id === currentStep
                      ? "text-primary"
                      : "text-gray-500"
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-0.5 ml-8",
                    step.id < currentStep ? "bg-success" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
