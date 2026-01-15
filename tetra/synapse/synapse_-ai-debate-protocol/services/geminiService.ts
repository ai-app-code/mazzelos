import { GoogleGenAI } from "@google/genai";

// Ensure API key is present
const API_KEY = process.env.API_KEY || ''; 

export class GeminiService {
  private client: GoogleGenAI | null = null;

  constructor() {
    if (API_KEY) {
      this.client = new GoogleGenAI({ apiKey: API_KEY });
    } else {
      console.warn("Gemini API Key missing in environment variables.");
    }
  }

  public async generateResponse(
    modelId: string,
    systemInstruction: string,
    prompt: string
  ): Promise<{ text: string; usage: number }> {
    if (!this.client) {
      return { text: "Configuration Error: API Key missing.", usage: 0 };
    }

    try {
      // Gemini 2.5+ supports system instructions in config
      const response = await this.client.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          // Basic safety settings to allow for debate
        },
      });

      const text = response.text || "No response generated.";
      
      // Estimate usage since the SDK simplified response might not always detail it in the basic access
      // For a real app, we would parse metadata if available, or estimate: 1 token ~= 4 chars
      const usage = Math.ceil((prompt.length + text.length) / 4);

      return { text, usage };
    } catch (error) {
      console.error("Gemini API Error:", error);
      return { text: `Error executing model: ${error}`, usage: 0 };
    }
  }
}

export const geminiService = new GeminiService();