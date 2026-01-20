// Test real voice transcription with OpenAI Whisper
import fs from 'fs';

async function testRealTranscription() {
  try {
    // Create a minimal audio buffer for testing
    const audioBuffer = Buffer.from('test audio data for transcription');
    
    const response = await fetch('http://localhost:5000/api/ai/transcription/process-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: '16d31d4b-9f6c-4926-81aa-dfad35eb9ec3',
        audioData: `data:audio/webm;base64,${audioBuffer.toString('base64')}`
      })
    });

    const result = await response.json();
    console.log('Real transcription test result:', result);
    
    if (result.transcription && result.transcription.length > 0) {
      console.log('✅ Real voice transcription is working');
    } else {
      console.log('❌ Transcription failed or returned empty');
    }
    
  } catch (error) {
    console.error('❌ Real transcription test failed:', error.message);
  }
}

testRealTranscription();