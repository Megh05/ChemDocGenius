import { Settings, ExtractedData, extractedDataSchema } from "@shared/schema";
import fs from "fs";
import pdf from "pdf-parse";

export class MistralService {
  private apiKey: string | null = null;
  private baseUrl = "https://api.mistral.ai/v1";

  private getApiKey(settings: Settings): string {
    if (settings.apiKey) return settings.apiKey;
    if (settings.encryptedApiKey) {
      // In a real implementation, decrypt the API key here
      return settings.encryptedApiKey;
    }
    throw new Error("No API key available");
  }

  async testConnection(settings: Settings): Promise<boolean> {
    try {
      const apiKey = this.getApiKey(settings);
      
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

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
Extract the following information from this chemical document text and return it as a JSON object:

Required structure:
{
  "document": {
    "type": "document type (e.g., Safety Data Sheet)",
    "id": "document ID or number",
    "issueDate": "issue date in YYYY-MM-DD format",
    "revision": "revision number or version"
  },
  "product": {
    "name": "chemical product name",
    "casNumber": "CAS registry number",
    "formula": "chemical formula",
    "purity": "purity percentage or grade",
    "grade": "chemical grade (e.g., ACS, Technical)"
  },
  "supplier": {
    "name": "supplier company name",
    "address": "full address",
    "phone": "phone number",
    "emergency": "emergency contact number"
  },
  "hazards": [
    {
      "category": "hazard classification",
      "signal": "signal word (Danger/Warning)"
    }
  ]
}

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
          max_tokens: 2000
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

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Mistral API call failed:", error);
      
      // Fallback: return default structure if API fails
      return {
        document: {
          type: "Safety Data Sheet",
          id: "Unknown",
          issueDate: new Date().toISOString().split('T')[0],
          revision: "1.0"
        },
        product: {
          name: "Chemical Product",
          casNumber: "Unknown",
          formula: "Unknown",
          purity: "Unknown",
          grade: "Unknown"
        },
        supplier: {
          name: "Unknown Supplier",
          address: "Address not available",
          phone: "Phone not available",
          emergency: "Emergency contact not available"
        },
        hazards: []
      };
    }
  }
}
