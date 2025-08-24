import fs from "fs";
import path from "path";

export class FileStorage {
  private uploadsDir = "uploads";

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async storeFile(documentId: string, tempPath: string): Promise<void> {
    const targetPath = this.getFilePath(documentId);
    await fs.promises.copyFile(tempPath, targetPath);
  }

  getFilePath(documentId: string): string {
    return path.join(this.uploadsDir, `${documentId}.pdf`);
  }

  async deleteFile(documentId: string): Promise<void> {
    const filePath = this.getFilePath(documentId);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
      console.warn(`Could not delete file for document ${documentId}:`, error);
    }
  }

  async fileExists(documentId: string): Promise<boolean> {
    const filePath = this.getFilePath(documentId);
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
