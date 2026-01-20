import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import type { 
  AiChartReview, 
  InsertAiChartReview,
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

interface ExtractedCode {
  type: 'ICD-10' | 'CPT' | 'HCPCS' | 'DRG';
  code: string;
  description: string;
  confidence: number;
  sourceEvidence: string;
  billable: boolean;
}

interface CodingDiscrepancy {
  type: 'missing' | 'incorrect' | 'unsupported' | 'conflicting';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  recommendation: string;
  evidence: string[];
}

interface ComplianceValidation {
  cms_guidelines: boolean;
  coding_standards: boolean;
  medical_necessity: boolean;
  documentation_adequacy: boolean;
  billing_accuracy: boolean;
  issues: string[];
  recommendations: string[];
}

export class AIChartReviewEngine {
  
  /**
   * Conduct comprehensive chart review with AI coding assistance
   */
  async conductChartReview(
    patientId: number,
    chartDocuments: string[]
  ): Promise<AiChartReview> {
    try {
      const startTime = Date.now();
      
      // Step 1: Extract all medical codes from documentation
      const extractedCodes = await this.extractMedicalCodes(chartDocuments);
      
      // Step 2: Identify coding discrepancies
      const codingDiscrepancies = await this.identifyCodingDiscrepancies(
        chartDocuments,
        extractedCodes
      );
      
      // Step 3: Generate coding justification
      const codingJustification = await this.generateCodingJustification(
        extractedCodes,
        chartDocuments
      );
      
      // Step 4: Flag medical necessity issues
      const medicalNecessityFlags = await this.flagMedicalNecessityIssues(
        chartDocuments,
        extractedCodes
      );
      
      // Step 5: Calculate coding confidence score
      const codingConfidenceScore = this.calculateCodingConfidence(
        extractedCodes,
        codingDiscrepancies
      );
      
      // Step 6: Generate recommended flags
      const recommendedFlags = await this.generateRecommendedFlags(
        codingDiscrepancies,
        medicalNecessityFlags
      );
      
      // Step 7: Validate compliance
      const complianceValidation = await this.validateCompliance(
        extractedCodes,
        chartDocuments,
        codingJustification
      );
      
      // Step 8: Assess reimbursement accuracy
      const reimbursementAccuracy = await this.assessReimbursementAccuracy(
        extractedCodes,
        complianceValidation
      );
      
      // Step 9: Apply rules engine
      const rulesEngineResults = await this.applyRulesEngine(
        extractedCodes,
        chartDocuments,
        codingDiscrepancies
      );
      
      const processingTime = Date.now() - startTime;
      
      const reviewData: InsertAiChartReview = {
        patientId,
        chartDocuments,
        extractedCodes: {
          codes: extractedCodes,
          totalCodes: extractedCodes.length,
          processingTime,
          timestamp: new Date().toISOString()
        },
        codingDiscrepancies: {
          discrepancies: codingDiscrepancies,
          totalIssues: codingDiscrepancies.length,
          severityDistribution: this.analyzeSeverityDistribution(codingDiscrepancies)
        },
        codingJustification,
        medicalNecessityFlags,
        codingConfidenceScore,
        recommendedFlags,
        complianceValidation,
        reimbursementAccuracy,
        rulesEngineResults
      };
      
      return await storage.createAiChartReview(reviewData);
      
    } catch (error) {
      console.error('Error conducting chart review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to conduct chart review: ${errorMessage}`);
    }
  }
  
  /**
   * Extract medical codes using Claude Sonnet 4
   */
  private async extractMedicalCodes(chartDocuments: string[]): Promise<ExtractedCode[]> {
    const allCodes: ExtractedCode[] = [];
    
    for (const document of chartDocuments) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Extract all medical codes from this clinical documentation. Identify:

1. ICD-10-CM Diagnosis Codes
2. CPT Procedure Codes
3. HCPCS Supply/Equipment Codes
4. DRG Codes (if applicable)

For each code provide:
- Code and description
- Confidence level (0-100)
- Supporting evidence from documentation
- Billability status
- Specificity level

Document: ${document}

Return JSON array of extracted codes with metadata.`
          }
        ]
      });
      
      const contentBlock = response.content[0];
      const resultText = 'text' in contentBlock ? contentBlock.text : '{"codes": []}';
      const result = JSON.parse(resultText);
      
      if (result.codes) {
        allCodes.push(...result.codes);
      }
    }
    
    return allCodes;
  }
  
  /**
   * Identify coding discrepancies using GPT-4o
   */
  private async identifyCodingDiscrepancies(
    chartDocuments: string[],
    extractedCodes: ExtractedCode[]
  ): Promise<CodingDiscrepancy[]> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a certified coding specialist. Analyze the documentation and extracted codes to identify discrepancies:

1. MISSING CODES: Documented conditions/procedures without corresponding codes
2. INCORRECT CODES: Codes that don't match documentation
3. UNSUPPORTED CODES: Codes without adequate documentation
4. CONFLICTING CODES: Contradictory or mutually exclusive codes

For each discrepancy, provide:
- Type and severity
- Impact on billing/compliance
- Specific recommendation
- Supporting evidence`
        },
        {
          role: "user",
          content: `Chart Documentation: ${JSON.stringify(chartDocuments)}
          Extracted Codes: ${JSON.stringify(extractedCodes)}
          
          Identify all coding discrepancies.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"discrepancies": []}');
    return result.discrepancies || [];
  }
  
  /**
   * Generate comprehensive coding justification
   */
  private async generateCodingJustification(
    extractedCodes: ExtractedCode[],
    chartDocuments: string[]
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Generate comprehensive coding justification that explains:

1. Clinical rationale for each code selection
2. Documentation support for codes
3. Medical necessity demonstration
4. Compliance with coding guidelines
5. Specificity and accuracy validation

Use professional medical coding terminology and reference specific documentation sections.`
        },
        {
          role: "user",
          content: `Extracted Codes: ${JSON.stringify(extractedCodes)}
          Chart Documentation: ${JSON.stringify(chartDocuments)}`
        }
      ]
    });
    
    return response.choices[0].message.content || '';
  }
  
  /**
   * Flag medical necessity issues
   */
  private async flagMedicalNecessityIssues(
    chartDocuments: string[],
    extractedCodes: ExtractedCode[]
  ): Promise<string[]> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Identify medical necessity issues that could affect reimbursement:

