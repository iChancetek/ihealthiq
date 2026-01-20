/**
 * Utility functions for parsing AI responses and handling JSON extraction
 */

export function cleanAIResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If response starts with explanation text, try to extract JSON portion
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

export function parseAIJSON(response: string, fallback: any = {}): any {
  try {
    const cleaned = cleanAIResponse(response);
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('Failed to parse AI response as JSON:', error);
    console.warn('Original response:', response);
    return fallback;
  }
}

export function extractTextFromContentBlock(contentBlock: any): string {
  if ('text' in contentBlock) {
    return contentBlock.text;
  }
  return '';
}