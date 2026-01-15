
export enum Provider {
  OPENROUTER = 'OpenRouter',
  GOOGLE = 'Google Gemini',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic',
  GROK = 'xAI Grok'
}

export interface LLMModel {
  id: string;
  name: string;
  provider: Provider;
  contextWindow: number;
  inputCost: number; // per 1M tokens
  outputCost: number; // per 1M tokens
  description: string;
  tags: string[];
  isConnected?: boolean;
}

export enum Role {
  MODERATOR = 'Moderator',
  PARTICIPANT = 'Participant',
  HUMAN = 'Human'
}

export interface Participant {
  id: string;
  modelId: string;
  name: string; // Display name e.g., "Skeptic Scientist"
  role: Role;
  avatarUrl: string;
  systemInstruction?: string;
  color: string;
}

export interface Message {
  id: string;
  participantId: string;
  content: string;
  timestamp: number;
  round: number;
  tokensUsed?: number;
  cost?: number;
  isThinking?: boolean;
}

export enum DebateStatus {
  SETUP = 'SETUP',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum DebateMode {
  ADVERSARIAL = 'adversarial', // Thesis vs Antithesis
  COLLABORATIVE = 'collaborative' // Problem Solving
}

export interface DebateConfig {
  topic: string;
  rounds: number;
  autoFinish: boolean; // NEW: Check for consensus to end early
  moderator: Participant;
  participants: Participant[];
  mode: DebateMode;
}

export interface DebateState {
  status: DebateStatus;
  currentRound: number;
  history: Message[];
  totalCost: number;
  activeParticipantId: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  mode: DebateMode;
  totalCost: number;
  roundCount: number;
  participantCount: number;
}
