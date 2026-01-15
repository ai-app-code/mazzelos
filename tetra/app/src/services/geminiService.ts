// Gemini Service - For Google AI models via OpenRouter
// This uses OpenRouter as a proxy for Gemini models

interface GeminiResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

interface HistoryMessage {
  role: string;
  text: string;
}

export const generateDebateTurn = async (
  modelId: string,
  systemContext: string,
  history: HistoryMessage[],
  instruction: string,
  apiKey?: string
): Promise<GeminiResponse> => {
  const key = apiKey || localStorage.getItem('hibrit_api_keys') 
    ? JSON.parse(localStorage.getItem('hibrit_api_keys') || '{}')['OpenRouter'] 
    : '';

  if (!key) {
    throw new Error('API anahtarı bulunamadı');
  }

  // Build conversation history
  const messages = history.map(h => ({
    role: h.role === 'Moderator' ? 'assistant' : 'user',
    content: `[${h.role}]: ${h.text}`
  }));

  // Add current instruction
  messages.push({
    role: 'user',
    content: instruction
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Hibrit AI Debate',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemContext },
          ...messages
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      text: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
  } catch (error) {
    console.error("Gemini turn generation failed:", error);
    throw error;
  }
};





