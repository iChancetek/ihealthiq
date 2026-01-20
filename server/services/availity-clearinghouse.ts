import { InsuranceInfo, ClearinghouseRequest, EligibilityVerificationResult } from './eligibility-verification-service';

export interface AvailityConfig {
  apiId: string;
  testable: boolean;
  backendSystem: string;
  assemblyConfig: string;
  environments: {
    tst: string;
    qua: string;
    qap: string;
    prd: string;
  };
  securityProviders: string[];
}

export interface AvailityEligibilityRequest {
  transactionControlNumber: string;
  submitter: {
    organizationName: string;
    npi: string;
    contactInformation?: {
      phone: string;
      email: string;
    };
  };
  receiver: {
    payerId: string;
    payerName: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  serviceType: string;
  serviceDate?: string;
  providerInformation?: {
    npi: string;
    organizationName: string;
    specialtyCode?: string;
  };
}

export interface AvailityEligibilityResponse {
  transactionControlNumber: string;
  responseCode: string;
  responseDescription: string;
  processingDate: string;
  eligibilityStatus: 'active' | 'inactive' | 'unknown';
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    relationshipCode: string;
  };
  payer: {
    payerId: string;
    payerName: string;
    payerType: string;
  };
  planInformation: {
    planName: string;
    planType: string;
    planId: string;
    effectiveDate: string;
    terminationDate?: string;
    groupNumber?: string;
  };
  benefits: {
    homeHealthServices: {
      covered: boolean;
      copayment?: {
        amount: number;
        period: string;
      };
      coinsurance?: {
        percentage: number;
        applicableToDeductible: boolean;
      };
      deductible?: {
        amount: number;
        remaining: number;
        period: string;
      };
      outOfPocketMaximum?: {
        amount: number;
        remaining: number;
        period: string;
      };
      authorizationRequired: boolean;
      limitationsAndExclusions?: string[];
    };
    generalBenefits: {
      deductibleInformation: {
        amount: number;
        remaining: number;
        period: string;
      };
      outOfPocketMaximum: {
        amount: number;
        remaining: number;
        period: string;
      };
    };
  };
  authorizationInformation?: {
    required: boolean;
    priorAuthorizationNumber?: string;
    authorizationPeriod?: string;
    servicesAuthorized?: string[];
    unitsAuthorized?: number;
  };
  additionalInformation?: {
    messages: string[];
    notes: string[];
  };
}

export class AvailityClearinghouseService {
  private config: AvailityConfig;
  private currentEnvironment: 'tst' | 'qua' | 'qap' | 'prd';
  private apiKey: string;
  private clientId: string;
  private baseUrl: string;

  constructor() {
    this.config = {
      apiId: 'ebva-member-card',
      testable: false,
      backendSystem: 'TYK',
      assemblyConfig: 'TYK',
      environments: {
        tst: 'https://tykint.ea1.infrastructure.awn.availity.net/tst/pres/eb-value-adds/',
        qua: 'https://tykint.ea1.infrastructure.awn.availity.net/qua/pres/eb-value-adds/',
        qap: 'https://tykint-qap.ea1.infrastructure.awn.availity.net/qap/pres/eb-value-adds/',
        prd: 'https://tykint.ea1.infrastructure.awp.availity.net/prd/pres/eb-value-adds/'
      },
      securityProviders: ['HIPAA_EXTERNAL']
    };

    this.currentEnvironment = (process.env.NODE_ENV === 'production') ? 'prd' : 'tst';
    this.apiKey = process.env.AVAILITY_API_KEY || '';
    this.clientId = process.env.AVAILITY_CLIENT_ID || '';
    this.baseUrl = this.config.environments[this.currentEnvironment];

    if (!this.apiKey || !this.clientId) {
      console.warn('Availity API credentials not configured. Set AVAILITY_API_KEY and AVAILITY_CLIENT_ID environment variables.');
    }
  }

