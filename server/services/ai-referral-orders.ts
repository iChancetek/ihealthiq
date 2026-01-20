import OpenAI from "openai";
import type { Patient } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ================================
// AI-POWERED 1-CLICK REFERRAL GENERATION SERVICE
// ================================

export interface AIReferralData {
  patientName: string;
  dateOfBirth: string;
  diagnosis: string;
  serviceType: string;
  clinicalJustification: string;
  urgency: string;
  expectedDuration: string;
  providerInstructions: string;
  insuranceAuthorization: string;
  physicianNotes: string;
  medicalHistory: string;
  currentMedications: string;
  functionalStatus: string;
  careGoals: string;
  contactInfo: string;
  aiConfidence: number;
  generatedBy: string;
  timestamp: string;
}

export async function generateAIReferral(
  patient: Patient, 
  referralType: string, 
  serviceType: string, 
  urgency: string, 
  notes: string, 
  physicianId: number
): Promise<AIReferralData> {
  const prompt = `
  As a healthcare AI, generate a comprehensive home health referral for the following patient:

  Patient Information:
  - Name: ${patient.patientName}
  - Date of Birth: ${patient.dateOfBirth}
  - Primary Diagnosis: ${patient.primaryDiagnosis || 'Not specified'}
  - Medical History: ${patient.medicalHistory || 'Not available'}
  - Current Medications: ${patient.currentMedications || 'Not listed'}

  Referral Parameters:
  - Service Type: ${serviceType}
  - Urgency Level: ${urgency}
  - Additional Notes: ${notes}

  Generate a complete referral document including:
  1. Clinical justification for home health services
  2. Specific service requirements and frequency
  3. Patient safety considerations and risk factors
  4. Expected duration and goals of care
  5. Insurance authorization requirements
  6. Provider instructions and special considerations

  Respond in JSON format with all required fields for healthcare referral processing.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: "You are a healthcare AI specializing in generating comprehensive, CMS-compliant referral documentation. Ensure all medical justifications meet insurance requirements and clinical standards."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const aiResult = JSON.parse(response.choices[0].message.content);

  return {
    patientName: patient.patientName,
    dateOfBirth: patient.dateOfBirth,
    diagnosis: aiResult.diagnosis || patient.primaryDiagnosis || 'Unspecified',
    serviceType: serviceType,
    clinicalJustification: aiResult.clinicalJustification || 'AI-generated clinical justification',
    urgency: urgency,
    expectedDuration: aiResult.expectedDuration || '60-90 days',
    providerInstructions: aiResult.providerInstructions || 'Standard care protocols',
    insuranceAuthorization: aiResult.insuranceAuthorization || 'Prior authorization recommended',
    physicianNotes: notes || aiResult.physicianNotes || 'Generated via 1-click referral system',
    medicalHistory: patient.medicalHistory || aiResult.medicalHistory || 'Available in patient chart',
    currentMedications: patient.currentMedications || aiResult.currentMedications || 'Refer to medication list',
    functionalStatus: aiResult.functionalStatus || 'Assessment pending',
    careGoals: aiResult.careGoals || 'Improve functional independence and safety',
    contactInfo: patient.contactInfo || 'On file',
    aiConfidence: 85,
    generatedBy: `AI-Physician-${physicianId}`,
    timestamp: new Date().toISOString()
  };
}

export async function generateAIDMEOrder(
  patient: Patient,
  equipmentType: string,
  justification: string,
  urgency: string,
  physicianId: number
): Promise<AIReferralData> {
  const prompt = `
  Generate a comprehensive DME (Durable Medical Equipment) order for:

  Patient: ${patient.patientName}
  DOB: ${patient.dateOfBirth}
  Equipment Type: ${equipmentType}
  Medical Justification: ${justification}
  Urgency: ${urgency}

  Include:
  1. Medical necessity documentation
  2. Functional limitations assessment
  3. Equipment specifications and requirements
  4. Duration of need and review schedule
  5. Insurance coverage considerations
  6. Safety and training requirements

  Generate CMS-compliant DME order documentation in JSON format.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: "You are a healthcare AI specializing in DME orders and CMS compliance. Generate medically appropriate equipment orders with proper justification."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const aiResult = JSON.parse(response.choices[0].message.content);

  return {
    patientName: patient.patientName,
    dateOfBirth: patient.dateOfBirth,
    diagnosis: aiResult.diagnosis || 'Equipment-related diagnosis',
    serviceType: equipmentType,
    clinicalJustification: aiResult.medicalNecessity || justification || 'Medical necessity for prescribed equipment',
    urgency: urgency,
    expectedDuration: aiResult.durationOfNeed || '12 months',
    providerInstructions: aiResult.equipmentSpecs || 'Standard equipment specifications',
    insuranceAuthorization: aiResult.insuranceRequirements || 'Prior authorization may be required',
    physicianNotes: aiResult.physicianNotes || `DME order for ${equipmentType}`,
    medicalHistory: patient.medicalHistory || 'Available in patient chart',
    currentMedications: patient.currentMedications || 'Refer to medication list',
    functionalStatus: aiResult.functionalLimitations || 'Functional assessment documented',
    careGoals: aiResult.treatmentGoals || 'Improve mobility and independence',
    contactInfo: patient.contactInfo || 'On file',
    aiConfidence: 88,
    generatedBy: `AI-DME-${physicianId}`,
    timestamp: new Date().toISOString()
  };
}

