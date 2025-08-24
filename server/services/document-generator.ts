import { Document, DynamicField } from "@shared/schema";
import PDFDocument from "pdfkit";
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export class DocumentGenerator {
  async generateDocument(document: Document, format: 'pdf' | 'docx'): Promise<Buffer> {
    if (format === 'pdf') {
      return this.generatePDF(document);
    } else {
      return this.generateDOCX(document);
    }
  }

  private async generatePDF(document: Document): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const data = document.extractedData as any;
        
        // Group fields by section for organized display
        const groupedFields = data.fields?.reduce((acc: Record<string, DynamicField[]>, field: DynamicField) => {
          if (!acc[field.section]) {
            acc[field.section] = [];
          }
          acc[field.section].push(field);
          return acc;
        }, {} as Record<string, DynamicField[]>) || {};

        // Company Header
        doc.fontSize(20).fillColor('#3B82F6').text('Nano Tech Chemical Brothers Pvt. Ltd.', 50, 50);
        doc.fontSize(12).fillColor('#6B7280').text('Certificate of Analysis', 50, 75);
        
        // Document Info
        doc.fontSize(10).fillColor('#6B7280');
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 400, 50);
        doc.text(`Document Type: ${data?.documentType || 'Unknown'}`, 400, 65);
        doc.text(`Total Fields: ${data?.fields?.length || 0}`, 400, 80);

        let yPosition = 120;

        // Dynamic Sections
        Object.entries(groupedFields).forEach(([sectionName, sectionFields]) => {
          // Check if we need a new page
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          // Section Header
          doc.fontSize(14).fillColor('#1E40AF').text(sectionName.toUpperCase(), 50, yPosition);
          yPosition += 25;
          
          // Section Fields
          sectionFields.forEach((field: DynamicField) => {
            if (yPosition > 750) {
              doc.addPage();
              yPosition = 50;
            }
            
            doc.fontSize(10).fillColor('#000000');
            const value = field.value?.toString() || 'Not specified';
            const label = `${field.label}:`;
            
            // Handle different field types
            let displayValue = value;
            if (field.type === 'boolean') {
              displayValue = field.value ? 'Yes' : 'No';
            } else if (field.type === 'date' && field.value) {
              displayValue = new Date(field.value.toString()).toLocaleDateString();
            }
            
            doc.text(label, 50, yPosition);
            doc.text(displayValue, 200, yPosition);
            yPosition += 15;
          });
          
          yPosition += 20;
        });

        // Footer
        doc.fontSize(8).fillColor('#6B7280');
        doc.text('This document was generated automatically from supplier data.', 50, yPosition + 20);
        doc.text(`Generated on ${new Date().toLocaleDateString()} by ChemDoc Processor`, 50, yPosition + 35);
        doc.text('Nano Tech Chemical Brothers Pvt. Ltd.', 50, yPosition + 50);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateDOCX(document: Document): Promise<Buffer> {
    const data = document.extractedData as any;
    
    // Group fields by section for organized display
    const groupedFields = data.fields?.reduce((acc: Record<string, DynamicField[]>, field: DynamicField) => {
      if (!acc[field.section]) {
        acc[field.section] = [];
      }
      acc[field.section].push(field);
      return acc;
    }, {} as Record<string, DynamicField[]>) || {};

    const children: Paragraph[] = [];

    // Company Header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Nano Tech Chemical Brothers Pvt. Ltd.",
            bold: true,
            size: 32,
            color: "3B82F6"
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Certificate of Analysis",
            size: 20,
            color: "6B7280"
          })
        ]
      }),
      new Paragraph({ text: "" }), // Empty line
    );

    // Document Info
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Generated: ", bold: true }),
          new TextRun({ text: new Date().toLocaleDateString() })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Document Type: ", bold: true }),
          new TextRun({ text: data?.documentType || "Unknown" })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Total Fields: ", bold: true }),
          new TextRun({ text: data?.fields?.length?.toString() || "0" })
        ]
      }),
      new Paragraph({ text: "" }), // Empty line
    );

    // Dynamic Sections
    Object.entries(groupedFields).forEach(([sectionName, sectionFields]) => {
      // Section Header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sectionName.toUpperCase(),
              bold: true,
              size: 24,
              color: "1E40AF"
            })
          ],
          heading: HeadingLevel.HEADING_2
        })
      );

      // Section Fields
      sectionFields.forEach((field: DynamicField) => {
        const value = field.value?.toString() || 'Not specified';
        let displayValue = value;
        
        if (field.type === 'boolean') {
          displayValue = field.value ? 'Yes' : 'No';
        } else if (field.type === 'date' && field.value) {
          displayValue = new Date(field.value.toString()).toLocaleDateString();
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${field.label}: `, bold: true }),
              new TextRun({ text: displayValue })
            ]
          })
        );
      });

      children.push(new Paragraph({ text: "" })); // Empty line
    });

    // Footer
    children.push(
      new Paragraph({ text: "" }), // Empty line
      new Paragraph({
        children: [
          new TextRun({
            text: "This document was generated automatically from supplier data.",
            size: 16,
            italics: true,
            color: "6B7280"
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on ${new Date().toLocaleDateString()} by ChemDoc Processor`,
            size: 16,
            italics: true,
            color: "6B7280"
          })
        ]
      })
    );

    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children
      }]
    });

    return Packer.toBuffer(doc);
  }
}