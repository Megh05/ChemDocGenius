import { useEffect, useState } from "react";
import { Loader2, CheckCircle, AlertCircle, FileText, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePipeline } from "@/hooks/use-pipeline";
import { Document } from "@shared/schema";

interface ProcessingStepProps {
  document: Document | null;
}

export default function ProcessingStep({ document }: ProcessingStepProps) {
  const { setCurrentDocument, goToStep } = usePipeline();
  const [currentProcessingStep, setCurrentProcessingStep] = useState(0);
  const [processingSteps, setProcessingSteps] = useState([
    { id: 1, name: "Uploading Document", icon: FileText, completed: false, active: false },
    { id: 2, name: "Extracting Text (OCR)", icon: FileText, completed: false, active: false },
    { id: 3, name: "AI Analysis", icon: Brain, completed: false, active: false },
    { id: 4, name: "Generating Structure", icon: Sparkles, completed: false, active: false },
  ]);

  const processMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/process`);
      return response.json();
    },
    onSuccess: (processedDocument) => {
      setCurrentDocument(processedDocument);
      // Complete all steps before transitioning
      setProcessingSteps(prev => prev.map(step => ({ ...step, completed: true, active: false })));
      setTimeout(() => goToStep(3), 1000);
    },
  });

  useEffect(() => {
    if (document && document.status === "uploaded" && !processMutation.isPending) {
      // Start processing with step animations
      setCurrentProcessingStep(0);
      setProcessingSteps(prev => prev.map((step, index) => ({ 
        ...step, 
        completed: false, 
        active: index === 0 
      })));
      
      // Animate through processing steps
      const stepInterval = setInterval(() => {
        setCurrentProcessingStep(prev => {
          const next = prev + 1;
          if (next >= processingSteps.length) {
            clearInterval(stepInterval);
            return prev;
          }
          
          setProcessingSteps(steps => steps.map((step, index) => ({
            ...step,
            completed: index < next,
            active: index === next
          })));
          
          return next;
        });
      }, 1500);
      
      // Start actual processing
      setTimeout(() => {
        processMutation.mutate(document.id);
      }, 500);
      
      return () => clearInterval(stepInterval);
    }
  }, [document?.id]);

  if (!document) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">No Document Found</h2>
          <p className="text-sm text-gray-600">Please upload a document first.</p>
        </div>
      </div>
    );
  }

  const isProcessing = processMutation.isPending || document.status === "processing";
  const isCompleted = document.status === "processed";
  const hasError = processMutation.isError || document.status === "error";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Processing Document</h2>
        <p className="text-sm text-gray-600 mt-1">
          Using Mistral AI to extract and structure document information
        </p>
      </div>

      <div className="space-y-6">
        {/* Document Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Processing File:</h3>
          <p className="text-sm text-gray-700" data-testid="text-filename">
            {document.originalFileName}
          </p>
        </div>

        {/* Enhanced Processing Status */}
        <div className="space-y-6">
          {isProcessing && (
            <div className="space-y-4">
              {/* Step-by-step Progress */}
              <div className="space-y-3">
                {processingSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div 
                      key={step.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-500 ${
                        step.completed 
                          ? 'bg-green-50 border border-green-200' 
                          : step.active 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-green-500' 
                          : step.active 
                          ? 'bg-blue-500' 
                          : 'bg-gray-300'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : step.active ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${
                          step.completed 
                            ? 'text-green-900' 
                            : step.active 
                            ? 'text-blue-900' 
                            : 'text-gray-600'
                        }`}>
                          {step.name}
                        </span>
                        {step.active && (
                          <div className="text-xs text-blue-600 mt-1">Processing...</div>
                        )}
                        {step.completed && (
                          <div className="text-xs text-green-600 mt-1">✓ Complete</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="text-gray-900 font-medium">
                    {Math.round(((currentProcessingStep + 1) / processingSteps.length) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={((currentProcessingStep + 1) / processingSteps.length) * 100} 
                  className="h-3" 
                  data-testid="progress-processing" 
                />
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Using Mistral AI to intelligently extract and structure your document data
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Processing completed successfully
                </span>
              </div>
              <Progress value={100} className="h-2" data-testid="progress-complete" />
            </div>
          )}

          {hasError && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  Processing failed
                </span>
              </div>
              <p className="text-sm text-red-700" data-testid="text-processing-error">
                {processMutation.error?.message || "Failed to process document. Please try again."}
              </p>
            </div>
          )}
        </div>

        {/* Processing Steps */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Processing Steps:</h3>
          <div className="space-y-2 text-xs text-blue-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Extract text from PDF using OCR</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Analyze content with Mistral AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Generate structured data</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Prepare for review</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => goToStep(1)}
            data-testid="button-back-to-upload"
          >
            Upload Different File
          </Button>
          
          {isCompleted && (
            <Button
              onClick={() => goToStep(3)}
              data-testid="button-continue-to-review"
            >
              Continue to Review
            </Button>
          )}
          
          {hasError && (
            <Button
              onClick={() => processMutation.mutate(document.id)}
              disabled={processMutation.isPending}
              data-testid="button-retry-processing"
            >
              Retry Processing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
