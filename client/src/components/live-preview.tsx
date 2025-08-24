import { FileText, Eye } from "lucide-react";
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
      <div className="mb-6">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr>
              {tableData[0]?.map((header, colIndex) => (
                <th key={colIndex} className="border border-black p-2 text-left font-bold text-black bg-gray-100">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-black p-2 text-black">
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
      1: "text-2xl font-bold text-black mb-3 border-b-2 border-black pb-1",
      2: "text-xl font-bold text-black mb-2 border-b border-black pb-1",
      3: "text-lg font-semibold text-black mb-2",
      4: "text-base font-semibold text-black mb-1",
      5: "text-sm font-semibold text-black mb-1",
      6: "text-sm font-medium text-black mb-1"
    };

    return (
      <div className={classes[level as keyof typeof classes] || classes[2]}>
        {field.value?.toString() || field.label}
      </div>
    );
  };

  const renderParagraph = (field: DynamicField) => {
    return (
      <p className="text-black mb-3 leading-relaxed text-justify">
        {field.value?.toString() || ""}
      </p>
    );
  };

  const renderRegularField = (field: DynamicField) => {
    const formatFieldValue = (field: DynamicField) => {
      if (field.value === null || field.value === undefined || field.value === "") {
        return <span className="text-gray-600 italic">Not specified</span>;
      }

      switch (field.type) {
        case "boolean":
          return <span className="font-medium text-black">
            {field.value ? "Yes" : "No"}
          </span>;
        case "date":
          return <span className="text-black">{field.value ? new Date(field.value.toString()).toLocaleDateString() : "Not specified"}</span>;
        case "number":
          return <span className="font-mono text-black">{field.value}</span>;
        case "email":
          return <span className="text-black underline">{field.value}</span>;
        case "phone":
          return <span className="text-black font-mono">{field.value}</span>;
        default:
          return <span className="text-black">{field.value.toString()}</span>;
      }
    };

    return (
      <div className="mb-2 grid grid-cols-5 gap-4">
        <dt className="col-span-2 text-sm font-semibold text-black uppercase tracking-wide">
          {field.label}:
        </dt>
        <dd className="col-span-3 text-sm text-black">
          {formatFieldValue(field)}
        </dd>
      </div>
    );
  };

  const renderField = (field: DynamicField) => {
    switch (field.type) {
      case "table":
        return (
          <div key={field.id} className="mb-6">
            <h4 className="text-base font-bold text-black mb-2 border-b border-black pb-1">{field.label}</h4>
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
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Professional A4 format ready for letterhead printing
        </p>
      </div>

      <div className="p-6 overflow-y-auto h-full">
        <div className="max-w-none mx-auto bg-white shadow-lg" style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          padding: '20mm',
          margin: '0 auto',
          fontFamily: 'serif'
        }}>
          
          {/* Professional Header */}
          <div className="border-b-2 border-black pb-4 mb-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-2">CERTIFICATE OF ANALYSIS</h1>
              <div className="text-lg text-black font-semibold">
                Nano Tech Chemical Brothers Pvt. Ltd.
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-black">
              <div>
                <strong>Generated:</strong> {new Date().toLocaleDateString()}
              </div>
              <div>
                <strong>Document Type:</strong> {data.documentType}
              </div>
            </div>
          </div>

          {/* Document Content with Preserved Structure */}
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
              <div key={sectionName} className="mb-6">
                <h2 className="text-lg font-bold text-black border-b border-black pb-1 mb-4 uppercase">
                  {sectionName}
                </h2>
                
                <div className="space-y-3">
                  {sectionFields.map((field) => renderField(field))}
                </div>
              </div>
            ))}
          </div>

          {/* Professional Footer */}
          <div className="border-t-2 border-black pt-4 mt-8">
            <div className="text-center text-sm text-black">
              <div className="font-bold mb-1">NANO TECH CHEMICAL BROTHERS PVT. LTD.</div>
              <div className="text-xs">
                This document was generated automatically from supplier documentation.
              </div>
              <div className="text-xs mt-1">
                Document generated on {new Date().toLocaleDateString()} • Confidential & Proprietary
              </div>
            </div>
          </div>

          {/* Page break indicator for multiple pages */}
          <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-300 pt-2">
            Ready for A4 Letterhead Printing
          </div>
        </div>
      </div>
    </div>
  );
}