export async function generateAISpecialistReferral(
  patient: Patient,
  specialtyType: string,
  reason: string,
  urgency: string,
  preferredProvider: string,
  physicianId: number
): Promise<AIReferralData> {
  const prompt = `
  Create a specialist referral for:

  Patient: ${patient.patientName}
  DOB: ${patient.dateOfBirth}
  Specialty: ${specialtyType}
  Reason for Referral: ${reason}
  Urgency: ${urgency}
  Preferred Provider: ${preferredProvider || 'Any qualified specialist'}

  Generate comprehensive referral including:
  1. Chief complaint and clinical presentation
  2. Relevant diagnostic results and findings
  3. Specific questions for the specialist
  4. Treatment attempted and patient response
  5. Insurance and scheduling considerations
  6. Follow-up requirements

  Provide professional specialist referral documentation in JSON format.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: "You are a healthcare AI creating specialist referrals. Generate clinically appropriate referrals with clear communication of patient needs and medical history."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const aiResult = JSON.parse(response.choices[0].message.content);

  return {
    patientName: patient.patientName,
    dateOfBirth: patient.dateOfBirth,
    diagnosis: aiResult.primaryDiagnosis || reason,
    serviceType: specialtyType,
    clinicalJustification: aiResult.clinicalPresentation || reason || `Specialist consultation for ${specialtyType}`,
    urgency: urgency,
    expectedDuration: aiResult.expectedTimeframe || 'Initial consultation',
    providerInstructions: aiResult.specificQuestions || `Specialist evaluation for ${specialtyType}`,
    insuranceAuthorization: aiResult.insuranceNotes || 'Verify specialist coverage',
    physicianNotes: aiResult.referringNotes || `Referral to ${specialtyType} specialist`,
    medicalHistory: patient.medicalHistory || aiResult.relevantHistory || 'See patient chart',
    currentMedications: patient.currentMedications || 'Current medication list available',
    functionalStatus: aiResult.functionalStatus || 'Assessment available',
    careGoals: aiResult.treatmentGoals || `Specialist evaluation and treatment recommendations`,
    contactInfo: patient.contactInfo || 'Contact information on file',
    aiConfidence: 90,
    generatedBy: `AI-Specialist-${physicianId}`,
    timestamp: new Date().toISOString()
  };
}

export async function generateAIHospiceReferral(
  patient: Patient,
  careLevel: string,
  prognosis: string,
  urgency: string,
  familyContact: string,
  physicianId: number
): Promise<AIReferralData> {
  const prompt = `
  Generate a compassionate hospice care referral for:

  Patient: ${patient.patientName}
  DOB: ${patient.dateOfBirth}
  Care Level: ${careLevel}
  Prognosis: ${prognosis}
  Urgency: ${urgency}
  Family Contact: ${familyContact}

  Include:
  1. Terminal diagnosis and prognosis documentation
  2. Comfort care goals and pain management needs
  3. Family support and communication preferences
  4. Advanced directives and end-of-life wishes
  5. Symptom management requirements
  6. Spiritual and emotional support needs

  Create comprehensive hospice referral documentation in JSON format.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: "You are a healthcare AI specializing in end-of-life care and hospice referrals. Generate compassionate, comprehensive referrals that honor patient dignity and family needs."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const aiResult = JSON.parse(response.choices[0].message.content);

  return {
    patientName: patient.patientName,
    dateOfBirth: patient.dateOfBirth,
    diagnosis: aiResult.terminalDiagnosis || prognosis,
    serviceType: careLevel,
    clinicalJustification: aiResult.prognosisDocumentation || prognosis || 'Terminal diagnosis requiring hospice care',
    urgency: urgency,
    expectedDuration: aiResult.estimatedTimeframe || 'End-of-life care',
    providerInstructions: aiResult.comfortCareGoals || 'Focus on comfort and dignity',
    insuranceAuthorization: aiResult.hospiceBenefits || 'Hospice benefits verification needed',
    physicianNotes: aiResult.physicianNotes || 'Hospice care referral for comfort and support',
    medicalHistory: patient.medicalHistory || aiResult.medicalBackground || 'Complete medical history available',
    currentMedications: patient.currentMedications || 'Current medications for review',
    functionalStatus: aiResult.functionalDecline || 'Declining functional status',
    careGoals: aiResult.endOfLifeGoals || 'Comfort, dignity, and family support',
    contactInfo: familyContact || patient.contactInfo || 'Family contact information',
    aiConfidence: 92,
    generatedBy: `AI-Hospice-${physicianId}`,
    timestamp: new Date().toISOString()
  };
}

