import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIRecommendation {
  medicationName: string;
  recommendedDosage: string;
  frequency: string;
  duration: string;
  route: string;
  warnings: string[];
  contraindications: string[];
  interactions: {
    severity: string;
    interactingMedications: string[];
    recommendations: string[];
  };
  monitoring: string[];
  alternatives: Array<{
    medication: string;
    reason: string;
  }>;
  confidence: number;
  reasoning: string;
}

export class AIDosingRecommendationsService {
  async generateDosingRecommendation(patient: any, medicationName: string, indication?: string): Promise<AIRecommendation> {
    try {
      const patientAge = this.calculateAge(patient.dateOfBirth);
      
      // Get current medications for interaction checking
      const currentMedications = patient.currentMedications || [];
      const allergies = patient.allergies || [];
      
      const prompt = `As an expert clinical pharmacist AI, provide personalized dosing recommendations for the following patient and medication. Return your analysis in JSON format with the exact structure provided.

PATIENT INFORMATION:
- Age: ${patientAge} years
- Weight: ${patient.weight || 'Not specified'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None known'}
- Current Medications: ${currentMedications.length > 0 ? currentMedications.map((med: any) => med.name || med).join(', ') : 'None'}
- Kidney Function: ${patient.kidneyFunction || 'Normal'}
- Liver Function: ${patient.liverFunction || 'Normal'}
- Medical History: ${patient.medicalHistory || 'Not specified'}

MEDICATION TO PRESCRIBE: ${medicationName}
INDICATION: ${indication || 'Standard indication'}

Please provide comprehensive dosing recommendations considering:
1. Patient-specific factors (age, weight, organ function)
2. Drug interactions with current medications
3. Contraindications based on patient history
4. Monitoring requirements
5. Safety warnings
6. Alternative medications if applicable

Respond with JSON in this exact format:
{
  "medicationName": "${medicationName}",
  "recommendedDosage": "specific dose with units",
  "frequency": "how often (e.g., twice daily)",
  "duration": "treatment duration",
  "route": "administration route",
  "warnings": ["warning 1", "warning 2"],
  "contraindications": ["contraindication 1", "contraindication 2"],
  "interactions": {
    "severity": "none/minor/moderate/major/contraindicated",
    "interactingMedications": ["medication names"],
    "recommendations": ["specific recommendations"]
  },
  "monitoring": ["monitoring requirement 1", "monitoring requirement 2"],
  "alternatives": [
    {
      "medication": "alternative drug name",
      "reason": "why this alternative might be better"
    }
  ],
  "confidence": 85,
  "reasoning": "detailed clinical reasoning for the recommendation"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert clinical pharmacist AI providing personalized medication dosing recommendations. Always provide evidence-based, safe dosing recommendations considering all patient factors. Return responses in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysisText = response.choices[0].message.content;
      if (!analysisText) {
        throw new Error('No response from AI service');
      }

      const recommendation = JSON.parse(analysisText) as AIRecommendation;
      
      // Validate and ensure all required fields are present
      return {
        medicationName: recommendation.medicationName || medicationName,
        recommendedDosage: recommendation.recommendedDosage || 'Consult prescribing information',
        frequency: recommendation.frequency || 'As directed',
        duration: recommendation.duration || '30 days',
        route: recommendation.route || 'By mouth',
        warnings: recommendation.warnings || [],
        contraindications: recommendation.contraindications || [],
        interactions: {
          severity: recommendation.interactions?.severity || 'none',
          interactingMedications: recommendation.interactions?.interactingMedications || [],
          recommendations: recommendation.interactions?.recommendations || []
        },
        monitoring: recommendation.monitoring || [],
        alternatives: recommendation.alternatives || [],
        confidence: recommendation.confidence || 75,
        reasoning: recommendation.reasoning || 'Based on standard clinical guidelines and patient factors'
      };

    } catch (error) {
      console.error('Error generating AI dosing recommendation:', error);
      
      // Return a safe fallback recommendation
      return {
        medicationName,
        recommendedDosage: 'Consult prescribing information',
        frequency: 'As directed by prescribing guidelines',
        duration: '30 days',
        route: 'By mouth',
        warnings: ['AI analysis unavailable - verify dosing manually'],
        contraindications: ['Review patient allergies and contraindications'],
        interactions: {
          severity: 'unknown',
          interactingMedications: [],
          recommendations: ['Manually review drug interactions']
        },
        monitoring: ['Standard monitoring as per drug guidelines'],
        alternatives: [],
        confidence: 50,
        reasoning: 'AI analysis failed - manual review required for safe prescribing'
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
}

export const aiDosingService = new AIDosingRecommendationsService();