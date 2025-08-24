import { useState } from "react";
import { Download, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePipeline } from "@/hooks/use-pipeline";
import { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface GenerateStepProps {
  document: Document | null;
}

export default function GenerateStep({ document }: GenerateStepProps) {
  const [format, setFormat] = useState("pdf");
  const { goToStep } = usePipeline();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async ({ format }: { format: string }) => {
      const response = await apiRequest("POST", `/api/documents/${document?.id}/generate`, { format });
      return response.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${document?.originalFileName?.replace('.pdf', '')}_company.${format}`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast({
        title: "Document Generated",
        description: "Your company document has been downloaded successfully.",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/documents/${document?.id}`, {
        status: "completed"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document Saved",
        description: "Your document has been saved to history.",
      });
    },
  });

  const handleGenerate = () => {
    if (document) {
      generateMutation.mutate({ format });
    }
  };

  const handleSaveToHistory = () => {
    if (document) {
      saveMutation.mutate();
    }
  };

  const handleStartOver = () => {
    goToStep(1);
  };

  if (!document) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">No Document Available</h2>
          <p className="text-sm text-gray-600">Please complete the previous steps first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Generate & Save Document</h2>
        <p className="text-sm text-gray-600 mt-1">
          Download your company-branded document and save to history
        </p>
      </div>

      <div className="space-y-6">
        {/* Document Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Document Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Original File:</span>
              <div className="text-gray-900" data-testid="text-original-filename">
                {document.originalFileName}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <div className="text-green-600 capitalize" data-testid="text-document-status">
                {document.status}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Processed:</span>
              <div className="text-gray-900" data-testid="text-processed-date">
                {document.processedAt ? new Date(document.processedAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Product:</span>
              <div className="text-gray-900" data-testid="text-product-summary">
                {(document.extractedData as any)?.product?.name || "Unknown"}
              </div>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-900">Select Output Format</Label>
          <RadioGroup value={format} onValueChange={setFormat} className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" data-testid="radio-format-pdf" />
              <Label htmlFor="pdf" className="cursor-pointer">PDF Document</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="docx" id="docx" data-testid="radio-format-docx" />
              <Label htmlFor="docx" className="cursor-pointer">Word Document (DOCX)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center justify-center"
            data-testid="button-generate-download"
          >
            <Download className="w-4 h-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : `Download ${format.toUpperCase()}`}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSaveToHistory}
            disabled={saveMutation.isPending}
            className="flex items-center justify-center"
            data-testid="button-save-history"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save to History"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleStartOver}
            className="flex items-center justify-center"
            data-testid="button-start-over"
          >
            <FileText className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Next Steps</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Download your company-branded document in your preferred format</li>
            <li>• Save the document to your history for future reference</li>
            <li>• Use the generated document for your business processes</li>
            <li>• Start a new processing workflow with another supplier document</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
