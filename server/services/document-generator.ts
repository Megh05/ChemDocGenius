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

        // Dynamic Sections with Structure Preservation
        Object.entries(groupedFields).forEach(([sectionName, sectionFields]) => {
          // Check if we need a new page
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          // Section Header
          doc.fontSize(14).fillColor('#1E40AF').text(sectionName.toUpperCase(), 50, yPosition);
          yPosition += 25;
          
          // Sort fields by order to maintain structure
          const sortedFields = sectionFields.sort((a, b) => {
            const orderA = a.layout?.order || 0;
            const orderB = b.layout?.order || 0;
            return orderA - orderB;
          });
          
          // Render fields preserving original structure
          sortedFields.forEach((field: DynamicField) => {
            if (yPosition > 750) {
              doc.addPage();
              yPosition = 50;
            }
            
            switch (field.type) {
              case 'table':
                // Render table structure
                const tableData = field.value as string[][] || [["Header"], ["Data"]];
                
                // Table title
                doc.fontSize(12).fillColor('#1E40AF').text(field.label, 50, yPosition);
                yPosition += 20;
                
                // Table headers
                let xPosition = 50;
                const columnWidth = 150;
                
                doc.fontSize(10).fillColor('#000000');
                
                // Draw table border and headers
                if (tableData[0]) {
                  tableData[0].forEach((header, colIndex) => {
                    doc.rect(xPosition, yPosition, columnWidth, 20).stroke();
                    doc.text(header, xPosition + 5, yPosition + 5);
                    xPosition += columnWidth;
                  });
                  yPosition += 20;
                }
                
                // Draw table rows
                tableData.slice(1).forEach((row) => {
                  xPosition = 50;
                  row.forEach((cell, colIndex) => {
                    doc.rect(xPosition, yPosition, columnWidth, 15).stroke();
                    doc.text(cell || '-', xPosition + 5, yPosition + 3);
                    xPosition += columnWidth;
                  });
                  yPosition += 15;
                });
                
                yPosition += 20;
                break;
                
              case 'heading':
                const level = field.layout?.level || 2;
                const fontSize = Math.max(16 - level, 10);
                doc.fontSize(fontSize).fillColor('#1E40AF').text(field.value?.toString() || field.label, 50, yPosition);
                yPosition += fontSize + 10;
                break;
                
              case 'paragraph':
                doc.fontSize(10).fillColor('#000000');
                const text = field.value?.toString() || '';
                const lines = doc.heightOfString(text, { width: 500 });
                doc.text(text, 50, yPosition, { width: 500 });
                yPosition += lines + 10;
                break;
                
              default:
                // Regular field
                doc.fontSize(10).fillColor('#000000');
                const value = field.value?.toString() || 'Not specified';
                const label = `${field.label}:`;
                
                let displayValue = value;
                if (field.type === 'boolean') {
                  displayValue = field.value ? 'Yes' : 'No';
                } else if (field.type === 'date' && field.value) {
                  displayValue = new Date(field.value.toString()).toLocaleDateString();
                }
                
                doc.text(label, 50, yPosition);
                doc.text(displayValue, 200, yPosition);
                yPosition += 15;
                break;
            }
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

    // Dynamic Sections with Structure Preservation
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

      // Sort fields by order to maintain structure
      const sortedFields = sectionFields.sort((a, b) => {
        const orderA = a.layout?.order || 0;
        const orderB = b.layout?.order || 0;
        return orderA - orderB;
      });

      // Render fields preserving original structure
      sortedFields.forEach((field: DynamicField) => {
        switch (field.type) {
          case 'table':
            // Add table to DOCX
            const tableData = field.value as string[][] || [["Header"], ["Data"]];
            
            // Table title
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: field.label,
                    bold: true,
                    size: 20,
                    color: "1E40AF"
                  })
                ]
              })
            );
            
            // Note: Full table implementation would require docx table API
            // For now, we'll represent as formatted text
            tableData.forEach((row, rowIndex) => {
              const isHeader = rowIndex === 0;
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row.join(' | '),
                      bold: isHeader,
                      color: isHeader ? "1E40AF" : "000000"
                    })
                  ]
                })
              );
            });
            
            children.push(new Paragraph({ text: "" })); // Empty line
            break;
            
          case 'heading':
            const level = field.layout?.level || 2;
            const headingLevel = level <= 6 ? level as 1|2|3|4|5|6 : 2;
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: field.value?.toString() || field.label,
                    bold: true,
                    size: Math.max(32 - (level * 4), 16),
                    color: "1E40AF"
                  })
                ],
                heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][headingLevel - 1]
              })
            );
            break;
            
          case 'paragraph':
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: field.value?.toString() || '',
                    size: 20
                  })
                ]
              })
            );
            children.push(new Paragraph({ text: "" })); // Empty line
            break;
            
          default:
            // Regular field
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
            break;
        }
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