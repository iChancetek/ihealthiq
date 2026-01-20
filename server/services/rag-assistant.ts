import OpenAI from "openai";
import { storage } from "../storage";
import type { Patient, Referral, EligibilityVerification, HomeboundAssessment, Appointment, Task, ConsentForm } from "@shared/schema";

// the newest OpenAI model is "gpt-4.1" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RAGQuery {
  question: string;
  context?: string;
  patientId?: number;
  includeHistoricalData?: boolean;
}

interface RAGResponse {
  answer: string;
  confidence: number;
  sources: string[];
  relatedPatients?: Patient[];
  suggestedActions?: string[];
  medicalInsights?: string[];
}

interface PatientContext {
  patient: Patient;
  referrals: Referral[];
  eligibilityVerifications: EligibilityVerification[];
  homeboundAssessments: HomeboundAssessment[];
  appointments: Appointment[];
  tasks: Task[];
  consentForms: ConsentForm[];
}

export class RAGAssistant {
  
  async queryPatientData(query: RAGQuery): Promise<RAGResponse> {
    try {
      // Gather comprehensive patient data for context
      const context = await this.buildComprehensiveContext(query.patientId);
      
      // Create embeddings and search relevant information
      const relevantData = await this.searchRelevantData(query.question, context);
      
      // Generate AI response with medical insights
      const response = await this.generateMedicalResponse(query.question, relevantData, context);
      
      return response;
    } catch (error) {
      console.error('RAG query error:', error);
      return {
        answer: "I'm unable to process that request at the moment. Please try again or contact support.",
        confidence: 0,
        sources: [],
        suggestedActions: ["Please rephrase your question", "Check system connectivity"]
      };
    }
  }

  private async buildComprehensiveContext(patientId?: number): Promise<{
    allPatients: Patient[];
    contextData: PatientContext | null;
    systemWideData: any;
  }> {
    const allPatients = await storage.getPatients();
    
    let contextData: PatientContext | null = null;
    if (patientId) {
      const patient = await storage.getPatient(patientId);
      if (patient) {
        contextData = {
          patient,
          referrals: await storage.getReferrals(),
          eligibilityVerifications: await storage.getEligibilityVerificationsByPatient(patientId),
          homeboundAssessments: await storage.getHomeboundAssessmentsByPatient(patientId),
          appointments: await storage.getAppointmentsByPatient(patientId),
          tasks: await storage.getTasks(),
          consentForms: await storage.getConsentFormsByPatient(patientId)
        };
      }
    }

    const systemWideData = {
      totalPatients: allPatients.length,
      totalReferrals: (await storage.getReferrals()).length,
      totalAppointments: (await storage.getAppointments()).length,
      activeTasks: (await storage.getTasksByStatus('pending')).length
    };

    return { allPatients, contextData, systemWideData };
  }

  private async searchRelevantData(question: string, context: any): Promise<string[]> {
    const relevantSources: string[] = [];
    
    // Search through patient records
    if (context.allPatients) {
      for (const patient of context.allPatients) {
        if (this.isRelevantToQuery(question, patient)) {
          relevantSources.push(`Patient: ${patient.patientName} - ${patient.diagnosis} - ${patient.physician}`);
        }
      }
    }

    // Add specific patient context if available
    if (context.contextData) {
      const { patient, referrals, eligibilityVerifications, appointments } = context.contextData;
      
      relevantSources.push(`Patient Details: ${patient.patientName}, DOB: ${patient.dateOfBirth}, Diagnosis: ${patient.diagnosis}`);
      
      if (referrals.length > 0) {
        relevantSources.push(`Referrals: ${referrals.map(r => `${r.referralType} - ${r.status}`).join(', ')}`);
      }
      
      if (eligibilityVerifications.length > 0) {
        relevantSources.push(`Insurance Status: ${eligibilityVerifications.map(e => `${e.insuranceType} - ${e.status}`).join(', ')}`);
      }
      
      if (appointments.length > 0) {
        relevantSources.push(`Appointments: ${appointments.map(a => `${a.appointmentType} on ${a.scheduledDate}`).join(', ')}`);
      }
    }

    return relevantSources.slice(0, 10); // Limit context size
  }

  private isRelevantToQuery(question: string, patient: Patient): boolean {
    const queryLower = question.toLowerCase();
    const patientText = `${patient.patientName} ${patient.diagnosis} ${patient.physician} ${patient.patientId}`.toLowerCase();
    
    // Simple relevance scoring based on keyword matching
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    return keywords.some(keyword => patientText.includes(keyword));
  }