export async function getReferralTemplates(type: string) {
  const templates = {
    'home-health': [
      { name: 'Skilled Nursing', code: 'skilled-nursing', description: 'Wound care, medication management, assessment' },
      { name: 'Physical Therapy', code: 'physical-therapy', description: 'Mobility training, strength building' },
      { name: 'Occupational Therapy', code: 'occupational-therapy', description: 'ADL training, safety assessment' },
      { name: 'Speech Therapy', code: 'speech-therapy', description: 'Swallowing assessment, communication' },
      { name: 'Home Health Aide', code: 'home-health-aide', description: 'Personal care assistance' }
    ],
    'dme': [
      { name: 'Wheelchair', code: 'wheelchair', description: 'Manual or power wheelchair' },
      { name: 'Hospital Bed', code: 'hospital-bed', description: 'Adjustable bed for medical needs' },
      { name: 'Oxygen Equipment', code: 'oxygen', description: 'Portable or stationary oxygen' },
      { name: 'CPAP/BiPAP', code: 'cpap', description: 'Sleep apnea equipment' },
      { name: 'Walker/Cane', code: 'mobility-aid', description: 'Mobility assistance devices' }
    ],
    'specialist': [
      { name: 'Cardiology', code: 'cardiology', description: 'Heart and cardiovascular system' },
      { name: 'Neurology', code: 'neurology', description: 'Brain and nervous system' },
      { name: 'Orthopedics', code: 'orthopedics', description: 'Bones, joints, and muscles' },
      { name: 'Pulmonology', code: 'pulmonology', description: 'Lungs and respiratory system' },
      { name: 'Endocrinology', code: 'endocrinology', description: 'Hormones and metabolism' }
    ],
    'hospice': [
      { name: 'Routine Care', code: 'routine-care', description: 'Standard hospice services' },
      { name: 'Continuous Care', code: 'continuous-care', description: '24-hour nursing care' },
      { name: 'Respite Care', code: 'respite-care', description: 'Temporary relief for caregivers' },
      { name: 'General Inpatient', code: 'inpatient', description: 'Acute symptom management' }
    ]
  };

  return templates[type] || [];
}