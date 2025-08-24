import { FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractedData, DynamicField } from "@shared/schema";

interface LivePreviewProps {
  data: ExtractedData;
}

export default function LivePreview({ data }: LivePreviewProps) {
  // Group fields by section for organized display
  const groupedFields = data.fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, DynamicField[]>);

  const formatFieldValue = (field: DynamicField) => {
    if (field.value === null || field.value === undefined || field.value === "") {
      return <span className="text-gray-400 italic">Not specified</span>;
    }

    switch (field.type) {
      case "boolean":
        return <span className={field.value ? "text-green-600" : "text-red-600"}>
          {field.value ? "Yes" : "No"}
        </span>;
      case "date":
        return field.value ? new Date(field.value.toString()).toLocaleDateString() : "Not specified";
      case "number":
        return <span className="font-mono">{field.value}</span>;
      case "email":
        return <a href={`mailto:${field.value}`} className="text-blue-600 hover:underline">
          {field.value}
        </a>;
      case "phone":
        return <a href={`tel:${field.value}`} className="text-blue-600 hover:underline">
          {field.value}
        </a>;
      default:
        return field.value.toString();
    }
  };

  return (
    <div className="w-1/2 border-l border-gray-200 bg-gray-50">
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Preview of the generated document based on extracted data
        </p>
      </div>

      <div className="p-6 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Document Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">NTCB Certificate of Analysis</h1>
                <p className="text-blue-100 mt-1">
                  Document Type: {data.documentType}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-200">Generated:</span>
                <span className="ml-2">{new Date().toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-blue-200">Total Fields:</span>
                <span className="ml-2">{data.fields.length}</span>
              </div>
            </div>
          </div>

          {/* Document Sections */}
          <div className="p-6 space-y-8">
            {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
              <div key={sectionName} className="space-y-4">
                <h2 className="text-xl font-semibold text-blue-800 border-b-2 border-blue-200 pb-2">
                  {sectionName.toUpperCase()}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionFields.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-start justify-between">
                        <dt className="text-sm font-medium text-gray-700">
                          {field.label}:
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </dt>
                      </div>
                      <dd className="text-sm text-gray-900 mt-1">
                        {formatFieldValue(field)}
                      </dd>
                      {field.type !== "text" && (
                        <div className="text-xs text-gray-500">
                          Type: {field.type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Metadata Section */}
            {data.metadata && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-xl font-semibold text-blue-800 border-b-2 border-blue-200 pb-2">
                  DOCUMENT METADATA
                </h2>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.metadata.extractedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Extracted At:</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {new Date(data.metadata.extractedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {data.metadata.confidence && (
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Confidence Score:</dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        <span className={`font-semibold ${
                          data.metadata.confidence > 0.8 ? 'text-green-600' :
                          data.metadata.confidence > 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(data.metadata.confidence * 100).toFixed(1)}%
                        </span>
                      </dd>
                    </div>
                  )}
                  {data.metadata.totalFields && (
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Total Fields:</dt>
                      <dd className="text-sm text-gray-900 mt-1">{data.metadata.totalFields}</dd>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <span className="font-medium">Nano Tech Chemical Brothers Pvt. Ltd.</span>
              </div>
              <div>
                Generated by ChemDoc Processor
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}