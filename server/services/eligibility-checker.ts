import OpenAI from "openai";
import { storage } from "../storage";
import type { Patient, EligibilityVerification, InsertEligibilityVerification } from "@shared/schema";

// the newest OpenAI model is "gpt-4.1" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MedicareEligibilityResponse {
  beneficiaryId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  partAEffectiveDate: string | null;
  partBEffectiveDate: string | null;
  partCPlanId: string | null;
  partDPlanId: string | null;
  deductibleAmount: number;
  coinsurancePercentage: number;
  copayAmount: number;
  eligibilityStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'EXPIRED';
  coverageDetails: {
    hospitalInsurance: boolean;
    medicalInsurance: boolean;
    prescriptionDrugs: boolean;
    supplementalBenefits: string[];
  };
}

interface MedicaidEligibilityResponse {
  medicaidId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  eligibilityStartDate: string;
  eligibilityEndDate: string | null;
  eligibilityStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'EXPIRED';
  planType: string;
  copayAmount: number;
  deductibleAmount: number;
  coverageDetails: {
    medicalServices: boolean;
    prescriptionDrugs: boolean;
    dentalServices: boolean;
    visionServices: boolean;
    mentalHealthServices: boolean;
    homeHealthServices: boolean;
  };
  mcoInformation?: {
    mcoName: string;
    mcoId: string;
    memberNumber: string;
    groupNumber: string;
  };
}

interface MCOEligibilityResponse {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  planName: string;
  planType: 'HMO' | 'PPO' | 'EPO' | 'POS';
  effectiveDate: string;
  terminationDate: string | null;
  eligibilityStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'EXPIRED';
  primaryCareProvider: {
    name: string;
    npi: string;
    address: string;
  } | null;
  copayAmounts: {
    primaryCare: number;
    specialist: number;
    emergency: number;
    urgentCare: number;
  };
  deductibleAmount: number;
  outOfPocketMaximum: number;
  coverageDetails: {
    preventiveCare: boolean;
    prescriptionDrugs: boolean;
    mentalHealth: boolean;
    substanceAbuse: boolean;
    rehabilitation: boolean;
    homeHealth: boolean;
    hospice: boolean;
  };
  priorAuthorizationRequired: string[];
}

interface EligibilityCheckRequest {
  patientId: number;
  insuranceType: 'MEDICARE' | 'MEDICAID' | 'MCO';
  memberNumber: string;
  dateOfBirth: string;
  lastName: string;
  verificationReason?: string;
}

interface EligibilityCheckResult {
  success: boolean;
  status: 'VERIFIED' | 'NOT_VERIFIED' | 'PENDING' | 'ERROR';
  eligibilityData: any;
  coverageSummary: {
    isActive: boolean;
    effectiveDate: string | null;
    expirationDate: string | null;
    benefits: string[];
    copayAmount: number;
    deductibleAmount: number;
    requiresPriorAuth: boolean;
    priorAuthServices: string[];
  };
  recommendations: string[];
  confidenceScore: number;
  verificationTimestamp: string;
  errors?: string[];
}

export class EligibilityCheckerAgent {
  
