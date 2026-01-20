import { extractReferralData } from "./openai.js";

export interface OCRResult {
  text: string;
  confidence: number;
  extractedData?: any;
}

export class OCRService {
  private googleVisionApiKey: string;

  constructor() {
    this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || "test_key";
  }

  async processDocument(imageBuffer: Buffer, documentType: 'referral' | 'consent' | 'other' = 'referral'): Promise<OCRResult> {
    try {
      if (!this.googleVisionApiKey || this.googleVisionApiKey === "test_key") {
        throw new Error("Google Vision API key not configured");
      }

      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');

      // Call Google Vision API
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`);
      }

      const result = await response.json();
      const textAnnotations = result.responses?.[0]?.textAnnotations;
      
      if (!textAnnotations || textAnnotations.length === 0) {
        throw new Error("No text detected in the document");
      }

      const extractedText = textAnnotations[0].description;
      const confidence = textAnnotations[0].confidence || 0.8;

      let extractedData;
      if (documentType === 'referral') {
        extractedData = await extractReferralData(extractedText);
      }

      return {
        text: extractedText,
        confidence,
        extractedData
      };
    } catch (error) {
      console.error("OCR processing failed:", error);
      throw new Error("OCR processing failed: " + (error as Error).message);
    }
  }

  async processPDF(pdfBuffer: Buffer): Promise<OCRResult> {
    // For simplicity, we'll treat PDFs as images for now
    // In a real implementation, you'd convert PDF pages to images first
    return this.processDocument(pdfBuffer, 'referral');
  }
}

export const ocrService = new OCRService();
