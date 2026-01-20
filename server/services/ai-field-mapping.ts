import OpenAI from "openai";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transformationRule?: string;
}

export interface FieldMappingResult {
  mappings: FieldMapping[];
  unmappedFields: string[];
  confidence: number;
  suggestions: FieldMappingSuggestion[];
}

export interface FieldMappingSuggestion {
  sourceField: string;
  suggestedTargetField: string;
  confidence: number;
  reasoning: string;
}

export interface PatientDataSchema {
  [key: string]: {
    type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
    examples?: string[];
  };
}

export class AIFieldMappingService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Standard patient data schema for mapping
  private getPatientDataSchema(): PatientDataSchema {
    return {
      firstName: {
        type: 'string',
        required: true,
        description: 'Patient first name',
        examples: ['John', 'Mary', 'Robert']
      },
      lastName: {
        type: 'string',
        required: true,
        description: 'Patient last name',
        examples: ['Smith', 'Johnson', 'Williams']
      },
      dateOfBirth: {
        type: 'date',
        required: true,
        description: 'Patient date of birth in YYYY-MM-DD format',
        examples: ['1980-05-15', '1965-12-03', '1992-08-22']
      },
      gender: {
        type: 'string',
        required: false,
        description: 'Patient gender',
        examples: ['Male', 'Female', 'Other', 'M', 'F']
      },
      ssn: {
        type: 'string',
        required: false,
        description: 'Social Security Number',
        examples: ['123-45-6789', '987-65-4321']
      },
      address: {
        type: 'string',
        required: false,
        description: 'Patient street address',
        examples: ['123 Main St', '456 Oak Avenue', '789 Pine Drive']
      },
      city: {
        type: 'string',
        required: false,
        description: 'Patient city',
        examples: ['New York', 'Los Angeles', 'Chicago']
      },
      state: {
        type: 'string',
        required: false,
        description: 'Patient state',
        examples: ['NY', 'CA', 'TX', 'New York', 'California']
      },
      zipCode: {
        type: 'string',
        required: false,
        description: 'Patient ZIP code',
        examples: ['10001', '90210', '12345-6789']
      },
      phoneNumber: {
        type: 'string',
        required: false,
        description: 'Patient phone number',
        examples: ['(555) 123-4567', '555-123-4567', '5551234567']
      },
      email: {
        type: 'string',
        required: false,
        description: 'Patient email address',
        examples: ['patient@email.com', 'john.smith@example.com']
      },
      emergencyContact: {
        type: 'string',
        required: false,
        description: 'Emergency contact name',
        examples: ['Jane Smith', 'Robert Johnson (spouse)']
      },
      emergencyPhone: {
        type: 'string',
        required: false,
        description: 'Emergency contact phone number',
        examples: ['(555) 987-6543', '555-987-6543']
      },
      primaryInsurance: {
        type: 'string',
        required: false,
        description: 'Primary insurance provider',
        examples: ['Aetna', 'Blue Cross Blue Shield', 'Medicare']
      },
      secondaryInsurance: {
        type: 'string',
        required: false,
        description: 'Secondary insurance provider',
        examples: ['Medicaid', 'UnitedHealthcare', 'Cigna']
      },
      medicareId: {
        type: 'string',
        required: false,
        description: 'Medicare ID number',
        examples: ['1EG4-TE5-MK73', '1AB2-CD3-EF45']
      },
      medicaidId: {
        type: 'string',
        required: false,
        description: 'Medicaid ID number',
        examples: ['12345678901', 'MC123456789']
      },
      primaryPhysician: {
        type: 'string',
        required: false,
        description: 'Primary care physician name',
        examples: ['Dr. John Smith', 'Dr. Mary Johnson, MD']
      },
      referringPhysician: {
        type: 'string',
        required: false,
        description: 'Referring physician name',
        examples: ['Dr. Robert Wilson', 'Dr. Sarah Brown, MD']
      },
      diagnosis: {
        type: 'string',
        required: false,
        description: 'Primary diagnosis or condition',
        examples: ['Diabetes Type 2', 'Hypertension', 'Chronic Pain']
      },
      medications: {
        type: 'array',
        required: false,
        description: 'List of current medications',
        examples: ['["Metformin 500mg", "Lisinopril 10mg"]', '["Aspirin", "Vitamin D"]']
      },
      allergies: {
        type: 'array',
        required: false,
        description: 'List of known allergies',
        examples: ['["Penicillin", "Peanuts"]', '["Shellfish", "Latex"]']
      },
      medicalHistory: {
        type: 'string',
        required: false,
        description: 'Relevant medical history',
        examples: ['Previous heart surgery in 2018', 'Family history of diabetes']
      }
    };
  }

  async analyzeDocumentStructure(extractedText: string, filename: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a medical document analysis specialist. Analyze the provided document text and identify all potential data fields that could contain patient information. 

Return a JSON array of field names/labels found in the document. Focus on fields that might contain structured patient data such as:
- Patient demographics (name, DOB, gender, address, etc.)
- Contact information (phone, email, emergency contacts)
- Insurance information (provider, ID numbers, policy numbers)
- Medical information (diagnosis, medications, allergies, history)
- Provider information (physician names, facility information)

Return only the actual field names/labels as they appear in the document.

Example response format:
["Patient Name", "Date of Birth", "Primary Insurance", "Diagnosis", "Medications", "Address", "Phone Number"]`
          },
          {
            role: "user",
            content: `Analyze this document and extract all potential data field names:

Filename: ${filename}

Document Content:
${extractedText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{"fields": []}');
      return result.fields || [];
    } catch (error) {
      console.error('Error analyzing document structure:', error);
      return [];
    }
  }

  async generateFieldMappings(
    documentFields: string[],
    extractedText: string,
    filename: string
  ): Promise<FieldMappingResult> {
    try {
      const schema = this.getPatientDataSchema();
      const schemaDescription = Object.entries(schema)
        .map(([field, config]) => `${field}: ${config.description} (${config.type}${config.required ? ', required' : ''})`)
        .join('\n');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an intelligent field mapping specialist for healthcare data. Your task is to map document fields to a standardized patient data schema.

Target Schema Fields:
${schemaDescription}

Analyze the document fields and content to create intelligent mappings. Return a JSON object with this structure:
{
  "mappings": [
    {
      "sourceField": "document field name",
      "targetField": "schema field name",
      "confidence": 0.95,
      "transformationRule": "optional transformation description"
    }
  ],
  "unmappedFields": ["fields that couldn't be mapped"],
  "confidence": 0.85,
  "suggestions": [
    {
      "sourceField": "ambiguous field",
      "suggestedTargetField": "best guess",
      "confidence": 0.70,
      "reasoning": "explanation of mapping logic"
    }
  ]
}

Mapping Rules:
1. Only map fields with confidence >= 0.60
2. Consider field names, context, and surrounding content
3. Handle variations (e.g., "DOB" maps to "dateOfBirth")
4. Suggest transformations when needed (e.g., name parsing, date formatting)
5. Provide reasoning for uncertain mappings`
          },
          {
            role: "user",
            content: `Create field mappings for this document:

Filename: ${filename}
Document Fields: ${JSON.stringify(documentFields)}

Document Content (for context):
${extractedText.substring(0, 2000)}...`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        mappings: result.mappings || [],
        unmappedFields: result.unmappedFields || [],
        confidence: result.confidence || 0,
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('Error generating field mappings:', error);
      return {
        mappings: [],
        unmappedFields: documentFields,
        confidence: 0,
        suggestions: []
      };
    }
  }

  async extractMappedData(
    extractedText: string,
    mappings: FieldMapping[],
    filename: string
  ): Promise<any> {
    try {
      const mappingInstructions = mappings
        .map(m => `${m.sourceField} -> ${m.targetField}${m.transformationRule ? ` (${m.transformationRule})` : ''}`)
        .join('\n');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a data extraction specialist. Extract data from the document using the provided field mappings and return a structured JSON object.

Field Mappings:
${mappingInstructions}

Return extracted data in this exact format:
{
  "extractedData": {
    "targetField1": "extracted value",
    "targetField2": "extracted value"
  },
  "confidence": 0.90,
  "extractionNotes": "Notes about data quality and any issues encountered"
}

Extraction Rules:
1. Extract exact values as they appear in the document
2. Apply transformations as specified in mapping rules
3. Return null for fields that cannot be found or extracted
4. Maintain data accuracy and format consistency
5. Handle dates in YYYY-MM-DD format
6. Parse arrays properly for medications and allergies`
          },
          {
            role: "user",
            content: `Extract data from this document using the field mappings:

Filename: ${filename}

Document Content:
${extractedText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.extractedData || {};
    } catch (error) {
      console.error('Error extracting mapped data:', error);
      return {};
    }
  }

  async processDocumentWithMapping(
    extractedText: string,
    filename: string
  ): Promise<{
    documentFields: string[];
    mappingResult: FieldMappingResult;
    extractedData: any;
    overallConfidence: number;
  }> {
    console.log(`Starting AI field mapping process for: ${filename}`);

    // Step 1: Analyze document structure
    const documentFields = await this.analyzeDocumentStructure(extractedText, filename);
    console.log(`Found ${documentFields.length} document fields:`, documentFields);

    // Step 2: Generate intelligent field mappings
    const mappingResult = await this.generateFieldMappings(documentFields, extractedText, filename);
    console.log(`Generated ${mappingResult.mappings.length} field mappings with confidence: ${mappingResult.confidence}`);

    // Step 3: Extract data using mappings
    const extractedData = await this.extractMappedData(extractedText, mappingResult.mappings, filename);
    console.log(`Extracted data from ${Object.keys(extractedData).length} fields`);

    // Calculate overall confidence
    const overallConfidence = mappingResult.confidence * 0.7 + 
      (mappingResult.mappings.length / (documentFields.length || 1)) * 0.3;

    return {
      documentFields,
      mappingResult,
      extractedData,
      overallConfidence: Math.min(overallConfidence, 1.0)
    };
  }
}

export const aiFieldMappingService = new AIFieldMappingService();