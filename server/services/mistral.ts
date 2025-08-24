import { Settings, ExtractedData, extractedDataSchema, DynamicField } from "@shared/schema";
import fs from "fs";

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
      // Extract text from PDF using Mistral OCR
      const extractedText = await this.extractTextWithMistralOCR(filePath, settings);
      
      console.log("Extracted text length:", extractedText.length);
      console.log("First 500 chars:", extractedText.substring(0, 500));
      console.log("Last 200 chars:", extractedText.substring(-200));

      if (extractedText.length < 10) {
        throw new Error("No meaningful text extracted from document");
      }

      // Use Mistral AI to extract structured data
      const structuredData = await this.extractStructuredData(extractedText, settings);
      
      console.log("Mistral response:", JSON.stringify(structuredData, null, 2));
      
      // Validate the extracted data
      return extractedDataSchema.parse(structuredData);
    } catch (error: any) {
      console.error("Document processing failed:", error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  private async extractTextWithMistralOCR(filePath: string, settings: Settings): Promise<string> {
    // Use ONLY Mistral's dedicated OCR API - no fallbacks
    const apiKey = this.getApiKey(settings);
    const pdfBuffer = fs.readFileSync(filePath);
    const base64Pdf = pdfBuffer.toString('base64');

    console.log("Calling Mistral OCR API with file size:", pdfBuffer.length, "bytes");
    
    const response = await fetch(`${this.baseUrl}/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${base64Pdf}`
        },
        include_image_base64: false
      })
    });

    console.log("Mistral OCR response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Mistral OCR error response:", errorText);
      throw new Error(`Mistral OCR API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Mistral OCR response structure:", Object.keys(result));
    
    // Extract text from all pages
    let fullText = '';
    if (result.pages && Array.isArray(result.pages)) {
      console.log("Found", result.pages.length, "pages");
      for (let i = 0; i < result.pages.length; i++) {
        const page = result.pages[i];
        console.log(`Page ${i + 1} keys:`, Object.keys(page));
        if (page.markdown) {
          fullText += page.markdown + '\n\n';
        } else if (page.text) {
          fullText += page.text + '\n\n';
        }
      }
    } else {
      console.log("No pages found in OCR response");
      console.log("Full OCR response:", JSON.stringify(result, null, 2));
    }
    
    console.log("Total extracted text length:", fullText.length);
    
    if (fullText.length < 10) {
      throw new Error(`Mistral OCR extracted insufficient text from document. Only ${fullText.length} characters extracted.`);
    }

    console.log("Mistral OCR successful - extracted", fullText.length, "characters");
    return fullText;
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
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        console.log("Rate limited, implementing exponential backoff...");
        
        for (let attempt = 1; attempt <= 4; attempt++) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000); // 2s, 4s, 8s, 16s (max 30s)
          console.log(`Retry attempt ${attempt}/4, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
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
                
                console.log(`Retry successful on attempt ${attempt}`);
                return parsedData;
              }
            }
          } else if (retryResponse.status !== 429) {
            // If it's not a rate limit error, break out and handle below
            break;
          }
        }
        
        throw new Error("Rate limited and all retries failed");
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
      
      console.log("Raw Mistral LLM response:", parsedData);
      
      // Ensure all fields have unique IDs
      if (parsedData.fields) {
        parsedData.fields.forEach((field: any, index: number) => {
          if (!field.id) {
            field.id = `field_${index + 1}`;
          }
        });
      }
      
      // Ensure detectedSections is always an array and populated
      if (!parsedData.detectedSections || !Array.isArray(parsedData.detectedSections) || parsedData.detectedSections.length === 0) {
        console.log("No sections detected by Mistral, creating default sections");
        
        // Create default sections based on fields
        const sections = new Map();
        if (parsedData.fields && Array.isArray(parsedData.fields)) {
          parsedData.fields.forEach((field: any) => {
            const sectionName = field.section || "Document Content";
            if (!sections.has(sectionName)) {
              sections.set(sectionName, []);
            }
            sections.get(sectionName).push(field);
          });
        }
        
        // If no fields either, create minimum viable sections
        if (sections.size === 0) {
          sections.set("Document Information", []);
          sections.set("Content", []);
        }
        
        parsedData.detectedSections = Array.from(sections.entries()).map(([title, fields], index) => ({
          id: `section_${index + 1}`,
          title: title,
          content: `${title} section`,
          type: "field_group",
          preview: fields.length > 0 ? `${fields.length} fields detected` : "Empty section",
          fields: fields,
          selected: false,
          order: index + 1
        }));
      }
      
      console.log("Final processed data:", {
        documentType: parsedData.documentType,
        sectionsCount: parsedData.detectedSections?.length || 0,
        fieldsCount: parsedData.fields?.length || 0
      });
      
      return parsedData;
    } catch (error) {
      console.error("Mistral API call failed:", error);
      throw new Error(`Mistral API processing failed: ${error.message}`);
    }
  }
}
