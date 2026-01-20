import OpenAI from "openai";

// the newest OpenAI model is "gpt-4.1" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-test"
});

export interface ExtractedReferralData {
  patientName?: string;
  dateOfBirth?: string;
  diagnosis?: string;
  physician?: string;
  referralDate?: string;
  insuranceInfo?: any;
  missingFields?: string[];
}

export async function extractReferralData(ocrText: string): Promise<ExtractedReferralData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a medical data extraction expert. Extract patient information from OCR text of medical referrals. 
          Return JSON with fields: patientName, dateOfBirth (MM/DD/YYYY format), diagnosis, physician, referralDate (MM/DD/YYYY format), insuranceInfo.
          If any field is missing or unclear, include it in a missingFields array.
          Be precise and only extract clearly visible information.`
        },
        {
          role: "user",
          content: `Extract patient data from this OCR text:\n\n${ocrText}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as ExtractedReferralData;
  } catch (error) {
    console.error("Failed to extract referral data:", error);
    throw new Error("Failed to extract referral data: " + (error as Error).message);
  }
}

export interface HomeboundAssessmentResult {
  isHomebound: boolean;
  cmsCompliant: boolean;
  rationale: string;
  verdict: string;
  confidence: number;
}

export async function assessHomeboundStatus(assessmentData: any): Promise<HomeboundAssessmentResult> {
  try {
    const cmsRules = `
    CMS Homebound Criteria:
    1. Patient has condition that restricts ability to leave home except with considerable difficulty
    2. Leaving home requires considerable and taxing effort
    3. Patient normally unable to leave home unassisted
    4. Patient may leave home for medical treatment or short, infrequent trips for religious/social purposes
    5. Condition must be expected to last at least 60 days
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a CMS compliance expert evaluating homebound status. 
          Use the CMS homebound criteria to determine if a patient qualifies.
          Return JSON with: isHomebound (boolean), cmsCompliant (boolean), rationale (detailed explanation), verdict (summary), confidence (0-1).`
        },
        {
          role: "user",
          content: `${cmsRules}\n\nAssess this patient data: ${JSON.stringify(assessmentData)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as HomeboundAssessmentResult;
  } catch (error) {
    console.error("Failed to assess homebound status:", error);
    throw new Error("Failed to assess homebound status: " + (error as Error).message);
  }
}

export async function generateVoiceResponse(transcript: string, context: any): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for a HIPAA-compliant healthcare intake platform. 
          You help with patient intake, scheduling, verifications, and general healthcare workflow questions.
          Be professional, concise, and maintain HIPAA compliance. Never share specific patient information.
          Context: ${JSON.stringify(context)}`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content || "I'm sorry, I didn't understand that. Could you please rephrase your question?";
  } catch (error) {
    console.error("Failed to generate voice response:", error);
    throw new Error("Failed to generate voice response: " + (error as Error).message);
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], "audio.wav", { type: "audio/wav" }),
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error("Failed to transcribe audio:", error);
    throw new Error("Failed to transcribe audio: " + (error as Error).message);
  }
}
