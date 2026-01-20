import { transcribeAudio, generateVoiceResponse } from "./openai.js";

export interface VoiceMessage {
  type: 'transcription' | 'response' | 'error' | 'status';
  content: string;
  timestamp: Date;
  sessionId: string;
}

export class VoiceService {
  private elevenlabsApiKey: string;
  
  constructor() {
    this.elevenlabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY_ENV_VAR || "test_key";
  }

  async processVoiceInput(audioBuffer: Buffer, sessionId: string, context: any): Promise<VoiceMessage[]> {
    const messages: VoiceMessage[] = [];
    
    try {
      // Step 1: Transcribe audio
      const transcript = await transcribeAudio(audioBuffer);
      messages.push({
        type: 'transcription',
        content: transcript,
        timestamp: new Date(),
        sessionId
      });

      // Step 2: Generate AI response
      const aiResponse = await generateVoiceResponse(transcript, context);
      messages.push({
        type: 'response',
        content: aiResponse,
        timestamp: new Date(),
        sessionId
      });

      return messages;
    } catch (error) {
      console.error("Error processing voice input:", error);
      messages.push({
        type: 'error',
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        sessionId
      });
      return messages;
    }
  }

  async synthesizeSpeech(text: string): Promise<Buffer | null> {
    try {
      if (!this.elevenlabsApiKey || this.elevenlabsApiKey === "test_key") {
        console.warn("ElevenLabs API key not configured, skipping speech synthesis");
        return null;
      }

      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.elevenlabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return Buffer.from(audioBuffer);
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      return null;
    }
  }

  async handleInterruption(sessionId: string): Promise<void> {
    // Handle voice interruption logic
    console.log(`Voice session ${sessionId} interrupted`);
  }
}

export const voiceService = new VoiceService();
