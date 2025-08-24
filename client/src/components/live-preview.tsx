import { FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractedData, DynamicField } from "@shared/schema";

interface LivePreviewProps {
  data: ExtractedData;
}

export default function LivePreview({ data }: LivePreviewProps) {
  // Sort fields by order to maintain document structure
  const sortedFields = data.fields.sort((a, b) => {
    const orderA = a.layout?.order || 0;
    const orderB = b.layout?.order || 0;
    return orderA - orderB;
  });

  // Group fields by section while preserving order
  const groupedFields = sortedFields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, DynamicField[]>);

  const renderTable = (field: DynamicField) => {
    const tableData = field.value as string[][] || [["Header"], ["Data"]];
    
    return (
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse border border-gray-300 bg-white">
          <thead>
            <tr className="bg-blue-100">
              {tableData[0]?.map((header, colIndex) => (
                <th key={colIndex} className="border border-gray-300 p-3 text-left font-semibold text-blue-900">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-3 text-gray-900">
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHeading = (field: DynamicField) => {
    const level = field.layout?.level || 2;
    const classes = {
      1: "text-3xl font-bold text-blue-900 mb-4 border-b-2 border-blue-300 pb-2",
      2: "text-2xl font-bold text-blue-800 mb-3 border-b border-blue-200 pb-1",
      3: "text-xl font-semibold text-blue-700 mb-2",
      4: "text-lg font-semibold text-blue-600 mb-2",
      5: "text-base font-semibold text-blue-500 mb-1",
      6: "text-sm font-semibold text-blue-400 mb-1"
    };

    return (
      <div className={classes[level as keyof typeof classes] || classes[2]}>
        {field.value?.toString() || field.label}
      </div>
    );
  };

  const renderParagraph = (field: DynamicField) => {
    return (
      <p className="text-gray-900 mb-4 leading-relaxed">
        {field.value?.toString() || ""}
      </p>
    );
  };

  const renderRegularField = (field: DynamicField) => {
    const formatFieldValue = (field: DynamicField) => {
      if (field.value === null || field.value === undefined || field.value === "") {
        return <span className="text-gray-400 italic">Not specified</span>;
      }

      switch (field.type) {
        case "boolean":
          return <span className={field.value ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
            {field.value ? "✓ Yes" : "✗ No"}
          </span>;
        case "date":
          return field.value ? new Date(field.value.toString()).toLocaleDateString() : "Not specified";
        case "number":
          return <span className="font-mono font-semibold">{field.value}</span>;
        case "email":
          return <a href={`mailto:${field.value}`} className="text-blue-600 hover:underline">
            {field.value}
          </a>;
        case "phone":
          return <a href={`tel:${field.value}`} className="text-blue-600 hover:underline">
            {field.value}
          </a>;
        default:
          return <span className="font-medium">{field.value.toString()}</span>;
      }
    };

    return (
      <div className="mb-3">
        <div className="grid grid-cols-3 gap-4">
          <dt className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
            {field.label}:
          </dt>
          <dd className="col-span-2 text-sm text-gray-900">
            {formatFieldValue(field)}
          </dd>
        </div>
      </div>
    );
  };

  const renderField = (field: DynamicField) => {
    switch (field.type) {
      case "table":
        return (
          <div key={field.id} className="mb-6">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">{field.label}</h4>
            {renderTable(field)}
          </div>
        );
      case "heading":
        return (
          <div key={field.id}>
            {renderHeading(field)}
          </div>
        );
      case "paragraph":
        return (
          <div key={field.id}>
            {renderParagraph(field)}
          </div>
        );
      default:
        return (
          <div key={field.id}>
            {renderRegularField(field)}
          </div>
        );
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
          Preview with original document structure preserved
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
                <span className="text-blue-200">Elements:</span>
                <span className="ml-2">{data.fields.length}</span>
              </div>
            </div>
          </div>

          {/* Document Content with Preserved Structure */}
          <div className="p-6">
            {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
              <div key={sectionName} className="mb-8">
                <h2 className="text-xl font-bold text-blue-800 border-b-2 border-blue-200 pb-2 mb-6">
                  {sectionName.toUpperCase()}
                </h2>
                
                <div className="space-y-4">
                  {sectionFields.map((field) => renderField(field))}
                </div>
              </div>
            ))}

            {/* Structure Info */}
            {data.structure && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Document Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${data.structure.hasTables ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Tables: {data.structure.hasTables ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${data.structure.hasHeaders ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Headers: {data.structure.hasHeaders ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${data.structure.hasLists ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Lists: {data.structure.hasLists ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Section */}
            {data.metadata && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Processing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {data.metadata.extractedAt && (
                    <div>
                      <dt className="font-medium text-gray-700">Extracted At:</dt>
                      <dd className="text-gray-900 mt-1">
                        {new Date(data.metadata.extractedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {data.metadata.confidence && (
                    <div>
                      <dt className="font-medium text-gray-700">Confidence Score:</dt>
                      <dd className="text-gray-900 mt-1">
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