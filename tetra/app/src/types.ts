// Provider enum (NEXUS - 5 provider)
export enum Provider {
  OPENROUTER = 'OpenRouter',
  GOOGLE = 'Google Gemini',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic',
  GROK = 'xAI Grok'
}

// LLM Model interface
export interface LLMModel {
  id: string;
  name: string;
  provider: Provider | string;
  contextWindow: number;
  inputCost: number; // per 1M tokens
  outputCost: number; // per 1M tokens
  description: string;
  tags: string[];
  isConnected?: boolean;
}

// Participant roles
export enum Role {
  MODERATOR = 'Moderator',
  PARTICIPANT = 'Participant',
  HUMAN = 'Human'
}

// Participant interface
export interface Participant {
  id: string;
  modelId: string;
  modelName: string;
  name: string;
  role: Role;
  avatarUrl: string;
  systemPrompt: string;
  color: string;
  contextWindow?: number;  // Model'in context window değeri (dinamik max_tokens için)
}

// Message types
export type MessageType = 'text' | 'summary' | 'intervention';

export interface Message {
  id: string;
  participantId: string;
  content: string;
  timestamp: number;
  round: number;
  tokensUsed: number;
  cost: number;
  type: MessageType;
  responseTimeMs?: number;  // API yanıt süresi (milisaniye)
  modelId?: string;         // Hangi model kullanıldı
}

// Debate statuses
export enum DebateStatus {
  SETUP = 'SETUP',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  REVISION = 'REVISION'  // YENİ: Revizyon modu (bitmiş münazara yeniden açıldığında)
}

// Debate modes
export enum DebateMode {
  ADVERSARIAL = 'adversarial',
  COLLABORATIVE = 'collaborative'
}

// Debate configuration
export interface DebateConfig {
  topic: string;
  rounds: number;
  autoFinish: boolean;
  mode: DebateMode;
  moderator: Participant;
  participants: Participant[];
  apiKey: string;
  // Revizyon modu alanları
  isRevision?: boolean;
  revisionCatalystType?: CatalystType;
  revisionPayload?: string;
  previousDecisions?: string[];
}

// Debate state
export interface DebateState {
  status: DebateStatus;
  currentRound: number;
  messages: Message[];
  rounds: Round[];                        // YENİ: Tur yapıları
  previousRoundSummary?: RoundSummary;    // YENİ: Bir önceki tur özeti (prompt'a enjekte edilir)
  totalCost: number;
  totalTokens: number;
  activeParticipantId: string | null;
  error?: string;
  startTime: number;
  isSemiAuto: boolean;
}

// History item for dashboard (TEMEL)
export interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  mode: DebateMode;
  totalCost: number;
  roundCount: number;
  participantCount: number;
  status?: 'COMPLETED' | 'REVISION';  // YENİ: Durum takibi
  revisionCount?: number;             // YENİ: Kaç kez revize edildi
}

// =============================================
// ZENGİN ARŞİV FORMATI (Canlandırma için)
// =============================================

// Kaydedilen katılımcı bilgisi
export interface ArchivedParticipant {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
  role: Role;
  systemPrompt: string;
  color: string;
}

// Son durum özeti
export interface FinalStatus {
  progressPercent: number;         // Son ilerleme yüzdesi
  decisions: string[];             // Tüm kesinleşen kararlar
  openQuestions: string[];         // Kalan açık sorular
  conflicts: string[];             // Çözülmemiş çatışmalar
}

// =============================================
// REVİZYON SİSTEMİ (Revision System)
// =============================================

// Revizyon tetikleyici türü
export type CatalystType = 'EVIDENCE' | 'SCOPE';

// Revizyon sonucu
export type RevisionOutcome = 'UPHELD' | 'REVISED';

// Revizyon talebi
export interface RevisionRequest {
  id: string;
  catalystType: CatalystType;     // Yeni kanıt mı, kapsam değişimi mi
  catalystPayload: string;        // Kullanıcının eklediği içerik
  targetClaim?: string;           // Hangi iddiayı etkiliyor (opsiyonel)
  createdAt: number;
  resolvedAt?: number;
  outcome?: RevisionOutcome;      // Karar korundu mu, güncellendi mi
  newDecision?: string;           // Güncellenen karar (varsa)
  rationale?: string;             // Gerekçe
}

// Zengin arşiv formatı (canlandırma için TÜM BİLGİ)
export interface DebateArchive {
  // Kimlik
  id: string;
  createdAt: number;
  completedAt?: number;

  // Konfigürasyon
  topic: string;
  goals?: string[];               // Hedefler (varsa)
  mode: DebateMode;
  maxRounds: number;
  autoFinish: boolean;

  // Katılımcılar (model bilgisi dahil)
  moderator: ArchivedParticipant;
  participants: ArchivedParticipant[];

  // İçerik
  messages: Message[];
  rounds: Round[];                // Tur yapıları + özetler

  // Son durum
  finalStatus: FinalStatus;
  isCompleted: boolean;

  // Canlandırma için hazır özet (AI tarafından)
  reviveSummary?: string;         // "Bu münazara X turda kaldı. Y kararları alındı..."

  // Transcript (geriye uyumluluk)
  transcript: string;

  // YENİ: Revizyon takibi
  revisionHistory?: RevisionRequest[];  // Tüm revizyon talepleri
  revisedAt?: number;                   // Son revizyon zamanı
  revisionCount?: number;               // Toplam revizyon sayısı (max 3)
}

// =============================================
// EVRENSEL TUR YÖNETİMİ (Universal Round Management)
// =============================================

// Katılımcı katkısı özeti
export interface SpeakerHighlight {
  name: string;             // Katılımcı adı
  contribution: string;     // Kısa katkı özeti (tez/antitez)
}

// Tur özeti yapısı (konu bağımsız)
export interface RoundSummary {
  summary: string[];              // 3-5 madde özet
  speakerHighlights: SpeakerHighlight[]; // Kim ne dedi (tez-antitez için)
  decisions: string[];            // alınan kararlar
  openQuestions: string[];        // sonraki tura kalan sorular
  conflicts: string[];            // YENİ: Tespit edilen çatışmalar ("[X] vs [Y]: konu")
  progressPercent: number;        // YENİ: Hedef ilerleme yüzdesi (0-100)
  nextDirective: string;          // YENİ: Sonraki tur için direktif
  generatedAt: number;            // özet üretim zamanı
}

// Tur tipi
export type RoundType = 'NORMAL' | 'REVISION';

// Tur yapısı
export interface Round {
  id: string;
  number: number;
  startIndex: number;       // messages[] içindeki başlangıç index
  endIndex: number;         // messages[] içindeki bitiş index (dahil)
  summary?: RoundSummary;   // tur bitince doldurulur
  isComplete: boolean;      // tur tamamlandı mı
  type?: RoundType;         // YENİ: Normal tur mu, revizyon turu mu (varsayılan: NORMAL)
}

