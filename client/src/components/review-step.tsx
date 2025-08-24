import { useState, useEffect } from "react";
import { RotateCcw, Plus, X, Save, Edit } from "lucide-react";
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

  const handleFieldChange = (fieldId: string, value: string | number | boolean | string[][]) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      fields: prev!.fields.map(field => 
        field.id === fieldId ? { ...field, value } : field
      )
    }));
  };

  const handleTableCellChange = (fieldId: string, rowIndex: number, colIndex: number, value: string) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      fields: prev!.fields.map(field => {
        if (field.id === fieldId && Array.isArray(field.value)) {
          const newTable = [...field.value as string[][]];
          newTable[rowIndex][colIndex] = value;
          return { ...field, value: newTable };
        }
        return field;
      })
    }));
  };

  const addTableRow = (fieldId: string) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      fields: prev!.fields.map(field => {
        if (field.id === fieldId && Array.isArray(field.value)) {
          const table = field.value as string[][];
          const columnCount = table[0]?.length || 2;
          const newRow = new Array(columnCount).fill("");
          return { ...field, value: [...table, newRow] };
        }
        return field;
      })
    }));
  };

  const removeTableRow = (fieldId: string, rowIndex: number) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      fields: prev!.fields.map(field => {
        if (field.id === fieldId && Array.isArray(field.value)) {
          const table = field.value as string[][];
          // Don't remove if it's the header row or the only row
          if (rowIndex === 0 || table.length <= 2) return field;
          return { ...field, value: table.filter((_, index) => index !== rowIndex) };
        }
        return field;
      })
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

  const renderTableField = (field: DynamicField) => {
    const tableData = field.value as string[][] || [["Header"], ["Data"]];
    
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {tableData[0]?.map((header, colIndex) => (
                  <th key={colIndex} className="border border-gray-300 p-2 text-left">
                    <Input
                      value={header}
                      onChange={(e) => handleTableCellChange(field.id, 0, colIndex, e.target.value)}
                      className="border-0 bg-transparent font-medium"
                      data-testid={`table-header-${field.id}-${colIndex}`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex + 1}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-gray-300 p-2">
                      <Input
                        value={cell}
                        onChange={(e) => handleTableCellChange(field.id, rowIndex + 1, colIndex, e.target.value)}
                        className="border-0 bg-transparent"
                        data-testid={`table-cell-${field.id}-${rowIndex}-${colIndex}`}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 p-2 w-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTableRow(field.id, rowIndex + 1)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      data-testid={`button-remove-row-${field.id}-${rowIndex}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addTableRow(field.id)}
          data-testid={`button-add-row-${field.id}`}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Row
        </Button>
      </div>
    );
  };

  const renderField = (field: DynamicField) => {
    if (field.type === "table") {
      return renderTableField(field);
    }

    if (field.type === "heading") {
      const HeadingTag = `h${field.layout?.level || 2}` as keyof JSX.IntrinsicElements;
      return (
        <div className="space-y-2">
          <Input
            value={field.value?.toString() || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="font-bold text-lg border-2 border-blue-200"
            placeholder="Heading text"
            data-testid={`heading-${field.id}`}
          />
          <div className="text-xs text-gray-500">
            Heading Level {field.layout?.level || 2}
          </div>
        </div>
      );
    }

    if (field.type === "paragraph") {
      return (
        <Textarea
          value={field.value?.toString() || ""}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          className="min-h-[100px]"
          placeholder="Paragraph content"
          data-testid={`paragraph-${field.id}`}
        />
      );
    }

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

  // Sort fields by order to maintain document structure
  const sortedFields = formData?.fields.sort((a, b) => {
    const orderA = a.layout?.order || 0;
    const orderB = b.layout?.order || 0;
    return orderA - orderB;
  }) || [];

  const groupedFields = sortedFields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, DynamicField[]>);

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
              {formData.fields.length} elements • 
              {formData.structure?.hasTables ? "📊 Tables" : ""} 
              {formData.structure?.hasHeaders ? " 📝 Headers" : ""}
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
        {/* Left Panel: Dynamic Form with Preserved Structure */}
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
                  
                  <div className="space-y-6">
                    {sectionFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={field.id} className="text-sm font-medium flex items-center gap-2">
                            {field.type === "table" && "📊"}
                            {field.type === "heading" && "📝"}
                            {field.type === "paragraph" && "📄"}
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
                          Type: {field.type} • Order: {field.layout?.order || 0}
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