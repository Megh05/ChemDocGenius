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

// Document schemas
export const hazardSchema = z.object({
  category: z.string(),
  signal: z.string(),
  pictogram: z.string().optional(),
});

export const extractedDataSchema = z.object({
  document: z.object({
    type: z.string(),
    id: z.string(),
    issueDate: z.string(),
    revision: z.string(),
  }),
  product: z.object({
    name: z.string(),
    casNumber: z.string(),
    formula: z.string(),
    purity: z.string(),
    grade: z.string(),
  }),
  supplier: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    emergency: z.string(),
  }),
  hazards: z.array(hazardSchema),
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
export type Hazard = z.infer<typeof hazardSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferSelect;
