import { useState, useEffect } from "react";
import { RotateCcw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePipeline } from "@/hooks/use-pipeline";
import { Document, ExtractedData, Hazard } from "@shared/schema";
import LivePreview from "@/components/live-preview";

interface ReviewStepProps {
  document: Document | null;
}

export default function ReviewStep({ document }: ReviewStepProps) {
  const { setCurrentDocument, goToStep } = usePipeline();
  const [formData, setFormData] = useState<ExtractedData | null>(null);

  useEffect(() => {
    if (document?.extractedData) {
      setFormData(document.extractedData as ExtractedData);
    }
  }, [document]);

  const updateMutation = useMutation({
    mutationFn: async (data: { extractedData: ExtractedData }) => {
      const response = await apiRequest("PATCH", `/api/documents/${document?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedDocument) => {
      setCurrentDocument(updatedDocument);
    },
  });

  const handleInputChange = (section: string, field: string, value: string) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof ExtractedData],
        [field]: value
      }
    }));
  };

  const handleHazardChange = (index: number, field: keyof Hazard, value: string) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      hazards: prev!.hazards.map((hazard, i) => 
        i === index ? { ...hazard, [field]: value } : hazard
      )
    }));
  };

  const addHazard = () => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      hazards: [...prev!.hazards, { category: "", signal: "" }]
    }));
  };

  const removeHazard = (index: number) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      hazards: prev!.hazards.filter((_, i) => i !== index)
    }));
  };

  const handleSaveAndContinue = () => {
    if (formData && document) {
      updateMutation.mutate({ extractedData: formData });
      goToStep(4);
    }
  };

  if (!document || !formData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">No Data Available</h2>
          <p className="text-sm text-gray-600">Please process a document first.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review & Edit Extracted Data</h2>
            <p className="text-sm text-gray-600 mt-1">
              Verify the extracted information and make any necessary adjustments
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={() => goToStep(2)}
              data-testid="button-regenerate"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button 
              onClick={handleSaveAndContinue}
              disabled={updateMutation.isPending}
              data-testid="button-continue-to-generate"
            >
              {updateMutation.isPending ? "Saving..." : "Continue to Step 4"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-200 min-h-[600px]">
        {/* Left Panel: Editable Form */}
        <div className="p-6 space-y-6">
          <h3 className="text-base font-semibold text-gray-900">Extracted Data</h3>

          {/* Document Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
              Document Information
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Input
                  id="document-type"
                  value={formData.document.type}
                  onChange={(e) => handleInputChange("document", "type", e.target.value)}
                  data-testid="input-document-type"
                />
              </div>
              <div>
                <Label htmlFor="document-id">Document ID</Label>
                <Input
                  id="document-id"
                  value={formData.document.id}
                  onChange={(e) => handleInputChange("document", "id", e.target.value)}
                  data-testid="input-document-id"
                />
              </div>
              <div>
                <Label htmlFor="issue-date">Issue Date</Label>
                <Input
                  id="issue-date"
                  type="date"
                  value={formData.document.issueDate}
                  onChange={(e) => handleInputChange("document", "issueDate", e.target.value)}
                  data-testid="input-issue-date"
                />
              </div>
              <div>
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  value={formData.document.revision}
                  onChange={(e) => handleInputChange("document", "revision", e.target.value)}
                  data-testid="input-revision"
                />
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
              Product Information
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={formData.product.name}
                  onChange={(e) => handleInputChange("product", "name", e.target.value)}
                  data-testid="input-product-name"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cas-number">CAS Number</Label>
                  <Input
                    id="cas-number"
                    value={formData.product.casNumber}
                    onChange={(e) => handleInputChange("product", "casNumber", e.target.value)}
                    data-testid="input-cas-number"
                  />
                </div>
                <div>
                  <Label htmlFor="formula">Molecular Formula</Label>
                  <Input
                    id="formula"
                    value={formData.product.formula}
                    onChange={(e) => handleInputChange("product", "formula", e.target.value)}
                    data-testid="input-formula"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purity">Purity</Label>
                  <Input
                    id="purity"
                    value={formData.product.purity}
                    onChange={(e) => handleInputChange("product", "purity", e.target.value)}
                    data-testid="input-purity"
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={formData.product.grade}
                    onChange={(e) => handleInputChange("product", "grade", e.target.value)}
                    data-testid="input-grade"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
              Supplier Information
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="supplier-name">Company Name</Label>
                <Input
                  id="supplier-name"
                  value={formData.supplier.name}
                  onChange={(e) => handleInputChange("supplier", "name", e.target.value)}
                  data-testid="input-supplier-name"
                />
              </div>
              <div>
                <Label htmlFor="supplier-address">Contact Address</Label>
                <Textarea
                  id="supplier-address"
                  rows={2}
                  value={formData.supplier.address}
                  onChange={(e) => handleInputChange("supplier", "address", e.target.value)}
                  data-testid="textarea-supplier-address"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier-phone">Phone</Label>
                  <Input
                    id="supplier-phone"
                    value={formData.supplier.phone}
                    onChange={(e) => handleInputChange("supplier", "phone", e.target.value)}
                    data-testid="input-supplier-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-contact">Emergency Contact</Label>
                  <Input
                    id="emergency-contact"
                    value={formData.supplier.emergency}
                    onChange={(e) => handleInputChange("supplier", "emergency", e.target.value)}
                    data-testid="input-emergency-contact"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hazard Classification */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
              Hazard Classification
            </h4>
            
            <div className="space-y-3">
              {formData.hazards.map((hazard, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Hazard category"
                      value={hazard.category}
                      onChange={(e) => handleHazardChange(index, "category", e.target.value)}
                      data-testid={`input-hazard-category-${index}`}
                    />
                    <Input
                      placeholder="Signal word"
                      value={hazard.signal}
                      onChange={(e) => handleHazardChange(index, "signal", e.target.value)}
                      data-testid={`input-hazard-signal-${index}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHazard(index)}
                    className="ml-3 text-red-400 hover:text-red-600"
                    data-testid={`button-remove-hazard-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addHazard}
                className="w-full"
                data-testid="button-add-hazard"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Hazard Classification
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <LivePreview data={formData} />
      </div>
    </>
  );
}
