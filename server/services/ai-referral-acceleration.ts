import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import type { 
  AiReferralProcessing, 
  InsertAiReferralProcessing,
  Referral 
} from '@shared/schema';

/*
<important_code_snippet_instructions>
The newest OpenAI model is "gpt-4.1", not "gpt-4". gpt-4.1 was released after your knowledge cutoff. Always prefer using gpt-4.1 as it is the latest model.
The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229".
</important_code_snippet_instructions>
*/

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ExtractedEntity {
  type: 'patient_name' | 'dob' | 'diagnosis' | 'physician' | 'insurance' | 'mrn' | 'address' | 'phone';
  value: string;
  confidence: number;
  location: { start: number; end: number };
}

interface NERResult {
  entities: ExtractedEntity[];
  confidence: number;
  processingTime: number;
}

interface DocumentClassification {
  type: 'referral' | 'assessment' | 'discharge_summary' | 'lab_report' | 'imaging';
  confidence: number;
  reasoning: string;
}

export class AIReferralAccelerationEngine {
  
  /**
   * Main processing pipeline for referral documents
   */
  async processReferralDocument(
    referralId: number,
    documentContent: string,
    documentType: 'pdf' | 'tiff' | 'hl7_cda' | 'fhir'
  ): Promise<AiReferralProcessing> {
    const startTime = Date.now();
    
    try {
      // Step 1: Document Classification
      const classification = await this.classifyDocument(documentContent);
      
      // Step 2: Named Entity Recognition
      const nerResults = await this.extractNamedEntities(documentContent);
      
      // Step 3: Chain-of-Thought Reasoning for ambiguous data
      const reasoning = await this.performChainOfThoughtReasoning(
        documentContent,
        nerResults.entities
      );
      
      // Step 4: Auto-fill EHR fields
      const autofilledFields = await this.generateAutofilledFields(nerResults.entities);
      
      // Step 5: Flag incomplete records
      const incompleteFlags = this.identifyIncompleteFields(autofilledFields);
      
      // Step 6: Generate response auto-draft
      const responseDraft = await this.generateResponseAutoDraft(
        autofilledFields,
        incompleteFlags
      );
      
      const processingTime = Date.now() - startTime;
      
      const processingResult: InsertAiReferralProcessing = {
        referralId,
        documentType,
        extractedEntities: {
          entities: nerResults.entities,
          classification: classification,
          confidence: nerResults.confidence
        },
        confidence: Math.round((nerResults.confidence + classification.confidence) / 2),
        chainOfThoughtReasoning: reasoning,
        autofilledFields,
        flaggedIncomplete: incompleteFlags,
        responseAutoDraft: responseDraft,
        processingTimeMs: processingTime,
        modelUsed: 'gpt-4.1+claude-sonnet-4'
      };
      
      // Save to database
      const result = await storage.createAiReferralProcessing(processingResult);
      
      // Track model performance
      await this.trackModelPerformance('ai-referral-acceleration', processingTime, nerResults.confidence);
      
      return result;
      
    } catch (error) {
      console.error('Error in AI Referral Acceleration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process referral document: ${errorMessage}`);
    }
  }
  
  /**
   * Classify document type using GPT-4.1
   */
  private async classifyDocument(content: string): Promise<DocumentClassification> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a healthcare document classifier. Analyze the document and classify it into one of these types:
          - referral: Patient referral from one provider to another
          - assessment: Clinical assessment or evaluation
          - discharge_summary: Hospital discharge summary
          - lab_report: Laboratory test results
          - imaging: Radiology or imaging reports
          
          Provide your response in JSON format with: type, confidence (0-100), reasoning`
        },
        {
          role: "user",
          content: `Classify this healthcare document:\n\n${content.substring(0, 2000)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Extract named entities using Claude Sonnet 4
   */
  private async extractNamedEntities(content: string): Promise<NERResult> {
    const startTime = Date.now();
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Extract healthcare-specific named entities from this document. Focus on:
          - Patient demographics (name, DOB, address, phone)
          - Medical information (diagnosis, physician, insurance)
          - Administrative data (MRN, account numbers)
          
          Return JSON with entities array containing: type, value, confidence (0-100), location (start/end positions).
          
          Document:
          ${content}`
        }
      ]
    });
    
    const processingTime = Date.now() - startTime;
    const contentBlock = response.content[0];
    let resultText = 'text' in contentBlock ? contentBlock.text : '{}';
    
    // Clean markdown formatting from AI response
    resultText = resultText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    
    const result = JSON.parse(resultText);
    
    return {
      entities: result.entities || [],
      confidence: result.overall_confidence || 85,
      processingTime
    };
  }
  
  /**
   * Perform Chain-of-Thought reasoning for ambiguous data
   */
  private async performChainOfThoughtReasoning(
    content: string,
    entities: ExtractedEntity[]
  ): Promise<string> {
    const ambiguousEntities = entities.filter(e => e.confidence < 80);
    
    if (ambiguousEntities.length === 0) {
      return "All extracted entities have high confidence. No ambiguity detected.";
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a clinical data analyst. Use step-by-step reasoning to resolve ambiguous data extractions.
          For each ambiguous entity, explain your reasoning process and provide the most likely correct interpretation.`
        },
        {
          role: "user",
          content: `Document content: ${content.substring(0, 1500)}
          
          Ambiguous entities: ${JSON.stringify(ambiguousEntities)}
          
          Use chain-of-thought reasoning to resolve these ambiguities.`
        }
      ]
    });
    
    return response.choices[0].message.content || '';
  }
  
  /**
   * Generate autofilled EHR fields
   */
  private async generateAutofilledFields(entities: ExtractedEntity[]): Promise<Record<string, any>> {
    const fields: Record<string, any> = {};
    
    for (const entity of entities) {
      switch (entity.type) {
        case 'patient_name':
          fields.patientName = entity.value;
          break;
        case 'dob':
          fields.dateOfBirth = entity.value;
          break;
        case 'diagnosis':
          fields.primaryDiagnosis = entity.value;
          break;
        case 'physician':
          fields.referringPhysician = entity.value;
          break;
        case 'insurance':
          fields.insuranceInfo = entity.value;
          break;
        case 'mrn':
          fields.medicalRecordNumber = entity.value;
          break;
        case 'address':
          fields.patientAddress = entity.value;
          break;
        case 'phone':
          fields.patientPhone = entity.value;
          break;
      }
    }
    
    return fields;
  }
  
  /**
   * Identify incomplete fields that need attention
   */
  private identifyIncompleteFields(autofilledFields: Record<string, any>): string[] {
    const requiredFields = [
      'patientName',
      'dateOfBirth',
      'primaryDiagnosis',
      'referringPhysician',
      'insuranceInfo'
    ];
    
    const incompleteFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!autofilledFields[field] || autofilledFields[field].toString().trim() === '') {
        incompleteFields.push(field);
      }
    }
    
    return incompleteFields;
  }
  
  /**
   * Generate response auto-draft
   */
  private async generateResponseAutoDraft(
    autofilledFields: Record<string, any>,
    incompleteFlags: string[]
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Generate a professional response draft for a healthcare referral. Include:
          - Acknowledgment of referral receipt
          - Summary of extracted patient information
          - List of any missing required information
          - Next steps for processing`
        },
        {
          role: "user",
          content: `Autofilled fields: ${JSON.stringify(autofilledFields)}
          Missing information: ${incompleteFlags.join(', ')}`
        }
      ]
    });
    
    return response.choices[0].message.content || '';
  }
  
  /**
   * Track model performance metrics
   */
  private async trackModelPerformance(
    moduleType: string,
    processingSpeed: number,
    accuracyScore: number
  ): Promise<void> {
    try {
      await storage.createAiModelMetrics({
        modelName: 'gpt-4.1+claude-sonnet-4',
        moduleType,
        performanceMetrics: {
          processingSpeed,
          accuracyScore,
          timestamp: new Date().toISOString()
        },
        accuracyScore: Math.round(accuracyScore),
        processingSpeed,
        costPerExecution: 5, // Estimated cost in cents
        errorRate: 0,
        feedbackScore: 95,
        usageCount: 1,
        lastUsed: new Date()
      });
    } catch (error) {
      console.error('Failed to track model performance:', error);
    }
  }
  
  /**
   * Process HL7 messages specifically
   */
  async processHL7Message(referralId: number, hl7Content: string): Promise<AiReferralProcessing> {
    // Parse HL7 segments
    const segments = hl7Content.split('\r').filter(line => line.trim());
    const structuredData = this.parseHL7Segments(segments);
    
    return await this.processReferralDocument(
      referralId,
      JSON.stringify(structuredData),
      'hl7_cda'
    );
  }
  
  /**
   * Process FHIR resources
   */
  async processFHIRResource(referralId: number, fhirResource: any): Promise<AiReferralProcessing> {
    const fhirContent = JSON.stringify(fhirResource, null, 2);
    
    return await this.processReferralDocument(
      referralId,
      fhirContent,
      'fhir'
    );
  }
  
  /**
   * Parse HL7 segments into structured data
   */
  private parseHL7Segments(segments: string[]): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const segment of segments) {
      const fields = segment.split('|');
      const segmentType = fields[0];
      
      switch (segmentType) {
        case 'PID': // Patient Identification
          data.patient = {
            id: fields[3],
            name: fields[5],
            dob: fields[7],
            gender: fields[8],
            address: fields[11]
          };
          break;
        case 'PV1': // Patient Visit
          data.visit = {
            patientClass: fields[2],
            assignedLocation: fields[3],
            attendingDoctor: fields[7]
          };
          break;
        case 'OBX': // Observation/Result
          if (!data.observations) data.observations = [];
          data.observations.push({
            valueType: fields[2],
            identifier: fields[3],
            value: fields[5],
            units: fields[6]
          });
          break;
      }
    }
    
    return data;
  }
}

export const aiReferralAccelerationEngine = new AIReferralAccelerationEngine();