
import { LLMModel } from './types';

export const DEFAULT_MODELS: LLMModel[] = [
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    provider: "Google",
    contextWindow: 1048576,
    promptPrice: 0,
    completionPrice: 0,
    description: "Google's fastest multimodal model",
    tags: ["google", "free", "flash"]
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    contextWindow: 128000,
    promptPrice: 5,
    completionPrice: 15,
    description: "OpenAI's flagship model",
    tags: ["openai", "gpt-4"]
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    contextWindow: 200000,
    promptPrice: 3,
    completionPrice: 15,
    description: "Anthropic's most intelligent model",
    tags: ["anthropic", "claude"]
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    contextWindow: 128000,
    promptPrice: 0.35,
    completionPrice: 0.4,
    description: "Open source large language model",
    tags: ["meta", "llama"]
  }
];

export const AVATAR_URLS = {
  MODERATOR: 'https://ui-avatars.com/api/?name=Moderator&background=8b5cf6&color=fff',
  PROTAGONIST: 'https://ui-avatars.com/api/?name=Tez&background=3b82f6&color=fff',
  ANTAGONIST: 'https://ui-avatars.com/api/?name=Anti&background=ec4899&color=fff',
  COMMENTATOR: 'https://ui-avatars.com/api/?name=Com&background=10b981&color=fff',
};

export const DEFAULT_TOPIC = "Yapay zeka geliÅŸtirme sÃ¼reÃ§lerinde aÃ§Ä±k kaynak (open-source) modeller, kapalÄ± kaynak (closed-source) modellere gÃ¶re daha gÃ¼venlidir.";

export const DEFAULT_API_KEY = "";

