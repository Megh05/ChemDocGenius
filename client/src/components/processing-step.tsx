import { useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
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

  const processMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/process`);
      return response.json();
    },
    onSuccess: (processedDocument) => {
      setCurrentDocument(processedDocument);
      goToStep(3);
    },
  });

  useEffect(() => {
    if (document && document.status === "uploaded") {
      processMutation.mutate(document.id);
    }
  }, [document]);

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

        {/* Processing Status */}
        <div className="space-y-4">
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-gray-900">
                  Extracting text and data...
                </span>
              </div>
              <Progress value={65} className="h-2" data-testid="progress-processing" />
              <p className="text-xs text-gray-500">
                This may take a few moments depending on document size
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
