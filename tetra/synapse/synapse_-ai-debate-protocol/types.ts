
export enum ProviderType {
  OPENROUTER = 'OpenRouter',
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  promptPrice: number; // Cost per 1M tokens
  completionPrice: number; // Cost per 1M tokens
  description?: string;
  tags: string[];
}

export enum ParticipantRole {
  MODERATOR = 'MODERATOR',
  PARTICIPANT = 'PARTICIPANT', // Generic role for flexible problem solving
}

export interface DebateParticipant {
  id: string;
  modelId: string; // The API model ID
  modelName: string; // Display name of the model
  name: string; // Character name (e.g., "Software Architect")
  role: ParticipantRole;
  systemPrompt: string; // The custom instructions
  color: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  participantId: string;
  content: string;
  timestamp: number;
  round: number;
  tokensUsed: number;
  cost: number; // Calculated cost for this specific message
  type: 'text' | 'summary' | 'interjection' | 'intervention'; // Added intervention
}

export enum DebateStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export interface DebateConfig {
  topic: string;
  rounds: number;
  autoFinish: boolean; // New: Consensus mode
  participants: DebateParticipant[];
  apiKey: string;
}

export interface DebateState {
  status: DebateStatus;
  currentRound: number;
  messages: Message[];
  totalCost: number;
  totalTokens: number;
  activeParticipantId: string | null;
  error?: string;
  startTime: number;
  isSemiAuto: boolean; // New: Toggle for semi-auto mode
}