1. Insufficient documentation for medical necessity
2. Lack of supporting symptoms/findings
3. Missing frequency/duration requirements
4. Inadequate physician orders
5. Non-covered services documentation
6. Experimental/investigational procedures
7. Duplicate services

Chart: ${JSON.stringify(chartDocuments)}
Codes: ${JSON.stringify(extractedCodes)}

Return JSON array of specific medical necessity flags.`
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const resultText = 'text' in contentBlock ? contentBlock.text : '{"flags": []}';
    const result = JSON.parse(resultText);
    return result.flags || [];
  }
  
  /**
   * Calculate overall coding confidence score
   */
  private calculateCodingConfidence(
    extractedCodes: ExtractedCode[],
    discrepancies: CodingDiscrepancy[]
  ): number {
    if (extractedCodes.length === 0) return 0;
    
    // Base confidence from code extraction
    const avgCodeConfidence = extractedCodes.reduce((sum, code) => sum + code.confidence, 0) / extractedCodes.length;
    
    // Penalty for discrepancies
    const discrepancyPenalty = discrepancies.reduce((penalty, disc) => {
      switch (disc.severity) {
        case 'critical': return penalty + 20;
        case 'high': return penalty + 15;
        case 'medium': return penalty + 10;
        case 'low': return penalty + 5;
        default: return penalty;
      }
    }, 0);
    
    return Math.max(0, Math.min(100, avgCodeConfidence - discrepancyPenalty));
  }
  
  /**
   * Generate recommended action flags
   */
  private async generateRecommendedFlags(
    discrepancies: CodingDiscrepancy[],
    medicalNecessityFlags: string[]
  ): Promise<string[]> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Based on identified discrepancies and medical necessity issues, recommend specific action flags:

- REVIEW_REQUIRED: Needs clinical review
- DOCUMENTATION_NEEDED: Additional documentation required  
- CODING_CORRECTION: Code changes needed
- MEDICAL_NECESSITY: Insufficient medical necessity
- COMPLIANCE_RISK: Potential compliance issue
- AUDIT_FLAG: High audit risk
- EDUCATION_NEEDED: Staff education required
- PRIOR_AUTH: Prior authorization needed`
        },
        {
          role: "user",
          content: `Discrepancies: ${JSON.stringify(discrepancies)}
          Medical Necessity Flags: ${JSON.stringify(medicalNecessityFlags)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"flags": []}');
    return result.flags || [];
  }
  
  /**
   * Validate compliance with regulations
   */
  private async validateCompliance(
    extractedCodes: ExtractedCode[],
    chartDocuments: string[],
    codingJustification: string
  ): Promise<ComplianceValidation> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Validate compliance across multiple dimensions:

1. CMS Guidelines Compliance
2. Coding Standards (ICD-10, CPT)
3. Medical Necessity Requirements
4. Documentation Adequacy
5. Billing Accuracy

Codes: ${JSON.stringify(extractedCodes)}
Documentation: ${JSON.stringify(chartDocuments)}
Justification: ${codingJustification}

Return JSON with boolean compliance flags and detailed issues/recommendations.`
        }
      ]
    });
    
    const contentBlock = response.content[0];
    const resultText = 'text' in contentBlock ? contentBlock.text : '{}';
    return JSON.parse(resultText);
  }
  
  /**
   * Assess reimbursement accuracy potential
   */
  private async assessReimbursementAccuracy(
    extractedCodes: ExtractedCode[],
    complianceValidation: ComplianceValidation
  ): Promise<number> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Assess the likelihood of accurate reimbursement based on:

