import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalFileName: text("original_file_name").notNull(),
  extractedData: jsonb("extracted_data"),
  companyData: jsonb("company_data"),
  status: text("status").notNull().default("uploaded"),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key"),
  encryptedApiKey: text("encrypted_api_key"),
  lastTested: timestamp("last_tested"),
  connectionStatus: text("connection_status").default("untested"),
});

// Dynamic field schema for flexible document structure
export const dynamicFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string().or(z.number()).or(z.boolean()).or(z.null()),
  type: z.enum(['text', 'number', 'date', 'email', 'phone', 'textarea', 'select', 'boolean']),
  section: z.string(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select fields
  validation: z.object({
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    message: z.string().optional(),
  }).optional(),
});

export const extractedDataSchema = z.object({
  documentType: z.string(),
  detectedSections: z.array(z.string()),
  fields: z.array(dynamicFieldSchema),
  metadata: z.object({
    originalFileName: z.string().optional(),
    extractedAt: z.string().optional(),
    confidence: z.number().optional(),
    totalFields: z.number().optional(),
  }).optional(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  lastTested: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type ExtractedData = z.infer<typeof extractedDataSchema>;
export type DynamicField = z.infer<typeof dynamicFieldSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferSelect;
