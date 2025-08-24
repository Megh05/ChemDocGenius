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
      
      // Fallback: return basic structure if API fails
      return {
        documentType: "Unknown Document",
        detectedSections: ["General Information"],
        fields: [
          {
            id: "document_title",
            label: "Document Title",
            value: "Untitled Document",
            type: "text",
            section: "General Information",
            required: false
          }
        ],
        metadata: {
          extractedAt: new Date().toISOString(),
          confidence: 0.1,
          totalFields: 1
        }
      };
    }
  }
}