1. Code accuracy and specificity
2. Documentation support
3. Medical necessity demonstration
4. Compliance validation results
5. Billing guidelines adherence

Return score 0-100 where 100 = highest reimbursement confidence.`
        },
        {
          role: "user",
          content: `Codes: ${JSON.stringify(extractedCodes)}
          Compliance: ${JSON.stringify(complianceValidation)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"score": 0}');
    return result.score || 0;
  }
  
  /**
   * Apply business rules engine for coding validation
   */
  private async applyRulesEngine(
    extractedCodes: ExtractedCode[],
    chartDocuments: string[],
    discrepancies: CodingDiscrepancy[]
  ): Promise<any> {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `Apply healthcare coding business rules to validate:

1. Age/Gender Specific Codes
2. Procedure/Diagnosis Compatibility
3. Frequency Limitations
4. Bundling Rules (CCI Edits)
5. Modifier Requirements
6. Place of Service Validation
7. Coverage Limitations
8. Prior Authorization Requirements

Return structured results with rule violations and recommendations.`
        },
        {
          role: "user",
          content: `Codes: ${JSON.stringify(extractedCodes)}
          Documents: ${JSON.stringify(chartDocuments)}
          Discrepancies: ${JSON.stringify(discrepancies)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Analyze severity distribution of discrepancies
   */
  private analyzeSeverityDistribution(discrepancies: CodingDiscrepancy[]): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    for (const disc of discrepancies) {
      distribution[disc.severity]++;
    }
    
    return distribution;
  }
  
  /**
   * Generate coding quality report
   */
  async generateCodingQualityReport(patientId: number): Promise<any> {
    try {
      const reviews = await storage.getAiChartReviewsByPatient(patientId);
      
      if (reviews.length === 0) {
        return { message: 'No chart reviews found for patient' };
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `Generate comprehensive coding quality report including:

1. Coding accuracy trends
2. Common discrepancy patterns
3. Compliance risk assessment
4. Educational opportunities
5. Performance metrics
6. Recommendations for improvement`
          },
          {
            role: "user",
            content: `Chart Reviews: ${JSON.stringify(reviews)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      console.error('Error generating coding quality report:', error);
      throw error;
    }
  }
  
  /**
   * Real-time coding assistance during documentation
   */
  async provideCodingSuggestions(
    documentationText: string,
    contextualCodes: ExtractedCode[]
  ): Promise<{
    suggestedCodes: ExtractedCode[];
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `Provide real-time coding assistance for this documentation:

Documentation: ${documentationText}
Existing Codes: ${JSON.stringify(contextualCodes)}

Suggest:
1. Additional codes that should be considered
2. Potential coding warnings or conflicts
3. Recommendations for documentation improvement

Return JSON with suggestedCodes, warnings, and recommendations arrays.`
          }
        ]
      });
      
      const contentBlock = response.content[0];
      const resultText = 'text' in contentBlock ? contentBlock.text : '{"suggestedCodes": [], "warnings": [], "recommendations": []}';
      return JSON.parse(resultText);
      
    } catch (error) {
      console.error('Error providing coding suggestions:', error);
      return {
        suggestedCodes: [],
        warnings: ['Error generating suggestions'],
        recommendations: []
      };
    }
  }
}

export const aiChartReviewEngine = new AIChartReviewEngine();