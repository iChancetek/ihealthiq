import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import type { 
  AiHopeAssessment, 
  InsertAiHopeAssessment,
  Patient 
} from '@shared/schema';

/*
<important_code_snippet_instructions>
The newest OpenAI model is "gpt-4.1", not "gpt-4". gpt-4.1 was released after your knowledge cutoff. Always prefer using gpt-4.1 as it is the latest model.
The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229".
</important_code_snippet_instructions>
*/

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface HOPEAssessmentData {
  cognition: {
    orientation: string;
    memory: string;
    executiveFunction: string;
    score: number;
  };
  physicalFunction: {
    mobility: string;
    adl: string;
    iadl: string;
    score: number;
  };
  psychosocialStatus: {
    mood: string;
    anxiety: string;
    socialSupport: string;
    score: number;
  };
  homeEnvironment: {
    safety: string;
    accessibility: string;
    caregiverSupport: string;
    score: number;
  };
}

interface SymptomImpactRanking {
  symptom: string;
  severity: number; // 1-10
  functionalImpact: number; // 1-10
  treatmentPriority: number; // 1-10
  reasoning: string;
}

interface ExplainableAIOutput {
  decisionFactors: string[];
  confidenceMetrics: Record<string, number>;
  alternativeRecommendations: string[];
  evidenceBasis: string[];
  uncertaintyAreas: string[];
}

export class AIHOPEAssessmentEngine {
  
