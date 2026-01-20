import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { langSmithService } from './langsmith';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface DocumentAnalysisResult {
  extractedData: {
    patientName?: string;
    dateOfBirth?: string;
    ssn?: string;
    address?: string;
    phone?: string;
    email?: string;
    insuranceInfo?: {
      primaryInsurance?: string;
      policyNumber?: string;
      groupNumber?: string;
      memberID?: string;
    };
    medicalInfo?: {
      diagnosis?: string[];
      medications?: string[];
      allergies?: string[];
      medicalHistory?: string;
      physicianName?: string;
      physicianNPI?: string;
    };
    referralInfo?: {
      referralDate?: string;
      referralSource?: string;
      servicesRequested?: string[];
      urgency?: string;
      authorizationRequired?: boolean;
    };
  };
  ocrConfidence: number;
  nlpConfidence: number;
  overallConfidence: number;
  fieldsExtracted: number;
  missingCriticalFields: string[];
  validationIssues: string[];
  complianceFlags: string[];
  aiSummary: string;
  processingTime: number;
}

export interface OCRProcessingResult {
  extractedText: string;
  confidence: number;
  language: string;
  documentType: string;
  pageCount: number;
  processingTime: number;
}

export class AIDocumentProcessor {
  
  // OCR Processing with Intelligent Text Extraction
  async performOCR(documentContent: string, fileType: string): Promise<OCRProcessingResult> {
    const startTime = Date.now();
    
    try {
      // For now, we'll handle text files and simulate OCR for other types
      if (fileType === 'application/pdf') {
        // TODO: Integrate with actual PDF OCR service
        throw new Error('PDF OCR not yet implemented - please convert to text format');
      }
      
      if (fileType === 'image/jpeg' || fileType === 'image/png') {
        // TODO: Integrate with actual image OCR service
        throw new Error('Image OCR not yet implemented - please convert to text format');
      }
      
      // For text files, return as-is
      const textContent = Buffer.from(documentContent, 'base64').toString('utf-8');
      
      return {
        extractedText: textContent,
        confidence: 1.0,
        language: "en",
        documentType: this.detectDocumentType(textContent),
        pageCount: 1,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to perform OCR processing');
    }
  }

  // Advanced NLP Processing with Field Extraction
  async performNLPAnalysis(text: string): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Use LangSmith-traced referral processing for document analysis
      const rawAnalysis = await langSmithService.traceReferralProcessing(text, 'healthcare_intake_processing');
      
      // Ensure proper structure and add processing metrics
      const analysis = {
        ...rawAnalysis,
        processingTime: Date.now() - startTime
      };

      return analysis;
    } catch (error) {
      console.error('NLP Analysis error:', error);
      throw new Error('Failed to perform NLP analysis');
    }
  }

  // Detect document type from content
  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('referral') || lowerText.includes('refer')) {
      return 'medical_referral';
    } else if (lowerText.includes('insurance') || lowerText.includes('eligibility')) {
      return 'insurance_document';
    } else if (lowerText.includes('prescription') || lowerText.includes('medication')) {
      return 'prescription';
    } else if (lowerText.includes('discharge') || lowerText.includes('summary')) {
      return 'discharge_summary';
    } else if (lowerText.includes('lab') || lowerText.includes('test results')) {
      return 'lab_results';
    } else {
      return 'general_medical';
    }
  }

  // Create instance method for export compatibility
  analyzeDocument = async (fileContent: string, fileName: string): Promise<DocumentAnalysisResult> => {
    const text = Buffer.from(fileContent, 'base64').toString('utf-8');
    return this.performNLPAnalysis(text);
  };
}

// Create and export instance
export const aiDocumentProcessor = new AIDocumentProcessor();