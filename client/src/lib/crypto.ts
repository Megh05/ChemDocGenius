// Simple client-side encryption for API keys
// Note: This is basic encryption for local storage. In production, consider more robust solutions.

const ENCRYPTION_KEY = "chemdoc-processor-key-v1";

export async function encryptApiKey(apiKey: string): Promise<string> {
  try {
    // For demo purposes, use base64 encoding
    // In production, use proper encryption
    return btoa(apiKey);
  } catch (error) {
    console.error("Encryption failed:", error);
    return apiKey; // Fallback to plain text
  }
}

export async function decryptApiKey(encryptedKey: string): Promise<string> {
  try {
    // For demo purposes, use base64 decoding
    // In production, use proper decryption
    return atob(encryptedKey);
  } catch (error) {
    console.error("Decryption failed:", error);
    return encryptedKey; // Fallback to returning as-is
  }
}

export function storeApiKeyLocally(encryptedKey: string): void {
  try {
    localStorage.setItem("mistral_api_key", encryptedKey);
  } catch (error) {
    console.error("Failed to store API key locally:", error);
  }
}

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem("mistral_api_key");
  } catch (error) {
    console.error("Failed to retrieve stored API key:", error);
    return null;
  }
}

export function removeStoredApiKey(): void {
  try {
    localStorage.removeItem("mistral_api_key");
  } catch (error) {
    console.error("Failed to remove stored API key:", error);
  }
}
