import { useState } from "react";
import { CheckCircle, Circle, Eye, FileText, Table, List, Type, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Document, DynamicField } from "@shared/schema";

interface SectionSelectionStepProps {
  document: Document | null;
  onSectionsSelected: (selectedSections: string[]) => void;
  onBack: () => void;
}

export default function SectionSelectionStep({ 
  document, 
  onSectionsSelected, 
  onBack 
}: SectionSelectionStepProps) {
  if (!document) return <div>Loading...</div>;
  
  // Group fields by section for selection
  const fieldsBySection = (document.extractedData?.fields || []).reduce((acc: Record<string, DynamicField[]>, field: DynamicField) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, DynamicField[]>);

  const allSections = Object.keys(fieldsBySection);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(allSections));

  const toggleSection = (sectionName: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionName)) {
      newSelected.delete(sectionName);
    } else {
      newSelected.add(sectionName);
    }
    setSelectedSections(newSelected);
  };

  const handleContinue = () => {
    onSectionsSelected(Array.from(selectedSections));
  };

  const getTypeIcon = (fields: DynamicField[]) => {
    if (fields.some(f => f.type === 'table')) return <Table className="w-4 h-4" />;
    if (fields.some(f => f.type === 'heading')) return <Type className="w-4 h-4" />;
    if (fields.length > 3) return <Users className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getTypeBadgeColor = (fields: DynamicField[]) => {
    if (fields.some(f => f.type === 'table')) return 'bg-blue-100 text-blue-800';
    if (fields.some(f => f.type === 'heading')) return 'bg-green-100 text-green-800';
    if (fields.length > 3) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSectionType = (fields: DynamicField[]) => {
    if (fields.some(f => f.type === 'table')) return 'Table Data';
    if (fields.some(f => f.type === 'heading')) return 'Headers';
    if (fields.length > 3) return 'Field Group';
    return 'Content';
  };

  const getSectionPreview = (fields: DynamicField[]) => {
    return fields.slice(0, 2).map(f => `${f.label}: ${f.value || 'N/A'}`).join(' • ');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Sections to Include
        </h2>
        <p className="text-gray-600">
          Choose which sections from your supplier document should be included in the NTCB Certificate of Analysis.
          Only selected sections will appear in the editable form.
        </p>
      </div>

      <div className="grid gap-4 mb-6">
        {allSections.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No sections detected in the document.</p>
            </CardContent>
          </Card>
        ) : (
          allSections.map((sectionName) => {
            const sectionFields = fieldsBySection[sectionName];
            return (
              <Card 
                key={sectionName}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedSections.has(sectionName) 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => toggleSection(sectionName)}
                data-testid={`section-card-${sectionName.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">
                        {selectedSections.has(sectionName) ? (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getTypeIcon(sectionFields)}
                          <CardTitle className="text-lg">{sectionName}</CardTitle>
                          <Badge className={getTypeBadgeColor(sectionFields)}>
                            {getSectionType(sectionFields)}
                          </Badge>
                        </div>
                        
                        <CardDescription className="text-sm">
                          {sectionFields.length} field{sectionFields.length !== 1 ? 's' : ''} detected
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <Eye className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Preview:</span>
                    </div>
                    <p className="text-gray-600 line-clamp-3">
                      {getSectionPreview(sectionFields)}
                    </p>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Fields in this section:</p>
                    <div className="flex flex-wrap gap-1">
                      {sectionFields.slice(0, 4).map((field: DynamicField) => (
                        <Badge key={field.id} variant="outline" className="text-xs">
                          {field.label}
                        </Badge>
                      ))}
                      {sectionFields.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{sectionFields.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          data-testid="button-back"
        >
          Back to Processing
        </Button>
        
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            {selectedSections.size} of {allSections.length} sections selected
          </p>
          <Button 
            onClick={handleContinue}
            disabled={selectedSections.size === 0}
            data-testid="button-continue"
          >
            Continue to Review & Edit
          </Button>
        </div>
      </div>
    </div>
  );
}