  /**
   * Conduct comprehensive HOPE assessment
   */
  async conductHOPEAssessment(
    patientId: number,
    clinicalData: any,
    patientReportedData: any
  ): Promise<AiHopeAssessment> {
    try {
      const startTime = Date.now();
      
      // Step 1: Analyze clinical data
      const hopeData = await this.analyzeHOPEDomains(clinicalData, patientReportedData);
      
      // Step 2: Rank symptom impacts
      const symptomRanking = await this.rankSymptomImpacts(clinicalData, hopeData);
      
      // Step 3: Generate medical reasoning
      const medicalReasoning = await this.generateMedicalReasoning(hopeData, symptomRanking);
      
      // Step 4: Create explainable AI output
      const explainableOutput = await this.generateExplainableOutput(
        hopeData,
        symptomRanking,
        medicalReasoning
      );
      
      // Step 5: Analyze symptom trends
      const symptomTrends = await this.analyzeSymptomTrends(patientId, clinicalData);
      
      // Step 6: Detect inconsistencies
      const inconsistencies = await this.detectInconsistencies(
        clinicalData,
        patientReportedData,
        hopeData
      );
      
      // Step 7: Check CMS compliance
      const cmsCompliance = await this.checkCMSCompliance(hopeData, medicalReasoning);
      
      // Step 8: Generate care plan suggestions
      const careplanSuggestions = await this.generateCareplanSuggestions(
        hopeData,
        symptomRanking,
        explainableOutput
      );
      
      const processingTime = Date.now() - startTime;
      
      const assessmentData: InsertAiHopeAssessment = {
        patientId,
        assessmentData: {
          hopeData,
          processingTime,
          timestamp: new Date().toISOString()
        },
        symptomImpactRanking: symptomRanking,
        medicalReasoning,
        explainableAiOutput: explainableOutput,
        symptomTrends,
        inconsistenciesDetected: inconsistencies,
        cmsComplianceCheck: cmsCompliance,
        careplanSuggestions,
        clinicianApprovalStatus: 'pending'
      };
      
      return await storage.createAiHopeAssessment(assessmentData);
      
    } catch (error) {
      console.error('Error conducting HOPE assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to conduct HOPE assessment: ${errorMessage}`);
    }
  }
  
  /**
   * Analyze HOPE domains using Claude Sonnet 4
   */
  private async analyzeHOPEDomains(
    clinicalData: any,
    patientReportedData: any
  ): Promise<HOPEAssessmentData> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Analyze patient data for HOPE (Home-based Outcomes of Patient Experience) assessment across four key domains:

1. COGNITION
   - Orientation (person, place, time)
   - Memory (short-term, long-term)
   - Executive function (planning, decision-making)
   
2. PHYSICAL FUNCTION
   - Mobility and ambulation
   - Activities of Daily Living (ADL)
   - Instrumental Activities of Daily Living (IADL)
   
3. PSYCHOSOCIAL STATUS
   - Mood and depression screening
   - Anxiety levels
   - Social support systems
   
4. HOME ENVIRONMENT
   - Safety assessment
   - Accessibility modifications needed
   - Caregiver support availability

Clinical Data: ${JSON.stringify(clinicalData)}
Patient Reported Data: ${JSON.stringify(patientReportedData)}

Return JSON with structured assessment for each domain including scores (0-100) and detailed findings.`
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const resultText = 'text' in contentBlock ? contentBlock.text : '{}';
    return JSON.parse(resultText);
  }
  
  /**
   * Rank symptom impacts using GPT-4o
   */
  private async rankSymptomImpacts(
    clinicalData: any,
    hopeData: HOPEAssessmentData
  ): Promise<SymptomImpactRanking[]> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a clinical assessment specialist. Rank patient symptoms by their impact on function and quality of life.
          
          For each symptom, provide:
          - Severity score (1-10)
          - Functional impact score (1-10)
          - Treatment priority score (1-10)
          - Clinical reasoning for rankings
          
          Consider the HOPE assessment domains when evaluating impact.`
        },
        {
          role: "user",
          content: `Clinical Data: ${JSON.stringify(clinicalData)}
          HOPE Assessment: ${JSON.stringify(hopeData)}
          
          Rank all identified symptoms by impact and priority.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"rankings": []}');
    return result.rankings || [];
  }
  
  /**
   * Generate comprehensive medical reasoning
   */
  private async generateMedicalReasoning(
    hopeData: HOPEAssessmentData,
    symptomRanking: SymptomImpactRanking[]
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Generate comprehensive medical reasoning for this HOPE assessment.
          
          Include:
          - Clinical rationale for findings
          - Evidence-based connections between symptoms and functional impacts
          - Risk stratification reasoning
          - Intervention recommendations based on assessment
          - Prognosis considerations
          
          Use clinical terminology appropriate for healthcare professionals.`
        },
        {
          role: "user",
          content: `HOPE Assessment Data: ${JSON.stringify(hopeData)}
          Symptom Impact Rankings: ${JSON.stringify(symptomRanking)}`
        }
      ]
    });
    
    return response.choices[0].message.content || '';
  }
  
  /**
   * Generate explainable AI output for transparency
   */
  private async generateExplainableOutput(
    hopeData: HOPEAssessmentData,
    symptomRanking: SymptomImpactRanking[],
    medicalReasoning: string
  ): Promise<ExplainableAIOutput> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Create explainable AI output for this HOPE assessment to ensure transparency and clinical understanding.
          
          Provide:
          1. Key decision factors that influenced the assessment
          2. Confidence metrics for each domain (0-100)
          3. Alternative recommendations considered
          4. Evidence basis for conclusions
          5. Areas of uncertainty or requiring clinical judgment
          
          HOPE Data: ${JSON.stringify(hopeData)}
          Symptom Rankings: ${JSON.stringify(symptomRanking)}
          Medical Reasoning: ${medicalReasoning}
          
          Return structured JSON for clinical review.`
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const resultText = 'text' in contentBlock ? contentBlock.text : '{}';
    return JSON.parse(resultText);
  }
  
  /**
   * Analyze symptom trends over time
   */
  private async analyzeSymptomTrends(
    patientId: number,
    currentData: any
  ): Promise<any> {
    try {
      // Get historical assessments
      const historicalAssessments = await storage.getAiHopeAssessmentsByPatient(patientId);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `Analyze symptom trends over time to identify patterns, improvements, or deterioration.
            
            Look for:
            - Symptom progression or regression
            - Response to interventions
            - Seasonal or cyclical patterns
            - Functional capacity changes
            - Risk factor evolution`
          },
          {
            role: "user",
            content: `Current Assessment: ${JSON.stringify(currentData)}
            Historical Data: ${JSON.stringify(historicalAssessments)}
            
            Analyze trends and provide insights.`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      console.error('Error analyzing symptom trends:', error);
      return { trends: [], insights: [] };
    }
  }
  
  /**
   * Detect inconsistencies in assessment data
   */
  private async detectInconsistencies(
    clinicalData: any,
    patientReportedData: any,
    hopeData: HOPEAssessmentData
  ): Promise<string[]> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Identify inconsistencies between clinical observations, patient-reported data, and HOPE assessment findings.
          
          Look for:
          - Discrepancies between objective and subjective findings
          - Contradictory symptom reports
          - Functional assessments that don't align with reported symptoms
          - Medication adherence vs. symptom control inconsistencies
          - Social support reports vs. care coordination needs
          
          Clinical Data: ${JSON.stringify(clinicalData)}
          Patient Reported: ${JSON.stringify(patientReportedData)}
          HOPE Assessment: ${JSON.stringify(hopeData)}
          
          Return JSON array of identified inconsistencies with explanations.`
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const resultText = 'text' in contentBlock ? contentBlock.text : '{"inconsistencies": []}';
    const result = JSON.parse(resultText);
    return result.inconsistencies || [];
  }
  
  /**
   * Check CMS compliance requirements
   */
  private async checkCMSCompliance(
    hopeData: HOPEAssessmentData,
    medicalReasoning: string
  ): Promise<boolean> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Evaluate this HOPE assessment for CMS compliance requirements.
          
          Check for:
          - Proper documentation of homebound status indicators
          - Evidence of skilled nursing needs
          - Functional limitation documentation
          - Safety concerns requiring home-based care
          - Medical complexity justifying home health services
          - Physician certification requirements met
          
          Return boolean true if compliant, false if non-compliant.`
        },
        {
          role: "user",
          content: `HOPE Assessment: ${JSON.stringify(hopeData)}
          Medical Reasoning: ${medicalReasoning}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"compliant": false}');
    return result.compliant || false;
  }
  
  /**
   * Generate evidence-based care plan suggestions
   */
  private async generateCareplanSuggestions(
    hopeData: HOPEAssessmentData,
    symptomRanking: SymptomImpactRanking[],
    explainableOutput: ExplainableAIOutput
  ): Promise<any> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Generate comprehensive, evidence-based care plan suggestions based on this HOPE assessment.
          
          Include:
          - Skilled nursing interventions
          - Physical therapy recommendations
          - Occupational therapy needs
          - Speech therapy if indicated
          - Medical social work referrals
          - Home health aide services
          - Medication management
          - Safety interventions
          - Caregiver education
          - Equipment/supply needs
          - Follow-up scheduling
          - Goals and outcomes measures
          
          HOPE Assessment: ${JSON.stringify(hopeData)}
          Symptom Rankings: ${JSON.stringify(symptomRanking)}
          AI Analysis: ${JSON.stringify(explainableOutput)}
          
          Return structured care plan with priorities, interventions, and measurable goals.`
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const resultText = 'text' in contentBlock ? contentBlock.text : '{}';
    return JSON.parse(resultText);
  }
  
  /**
   * Update assessment with clinician review
   */
  async updateWithClinicianReview(
    assessmentId: number,
    clinicianNotes: string,
    approvalStatus: 'approved' | 'needs_revision' | 'rejected'
  ): Promise<AiHopeAssessment | undefined> {
    try {
      return await storage.updateAiHopeAssessment(assessmentId, {
        clinicianApprovalStatus: approvalStatus
      });
    } catch (error) {
      console.error('Error updating assessment with clinician review:', error);
      throw error;
    }
  }
  
  /**
   * Generate progress report
   */
  async generateProgressReport(patientId: number): Promise<any> {
    try {
      const assessments = await storage.getAiHopeAssessmentsByPatient(patientId);
      
      if (assessments.length === 0) {
        return { message: 'No assessments found for patient' };
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `Generate a comprehensive progress report based on sequential HOPE assessments.
            
            Include:
            - Functional improvement or decline trends
            - Goal achievement status
            - Intervention effectiveness
            - Risk factor changes
            - Recommendations for care plan modifications`
          },
          {
            role: "user",
            content: `Assessment History: ${JSON.stringify(assessments)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      console.error('Error generating progress report:', error);
      throw error;
    }
  }
}

export const aiHOPEAssessmentEngine = new AIHOPEAssessmentEngine();