  async verifyMedicareEligibility(request: EligibilityCheckRequest): Promise<MedicareEligibilityResponse> {
    // In a real implementation, this would call the Medicare Blue Button 2.0 API
    // or CMS's Beneficiary FHIR API for authentic eligibility verification
    
    // Simulate Medicare API response based on patient data
    const patient = await storage.getPatient(request.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Mock Medicare verification - in production, this would be a real API call
    const mockResponse: MedicareEligibilityResponse = {
      beneficiaryId: request.memberNumber,
      firstName: patient.patientName.split(' ')[0],
      lastName: patient.patientName.split(' ').slice(1).join(' '),
      dateOfBirth: patient.dateOfBirth,
      partAEffectiveDate: '2020-01-01',
      partBEffectiveDate: '2020-01-01',
      partCPlanId: null,
      partDPlanId: 'PDP123456',
      deductibleAmount: 240,
      coinsurancePercentage: 20,
      copayAmount: 20,
      eligibilityStatus: 'ACTIVE',
      coverageDetails: {
        hospitalInsurance: true,
        medicalInsurance: true,
        prescriptionDrugs: true,
        supplementalBenefits: ['preventive_care', 'wellness_visits']
      }
    };

    return mockResponse;
  }

  async verifyMedicaidEligibility(request: EligibilityCheckRequest): Promise<MedicaidEligibilityResponse> {
    // In a real implementation, this would integrate with state Medicaid systems
    // through MITA (Medicaid Information Technology Architecture) standards
    
    const patient = await storage.getPatient(request.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const mockResponse: MedicaidEligibilityResponse = {
      medicaidId: request.memberNumber,
      firstName: patient.patientName.split(' ')[0],
      lastName: patient.patientName.split(' ').slice(1).join(' '),
      dateOfBirth: patient.dateOfBirth,
      eligibilityStartDate: '2023-01-01',
      eligibilityEndDate: null,
      eligibilityStatus: 'ACTIVE',
      planType: 'Managed Care',
      copayAmount: 0,
      deductibleAmount: 0,
      coverageDetails: {
        medicalServices: true,
        prescriptionDrugs: true,
        dentalServices: true,
        visionServices: false,
        mentalHealthServices: true,
        homeHealthServices: true
      },
      mcoInformation: {
        mcoName: 'Community Health Plan',
        mcoId: 'CHP001',
        memberNumber: request.memberNumber,
        groupNumber: 'MCD2024'
      }
    };

    return mockResponse;
  }

  async verifyMCOEligibility(request: EligibilityCheckRequest): Promise<MCOEligibilityResponse> {
    // In a real implementation, this would use X12 270/271 EDI transactions
    // or modern FHIR-based eligibility APIs from major insurers
    
    const patient = await storage.getPatient(request.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const insuranceInfo = patient.insuranceInfo as any;
    const planType = insuranceInfo?.plan?.includes('PPO') ? 'PPO' : 
                    insuranceInfo?.plan?.includes('HMO') ? 'HMO' : 'PPO';

    const mockResponse: MCOEligibilityResponse = {
      memberId: request.memberNumber,
      firstName: patient.patientName.split(' ')[0],
      lastName: patient.patientName.split(' ').slice(1).join(' '),
      dateOfBirth: patient.dateOfBirth,
      planName: `${insuranceInfo?.provider || 'Health Plan'} ${planType}`,
      planType: planType as 'HMO' | 'PPO' | 'EPO' | 'POS',
      effectiveDate: '2024-01-01',
      terminationDate: null,
      eligibilityStatus: 'ACTIVE',
      primaryCareProvider: planType === 'HMO' ? {
        name: patient.physician || 'Dr. Smith',
        npi: '1234567890',
        address: '123 Medical Center Dr, Austin, TX 78701'
      } : null,
      copayAmounts: {
        primaryCare: planType === 'HMO' ? 15 : 25,
        specialist: planType === 'HMO' ? 30 : 45,
        emergency: 150,
        urgentCare: 75
      },
      deductibleAmount: planType === 'HMO' ? 500 : 1500,
      outOfPocketMaximum: planType === 'HMO' ? 3000 : 5000,
      coverageDetails: {
        preventiveCare: true,
        prescriptionDrugs: true,
        mentalHealth: true,
        substanceAbuse: true,
        rehabilitation: true,
        homeHealth: true,
        hospice: true
      },
      priorAuthorizationRequired: ['durable_medical_equipment', 'home_health_services', 'specialty_medications']
    };

    return mockResponse;
  }

  async performEligibilityCheck(request: EligibilityCheckRequest): Promise<EligibilityCheckResult> {
    try {
      let eligibilityData: any;
      let coverageSummary: EligibilityCheckResult['coverageSummary'];

      // Route to appropriate verification method based on insurance type
      switch (request.insuranceType) {
        case 'MEDICARE':
          eligibilityData = await this.verifyMedicareEligibility(request);
          coverageSummary = {
            isActive: eligibilityData.eligibilityStatus === 'ACTIVE',
            effectiveDate: eligibilityData.partAEffectiveDate,
            expirationDate: null,
            benefits: [
              eligibilityData.coverageDetails.hospitalInsurance ? 'Hospital Insurance (Part A)' : '',
              eligibilityData.coverageDetails.medicalInsurance ? 'Medical Insurance (Part B)' : '',
              eligibilityData.coverageDetails.prescriptionDrugs ? 'Prescription Drugs (Part D)' : ''
            ].filter(Boolean),
            copayAmount: eligibilityData.copayAmount,
            deductibleAmount: eligibilityData.deductibleAmount,
            requiresPriorAuth: false,
            priorAuthServices: []
          };
          break;

        case 'MEDICAID':
          eligibilityData = await this.verifyMedicaidEligibility(request);
          coverageSummary = {
            isActive: eligibilityData.eligibilityStatus === 'ACTIVE',
            effectiveDate: eligibilityData.eligibilityStartDate,
            expirationDate: eligibilityData.eligibilityEndDate,
            benefits: Object.entries(eligibilityData.coverageDetails)
              .filter(([_, covered]) => covered)
              .map(([service, _]) => service.replace(/([A-Z])/g, ' $1').toLowerCase()),
            copayAmount: eligibilityData.copayAmount,
            deductibleAmount: eligibilityData.deductibleAmount,
            requiresPriorAuth: false,
            priorAuthServices: []
          };
          break;

        case 'MCO':
          eligibilityData = await this.verifyMCOEligibility(request);
          coverageSummary = {
            isActive: eligibilityData.eligibilityStatus === 'ACTIVE',
            effectiveDate: eligibilityData.effectiveDate,
            expirationDate: eligibilityData.terminationDate,
            benefits: Object.entries(eligibilityData.coverageDetails)
              .filter(([_, covered]) => covered)
              .map(([service, _]) => service.replace(/([A-Z])/g, ' $1').toLowerCase()),
            copayAmount: eligibilityData.copayAmounts.primaryCare,
            deductibleAmount: eligibilityData.deductibleAmount,
            requiresPriorAuth: eligibilityData.priorAuthorizationRequired.length > 0,
            priorAuthServices: eligibilityData.priorAuthorizationRequired
          };
          break;

        default:
          throw new Error(`Unsupported insurance type: ${request.insuranceType}`);
      }

      // Generate AI-powered recommendations
      const recommendations = await this.generateRecommendations(coverageSummary, eligibilityData);
      const confidenceScore = this.calculateConfidenceScore(eligibilityData);

      const result: EligibilityCheckResult = {
        success: true,
        status: coverageSummary.isActive ? 'VERIFIED' : 'NOT_VERIFIED',
        eligibilityData,
        coverageSummary,
        recommendations,
        confidenceScore,
        verificationTimestamp: new Date().toISOString()
      };

      // Store verification result in database
      await this.storeVerificationResult(request.patientId, result);

      return result;

    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        eligibilityData: null,
        coverageSummary: {
          isActive: false,
          effectiveDate: null,
          expirationDate: null,
          benefits: [],
          copayAmount: 0,
          deductibleAmount: 0,
          requiresPriorAuth: false,
          priorAuthServices: []
        },
        recommendations: ['Unable to verify eligibility. Please contact insurance provider directly.'],
        confidenceScore: 0,
        verificationTimestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  private async generateRecommendations(
    coverageSummary: EligibilityCheckResult['coverageSummary'], 
    eligibilityData: any
  ): Promise<string[]> {
    const prompt = `
    Based on the following insurance eligibility verification results, provide actionable recommendations for the healthcare provider:

    Coverage Status: ${coverageSummary.isActive ? 'Active' : 'Inactive'}
    Benefits: ${coverageSummary.benefits.join(', ')}
    Copay Amount: $${coverageSummary.copayAmount}
    Deductible: $${coverageSummary.deductibleAmount}
    Prior Authorization Required: ${coverageSummary.requiresPriorAuth ? 'Yes' : 'No'}
    Prior Auth Services: ${coverageSummary.priorAuthServices.join(', ')}

    Provide specific, actionable recommendations in JSON format:
    {
      "recommendations": [
        "recommendation 1",
        "recommendation 2",
        "recommendation 3"
      ]
    }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "You are a healthcare insurance specialist providing actionable recommendations based on eligibility verification results."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.recommendations || ['Standard eligibility verification completed'];
    } catch (error) {
      return ['Standard eligibility verification completed'];
    }
  }

  private calculateConfidenceScore(eligibilityData: any): number {
    // Calculate confidence based on data completeness and verification success
    let score = 0;
    
    if (eligibilityData.eligibilityStatus === 'ACTIVE') score += 40;
    if (eligibilityData.firstName && eligibilityData.lastName) score += 20;
    if (eligibilityData.dateOfBirth) score += 15;
    if (eligibilityData.effectiveDate || eligibilityData.partAEffectiveDate) score += 15;
    if (Object.keys(eligibilityData.coverageDetails || {}).length > 0) score += 10;

    return Math.min(score, 100);
  }

  private async storeVerificationResult(patientId: number, result: EligibilityCheckResult): Promise<void> {
    const verificationData: InsertEligibilityVerification = {
      patientId: patientId || 1,
      status: result.status.toLowerCase(),
      insuranceType: result.eligibilityData?.planName || 'Unknown',
      verificationData: {
        ...result.eligibilityData,
        coverageSummary: result.coverageSummary,
        recommendations: result.recommendations,
        confidenceScore: result.confidenceScore
      },
      verifiedAt: result.status === 'VERIFIED' ? new Date() : null
    };

    await storage.createEligibilityVerification(verificationData);
  }

  async getVerificationHistory(patientId: number): Promise<EligibilityVerification[]> {
    return await storage.getEligibilityVerificationsByPatient(patientId);
  }

  async rerunVerification(verificationId: number): Promise<EligibilityCheckResult> {
    const verification = await storage.getEligibilityVerification(verificationId);
    if (!verification) {
      throw new Error('Verification record not found');
    }

    const patient = await storage.getPatient(verification.patientId || 1);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Extract member number from stored insurance info
    const insuranceInfo = patient.insuranceInfo as any;
    const memberNumber = insuranceInfo?.id || '';

    // Determine insurance type from stored data
    const insuranceType = verification.insuranceType?.includes('Medicare') ? 'MEDICARE' :
                         verification.insuranceType?.includes('Medicaid') ? 'MEDICAID' : 'MCO';

    const request: EligibilityCheckRequest = {
      patientId: verification.patientId || 1,
      insuranceType: insuranceType as 'MEDICARE' | 'MEDICAID' | 'MCO',
      memberNumber,
      dateOfBirth: patient.dateOfBirth,
      lastName: patient.patientName.split(' ').slice(1).join(' '),
      verificationReason: 'Re-verification requested'
    };

    return await this.performEligibilityCheck(request);
  }
}

export const eligibilityChecker = new EligibilityCheckerAgent();