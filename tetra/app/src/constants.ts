import { LLMModel, Provider } from './types';

// Default API key
// Production'da env'den okunmalı
export const DEFAULT_API_KEY = import.meta.env.VITE_DEFAULT_API_KEY || '';

// Default models (SYNAPSE + NEXUS combined)
export const DEFAULT_MODELS: LLMModel[] = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: Provider.GOOGLE,
    contextWindow: 1048576,
    inputCost: 0,
    outputCost: 0,
    description: 'Google\'s fastest multimodal model - Free tier.',
    tags: ['Free', 'Fast', 'Multimodal'],
    isConnected: true
  },
  {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    provider: Provider.GOOGLE,
    contextWindow: 1000000,
    inputCost: 0.075,
    outputCost: 0.3,
    description: 'Latest Gemini with thinking capabilities.',
    tags: ['New', 'Fast', 'Reasoning'],
    isConnected: true
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: Provider.OPENAI,
    contextWindow: 128000,
    inputCost: 5.0,
    outputCost: 15.0,
    description: 'OpenAI flagship model.',
    tags: ['Popular', 'Balanced'],
    isConnected: false
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: Provider.ANTHROPIC,
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    description: 'Anthropic\'s most intelligent model.',
    tags: ['Coding', 'Writing'],
    isConnected: false
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: Provider.OPENROUTER,
    contextWindow: 128000,
    inputCost: 0.35,
    outputCost: 0.4,
    description: 'Open source large language model.',
    tags: ['Open Source', 'Fast'],
    isConnected: true
  },
  {
    id: 'x-ai/grok-beta',
    name: 'Grok Beta',
    provider: Provider.GROK,
    contextWindow: 128000,
    inputCost: 2.0,
    outputCost: 8.0,
    description: 'xAI\'s witty and unfiltered model.',
    tags: ['Uncensored', 'Witty'],
    isConnected: false
  },
];

// Avatar URLs
export const AVATARS = [
  'https://ui-avatars.com/api/?name=Mod&background=8b5cf6&color=fff',
  'https://ui-avatars.com/api/?name=A1&background=3b82f6&color=fff',
  'https://ui-avatars.com/api/?name=A2&background=ec4899&color=fff',
  'https://ui-avatars.com/api/?name=A3&background=10b981&color=fff',
  'https://ui-avatars.com/api/?name=A4&background=f59e0b&color=fff',
];

// Participant colors
export const COLORS = [
  '#8b5cf6', // Violet (Moderator)
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
];

// Default topic
export const DEFAULT_TOPIC = "Yazılım projelerinde Monolith mimariden Microservices mimarisine geçişin maliyet/fayda analizi.";


