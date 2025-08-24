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
You are an intelligent document analysis system. Analyze this document and:

1. Identify the document type (e.g., Certificate of Analysis, Safety Data Sheet, Product Specification, etc.)
2. Detect all sections and meaningful data points
3. Extract all key-value pairs found in the document
4. Determine appropriate form field types for each data point
5. Group related fields into logical sections

For each extracted field, determine:
- Appropriate input type (text, number, date, email, phone, textarea, select, boolean)
- Whether the field should be required
- Validation rules if applicable

Return a JSON object with this exact structure:
{
  "documentType": "detected document type",
  "detectedSections": ["section1", "section2", "section3"],
  "fields": [
    {
      "id": "unique_field_id",
      "label": "Human readable field name",
      "value": "extracted value or null",
      "type": "text|number|date|email|phone|textarea|select|boolean",
      "section": "section name this field belongs to",
      "required": true/false,
      "options": ["option1", "option2"] // only for select fields
    }
  ],
  "metadata": {
    "extractedAt": "${new Date().toISOString()}",
    "confidence": 0.85,
    "totalFields": "number of fields extracted"
  }
}

Be intelligent about field types:
- Use "number" for quantities, percentages, measurements
- Use "date" for dates
- Use "email" for email addresses
- Use "phone" for phone numbers
- Use "textarea" for long descriptions
- Use "select" when you can infer possible options
- Use "boolean" for yes/no fields
- Use "text" as default

Extract ALL meaningful data points, not just chemical data. Include:
- Company information (names, addresses, contacts)
- Product details (names, specifications, properties)
- Test results and measurements
- Dates and reference numbers
- Any other structured data found

Document text:
${text}

Return only the JSON object, no additional text:`;

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
