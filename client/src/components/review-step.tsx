import { useState, useEffect } from "react";
import { RotateCcw, Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePipeline } from "@/hooks/use-pipeline";
import { Document, ExtractedData, DynamicField } from "@shared/schema";
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

  const handleFieldChange = (fieldId: string, value: string | number | boolean) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      fields: prev!.fields.map(field => 
        field.id === fieldId ? { ...field, value } : field
      )
    }));
  };

  const addField = (section: string) => {
    if (!formData) return;
    
    const newField: DynamicField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      value: "",
      type: "text",
      section,
      required: false
    };

    setFormData(prev => ({
      ...prev!,
      fields: [...prev!.fields, newField]
    }));
  };

  const removeField = (fieldId: string) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      fields: prev!.fields.filter(field => field.id !== fieldId)
    }));
  };

  const handleSaveAndContinue = () => {
    if (formData && document) {
      updateMutation.mutate({ extractedData: formData });
      goToStep(4);
    }
  };

  const renderField = (field: DynamicField) => {
    const commonProps = {
      id: field.id,
      value: field.value?.toString() || "",
      onChange: (e: any) => {
        let value: string | number | boolean = e.target.value;
        if (field.type === "number") {
          value = parseFloat(e.target.value) || 0;
        } else if (field.type === "boolean") {
          value = e.target.checked;
        }
        handleFieldChange(field.id, value);
      },
      "data-testid": `input-${field.id}`
    };

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            {...commonProps}
            className="min-h-[80px]"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      
      case "number":
        return (
          <Input
            {...commonProps}
            type="number"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      
      case "date":
        return (
          <Input
            {...commonProps}
            type="date"
          />
        );
      
      case "email":
        return (
          <Input
            {...commonProps}
            type="email"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      
      case "phone":
        return (
          <Input
            {...commonProps}
            type="tel"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      
      case "select":
        return (
          <Select value={field.value?.toString() || ""} onValueChange={(value) => handleFieldChange(field.id, value)}>
            <SelectTrigger data-testid={`select-${field.id}`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              data-testid={`checkbox-${field.id}`}
            />
            <Label htmlFor={field.id}>Yes</Label>
          </div>
        );
      
      default:
        return (
          <Input
            {...commonProps}
            type="text"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  const groupedFields = formData?.fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, DynamicField[]>) || {};

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
              Document Type: <span className="font-medium">{formData.documentType}</span> • 
              {formData.fields.length} fields detected
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Dynamic Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-8">
              {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
                <div key={sectionName} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900" data-testid={`section-${sectionName.replace(/\s+/g, '-').toLowerCase()}`}>
                      {sectionName}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addField(sectionName)}
                      data-testid={`button-add-field-${sectionName.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sectionFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={field.id} className="text-sm font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(field.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            data-testid={`button-remove-${field.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        {renderField(field)}
                        <div className="text-xs text-gray-500">
                          Type: {field.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => addField("New Section")}
                data-testid="button-add-new-section"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Section
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