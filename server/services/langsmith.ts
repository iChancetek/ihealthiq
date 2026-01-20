import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
import OpenAI from "openai";

/**
 * LangSmith Healthcare AI Monitoring Service
 * Provides comprehensive tracing and monitoring for AI/ML operations in iSynera Healthcare Platform
 */
export class LangSmithService {
  private client: Client;
  private openai: OpenAI;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.LANGSMITH_TRACING === 'true';
    
    if (this.isEnabled) {
      // Initialize LangSmith client
      this.client = new Client({
        apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
        apiKey: process.env.LANGSMITH_API_KEY,
      });

      // Initialize OpenAI with LangSmith wrapper for automatic tracing
      this.openai = wrapOpenAI(new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }));

      console.log('LangSmith monitoring initialized for iSynera Healthcare Platform');
      console.log(`Project: ${process.env.LANGSMITH_PROJECT}`);
    } else {
      // Fallback to regular OpenAI without tracing
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('LangSmith monitoring disabled - using standard OpenAI client');
    }
  }

  /**
   * Get traced OpenAI client for healthcare AI operations
   */
  getOpenAIClient(): OpenAI {
    return this.openai;
  }

  /**
   * Create a traceable function for healthcare AI operations
   */
  createTraceable<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
    metadata?: Record<string, any>
  ): T {
    if (!this.isEnabled) {
      return fn;
    }

    return traceable(fn, {
      name,
      project_name: process.env.LANGSMITH_PROJECT,
      metadata: {
        ...metadata,
        service: 'iSynera Healthcare Platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    });
  }

  /**
   * Log healthcare AI operation with custom metadata
   */
  async logOperation(
    operationName: string,
    input: any,
    output: any,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.client.createRun({
        name: operationName,
        project_name: process.env.LANGSMITH_PROJECT,
        inputs: input,
        outputs: output,
        run_type: "llm",
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          service: 'iSynera Healthcare Platform',
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (error) {
      console.error('Failed to log operation to LangSmith:', error);
    }
  }

  /**
   * Trace SOAP note generation for clinical documentation
   */
  traceSoapNoteGeneration = this.createTraceable(
    'soap_note_generation',
    async (transcription: string, patientContext?: any) => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a healthcare AI assistant generating SOAP notes from clinical transcriptions. Follow medical documentation standards and ensure accuracy. Return JSON format with subjective, objective, assessment, plan fields and confidence scores."
          },
          {
            role: "user",
            content: `Convert this clinical transcript into structured SOAP notes format:

SUBJECTIVE: Patient's reported symptoms, concerns, and history
OBJECTIVE: Observable findings, vital signs, examination results  
ASSESSMENT: Clinical impression, diagnosis, differential diagnosis
PLAN: Treatment plan, follow-up, recommendations

Also provide confidence scores (0-100) for each section based on the clarity and completeness of information.

Transcript:
${transcription}

Return as JSON with structure:
{
  "subjective": "string",
  "objective": "string", 
  "assessment": "string",
  "plan": "string",
  "confidence": {
    "subjective": number,
    "objective": number,
    "assessment": number,
    "plan": number,
    "overall": number
  }
}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    },
    {
      operation_type: 'clinical_documentation',
      ai_model: 'gpt-4o',
      healthcare_module: 'iSynera_Scribe'
    }
  );

  /**
   * Trace AI referral processing for intake automation
   */
  traceReferralProcessing = this.createTraceable(
    'referral_processing',
    async (documentText: string, extractionType: string) => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a medical document analysis AI. Extract structured data from healthcare documents and return ONLY a valid JSON object with no additional text.

{
  "extractedData": {
    "patientName": "",
    "dateOfBirth": "",
    "ssn": "",
    "address": "",
    "phone": "", 
    "email": "",
    "insuranceInfo": {
      "primaryInsurance": "",
      "policyNumber": "",
      "groupNumber": "",
      "memberID": ""
    },
    "medicalInfo": {
      "diagnosis": [],
      "medications": [],
      "allergies": [],
      "medicalHistory": "",
      "physicianName": "",
      "physicianNPI": ""
    },
    "referralInfo": {
      "referralDate": "",
      "referralSource": "",
      "servicesRequested": [],
      "urgency": "routine",
      "authorizationRequired": false
    }
  },
  "ocrConfidence": 85,
  "nlpConfidence": 85,
  "overallConfidence": 85,
  "fieldsExtracted": 0,
  "missingCriticalFields": [],
  "validationIssues": [],
  "complianceFlags": [],
  "aiSummary": ""
}

Return ONLY the JSON. No explanations.`
          },
          {
            role: "user",
            content: `Analyze this medical document and extract all relevant healthcare intake information:\n\n${documentText}`
          }
        ],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content);
    },
    {
      operation_type: 'document_processing',
      ai_model: 'gpt-4o',
      healthcare_module: 'AI_Referral_Acceleration'
    }
  );

  /**
   * Trace AI clinical recommendations generation
   */
  traceAIRecommendations = this.createTraceable(
    'ai_clinical_recommendations',
    async (clinicalData: any, patientContext: any) => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a healthcare AI assistant generating clinical recommendations based on patient data and SOAP notes. Provide actionable insights for healthcare providers in JSON format."
          },
          {
            role: "user",
            content: `Generate clinical recommendations based on this data:\n\nClinical Data: ${JSON.stringify(clinicalData)}\nPatient Context: ${JSON.stringify(patientContext)}`
          }
        ],
        response_format: { type: "json_object" },
      });

      return response.choices[0].message.content;
    },
    {
      operation_type: 'clinical_recommendations',
      ai_model: 'gpt-4o',
      healthcare_module: 'AI_Recommendations_Panel'
    }
  );

  /**
   * Trace homebound assessment AI processing
   */
  traceHomeboundAssessment = this.createTraceable(
    'homebound_assessment',
    async (patientData: any, clinicalNotes: string) => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a healthcare AI assistant performing CMS-compliant homebound assessments. Evaluate patient eligibility based on clinical criteria."
          },
          {
            role: "user",
            content: `Perform homebound assessment for:\n\nPatient Data: ${JSON.stringify(patientData)}\nClinical Notes: ${clinicalNotes}`
          }
        ],
        response_format: { type: "json_object" },
      });

      return response.choices[0].message.content;
    },
    {
      operation_type: 'homebound_assessment',
      ai_model: 'gpt-4o',
      healthcare_module: 'HOPE_Clinical_Decision'
    }
  );

  /**
   * Trace eligibility verification AI processing
   */
  traceEligibilityVerification = this.createTraceable(
    'eligibility_verification',
    async (insuranceData: any, patientInfo: any) => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a healthcare AI assistant processing insurance eligibility verification. Analyze eligibility documents and extract key information."
          },
          {
            role: "user",
            content: `Process eligibility verification for:\n\nInsurance Data: ${JSON.stringify(insuranceData)}\nPatient Info: ${JSON.stringify(patientInfo)}`
          }
        ],
        response_format: { type: "json_object" },
      });

      return response.choices[0].message.content;
    },
    {
      operation_type: 'eligibility_verification',
      ai_model: 'gpt-4o',
      healthcare_module: 'Eligibility_Verification_Service'
    }
  );

  /**
   * Check if LangSmith monitoring is enabled
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get LangSmith client for advanced operations
   */
  getClient(): Client | null {
    return this.isEnabled ? this.client : null;
  }
}

// Export singleton instance
export const langSmithService = new LangSmithService();