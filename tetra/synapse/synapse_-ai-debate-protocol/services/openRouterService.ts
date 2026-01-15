
import { LLMModel } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  description?: string;
}

export const fetchOpenRouterModels = async (apiKey: string): Promise<LLMModel[]> => {
  if (!apiKey) return [];

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      throw new Error('API Anahtarı geçersiz (401 Unauthorized).');
    }

    if (!response.ok) {
      throw new Error(`OpenRouter Bağlantı Hatası: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
       throw new Error('API yanıt formatı beklenmedik şekilde.');
    }

    return data.data.map((m: OpenRouterModel) => {
      const promptPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1000000 : 0;
      const completionPrice = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1000000 : 0;

      return {
        id: m.id,
        name: m.name,
        provider: m.id.split('/')[0] || 'Unknown',
        contextWindow: m.context_length || 4096,
        promptPrice: isNaN(promptPrice) ? 0 : promptPrice,
        completionPrice: isNaN(completionPrice) ? 0 : completionPrice,
        description: m.description || `${m.name}`,
        tags: [m.id.split('/')[0]],
      };
    }).sort((a: LLMModel, b: LLMModel) => b.contextWindow - a.contextWindow);
  } catch (error) {
    console.error("OpenRouter Fetch Error:", error);
    throw error;
  }
};

export const sendChatCompletion = async (
  apiKey: string,
  modelId: string,
  messages: { role: string, content: string }[],
  systemPrompt?: string
): Promise<{ text: string; usage: number; cost: number }> => {
  
  const payload = {
    model: modelId,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages
    ],
    temperature: 0.7,
  };

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'Synapse AI Lab'
        },
        body: JSON.stringify(payload)
      });

      // Handle Rate Limiting (429)
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 2s, 4s, 8s...
          const delay = Math.pow(2, attempt + 1) * 1000; 
          console.warn(`Rate Limit Hit (429) for ${modelId}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // If all retries fail, try to read the error body
          const errorText = await response.text().catch(() => 'No error details');
          throw new Error(`API Hatası (429): Çok fazla istek (Rate Limit) ve yeniden denemeler başarısız oldu. Detay: ${errorText}`);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Try to get specific error message from provider metadata or standard error message
        const providerError = errorData.error?.metadata?.provider_error || errorData.error?.message || response.statusText;
        throw new Error(`API Hatası (${response.status}): ${providerError}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error("Model boş yanıt döndürdü.");
      }

      const usage = data.usage || { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
      
      return {
        text: choice.message.content || "",
        usage: usage.total_tokens,
        cost: 0 
      };

    } catch (error: any) {
      lastError = error;
      
      // If the error is NOT related to 429 (which is handled inside the loop via continue),
      // we generally throw immediately for things like 400 Bad Request or 401 Unauthorized.
      // However, if it was a network error (fetch failed), we *could* retry, 
      // but for now we only strictly retry on 429 logic or network exceptions if desired.
      
      if (error.message.includes("429")) {
         throw error; // Throw the final 429 error if loop finished
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError || new Error("Unknown error in sendChatCompletion");
};
