
import { LLMModel, Provider } from '../types';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  tags?: string[];
}

export const fetchOpenRouterModels = async (apiKey: string): Promise<LLMModel[]> => {
  try {
    // Fetching all models from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin, // Required by OpenRouter
        'X-Title': 'Nexus Debate AI', // Required by OpenRouter
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawModels: OpenRouterModel[] = data.data;

    // Filter and Map to our LLMModel type
    const mappedModels: LLMModel[] = rawModels
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: Provider.OPENROUTER,
        contextWindow: m.context_length,
        // OpenRouter pricing is usually per token string, convert to number per 1M tokens
        inputCost: parseFloat(m.pricing.prompt) * 1000000,
        outputCost: parseFloat(m.pricing.completion) * 1000000,
        description: m.description || 'High-performance model hosted via OpenRouter.',
        tags: ['External', ...((m.tags || []).slice(0, 2))],
        isConnected: true
      }))
      // Sort by context window size descending to showcase powerful models first
      .sort((a, b) => b.contextWindow - a.contextWindow);

    // We do NOT slice here anymore to allow the frontend to search the full catalog.
    return mappedModels;
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    return [];
  }
};
