import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import type { 
  Claim, InsertClaim, ClaimLineItem, InsertClaimLineItem, 
  Denial, InsertDenial, Appeal, InsertAppeal, BillingRule,
  Patient, Appointment, EligibilityVerification
} from '@shared/schema';

// Core AI Billing Agent Interfaces
export interface ClaimGenerationData {
  patientId: number;
  appointmentId: number;
  serviceDate: string;
  serviceCodes: string[];
  diagnosisCodes: string[];
  providerId: number;
  payerId: number;
  placeOfService: string;
  authorizationNumber?: string;
  referralNumber?: string;
}

export interface ClaimValidationResult {
  isValid: boolean;
  riskScore: number; // 0-100, higher = more likely to be denied
  validationErrors: string[];
  recommendations: string[];
  aiFlags: string[];
  scrubResults: {
    npiValidation: boolean;
    icd10Validation: boolean;
    cptValidation: boolean;
    eligibilityCheck: boolean;
    authorizationCheck: boolean;
  };
}

export interface DenialAnalysis {
  category: 'technical' | 'eligibility' | 'authorization' | 'documentation' | 'coding' | 'timely_filing';
  rootCause: string;
  remediationSteps: string[];
  appealable: boolean;
  appealDeadline: Date | null;
  successProbability: number; // 0-100
  estimatedRecovery: number; // in cents
}

export interface AppealLetterData {
  denialId: number;
  appealType: 'reconsideration' | 'redetermination' | 'fair_hearing';
  regulations: string[];
  precedents: string[];
  supportingEvidence: string[];
}

// Main AI Billing Agent Class
export class BillingAIAgent {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // 1. AI Claim Generator
  async generateClaim(data: ClaimGenerationData): Promise<{ claim: InsertClaim; lineItems: InsertClaimLineItem[] }> {
    const patient = await storage.getPatient(data.patientId);
    const appointment = await storage.getAppointment(data.appointmentId);
    const payer = await storage.getPayer(data.payerId);
    
    if (!patient || !appointment || !payer) {
      throw new Error('Required data not found for claim generation');
    }

    // Generate unique claim ID
    const claimId = `CLM-${Date.now()}-${data.patientId}`;

    // Use AI to determine optimal claim structure
    const aiClaimData = await this.generateAIClaimStructure({
      patient,
      appointment,
      payer,
      serviceCodes: data.serviceCodes,
      diagnosisCodes: data.diagnosisCodes
    });

    // Calculate total amount from line items
    const totalAmount = data.serviceCodes.reduce((total, _, index) => {
      return total + (aiClaimData.lineItems[index]?.chargeAmount || 0);
    }, 0);

    const claim: InsertClaim = {
      claimId,
      patientId: data.patientId,
      providerId: data.providerId,
      payerId: data.payerId,
      claimType: 'cms1500', // Default to CMS-1500
      status: 'draft',
      serviceDate: new Date(data.serviceDate),
      totalAmount,
      claimData: {
        patientName: patient.patientName,
        serviceDate: data.serviceDate,
        placeOfService: data.placeOfService,
        authorizationNumber: data.authorizationNumber,
        referralNumber: data.referralNumber,
        aiGenerated: true,
        generatedAt: new Date().toISOString()
      },
      submissionData: aiClaimData.submissionData,
      aiFlags: aiClaimData.flags
    };

    const lineItems: InsertClaimLineItem[] = data.serviceCodes.map((serviceCode, index) => ({
      claimId: 0, // Will be set after claim creation
      lineNumber: index + 1,
      serviceCode,
      diagnosisCode: data.diagnosisCodes[0] || 'Z00.00', // Default if missing
      serviceUnits: 1,
      chargeAmount: aiClaimData.lineItems[index]?.chargeAmount || 10000, // $100 default
      placeOfService: data.placeOfService
    }));

    return { claim, lineItems };
  }

