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
  
  // Use detectedSections from the document
  const detectedSections = document.extractedData?.detectedSections || [];
  const allSectionIds = detectedSections.map(section => section.id);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(allSectionIds));

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

  const getTypeIcon = (section: any) => {
    switch (section.type) {
      case 'table': return <Table className="w-4 h-4" />;
      case 'heading': return <Type className="w-4 h-4" />;
      case 'field_group': return <Users className="w-4 h-4" />;
      case 'list': return <List className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (section: any) => {
    switch (section.type) {
      case 'table': return 'bg-blue-100 text-blue-800';
      case 'heading': return 'bg-green-100 text-green-800';
      case 'field_group': return 'bg-orange-100 text-orange-800';
      case 'list': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSectionType = (section: any) => {
    switch (section.type) {
      case 'table': return 'Table Data';
      case 'heading': return 'Headers';
      case 'field_group': return 'Field Group';
      case 'list': return 'List';
      default: return 'Content';
    }
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
        {detectedSections.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No sections detected in the document.</p>
            </CardContent>
          </Card>
        ) : (
          detectedSections.map((section) => {
            return (
              <Card 
                key={section.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedSections.has(section.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => toggleSection(section.id)}
                data-testid={`section-card-${section.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">
                        {selectedSections.has(section.id) ? (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getTypeIcon(section)}
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <Badge className={getTypeBadgeColor(section)}>
                            {getSectionType(section)}
                          </Badge>
                        </div>
                        
                        <CardDescription className="text-sm">
                          {section.fields?.length || 0} field{(section.fields?.length || 0) !== 1 ? 's' : ''} detected
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
                      {section.preview || section.content}
                    </p>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Fields in this section:</p>
                    <div className="flex flex-wrap gap-1">
                      {(section.fields || []).slice(0, 4).map((field: DynamicField) => (
                        <Badge key={field.id} variant="outline" className="text-xs">
                          {field.label}
                        </Badge>
                      ))}
                      {(section.fields?.length || 0) > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{(section.fields?.length || 0) - 4} more
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
            {selectedSections.size} of {detectedSections.length} sections selected
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