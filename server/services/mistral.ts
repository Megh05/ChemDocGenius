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
      
      console.log("Extracted text length:", extractedText.length);
      console.log("First 200 chars:", extractedText.substring(0, 200));

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
You are an advanced document structure analysis system specialized in processing Certificate of Analysis (COA) documents and supplier documentation. Analyze this document and extract ALL meaningful content into structured sections.

CRITICAL: You MUST always return at least 2-3 sections even if the document appears simple. Never return empty sections.

Your tasks:
1. Identify the document type (default to "Certificate of Analysis" if unclear)
2. Create meaningful sections that group related content
3. Extract ALL text content into appropriate fields
4. For any tabular data: preserve as table structure
5. For headings: create heading fields with proper levels
6. Group related fields into logical sections

MANDATORY SECTIONS TO CREATE:
- Document Information (document title, dates, identifiers)
- Product Information (product details, specifications)
- Test Results or Analysis Data (any measurements, values, results)
- Additional Information (any remaining content)

RETURN THIS EXACT JSON STRUCTURE:
{
  "documentType": "detected document type",
  "detectedSections": [
    {
      "id": "section1_id",
      "title": "Section 1 Title",
      "content": "Section content or description",
      "type": "field_group",
      "preview": "Brief preview of section content",
      "fields": [],
      "selected": false,
      "order": 1
    }
  ],
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
- NEVER return empty detectedSections array - always create at least 2-3 meaningful sections
- For TABLES: Use type="table", value must be array of arrays [[headers],[row1],[row2]]
- For HEADINGS: Use type="heading", set layout.level (1-6), preserve hierarchy
- For regular fields: Use appropriate type (text, number, date, etc.)
- MAINTAIN EXACT ORDER: layout.order must reflect document sequence
- PRESERVE STRUCTURE: Don't flatten tables into individual fields
- If document seems empty, extract whatever text is available into meaningful sections
- Always populate detectedSections with proper section objects that have fields arrays

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

Document text to analyze:
${text}

IMPORTANT: Even if the document text appears minimal or poorly formatted, you MUST create meaningful sections and extract all available content. Do not return empty arrays.

Return only the JSON object with populated detectedSections and fields:`;

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
      throw new Error(`Mistral API processing failed: ${error.message}`);
    }
  }
}
