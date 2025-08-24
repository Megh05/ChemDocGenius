import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertDocumentSchema, insertSettingsSchema, extractedDataSchema } from "@shared/schema";
import { MistralService } from "./services/mistral";
import { DocumentGenerator } from "./services/document-generator.js";
import { FileStorage } from "./services/file-storage.js";

const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

const mistralService = new MistralService();
const documentGenerator = new DocumentGenerator();
const fileStorage = new FileStorage();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload PDF document
  app.post("/api/documents/upload", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const document = await storage.createDocument({
        originalFileName: req.file.originalname,
        extractedData: null,
        companyData: null,
        status: "uploaded"
      });

      // Store the file
      await fileStorage.storeFile(document.id, req.file.path);
      
      // Clean up temp file
      fs.unlinkSync(req.file.path);

      res.json(document);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Process document with Mistral AI
  app.post("/api/documents/:id/process", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Update status to processing
      await storage.updateDocument(id, { status: "processing" });

      // Get settings for API key
      const settings = await storage.getSettings();
      if (!settings?.apiKey && !settings?.encryptedApiKey) {
        return res.status(400).json({ message: "Mistral API key not configured" });
      }

      // Extract text and data using Mistral
      const filePath = fileStorage.getFilePath(id);
      const extractedData = await mistralService.processDocument(filePath, settings);

      // Update document with extracted data
      const updatedDocument = await storage.updateDocument(id, {
        extractedData,
        status: "processed"
      });

      res.json(updatedDocument);
    } catch (error: any) {
      console.error("Processing error:", error);
      await storage.updateDocument(req.params.id, { status: "error" });
      res.status(500).json({ message: "Processing failed", error: error.message });
    }
  });

  // Update document data
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate extracted data if provided
      if (updates.extractedData) {
        const validData = extractedDataSchema.parse(updates.extractedData);
        updates.extractedData = validData;
      }

      const document = await storage.updateDocument(id, updates);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error: any) {
      console.error("Update error:", error);
      res.status(500).json({ message: "Update failed", error: error.message });
    }
  });

  // Generate company document
  app.post("/api/documents/:id/generate", async (req, res) => {
    try {
      const { id } = req.params;
      const { format = "pdf" } = req.body; // pdf or docx
      
      const document = await storage.getDocument(id);
      if (!document || !document.extractedData) {
        return res.status(404).json({ message: "Document not found or not processed" });
      }

      const generatedFile = await documentGenerator.generateDocument(document, format);
      
      // Set appropriate headers
      const filename = `${document.originalFileName.replace('.pdf', '')}_company.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      res.send(generatedFile);
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ message: "Generation failed", error: error.message });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Fetch documents error:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Fetch document error:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete file from storage
      await fileStorage.deleteFile(id);
      
      // Delete from database
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      // Don't send API key in response
      if (settings) {
        const { apiKey, encryptedApiKey, ...safeSettings } = settings;
        res.json({ ...safeSettings, hasApiKey: !!(apiKey || encryptedApiKey) });
      } else {
        res.json({ hasApiKey: false });
      }
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const validSettings = insertSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validSettings);
      
      // Don't send API key in response
      const { apiKey, encryptedApiKey, ...safeSettings } = settings;
      res.json({ ...safeSettings, hasApiKey: !!(apiKey || encryptedApiKey) });
    } catch (error: any) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings", error: error.message });
    }
  });

  // Test API connection
  app.post("/api/settings/test", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.apiKey && !settings?.encryptedApiKey) {
        return res.status(400).json({ message: "API key not configured" });
      }

      const isConnected = await mistralService.testConnection(settings);
      
      await storage.updateSettings({
        ...settings,
        connectionStatus: isConnected ? "connected" : "failed"
      });

      res.json({ connected: isConnected });
    } catch (error: any) {
      console.error("Test connection error:", error);
      res.status(500).json({ message: "Connection test failed", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