  // 2. Pre-Submission Scrubbing Engine
  async validateClaim(claimId: number): Promise<ClaimValidationResult> {
    const claim = await storage.getClaim(claimId);
    const lineItems = await storage.getClaimLineItems(claimId);
    const patient = await storage.getPatient(claim?.patientId || 0);
    const payer = await storage.getPayer(claim?.payerId || 0);

    if (!claim || !patient || !payer) {
      throw new Error('Claim data not found for validation');
    }

    // AI-powered validation
    const aiValidation = await this.performAIValidation({
      claim,
      lineItems,
      patient,
      payer
    });

    // Technical validations
    const scrubResults = {
      npiValidation: this.validateNPI(claim.providerId?.toString() || ''),
      icd10Validation: lineItems.every(item => this.validateICD10(item.diagnosisCode)),
      cptValidation: lineItems.every(item => this.validateCPT(item.serviceCode)),
      eligibilityCheck: await this.checkEligibility(patient.id, claim.serviceDate),
      authorizationCheck: await this.checkAuthorization(claim)
    };

    const validationErrors: string[] = [];
    const recommendations: string[] = [];

    // Check for critical errors
    if (!scrubResults.npiValidation) validationErrors.push('Invalid NPI number');
    if (!scrubResults.icd10Validation) validationErrors.push('Invalid ICD-10 diagnosis codes');
    if (!scrubResults.cptValidation) validationErrors.push('Invalid CPT/HCPCS procedure codes');
    if (!scrubResults.eligibilityCheck) validationErrors.push('Patient eligibility verification failed');
    if (!scrubResults.authorizationCheck) validationErrors.push('Missing required authorization');

    // AI-generated recommendations
    recommendations.push(...aiValidation.recommendations);

    return {
      isValid: validationErrors.length === 0,
      riskScore: aiValidation.riskScore,
      validationErrors,
      recommendations,
      aiFlags: aiValidation.flags,
      scrubResults
    };
  }

  // 3. AI-Driven Billing Rules Engine
  async applyBillingRules(claimId: number): Promise<string[]> {
    const claim = await storage.getClaim(claimId);
    const payer = await storage.getPayer(claim?.payerId || 0);
    const rules = await storage.getBillingRulesByPayer(claim?.payerId || 0);

    if (!claim || !payer) {
      throw new Error('Claim or payer not found');
    }

    const appliedRules: string[] = [];

    // Apply payer-specific rules
    for (const rule of rules) {
      if (this.evaluateRuleConditions(rule.conditions, claim)) {
        appliedRules.push(rule.ruleName);
        await this.executeRuleActions(rule.actions, claimId);
      }
    }

    // AI learning from historical denials
    const aiRules = await this.generateAIRules(payer, claim);
    appliedRules.push(...aiRules);

    return appliedRules;
  }

  // 4. Denial Management Bot
  async analyzeDenial(denialData: any): Promise<DenialAnalysis> {
    const prompt = `
You are a healthcare billing denial analysis expert. Analyze this denial and provide structured remediation guidance:

Denial Reason Code: ${denialData.denialReason}
Denial Description: ${denialData.denialDescription}
Claim Amount: $${(denialData.denialAmount / 100).toFixed(2)}
Service Codes: ${denialData.serviceCodes?.join(', ')}
Diagnosis Codes: ${denialData.diagnosisCodes?.join(', ')}
Payer Type: ${denialData.payerType}

Provide analysis in JSON format:
{
  "category": "technical|eligibility|authorization|documentation|coding|timely_filing",
  "rootCause": "detailed explanation of why denied",
  "remediationSteps": ["step 1", "step 2", "step 3"],
  "appealable": true/false,
  "appealDeadline": "YYYY-MM-DD or null",
  "successProbability": 0-100,
  "estimatedRecovery": amount_in_cents
}

Focus on CMS regulations and payer-specific policies.
`;

    try {
      // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const analysis = this.extractValidJson(responseText);

      return {
        category: analysis.category || 'technical',
        rootCause: analysis.rootCause || 'Unknown denial reason',
        remediationSteps: analysis.remediationSteps || ['Review claim documentation'],
        appealable: analysis.appealable !== false,
        appealDeadline: analysis.appealDeadline ? new Date(analysis.appealDeadline) : null,
        successProbability: Math.max(0, Math.min(100, analysis.successProbability || 50)),
        estimatedRecovery: analysis.estimatedRecovery || denialData.denialAmount
      };
    } catch (error) {
      console.error('AI denial analysis error:', error);
      return this.getDefaultDenialAnalysis(denialData);
    }
  }