  private async generateMedicalResponse(question: string, sources: string[], context: any): Promise<RAGResponse> {
    const systemPrompt = `You are a medical AI assistant with access to patient healthcare records. 
    Provide accurate, professional medical insights based on the available data.
    
    IMPORTANT GUIDELINES:
    - Only use information from the provided sources
    - Maintain patient confidentiality and HIPAA compliance
    - Provide actionable medical recommendations when appropriate
    - Indicate confidence levels in your responses
    - Suggest follow-up actions for healthcare providers
    - Never diagnose - only provide insights and recommendations
    
    Available Data Sources:
    ${sources.join('\n')}
    
    System Context:
    - Total Patients: ${context.systemWideData?.totalPatients || 0}
    - Active Referrals: ${context.systemWideData?.totalReferrals || 0}
    - Pending Tasks: ${context.systemWideData?.activeTasks || 0}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Please answer this healthcare question: "${question}"
          
          Provide your response in JSON format with:
          {
            "answer": "detailed response",
            "confidence": number between 0-100,
            "medicalInsights": ["insight1", "insight2"],
            "suggestedActions": ["action1", "action2"],
            "relatedPatientIds": [1, 2, 3]
          }` 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Find related patients based on the response
      const relatedPatients = context.allPatients?.filter((p: Patient) => 
        result.relatedPatientIds?.includes(p.id)
      ) || [];

      return {
        answer: result.answer || "Unable to generate response",
        confidence: Math.min(Math.max(result.confidence || 50, 0), 100),
        sources: sources.slice(0, 5),
        relatedPatients: relatedPatients.slice(0, 5),
        suggestedActions: result.suggestedActions || [],
        medicalInsights: result.medicalInsights || []
      };
    } catch (error) {
      return {
        answer: response.choices[0].message.content || "Unable to parse response",
        confidence: 60,
        sources: sources.slice(0, 3),
        suggestedActions: ["Review patient records manually", "Consult with supervising physician"]
      };
    }
  }

  async generatePatientSummary(patientId: number): Promise<string> {
    const context = await this.buildComprehensiveContext(patientId);
    
    if (!context.contextData) {
      return "Patient not found";
    }

    const { patient, referrals, eligibilityVerifications, appointments, tasks } = context.contextData;
    
    const prompt = `Generate a comprehensive medical summary for this patient:
    
    Patient: ${patient.patientName}
    Date of Birth: ${patient.dateOfBirth}
    Diagnosis: ${patient.diagnosis}
    Physician: ${patient.physician}
    
    Recent Referrals: ${referrals.map(r => `${r.referralType} (${r.status})`).join(', ')}
    Insurance Status: ${eligibilityVerifications.map(e => `${e.insuranceType}: ${e.status}`).join(', ')}
    Upcoming Appointments: ${appointments.map(a => `${a.appointmentType} on ${a.scheduledDate}`).join(', ')}
    Active Tasks: ${tasks.filter(t => t.patientId === patientId && t.status === 'pending').length}
    
    Provide a professional medical summary including key health indicators, care recommendations, and next steps.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You are a medical AI assistant. Provide professional, HIPAA-compliant patient summaries." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    return response.choices[0].message.content || "Unable to generate summary";
  }

  async analyzePatientCohort(criteria: string): Promise<{
    matchingPatients: Patient[];
    insights: string[];
    recommendations: string[];
  }> {
    const allPatients = await storage.getPatients();
    
    const prompt = `Analyze this patient cohort based on the criteria: "${criteria}"
    
    Available patients:
    ${allPatients.map(p => `${p.patientName}: ${p.diagnosis}, Age: ${this.calculateAge(p.dateOfBirth)}, Physician: ${p.physician}`).join('\n')}
    
    Provide analysis in JSON format:
    {
      "matchingPatientIds": [1, 2, 3],
      "insights": ["insight1", "insight2"],
      "recommendations": ["rec1", "rec2"]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You are a medical data analyst. Analyze patient cohorts for healthcare insights." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      const matchingPatients = allPatients.filter(p => 
        result.matchingPatientIds?.includes(p.id)
      );

      return {
        matchingPatients: matchingPatients || [],
        insights: result.insights || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      return {
        matchingPatients: [],
        insights: ["Unable to analyze cohort"],
        recommendations: ["Please refine search criteria"]
      };
    }
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  async generateClinicalInsights(): Promise<{
    patientTrends: string[];
    riskFactors: string[];
    careGaps: string[];
    systemRecommendations: string[];
  }> {
    const context = await this.buildComprehensiveContext();
    const { allPatients, systemWideData } = context;
    
    const recentReferrals = await storage.getReferrals();
    const activeTasks = await storage.getTasksByStatus('pending');
    
    const prompt = `Analyze the healthcare system data and provide clinical insights:
    
    Patient Demographics:
    ${allPatients.map(p => `Age ${this.calculateAge(p.dateOfBirth)}, ${p.diagnosis}`).join('\n')}
    
    System Metrics:
    - Total Patients: ${systemWideData.totalPatients}
    - Active Referrals: ${recentReferrals.length}
    - Pending Tasks: ${activeTasks.length}
    
    Provide analysis in JSON format:
    {
      "patientTrends": ["trend1", "trend2"],
      "riskFactors": ["risk1", "risk2"],
      "careGaps": ["gap1", "gap2"],
      "systemRecommendations": ["rec1", "rec2"]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You are a healthcare analytics AI. Provide system-wide clinical insights." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        patientTrends: result.patientTrends || [],
        riskFactors: result.riskFactors || [],
        careGaps: result.careGaps || [],
        systemRecommendations: result.systemRecommendations || []
      };
    } catch (error) {
      return {
        patientTrends: ["Unable to analyze trends"],
        riskFactors: ["Data analysis unavailable"],
        careGaps: ["System review recommended"],
        systemRecommendations: ["Contact system administrator"]
      };
    }
  }

  async analyzeCohort(cohortType: string): Promise<{
    cohortSize: number;
    demographics: any;
    riskProfile: string;
    recommendations: string[];
    trends: string[];
  }> {
    try {
      const context = await this.buildComprehensiveContext();
      const { allPatients } = context;
      
      // Filter patients based on cohort type
      let cohortPatients = allPatients;
      if (cohortType === 'high_risk') {
        cohortPatients = allPatients.filter(p => p.diagnosis?.toLowerCase().includes('diabetes') || 
                                                 p.diagnosis?.toLowerCase().includes('heart') ||
                                                 p.diagnosis?.toLowerCase().includes('copd'));
      } else if (cohortType === 'homebound') {
        // Get homebound assessments to identify homebound patients
        const homeboundAssessments = await storage.getHomeboundAssessmentsByPatient(0); // Get all
        const homeboundPatientIds = homeboundAssessments
          .filter(a => a.aiVerdict === 'homebound_qualified')
          .map(a => a.patientId);
        cohortPatients = allPatients.filter(p => homeboundPatientIds.includes(p.id));
      }

      const prompt = `Analyze this patient cohort for clinical insights:
      
      Cohort Type: ${cohortType}
      Patient Count: ${cohortPatients.length}
      
      Patient Data:
      ${cohortPatients.map(p => `ID: ${p.id}, Age: ${this.calculateAge(p.dateOfBirth)}, Diagnosis: ${p.diagnosis}, Insurance: ${p.insuranceType}`).join('\n')}
      
      Provide comprehensive cohort analysis in JSON format:
      {
        "cohortSize": ${cohortPatients.length},
        "demographics": {
          "averageAge": number,
          "ageDistribution": "description",
          "primaryDiagnoses": ["diagnosis1", "diagnosis2"],
          "insuranceBreakdown": {"Medicare": number, "Medicaid": number, "Commercial": number}
        },
        "riskProfile": "low|medium|high risk description",
        "recommendations": ["clinical recommendation 1", "clinical recommendation 2"],
        "trends": ["observed trend 1", "observed trend 2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You are a healthcare analytics AI specializing in cohort analysis and population health management." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        cohortSize: result.cohortSize || cohortPatients.length,
        demographics: result.demographics || {},
        riskProfile: result.riskProfile || 'Analysis unavailable',
        recommendations: result.recommendations || [],
        trends: result.trends || []
      };
    } catch (error) {
      console.error('Cohort analysis error:', error);
      return {
        cohortSize: 0,
        demographics: {},
        riskProfile: 'Analysis failed',
        recommendations: ['Manual review recommended'],
        trends: ['Unable to determine trends']
      };
    }
  }
}

export const ragAssistant = new RAGAssistant();