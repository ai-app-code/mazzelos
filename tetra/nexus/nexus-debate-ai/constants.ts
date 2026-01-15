import { LLMModel, Provider } from './types';

export const MOCK_MODELS: LLMModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: Provider.GOOGLE,
    contextWindow: 1000000,
    inputCost: 0.075,
    outputCost: 0.3,
    description: 'Fastest, most cost-effective multimodal model.',
    tags: ['Fast', 'Multimodal', 'Efficient'],
    isConnected: true
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: Provider.GOOGLE,
    contextWindow: 2000000,
    inputCost: 1.25,
    outputCost: 5.0,
    description: 'Best-in-class reasoning for complex tasks.',
    tags: ['Reasoning', 'Coding', 'Complex'],
    isConnected: true
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: Provider.OPENAI,
    contextWindow: 128000,
    inputCost: 5.0,
    outputCost: 15.0,
    description: 'Flagship model from OpenAI.',
    tags: ['Popular', 'Balanced'],
    isConnected: false
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: Provider.ANTHROPIC,
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    description: 'Excellent nuance and coding capabilities.',
    tags: ['Coding', 'Writing'],
    isConnected: false
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: Provider.GROK,
    contextWindow: 128000,
    inputCost: 2.0,
    outputCost: 8.0,
    description: 'Witty and rebellious model from xAI.',
    tags: ['Uncensored', 'Witty'],
    isConnected: false
  },
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    provider: Provider.OPENROUTER,
    contextWindow: 8000,
    inputCost: 0.7,
    outputCost: 0.9,
    description: 'Open source powerhouse.',
    tags: ['Open Source', 'Fast'],
    isConnected: false
  },
];

export const AVATARS = [
  'https://picsum.photos/id/64/100/100',
  'https://picsum.photos/id/1025/100/100',
  'https://picsum.photos/id/237/100/100',
  'https://picsum.photos/id/1062/100/100',
  'https://picsum.photos/id/177/100/100',
];

export const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
];
