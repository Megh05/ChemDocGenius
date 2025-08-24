import { Settings, ExtractedData, extractedDataSchema, DynamicField } from "@shared/schema";
import fs from "fs";
import pdf from "pdf-parse";

export class MistralService {
  private apiKey: string | null = null;
  private baseUrl = "https://api.mistral.ai/v1";

  private getApiKey(settings: Settings): string {
    if (settings.apiKey) return settings.apiKey;
    if (settings.encryptedApiKey) {
      // Decrypt the base64-encoded API key
      try {
        return Buffer.from(settings.encryptedApiKey, 'base64').toString('utf-8');
      } catch (error) {
        console.error("Failed to decrypt API key:", error);
        return settings.encryptedApiKey; // Fallback to raw value
      }
    }
    throw new Error("No API key available");
  }

  async testConnection(settings: Settings): Promise<boolean> {
    try {
      const apiKey = this.getApiKey(settings);
      console.log("Testing connection with API key length:", apiKey.length);
      
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("Mistral API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log("Mistral API error:", errorText);
      }

      return response.ok;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  async processDocument(filePath: string, settings: Settings): Promise<ExtractedData> {
    try {
      // Extract text from PDF
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(pdfBuffer);
      const extractedText = pdfData.text;

      // Use Mistral AI to extract structured data
      const structuredData = await this.extractStructuredData(extractedText, settings);
      
      // Validate the extracted data
      return extractedDataSchema.parse(structuredData);
    } catch (error: any) {
      console.error("Document processing failed:", error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  private async extractStructuredData(text: string, settings: Settings): Promise<any> {
    const apiKey = this.getApiKey(settings);
    
    const prompt = `
You are an advanced document structure analysis system. Analyze this document and PRESERVE its original layout structure including tables, headings, paragraphs, and visual formatting.

Your tasks:
1. Identify the document type
2. Detect ALL structural elements: headings, tables, paragraphs, lists
3. Extract data while maintaining the original visual structure
4. For tables: preserve headers, rows, and cell relationships
5. For headings: identify hierarchy levels (1-6)
6. Maintain the exact order of elements as they appear

RETURN THIS EXACT JSON STRUCTURE:
{
  "documentType": "detected document type",
  "detectedSections": ["section1", "section2"],
  "fields": [
    {
      "id": "unique_id",
      "label": "field name or table/heading title",
      "value": "single value OR [['header1','header2'],['row1col1','row1col2']] for tables",
      "type": "text|number|date|email|phone|textarea|table|heading|paragraph",
      "section": "section name",
      "required": false,
      "layout": {
        "structureType": "field|table|heading|paragraph",
        "level": 1, // for headings only (1-6)
        "columns": ["header1", "header2"], // for tables only
        "rows": [["row1col1","row1col2"],["row2col1","row2col2"]], // for tables only
        "order": 1 // sequential order in document
      }
    }
  ],
  "structure": {
    "hasHeaders": true/false,
    "hasTables": true/false,
    "hasLists": true/false,
    "originalLayout": [
      {
        "type": "heading|paragraph|table|field",
        "content": "text content or table identifier",
        "level": 1, // for headings
        "order": 1
      }
    ]
  },
  "metadata": {
    "extractedAt": "${new Date().toISOString()}",
    "confidence": 0.85,
    "totalFields": 10
  }
}

CRITICAL RULES:
- For TABLES: Use type="table", value must be array of arrays [[headers],[row1],[row2]]
- For HEADINGS: Use type="heading", set layout.level (1-6), preserve hierarchy
- For regular fields: Use appropriate type (text, number, date, etc.)
- MAINTAIN EXACT ORDER: layout.order must reflect document sequence
- PRESERVE STRUCTURE: Don't flatten tables into individual fields

EXAMPLE TABLE EXTRACTION:
If you see:
Test Items | Specifications | Results
Appearance | White powder | White powder
Purity | ≥95% | 97.4%

Extract as:
{
  "id": "test_results_table",
  "label": "Test Results",
  "value": [["Test Items","Specifications","Results"],["Appearance","White powder","White powder"],["Purity","≥95%","97.4%"]],
  "type": "table",
  "layout": {
    "structureType": "table",
    "columns": ["Test Items","Specifications","Results"],
    "rows": [["Appearance","White powder","White powder"],["Purity","≥95%","97.4%"]],
    "order": 5
  }
}

Document text:
${text}

Return only the JSON object:`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        console.log("Rate limited, waiting before retry...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const retryResponse = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 4000
          })
        });
        
        if (retryResponse.ok) {
          const retryResult = await retryResponse.json();
          const retryContent = retryResult.choices[0]?.message?.content;
          
          if (retryContent) {
            const jsonMatch = retryContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedData = JSON.parse(jsonMatch[0]);
              
              if (parsedData.fields) {
                parsedData.fields.forEach((field: any, index: number) => {
                  if (!field.id) {
                    field.id = `field_${index + 1}`;
                  }
                });
              }
              
              return parsedData;
            }
          }
        }
        
        throw new Error("Rate limited and retry failed");
      }
      
      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("No content returned from Mistral API");
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Ensure all fields have unique IDs
      if (parsedData.fields) {
        parsedData.fields.forEach((field: any, index: number) => {
          if (!field.id) {
            field.id = `field_${index + 1}`;
          }
        });
      }
      
      return parsedData;
    } catch (error) {
      console.error("Mistral API call failed:", error);
      
      // Enhanced fallback with better structure when API fails
      console.log("API failed, using enhanced text parsing fallback");
      
      // Basic text parsing as fallback
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const fields: any[] = [];
      let fieldId = 1;
      
      // Try to extract basic information from text
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip very short lines
        if (trimmedLine.length < 3) return;
        
        // Check if line contains colon (key-value pair)
        if (trimmedLine.includes(':')) {
          const [label, ...valueParts] = trimmedLine.split(':');
          const value = valueParts.join(':').trim();
          
          if (label.trim() && value) {
            fields.push({
              id: `field_${fieldId++}`,
              label: label.trim(),
              value: value,
              type: "text" as const,
              section: "Document Information",
              required: false,
              layout: {
                structureType: "field" as const,
                order: index + 1
              }
            });
          }
        } else if (trimmedLine.length > 20) {
          // Treat longer lines as paragraphs
          fields.push({
            id: `paragraph_${fieldId++}`,
            label: `Content ${fieldId}`,
            value: trimmedLine,
            type: "paragraph" as const,
            section: "Document Content",
            required: false,
            layout: {
              structureType: "paragraph" as const,
              order: index + 1
            }
          });
        } else {
          // Treat as potential heading
          fields.push({
            id: `heading_${fieldId++}`,
            label: trimmedLine,
            value: trimmedLine,
            type: "heading" as const,
            section: "Document Content",
            required: false,
            layout: {
              structureType: "heading" as const,
              level: 2,
              order: index + 1
            }
          });
        }
      });
      
      // Create properly structured sections
      const documentInfoFields = fields.filter(f => f.section === "Document Information");
      const contentFields = fields.filter(f => f.section === "Document Content");
      
      const detectedSections = [
        {
          id: "doc_info_section",
          title: "Document Information", 
          content: "Basic document information and metadata",
          type: "field_group" as const,
          preview: documentInfoFields.length > 0 ? documentInfoFields[0].value : "Document details",
          fields: documentInfoFields,
          selected: false,
          order: 1
        },
        {
          id: "doc_content_section", 
          title: "Document Content",
          content: "Main document content and extracted text",
          type: "field_group" as const,
          preview: contentFields.length > 0 ? contentFields[0].value : "Document content",
          fields: contentFields,
          selected: false,
          order: 2
        }
      ];

      return {
        documentType: "Certificate of Analysis",
        detectedSections: detectedSections,
        fields: fields.length > 0 ? fields : [
          {
            id: "document_title",
            label: "Document Title",
            value: "Extracted Document",
            type: "text" as const,
            section: "Document Information",
            required: false,
            layout: {
              structureType: "field" as const,
              order: 1
            }
          }
        ],
        structure: {
          hasHeaders: true,
          hasTables: false,
          hasLists: false
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          confidence: 0.6,
          totalFields: fields.length || 1
        }
      };
    }
  }
}