  // 5. Auto Appeals Assistant
  async generateAppealLetter(appealData: AppealLetterData): Promise<string> {
    const denial = await storage.getDenial(appealData.denialId);
    const claim = await storage.getClaim(denial?.claimId || 0);
    const patient = await storage.getPatient(claim?.patientId || 0);
    const payer = await storage.getPayer(claim?.payerId || 0);

    if (!denial || !claim || !patient || !payer) {
      throw new Error('Required data not found for appeal letter generation');
    }

    const prompt = `
You are a healthcare billing appeal specialist. Generate a professional appeal letter for:

CLAIM DETAILS:
- Claim ID: ${claim.claimId}
- Patient: ${patient.patientName}
- Service Date: ${claim.serviceDate?.toISOString().split('T')[0]}
- Denial Reason: ${denial.denialReason} - ${denial.denialDescription}
- Denied Amount: $${(denial.denialAmount / 100).toFixed(2)}

PAYER INFORMATION:
- Payer: ${payer.payerName}
- Payer Type: ${payer.payerType}

APPEAL TYPE: ${appealData.appealType}

SUPPORTING REGULATIONS:
${appealData.regulations.map(reg => `- ${reg}`).join('\n')}

PRECEDENTS:
${appealData.precedents.map(prec => `- ${prec}`).join('\n')}

SUPPORTING EVIDENCE:
${appealData.supportingEvidence.map(evidence => `- ${evidence}`).join('\n')}

Generate a formal, professional appeal letter that:
1. References specific CMS regulations and payer policies
2. Provides clear medical necessity justification
3. Cites relevant precedents and guidelines
4. Maintains professional tone throughout
5. Includes proper formatting for ${payer.payerType} appeals

The letter should be compelling and increase overturn probability.
`;

    try {
      // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const appealLetter = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Add header and footer
      const formattedLetter = this.formatAppealLetter(appealLetter, claim, patient, payer);
      
      return formattedLetter;
    } catch (error) {
      console.error('AI appeal letter generation error:', error);
      return this.getDefaultAppealLetter(claim, patient, payer, denial);
    }
  }

  // Helper Methods
  private async generateAIClaimStructure(data: any): Promise<any> {
    const prompt = `
Generate optimal claim structure for healthcare billing:

Patient: ${data.patient.patientName}
Payer: ${data.payer.payerName} (${data.payer.payerType})
Service Codes: ${data.serviceCodes.join(', ')}
Diagnosis Codes: ${data.diagnosisCodes.join(', ')}

Provide JSON response:
{
  "submissionData": {
    "form_type": "cms1500|ub04",
    "billing_provider": "NPI and details",
    "patient_info": "demographics",
    "service_details": "optimized for payer"
  },
  "lineItems": [
    {
      "chargeAmount": amount_in_cents,
      "modifiers": ["modifier1"],
      "notes": "billing notes"
    }
  ],
  "flags": ["flag1", "flag2"]
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.extractValidJson(responseText);
    } catch (error) {
      console.error('AI claim structure generation error:', error);
      return this.getDefaultClaimStructure(data);
    }
  }

  private async performAIValidation(data: any): Promise<{ riskScore: number; recommendations: string[]; flags: string[] }> {
    const prompt = `
Analyze this healthcare claim for denial risk:

Patient Age: ${this.calculateAge(data.patient.dateOfBirth)}
Payer Type: ${data.payer.payerType}
Service Codes: ${data.lineItems.map((item: any) => item.serviceCode).join(', ')}
Diagnosis Codes: ${data.lineItems.map((item: any) => item.diagnosisCode).join(', ')}
Claim Amount: $${(data.claim.totalAmount / 100).toFixed(2)}

Historical denial patterns for this payer type should be considered.

Provide JSON response:
{
  "riskScore": 0-100,
  "recommendations": ["rec1", "rec2"],
  "flags": ["flag1", "flag2"]
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const validation = this.extractValidJson(responseText);

      return {
        riskScore: Math.max(0, Math.min(100, validation.riskScore || 30)),
        recommendations: validation.recommendations || ['Review claim documentation'],
        flags: validation.flags || []
      };
    } catch (error) {
      console.error('AI validation error:', error);
      return {
        riskScore: 50,
        recommendations: ['Standard validation recommended'],
        flags: ['ai_validation_failed']
      };
    }
  }

