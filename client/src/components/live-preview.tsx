import { ExtractedData } from "@shared/schema";

interface LivePreviewProps {
  data: ExtractedData;
}

export default function LivePreview({ data }: LivePreviewProps) {
  return (
    <div className="p-6 bg-gray-50">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Live PDF Preview</h3>
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-8 min-h-[600px] max-w-[8.5in] mx-auto" style={{ fontFamily: 'serif' }}>
        
        {/* Company Header - PDF Style */}
        <div className="border-b-2 border-blue-900 pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">AC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-900 mb-1">Apex Chemicals Corp.</h1>
                <p className="text-lg text-blue-700 font-medium">Advanced Chemical Solutions</p>
                <p className="text-sm text-gray-600 mt-1">ISO 9001:2015 Certified</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600 bg-gray-50 p-3 rounded border">
              <div className="font-semibold text-gray-900">Document Details</div>
              <div className="mt-1">Generated: <span data-testid="text-generation-date">{new Date().toLocaleDateString()}</span></div>
              <div>Doc ID: <span data-testid="text-company-doc-id" className="font-mono">AC-{data.document.id}</span></div>
              <div>Rev: {data.document.revision}</div>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="space-y-4">
          
          {/* Product Identification - PDF Style */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4 pb-2 border-b border-blue-200">
              1. PRODUCT IDENTIFICATION
            </h2>
            <div className="bg-blue-50 border border-blue-200 p-6 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-blue-900 uppercase tracking-wide">Product Name:</div>
                    <div className="text-gray-900 text-base font-medium mt-1" data-testid="preview-product-name">
                      {data.product.name}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900 uppercase tracking-wide">Molecular Formula:</div>
                    <div className="text-gray-900 font-mono text-base mt-1" data-testid="preview-formula">
                      {data.product.formula}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-blue-900 uppercase tracking-wide">CAS Registry Number:</div>
                    <div className="text-gray-900 font-mono text-base mt-1" data-testid="preview-cas-number">
                      {data.product.casNumber}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900 uppercase tracking-wide">Grade/Purity:</div>
                    <div className="text-gray-900 text-base mt-1" data-testid="preview-grade">
                      {data.product.grade} • {data.product.purity}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Information - PDF Style */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4 pb-2 border-b border-blue-200">
              2. SUPPLIER INFORMATION
            </h2>
            <div className="bg-gray-50 border border-gray-200 p-6 rounded">
              <div className="space-y-4 text-sm">
                <div>
                  <div className="font-semibold text-gray-900 uppercase tracking-wide">Company Name:</div>
                  <div className="text-gray-900 text-base mt-1" data-testid="preview-supplier-name">
                    {data.supplier.name}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 uppercase tracking-wide">Address:</div>
                  <div className="text-gray-900 text-base mt-1 leading-relaxed" data-testid="preview-supplier-address">
                    {data.supplier.address}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="font-semibold text-gray-900 uppercase tracking-wide">Phone Number:</div>
                    <div className="text-gray-900 font-mono text-base mt-1" data-testid="preview-supplier-phone">
                      {data.supplier.phone}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 uppercase tracking-wide">Emergency Contact:</div>
                    <div className="text-red-700 font-mono text-base font-medium mt-1" data-testid="preview-emergency-contact">
                      {data.supplier.emergency}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hazard Information - PDF Style */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-red-900 mb-4 pb-2 border-b border-red-200">
              3. HAZARD IDENTIFICATION
            </h2>
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded">
              {data.hazards.length > 0 ? (
                <div className="space-y-4">
                  <div className="font-semibold text-red-900 uppercase tracking-wide text-sm mb-3">
                    Classified Hazards:
                  </div>
                  {data.hazards.map((hazard, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-red-100 border border-red-300 rounded">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <div>
                        <div className="font-bold text-red-900 text-base" data-testid={`preview-hazard-${index}`}>
                          {hazard.category}
                        </div>
                        <div className="text-red-800 text-sm font-medium">
                          Signal Word: <span className="uppercase">{hazard.signal}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-red-700 font-medium" data-testid="preview-no-hazards">
                    No hazard classifications identified
                  </div>
                  <div className="text-red-600 text-sm mt-1">
                    Please verify hazard information with supplier documentation
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - PDF Style */}
          <div className="border-t-2 border-blue-900 pt-6 mt-8">
            <div className="bg-blue-900 text-white p-4 rounded text-center">
              <div className="font-bold text-sm mb-2">APEX CHEMICALS CORP. - AUTOMATED DOCUMENT PROCESSING</div>
              <div className="text-xs opacity-90">
                This document was generated automatically from supplier documentation. 
                For technical support or questions, contact our chemical safety team.
              </div>
              <div className="text-xs opacity-75 mt-2">
                Document generated on {new Date().toLocaleDateString()} • Confidential & Proprietary
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