  /**
   * Verify member eligibility using Availity clearinghouse
   */
  async verifyMemberEligibility(insuranceInfo: InsuranceInfo, patientInfo: any): Promise<EligibilityVerificationResult> {
    try {
      // Validate API credentials
      if (!this.apiKey || !this.clientId) {
        throw new Error('Availity API credentials not configured');
      }

      // Step 1: Prepare eligibility request
      const request = this.prepareEligibilityRequest(insuranceInfo, patientInfo);

      // Step 2: Send request to Availity
      const response = await this.sendEligibilityRequest(request);

      // Step 3: Process and validate response
      const verificationResult = await this.processEligibilityResponse(response, insuranceInfo);

      return verificationResult;

    } catch (error) {
      console.error('Availity eligibility verification failed:', error);
      throw new Error(`Availity verification failed: ${error.message}`);
    }
  }

  /**
   * Prepare eligibility request for Availity API
   */
  private prepareEligibilityRequest(insuranceInfo: InsuranceInfo, patientInfo: any): AvailityEligibilityRequest {
    const transactionControlNumber = `AVL${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    return {
      transactionControlNumber,
      submitter: {
        organizationName: process.env.ORGANIZATION_NAME || 'iSynera Healthcare Platform',
        npi: process.env.PROVIDER_NPI || '1234567890',
        contactInformation: {
          phone: process.env.ORGANIZATION_PHONE || '(555) 123-4567',
          email: process.env.ORGANIZATION_EMAIL || 'admin@isynera.com'
        }
      },
      receiver: {
        payerId: this.extractPayerId(insuranceInfo.primaryInsurance),
        payerName: insuranceInfo.primaryInsurance
      },
      subscriber: {
        memberId: insuranceInfo.memberID,
        firstName: patientInfo.firstName || 'Unknown',
        lastName: patientInfo.lastName || 'Unknown',
        dateOfBirth: patientInfo.dateOfBirth || '1900-01-01',
        gender: patientInfo.gender || 'U',
        address: patientInfo.address ? {
          street: patientInfo.address.street || '',
          city: patientInfo.address.city || '',
          state: patientInfo.address.state || '',
          zipCode: patientInfo.address.zipCode || ''
        } : undefined
      },
      serviceType: '04', // Home Health Services
      serviceDate: new Date().toISOString().split('T')[0],
      providerInformation: {
        npi: process.env.PROVIDER_NPI || '1234567890',
        organizationName: process.env.ORGANIZATION_NAME || 'iSynera Healthcare Platform',
        specialtyCode: '69' // Home Health Agency
      }
    };
  }

  /**
   * Send eligibility request to Availity API
   */
  private async sendEligibilityRequest(request: AvailityEligibilityRequest): Promise<AvailityEligibilityResponse> {
    const endpoint = `${this.baseUrl}eligibility/v1/inquiry`;

    const requestPayload = {
      apiVersion: '1.0',
      transactionType: '270', // X12 Eligibility Inquiry
      inquiry: request
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Client-ID': this.clientId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Version': '1.0',
        'X-Availity-Environment': this.currentEnvironment
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Availity API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return this.normalizeAvailityResponse(result);
  }

  /**
   * Process eligibility response and create verification result
   */
  private async processEligibilityResponse(
    response: AvailityEligibilityResponse, 
    insuranceInfo: InsuranceInfo
  ): Promise<EligibilityVerificationResult> {
    
    const isEligible = response.eligibilityStatus === 'active';
    const homeHealthBenefits = response.benefits?.homeHealthServices;

    return {
      isEligible,
      verificationStatus: this.determineVerificationStatus(response),
      effectiveDate: response.planInformation?.effectiveDate,
      terminationDate: response.planInformation?.terminationDate,
      planDetails: {
        planName: response.planInformation?.planName || 'Unknown Plan',
        planType: response.planInformation?.planType || 'Unknown Type',
        payerName: response.payer?.payerName || insuranceInfo.primaryInsurance,
        payerID: response.payer?.payerId || 'Unknown'
      },
      benefits: {
        homeHealthCoverage: homeHealthBenefits?.covered || false,
        copayAmount: homeHealthBenefits?.copayment?.amount,
        coinsuranceRate: homeHealthBenefits?.coinsurance?.percentage ? 
          homeHealthBenefits.coinsurance.percentage / 100 : undefined,
        deductible: homeHealthBenefits?.deductible?.amount || 
          response.benefits?.generalBenefits?.deductibleInformation?.amount,
        deductibleMet: homeHealthBenefits?.deductible?.remaining || 
          response.benefits?.generalBenefits?.deductibleInformation?.remaining,
        outOfPocketMax: homeHealthBenefits?.outOfPocketMaximum?.amount || 
          response.benefits?.generalBenefits?.outOfPocketMaximum?.amount,
        outOfPocketMet: homeHealthBenefits?.outOfPocketMaximum?.remaining || 
          response.benefits?.generalBenefits?.outOfPocketMaximum?.remaining
      },
      authorizationRequired: homeHealthBenefits?.authorizationRequired || 
        response.authorizationInformation?.required || false,
      authorizationDetails: response.authorizationInformation ? {
        required: response.authorizationInformation.required,
        priorAuthNumber: response.authorizationInformation.priorAuthorizationNumber,
        authorizationPeriod: response.authorizationInformation.authorizationPeriod,
        servicesAuthorized: response.authorizationInformation.servicesAuthorized || []
      } : undefined,
      clearinghouseResponse: response,
      verificationDate: new Date().toISOString(),
      aiSummary: await this.generateAISummary(response, insuranceInfo),
      recommendations: this.generateRecommendations(response),
      complianceFlags: this.identifyComplianceFlags(response)
    };
  }

  /**
   * Normalize Availity API response to standard format
   */
  private normalizeAvailityResponse(apiResponse: any): AvailityEligibilityResponse {
    const response = apiResponse.response || apiResponse;
    
    return {
      transactionControlNumber: response.transactionControlNumber || response.controlNumber,
      responseCode: response.responseCode || response.statusCode || '000',
      responseDescription: response.responseDescription || response.statusDescription || 'Success',
      processingDate: response.processingDate || new Date().toISOString(),
      eligibilityStatus: this.normalizeEligibilityStatus(response.eligibilityStatus || response.status),
      subscriber: {
        memberId: response.subscriber?.memberId || response.member?.id,
        firstName: response.subscriber?.firstName || response.member?.firstName,
        lastName: response.subscriber?.lastName || response.member?.lastName,
        dateOfBirth: response.subscriber?.dateOfBirth || response.member?.dateOfBirth,
        relationshipCode: response.subscriber?.relationshipCode || '18'
      },
      payer: {
        payerId: response.payer?.payerId || response.payer?.id,
        payerName: response.payer?.payerName || response.payer?.name,
        payerType: response.payer?.payerType || response.payer?.type || 'Unknown'
      },
      planInformation: {
        planName: response.planInformation?.planName || response.plan?.name,
        planType: response.planInformation?.planType || response.plan?.type,
        planId: response.planInformation?.planId || response.plan?.id,
        effectiveDate: response.planInformation?.effectiveDate || response.coverage?.effectiveDate,
        terminationDate: response.planInformation?.terminationDate || response.coverage?.terminationDate,
        groupNumber: response.planInformation?.groupNumber || response.plan?.groupNumber
      },
      benefits: {
        homeHealthServices: {
          covered: this.extractHomeHealthCoverage(response.benefits),
          copayment: this.extractCopayment(response.benefits),
          coinsurance: this.extractCoinsurance(response.benefits),
          deductible: this.extractDeductible(response.benefits),
          outOfPocketMaximum: this.extractOutOfPocketMaximum(response.benefits),
          authorizationRequired: this.extractAuthorizationRequired(response.benefits),
          limitationsAndExclusions: this.extractLimitationsAndExclusions(response.benefits)
        },
        generalBenefits: {
          deductibleInformation: this.extractGeneralDeductible(response.benefits),
          outOfPocketMaximum: this.extractGeneralOutOfPocket(response.benefits)
        }
      },
      authorizationInformation: response.authorizationInformation ? {
        required: response.authorizationInformation.required,
        priorAuthorizationNumber: response.authorizationInformation.priorAuthorizationNumber,
        authorizationPeriod: response.authorizationInformation.authorizationPeriod,
        servicesAuthorized: response.authorizationInformation.servicesAuthorized,
        unitsAuthorized: response.authorizationInformation.unitsAuthorized
      } : undefined,
      additionalInformation: response.additionalInformation ? {
        messages: response.additionalInformation.messages || [],
        notes: response.additionalInformation.notes || []
      } : undefined
    };
  }

  /**
   * Extract payer ID from insurance name
   */
  private extractPayerId(insuranceName: string): string {
    const payerMappings: { [key: string]: string } = {
      'Medicare': '00431',
      'Medicaid': '00432',
      'Blue Cross Blue Shield': '00510',
      'Aetna': '00195',
      'UnitedHealthcare': '00192',
      'Humana': '00355',
      'Cigna': '00510',
      'Anthem': '00510'
    };

    const normalizedName = insuranceName.toLowerCase();
    for (const [key, value] of Object.entries(payerMappings)) {
      if (normalizedName.includes(key.toLowerCase())) {
        return value;
      }
    }

    return '99999'; // Default/unknown payer ID
  }

  /**
   * Normalize eligibility status from various response formats
   */
  private normalizeEligibilityStatus(status: any): 'active' | 'inactive' | 'unknown' {
    if (!status) return 'unknown';
    
    const statusStr = status.toString().toLowerCase();
    
    if (statusStr.includes('active') || statusStr.includes('eligible') || statusStr === '1') {
      return 'active';
    } else if (statusStr.includes('inactive') || statusStr.includes('terminated') || statusStr === '0') {
      return 'inactive';
    }
    
    return 'unknown';
  }

  /**
   * Extract home health coverage information
   */
  private extractHomeHealthCoverage(benefits: any): boolean {
    if (!benefits) return false;
    
    // Check for home health specific benefits
    if (benefits.homeHealthServices?.covered !== undefined) {
      return benefits.homeHealthServices.covered;
    }
    
    // Check in general benefits for service type 04
    if (benefits.serviceTypeBenefits) {
      const homeHealthBenefit = benefits.serviceTypeBenefits.find(
        (benefit: any) => benefit.serviceType === '04' || benefit.serviceType === 'homeHealth'
      );
      return homeHealthBenefit?.covered || false;
    }
    
    return false;
  }

  /**
   * Extract copayment information
   */
  private extractCopayment(benefits: any): { amount: number; period: string } | undefined {
    const homeHealthBenefits = benefits?.homeHealthServices || benefits?.serviceTypeBenefits?.find(
      (b: any) => b.serviceType === '04'
    );
    
    if (homeHealthBenefits?.copayment) {
      return {
        amount: homeHealthBenefits.copayment.amount || 0,
        period: homeHealthBenefits.copayment.period || 'visit'
      };
    }
    
    return undefined;
  }

  /**
   * Extract coinsurance information
   */
  private extractCoinsurance(benefits: any): { percentage: number; applicableToDeductible: boolean } | undefined {
    const homeHealthBenefits = benefits?.homeHealthServices || benefits?.serviceTypeBenefits?.find(
      (b: any) => b.serviceType === '04'
    );
    
    if (homeHealthBenefits?.coinsurance) {
      return {
        percentage: homeHealthBenefits.coinsurance.percentage || 0,
        applicableToDeductible: homeHealthBenefits.coinsurance.applicableToDeductible || false
      };
    }
    
    return undefined;
  }

  /**
   * Extract deductible information
   */
  private extractDeductible(benefits: any): { amount: number; remaining: number; period: string } | undefined {
    const homeHealthBenefits = benefits?.homeHealthServices || benefits?.serviceTypeBenefits?.find(
      (b: any) => b.serviceType === '04'
    );
    
    if (homeHealthBenefits?.deductible) {
      return {
        amount: homeHealthBenefits.deductible.amount || 0,
        remaining: homeHealthBenefits.deductible.remaining || 0,
        period: homeHealthBenefits.deductible.period || 'calendar year'
      };
    }
    
    return undefined;
  }

  /**
   * Extract out-of-pocket maximum information
   */
  private extractOutOfPocketMaximum(benefits: any): { amount: number; remaining: number; period: string } | undefined {
    const homeHealthBenefits = benefits?.homeHealthServices || benefits?.serviceTypeBenefits?.find(
      (b: any) => b.serviceType === '04'
    );
    
    if (homeHealthBenefits?.outOfPocketMaximum) {
      return {
        amount: homeHealthBenefits.outOfPocketMaximum.amount || 0,
        remaining: homeHealthBenefits.outOfPocketMaximum.remaining || 0,
        period: homeHealthBenefits.outOfPocketMaximum.period || 'calendar year'
      };
    }
    
    return undefined;
  }

  /**
   * Extract authorization requirement
   */
  private extractAuthorizationRequired(benefits: any): boolean {
    const homeHealthBenefits = benefits?.homeHealthServices || benefits?.serviceTypeBenefits?.find(
      (b: any) => b.serviceType === '04'
    );
    
    return homeHealthBenefits?.authorizationRequired || false;
  }

  /**
   * Extract limitations and exclusions
   */
  private extractLimitationsAndExclusions(benefits: any): string[] {
    const homeHealthBenefits = benefits?.homeHealthServices || benefits?.serviceTypeBenefits?.find(
      (b: any) => b.serviceType === '04'
    );
    
    return homeHealthBenefits?.limitationsAndExclusions || [];
  }

  /**
   * Extract general deductible information
   */
  private extractGeneralDeductible(benefits: any): { amount: number; remaining: number; period: string } {
    const deductible = benefits?.deductible || benefits?.generalBenefits?.deductible;
    
    return {
      amount: deductible?.amount || 0,
      remaining: deductible?.remaining || 0,
      period: deductible?.period || 'calendar year'
    };
  }

  /**
   * Extract general out-of-pocket information
   */
  private extractGeneralOutOfPocket(benefits: any): { amount: number; remaining: number; period: string } {
    const outOfPocket = benefits?.outOfPocketMaximum || benefits?.generalBenefits?.outOfPocketMaximum;
    
    return {
      amount: outOfPocket?.amount || 0,
      remaining: outOfPocket?.remaining || 0,
      period: outOfPocket?.period || 'calendar year'
    };
  }

  /**
   * Determine verification status based on response
   */
  private determineVerificationStatus(response: AvailityEligibilityResponse): 'verified' | 'pending' | 'denied' | 'requires_auth' {
    if (response.responseCode === '000' && response.eligibilityStatus === 'active') {
      return 'verified';
    } else if (response.responseCode === '000' && response.eligibilityStatus === 'inactive') {
      return 'denied';
    } else if (response.authorizationInformation?.required) {
      return 'requires_auth';
    } else {
      return 'pending';
    }
  }

  /**
   * Generate AI summary of eligibility response
   */
  private async generateAISummary(response: AvailityEligibilityResponse, insuranceInfo: InsuranceInfo): Promise<string> {
    const eligibilityStatus = response.eligibilityStatus;
    const homeHealthCovered = response.benefits?.homeHealthServices?.covered;
    const authRequired = response.benefits?.homeHealthServices?.authorizationRequired;
    
    let summary = `Member eligibility verification completed via Availity clearinghouse. `;
    
    if (eligibilityStatus === 'active') {
      summary += `Member is currently eligible for services. `;
    } else if (eligibilityStatus === 'inactive') {
      summary += `Member eligibility is inactive or terminated. `;
    } else {
      summary += `Member eligibility status is uncertain. `;
    }
    
    if (homeHealthCovered) {
      summary += `Home health services are covered under the current plan. `;
    } else {
      summary += `Home health services coverage is not confirmed. `;
    }
    
    if (authRequired) {
      summary += `Prior authorization is required for home health services. `;
    }
    
    summary += `Verification performed on ${new Date().toLocaleDateString()}.`;
    
    return summary;
  }

  /**
   * Generate recommendations based on eligibility response
   */
  private generateRecommendations(response: AvailityEligibilityResponse): string[] {
    const recommendations: string[] = [];
    
    if (response.eligibilityStatus !== 'active') {
      recommendations.push('Verify member eligibility status with insurance provider');
      recommendations.push('Check for any recent changes to the insurance plan');
    }
    
    if (!response.benefits?.homeHealthServices?.covered) {
      recommendations.push('Confirm home health services coverage with insurance provider');
      recommendations.push('Review alternative coverage options if needed');
    }
    
    if (response.benefits?.homeHealthServices?.authorizationRequired) {
      recommendations.push('Obtain prior authorization before providing services');
      recommendations.push('Document medical necessity for authorization request');
    }
    
    if (response.benefits?.homeHealthServices?.copayment?.amount) {
      recommendations.push(`Collect copayment of $${response.benefits.homeHealthServices.copayment.amount} at time of service`);
    }
    
    if (response.benefits?.homeHealthServices?.deductible?.remaining && response.benefits.homeHealthServices.deductible.remaining > 0) {
      recommendations.push(`Patient has $${response.benefits.homeHealthServices.deductible.remaining} remaining deductible`);
    }
    
    recommendations.push('Maintain documentation of eligibility verification for compliance');
    recommendations.push('Re-verify eligibility if services extend beyond 30 days');
    
    return recommendations;
  }

  /**
   * Identify compliance flags from eligibility response
   */
  private identifyComplianceFlags(response: AvailityEligibilityResponse): string[] {
    const flags: string[] = [];
    
    if (response.eligibilityStatus !== 'active') {
      flags.push('ELIGIBILITY_INACTIVE');
    }
    
    if (!response.benefits?.homeHealthServices?.covered) {
      flags.push('HOME_HEALTH_NOT_COVERED');
    }
    
    if (response.benefits?.homeHealthServices?.authorizationRequired) {
      flags.push('PRIOR_AUTH_REQUIRED');
    }
    
    if (response.planInformation?.terminationDate) {
      const terminationDate = new Date(response.planInformation.terminationDate);
      if (terminationDate <= new Date()) {
        flags.push('PLAN_TERMINATED');
      }
    }
    
    if (response.benefits?.homeHealthServices?.limitationsAndExclusions?.length) {
      flags.push('SERVICE_LIMITATIONS_EXIST');
    }
    
    if (response.responseCode !== '000') {
      flags.push('CLEARINGHOUSE_ERROR');
    }
    
    return flags;
  }

  /**
   * Switch API environment (for testing/production)
   */
  switchEnvironment(environment: 'tst' | 'qua' | 'qap' | 'prd'): void {
    this.currentEnvironment = environment;
    this.baseUrl = this.config.environments[environment];
    console.log(`Availity environment switched to: ${environment}`);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): AvailityConfig & { currentEnvironment: string; baseUrl: string } {
    return {
      ...this.config,
      currentEnvironment: this.currentEnvironment,
      baseUrl: this.baseUrl
    };
  }
}