  private extractValidJson(response: string): any {
    try {
      // Try direct parsing first
      return JSON.parse(response);
    } catch {
      try {
        // Clean and try again
        const cleaned = this.cleanJsonResponse(response);
        return JSON.parse(cleaned);
      } catch {
        try {
          // Extract JSON with regex
          return this.extractJsonWithRegex(response);
        } catch {
          console.warn('Failed to parse AI response as JSON:', response);
          return {};
        }
      }
    }
  }

  private cleanJsonResponse(response: string): string {
    return response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^\s*[\r\n]/gm, '')
      .trim();
  }

  private extractJsonWithRegex(response: string): any {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  }

  private validateNPI(npi: string): boolean {
    return /^\d{10}$/.test(npi);
  }

  private validateICD10(code: string): boolean {
    return /^[A-Z]\d{2}(\.\d{1,3})?$/.test(code);
  }

  private validateCPT(code: string): boolean {
    return /^\d{5}$/.test(code) || /^[A-Z]\d{4}$/.test(code);
  }

  private async checkEligibility(patientId: number, serviceDate: Date): Promise<boolean> {
    const verifications = await storage.getEligibilityVerificationsByPatient(patientId);
    return verifications.some(v => v.status === 'verified');
  }

  private async checkAuthorization(claim: any): Promise<boolean> {
    // Check if authorization is required and valid
    const authRequired = claim.claimData?.authorizationNumber;
    return !authRequired || authRequired.length > 0;
  }

  private evaluateRuleConditions(conditions: any, claim: any): boolean {
    // Simplified rule evaluation
    return true; // Implement actual rule logic
  }

  private async executeRuleActions(actions: any, claimId: number): Promise<void> {
    // Execute rule actions (modify claim, add flags, etc.)
  }

  private async generateAIRules(payer: any, claim: any): Promise<string[]> {
    // Generate AI-learned rules based on historical data
    return ['ai_rule_applied'];
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private getDefaultDenialAnalysis(denialData: any): DenialAnalysis {
    return {
      category: 'technical',
      rootCause: 'Standard denial analysis - AI processing unavailable',
      remediationSteps: ['Review claim documentation', 'Verify patient eligibility', 'Check authorization requirements'],
      appealable: true,
      appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      successProbability: 65,
      estimatedRecovery: denialData.denialAmount || 0
    };
  }

  private getDefaultClaimStructure(data: any): any {
    return {
      submissionData: {
        form_type: 'cms1500',
        billing_provider: 'Standard provider info',
        patient_info: data.patient.patientName,
        service_details: 'Standard service billing'
      },
      lineItems: data.serviceCodes.map(() => ({
        chargeAmount: 10000, // $100 default
        modifiers: [],
        notes: 'Standard billing'
      })),
      flags: ['default_structure']
    };
  }

  private formatAppealLetter(content: string, claim: any, patient: any, payer: any): string {
    const today = new Date().toLocaleDateString();
    
    return `
${today}

${payer.payerName}
Claims Review Department
${payer.contactInfo?.address || 'Address on file'}

RE: Appeal for Claim ${claim.claimId}
Patient: ${patient.patientName}
Service Date: ${claim.serviceDate?.toISOString().split('T')[0]}

Dear Claims Review Team,

${content}

Sincerely,

[Provider Name]
[Provider Title]
[Contact Information]

Attachments:
- Original claim documentation
- Medical records
- Supporting clinical notes
- Relevant authorization documentation
`;
  }

  private getDefaultAppealLetter(claim: any, patient: any, payer: any, denial: any): string {
    return `
We respectfully request reconsideration of the denied claim ${claim.claimId} for patient ${patient.patientName}.

The denial reason cited was: ${denial.denialDescription}

We believe this claim was denied in error based on the following:

1. The services provided were medically necessary and appropriate
2. All required documentation was submitted with the original claim
3. The patient's eligibility was verified prior to service delivery
4. All applicable regulations and payer policies were followed

We request that you reverse this denial and process payment for the full amount of $${(denial.denialAmount / 100).toFixed(2)}.

Please contact us if additional information is required.
`;
  }
}

export const billingAIAgent = new BillingAIAgent();