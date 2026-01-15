import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { translations, Language } from '@/translations';
import {
  DebateConfig, DebateState, DebateStatus, Message, Role, LLMModel, HistoryItem, DebateMode, Round, RoundSummary, DebateArchive
} from '@/types';
import { generateTurnResponse, generateRoundSummary } from '@/services/debateEngine';
import { onOpenRouterEvent } from '@/services/openRouterService';
import api from '@/services/api';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Play, Pause, RotateCcw, MessageSquare, Flame, CheckCircle2, Zap,
  StepForward, AlertCircle, Gavel, XCircle, Check, Send, Copy, Download,
  ClipboardList, ChevronDown, ChevronUp, Loader2, Home
} from 'lucide-react';

interface DebateArenaProps {
  config: DebateConfig;
  onClose: () => void;
  lang: Language;
  allModels: LLMModel[];
}

type AutoPlayMode = 'off' | 'semi' | 'full';

export const DebateArena: React.FC<DebateArenaProps> = ({ config, onClose, lang, allModels }) => {
  const t = translations[lang].arena;

  // 🆕 SAFE CLOSE: Manuel durdurmada da kayıt yap
  const handleClose = () => {
    if (state.messages.length > 0 && state.status !== DebateStatus.COMPLETED) {
      console.log('[handleClose] Saving incomplete debate to history before closing...');
      saveToHistory();
    }
    onClose();
  };

  const [state, setState] = useState<DebateState>({
    status: DebateStatus.SETUP,
    currentRound: 0,
    messages: [],
    rounds: [],                           // YENİ: Tur yapıları
    previousRoundSummary: undefined,      // YENİ: Bir önceki tur özeti
    totalCost: 0,
    totalTokens: 0,
    activeParticipantId: null,
    startTime: 0,
    isSemiAuto: false,
  });

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  // 🆕 A AKIŞI: Hangi tur için özet üretildiğini UI'da doğru yerde göstermek için
  const [summarizingRoundNumber, setSummarizingRoundNumber] = useState<number | null>(null);

  // 🆕 RACE CONDITION FIX: Senkron kontrol için ref'ler
  // React useState asenkron güncellenir, ref anında güncellenir
  const isProcessingRef = useRef(false);
  const isGeneratingSummaryRef = useRef(false);

  // 🆕 CLOSURE FIX: previousRoundSummary için ref
  // useState closure sorunu yaşar, ref her zaman güncel değeri tutar
  const previousRoundSummaryRef = useRef<RoundSummary | undefined>(undefined);

  const [humanInput, setHumanInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [autoPlayMode, setAutoPlayMode] = useState<AutoPlayMode>('off');
  const [textSize, setTextSize] = useState(14);
  const [copied, setCopied] = useState(false);

  // Ratification State (NEXUS)
  const [showRatification, setShowRatification] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [expandedRoundReports, setExpandedRoundReports] = useState<Set<number>>(new Set());

  // 🆕 Diskalifiye State
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [failedParticipant, setFailedParticipant] = useState<typeof config.participants[0] | null>(null);
  const [disqualifiedIds, setDisqualifiedIds] = useState<Set<string>>(new Set());

  // 🆕 RACE FIX: disqualifiedIds için ref (useState asenkron, ref senkron)
  const disqualifiedIdsRef = useRef<Set<string>>(new Set());

  // 🆕 RETRY STATE: UI'da retry durumunu göster
  const [retryAttempt, setRetryAttempt] = useState(0); // 0 = ilk deneme, 1 = retry 1, 2 = retry 2...
  const MAX_RETRY_ATTEMPTS = 3; // Toplam 3 deneme (1 ilk + 2 retry)

  // 🆕 TUR ÖZETİ SIRASINDA ANİMASYON (kehribar kutu içinde)
  const ROUND_TRANSITION_DELAY = 1500; // 1.5 saniye (kısa görsel geçiş)

  // 🆕 TOAST BİLDİRİM SİSTEMİ
  interface Toast {
    id: number;
    type: 'info' | 'warning' | 'success' | 'error';
    message: string;
    icon: string;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast ekle
  const addToast = (type: Toast['type'], message: string, icon: string) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { id, type, message, icon }]); // Max 5 toast

    // 4 saniye sonra kaldır
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 🆕 OpenRouter event listener → Toast
  useEffect(() => {
    const unsubscribe = onOpenRouterEvent((event) => {
      switch (event.type) {
        case 'cache_fallback_started':
          addToast('warning', event.message, '🔄');
          break;
        case 'cache_fallback_success':
          addToast('success', event.message, '✅');
          break;
        case 'cache_fallback_failed':
          addToast('error', event.message, '❌');
          break;
        case 'retry_started':
          addToast('warning', event.message, '🔄');
          break;
        case 'retry_success':
          addToast('success', event.message, '✅');
          break;
        case 'cache_hit':
          addToast('success', `🔥 ${event.message}`, '💰');
          break;
        case 'model_marked_incompatible':
          addToast('warning', event.message, '⚠️');
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  // 🆕 KREDİ HATASI STATE
  const [creditsError, setCreditsError] = useState<{
    show: boolean;
    modelId: string;
    details: string;
    settingsUrl: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isRoundComplete = () => {
    if (state.messages.length === 0) return false;
    const lastMsg = state.messages[state.messages.length - 1];
    return lastMsg.participantId === config.moderator.id;
  };

  // Check for ratification prompt (daha spesifik pattern'ler)
  useEffect(() => {
    if (state.messages.length > 0) {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg.participantId === config.moderator.id) {
        const content = lastMsg.content.toLowerCase();

        // Sadece şu durumda ratification göster:
        // 1. "nihai plan" + ("onay" veya "oyla" veya "karar") birlikte geçiyorsa
        // 2. Veya "[ONAY_İSTE]" işaretçisi varsa (moderatör prompt'una eklenebilir)
        // 3. Veya "plan sunuldu" + "onaylıyor musunuz" gibi bağlamsal ifadeler
        const hasNihaiPlan = content.includes('nihai plan');
        const hasOnayKeyword = content.includes('onaylıyor musunuz') ||
          content.includes('onay iste') ||
          content.includes('kararınız') ||
          content.includes('oylama') ||
          content.includes('[onay_iste]');
        const hasPlanSunuldu = content.includes('plan sunuldu') || content.includes('planı sunuyorum');

        // Ratification sadece net bir "nihai plan sunumu" varsa tetiklenir
        const shouldShowRatification = (hasNihaiPlan && hasOnayKeyword) ||
          hasPlanSunuldu ||
          content.includes('[onay_iste]');

        if (shouldShowRatification) {
          setShowRatification(true);
          if (autoPlayMode === 'full') setAutoPlayMode('semi');
        } else {
          setShowRatification(false);
          setShowRejectInput(false);
        }
      }
    }
  }, [state.messages, config.moderator.id, autoPlayMode]);

  // Start debate
  useEffect(() => {
    if (state.status === DebateStatus.SETUP) {
      startDebate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Bekleme süresi sayacı
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isProcessing && processingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, processingStartTime]);

  // Save to history on completion
  useEffect(() => {
    if (state.status === DebateStatus.COMPLETED) {
      saveToHistory();
      setAutoPlayMode('off');
      setShowRatification(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Auto-play logic - 🆕 REF KONTROLÜ ile race condition fix
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // 🆕 SENKRON REF KONTROLÜ: useState asenkron, useRef senkron
    // Bu sayede "işlem devam ederken yeni tur başlama" sorunu çözülür
    const canProceed = state.status === DebateStatus.RUNNING &&
      !isProcessingRef.current &&        // 🆕 Ref kontrolü
      !isGeneratingSummaryRef.current && // 🆕 Ref kontrolü  
      autoPlayMode !== 'off';

    if (canProceed) {
      if (autoPlayMode === 'semi' && isRoundComplete() && state.currentRound > 0) {
        return;
      }
      if (showRatification) return;

      timeoutId = setTimeout(() => {
        // Timeout sonrası tekrar ref kontrolü (güvenlik)
        if (!isProcessingRef.current && !isGeneratingSummaryRef.current) {
          nextTurn();
        }
      }, 2000);
    }
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayMode, state.status, isProcessing, state.messages, showRatification, isGeneratingSummary]);

  const saveToHistory = async () => {
    const transcript = buildTranscript(state.messages);
    const archiveId = Date.now().toString();

    // 1. Temel history item
    const newItem: HistoryItem = {
      id: archiveId,
      timestamp: Date.now(),
      topic: config.topic,
      mode: config.mode,
      totalCost: state.totalCost,
      roundCount: state.currentRound,
      participantCount: config.participants.length
    };

    // 2. ZENGİN ARŞİV (canlandırma için)
    const lastRoundSummary = state.rounds.length > 0
      ? state.rounds[state.rounds.length - 1]?.summary
      : undefined;

    const allDecisions = state.rounds
      .filter(r => r.summary?.decisions)
      .flatMap(r => r.summary!.decisions);

    const archive: DebateArchive = {
      id: archiveId,
      createdAt: state.startTime || Date.now(),
      completedAt: state.status === DebateStatus.COMPLETED ? Date.now() : undefined,
      topic: config.topic,
      mode: config.mode,
      maxRounds: config.rounds,
      autoFinish: config.autoFinish,
      moderator: {
        id: config.moderator.id,
        name: config.moderator.name,
        modelId: config.moderator.modelId,
        modelName: config.moderator.modelName,
        role: config.moderator.role,
        systemPrompt: config.moderator.systemPrompt,
        color: config.moderator.color
      },
      participants: config.participants.map(p => ({
        id: p.id,
        name: p.name,
        modelId: p.modelId,
        modelName: p.modelName,
        role: p.role,
        systemPrompt: p.systemPrompt,
        color: p.color
      })),
      messages: state.messages,
      rounds: state.rounds,
      finalStatus: {
        progressPercent: lastRoundSummary?.progressPercent || 0,
        decisions: allDecisions,
        openQuestions: lastRoundSummary?.openQuestions || [],
        conflicts: lastRoundSummary?.conflicts || []
      },
      isCompleted: state.status === DebateStatus.COMPLETED,
      transcript
    };

    // Backend API'ye kaydet
    try {
      await api.history.add(newItem);
      await api.archives.add(archive);
      console.log('[Archive] Saved to backend:', archive.id);
    } catch (err) {
      console.error('[Archive] Backend save failed, using localStorage fallback:', err);
      // Fallback to localStorage if backend fails
      const existing = localStorage.getItem('tetra_history');
      const history = existing ? JSON.parse(existing) : [];
      history.push(newItem);
      localStorage.setItem('tetra_history', JSON.stringify(history));

      const archivesExisting = localStorage.getItem('tetra_archives');
      const archives = archivesExisting ? JSON.parse(archivesExisting) : [];
      archives.push(archive);
      localStorage.setItem('tetra_archives', JSON.stringify(archives));
    }
  };

  // ARKA PLANDA TUR ÖZETİ ÜRET (kullanıcıya görünmez)
  // allMessages parametresi closure sorununu önler
  // 🆕 RACE FIX v4: REF'ler executeTurn'de setState'DEN ÖNCE ayarlanıyor
  // Bu sayede useEffect tetiklendiğinde ref zaten true ve nextTurn() engellenir
  const generateRoundSummaryInBackground = async (roundNumber: number, allMessages: Message[]) => {
    // NOT: isGeneratingSummaryRef.current = true ve setIsGeneratingSummary(true) 
    // executeTurn'de setState'DEN ÖNCE çağrıldı - bu kritik!

    try {
      const roundMessages = allMessages.filter(m => m.round === roundNumber);

      if (roundMessages.length === 0) {
        console.log(`[Summary] Round ${roundNumber} has no messages, skipping.`);
        // 🚨 RACE FIX v5: Ref burada sıfırlanmayacak, executeTurn sıfırlayacak
        return;
      }

      const summaryModelId = config.moderator.modelId;
      console.log(`[Summary] Generating summary for round ${roundNumber} with ${roundMessages.length} messages...`);

      const summary = await generateRoundSummary(
        config.apiKey,
        summaryModelId,
        roundMessages,
        config.participants
      );

      if (summary) {
        console.log(`[Summary] Round ${roundNumber} summary generated:`, summary);

        // 🆕 REF'İ ÖNCE GÜNCELLE - closure sorunu çözülür
        previousRoundSummaryRef.current = summary;

        setState(prev => {
          const updatedRounds = prev.rounds.map(r =>
            r.number === roundNumber ? { ...r, summary } : r
          );

          return {
            ...prev,
            rounds: updatedRounds,
            previousRoundSummary: summary
          };
        });
      } else {
        console.warn(`[Summary] Failed to generate summary for round ${roundNumber}`);
      }
    } catch (error) {
      console.error(`[Summary] Error generating summary for round ${roundNumber}:`, error);
    }

    // 🚨 RACE FIX v5: REF BURADA SIFIRLANMAYACAK!
    // executeTurn içinde animasyon + tur güncellemesi bittikten SONRA sıfırlanacak
    // Aksi halde useEffect hemen nextTurn() çağırır ve race condition oluşur
  };

  // 🆕 REFACTORED: executeTurn çağrısı kaldırıldı - useEffect otomatik tetikleyecek
  // Bu race condition'ı önler (Double Moderator Speak)
  const startDebate = () => {
    setState(prev => ({
      ...prev,
      status: DebateStatus.RUNNING,
      currentRound: 1,
      startTime: Date.now(),
      messages: [],
      rounds: [],
      totalCost: 0,
      totalTokens: 0
    }));
    // ✅ executeTurn ÇAĞRILMIYOR - auto-play useEffect tetikleyecek
  };

  const buildTranscript = (messages: Message[]) => {
    const lines: string[] = [];

    // ═══════════════════════════════════════════════════════════════
    // BAŞLIK BİLGİLERİ
    // ═══════════════════════════════════════════════════════════════
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        TETRA MÜNAZARA TRANSKRİPTİ                          ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`📋 KONU: ${config.topic}`);
    lines.push(`📅 TARİH: ${new Date(state.startTime || Date.now()).toLocaleString('tr-TR')}`);
    lines.push(`💰 TOPLAM MALİYET: $${state.totalCost.toFixed(5)}`);
    lines.push(`📊 TOPLAM TOKEN: ${state.totalTokens.toLocaleString()}`);
    lines.push(`🔄 TOPLAM TUR: ${state.currentRound}`);
    lines.push('');

    // Katılımcı listesi
    lines.push('👥 KATILIMCILAR:');
    config.participants.forEach(p => {
      const roleEmoji = p.role === Role.MODERATOR ? '🎯' : '💬';
      lines.push(`   ${roleEmoji} ${p.name} (${p.modelName || p.modelId})`);
    });
    lines.push('');
    lines.push('═'.repeat(78));
    lines.push('');

    // ═══════════════════════════════════════════════════════════════
    // MESAJLAR VE TUR RAPORLARI
    // ═══════════════════════════════════════════════════════════════
    let lastRoundWithReport = 0;

    messages.forEach((m, idx) => {
      const sender = getParticipant(m.participantId) || { name: 'Admin', role: Role.HUMAN, modelName: '' };
      const roleLabel = sender.role === Role.MODERATOR ? '🎯 MOD' : sender.role === Role.HUMAN ? '👤 ADMIN' : '💬';
      const modelInfo = sender.modelName ? ` - ${sender.modelName.split('/').pop()?.split(':')[0] || ''}` : '';

      // Mesaj başlığı
      lines.push(`┌─────────────────────────────────────────────────────────────────────────────┐`);
      lines.push(`│ ${roleLabel} ${sender.name}${modelInfo}`);
      lines.push(`│ TUR ${m.round} | ${new Date(m.timestamp).toLocaleTimeString('tr-TR')}`);

      // Performans bilgileri
      if (m.responseTimeMs || m.tokensUsed || m.cost) {
        const perfParts: string[] = [];
        if (m.responseTimeMs) perfParts.push(`⏱️ ${(m.responseTimeMs / 1000).toFixed(1)}s`);
        if (m.tokensUsed) perfParts.push(`📊 ${m.tokensUsed} token`);
        if (m.cost) perfParts.push(`💰 $${m.cost.toFixed(5)}`);
        lines.push(`│ ${perfParts.join(' | ')}`);
      }
      lines.push(`└─────────────────────────────────────────────────────────────────────────────┘`);

      // Mesaj içeriği
      const cleanContent = m.content.replace('[OTURUM_SONLANDI]', '').trim();
      lines.push(cleanContent);
      lines.push('');

      // Tur Raporu: Bu mesajdan sonra tur değişiyorsa ve rapor henüz eklenmemişse
      const nextMsg = messages[idx + 1];
      const isLastOfRound = m.round > 0 && nextMsg && nextMsg.round > m.round;
      const roundSummary = state.rounds.find(r => r.number === m.round)?.summary;

      if (isLastOfRound && roundSummary && m.round > lastRoundWithReport) {
        lastRoundWithReport = m.round;

        lines.push('');
        lines.push(`╔══════════════════════════════════════════════════════════════════════════╗`);
        lines.push(`║  ⭐ TUR ${m.round} RAPORU                                                       ║`);
        lines.push(`╠══════════════════════════════════════════════════════════════════════════╣`);

        // İlerleme yüzdesi
        if (typeof roundSummary.progressPercent === 'number') {
          const bar = '█'.repeat(Math.floor(roundSummary.progressPercent / 5)) + '░'.repeat(20 - Math.floor(roundSummary.progressPercent / 5));
          lines.push(`║  📊 HEDEF İLERLEME: [${bar}] %${roundSummary.progressPercent}`);
        }

        // Özet maddeleri
        if (roundSummary.summary && roundSummary.summary.length > 0) {
          lines.push(`║`);
          lines.push(`║  📝 SOMUT ÇIKTILAR:`);
          roundSummary.summary.forEach((item, i) => {
            lines.push(`║     ${i + 1}. ${item}`);
          });
        }

        // Kim ne dedi
        if (roundSummary.speakerHighlights && roundSummary.speakerHighlights.length > 0) {
          lines.push(`║`);
          lines.push(`║  👥 KİM NE DEDİ:`);
          roundSummary.speakerHighlights.forEach(sh => {
            lines.push(`║     • ${sh.name}: ${sh.contribution}`);
          });
        }

        // Kararlar
        if (roundSummary.decisions && roundSummary.decisions.length > 0) {
          lines.push(`║`);
          lines.push(`║  ✅ KESİNLEŞEN KARARLAR:`);
          roundSummary.decisions.forEach(d => {
            lines.push(`║     ✓ ${d}`);
          });
        }

        // Çatışmalar
        if (roundSummary.conflicts && roundSummary.conflicts.length > 0) {
          lines.push(`║`);
          lines.push(`║  ⚠️ ÇATIŞMALAR:`);
          roundSummary.conflicts.forEach(c => {
            lines.push(`║     🔥 ${c}`);
          });
        }

        // Açık sorular
        if (roundSummary.openQuestions && roundSummary.openQuestions.length > 0) {
          lines.push(`║`);
          lines.push(`║  ❓ AÇIK SORULAR:`);
          roundSummary.openQuestions.forEach(q => {
            lines.push(`║     → ${q}`);
          });
        }

        // Sonraki direktif
        if (roundSummary.nextDirective) {
          lines.push(`║`);
          lines.push(`║  🎯 SONRAKİ TUR DİREKTİFİ:`);
          lines.push(`║     ${roundSummary.nextDirective}`);
        }

        lines.push(`╚══════════════════════════════════════════════════════════════════════════╝`);
        lines.push('');
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // SON DURUM
    // ═══════════════════════════════════════════════════════════════
    lines.push('');
    lines.push('═'.repeat(78));
    lines.push('');
    lines.push(`🏁 OTURUM DURUMU: ${state.status === DebateStatus.COMPLETED ? 'TAMAMLANDI ✅' : 'DEVAM EDİYOR...'}`);
    lines.push(`📅 BİTİŞ: ${new Date().toLocaleString('tr-TR')}`);
    lines.push('');
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                      TETRA AI DEBATE PROTOCOL v2.0                         ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  };

  const handleCopyTranscript = () => {
    const transcript = buildTranscript(state.messages);
    navigator.clipboard.writeText(transcript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadTranscript = () => {
    const transcript = buildTranscript(state.messages);
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.topic.replace(/\\s+/g, '_').slice(0, 50)}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tur raporu kartını aç/kapat
  const toggleRoundReport = (roundNumber: number) => {
    setExpandedRoundReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundNumber)) {
        newSet.delete(roundNumber);
      } else {
        newSet.add(roundNumber);
      }
      return newSet;
    });
  };

  // Belirli bir tur için özet al
  const getRoundSummary = (roundNumber: number): RoundSummary | undefined => {
    const round = state.rounds.find(r => r.number === roundNumber);
    return round?.summary;
  };

  // 🆕 A AKIŞI: Tur bitince önce özet üret, sonra moderatör yeni turu başlatsın/bitirsin
  const finalizeRoundAndThenModerator = useCallback(async () => {
    // Aynı anda iki kez tetiklenmesin
    if (isProcessingRef.current || isGeneratingSummaryRef.current) return;
    if (state.status !== DebateStatus.RUNNING) return;
    if (state.messages.length === 0) return;

    const lastMsg = state.messages[state.messages.length - 1];
    const completedRoundNumber = lastMsg.round || state.currentRound;
    if (completedRoundNumber <= 0) return;

    // 1) Tur kaydını (rounds[]) garanti altına al: raporu doğru yerde gösterebilmek için endIndex lazım
    setState(prev => {
      const existing = prev.rounds.find(r => r.number === completedRoundNumber);
      if (existing) return prev;

      const startIndex = prev.messages.findIndex(m => m.round === completedRoundNumber);
      const endIndex = prev.messages.length - 1;

      const newRound: Round = {
        id: `round-${completedRoundNumber}`,
        number: completedRoundNumber,
        startIndex: startIndex >= 0 ? startIndex : endIndex,
        endIndex,
        isComplete: true
      };

      return { ...prev, rounds: [...prev.rounds, newRound] };
    });

    // 2) Özet üretimi başlat (UI: kehribar kart + animasyon)
    isGeneratingSummaryRef.current = true;
    setIsGeneratingSummary(true);
    setSummarizingRoundNumber(completedRoundNumber);

    try {
      // ÖNEMLİ: özet üretimi tamamlanana kadar bekle (A akışının temel şartı)
      await generateRoundSummaryInBackground(completedRoundNumber, state.messages);

      // 3) Kısa görsel geçiş (kehribar kart içinde)
      await new Promise(resolve => setTimeout(resolve, ROUND_TRANSITION_DELAY));
    } finally {
      // Özet süreci bitti: otomatik ilerleme devam edebilir
      isGeneratingSummaryRef.current = false;
      setIsGeneratingSummary(false);
      setSummarizingRoundNumber(null);
    }

    // 4) Round-limit modunda (autoFinish kapalı) son tur bitti ise direkt tamamla
    if (!config.autoFinish && completedRoundNumber >= config.rounds) {
      setState(prev => ({ ...prev, status: DebateStatus.COMPLETED }));
      return;
    }

    // 5) Şimdi moderatör yeni turu başlatsın veya mutabakat varsa bitirsin
    // Not: previousRoundSummaryRef.current artık completedRoundNumber özetini tutuyor olacak.
    let modInstructions = `ÖNCEKİ TUR ÖZETİNİ kullanarak bir sonraki tur için NET bir direktif ver. Başlayın.`;
    if (config.autoFinish) {
      modInstructions += ` Eğer plan olgunlaştıysa, "Plan kabul edildi: [3 madde]" yaz ve yanıtının EN SONUNA [OTURUM_SONLANDI] ekle.`;
    }
    await executeTurn(config.moderator, modInstructions);
  }, [state, config]);

  const nextTurn = useCallback(async () => {
    // 🆕 REF KONTROLÜ: Senkron kontrol ile race condition önleme
    if (state.status !== DebateStatus.RUNNING || isProcessingRef.current) {
      console.log('[nextTurn] Blocked: status=', state.status, 'isProcessing=', isProcessingRef.current);
      return;
    }
    if (isGeneratingSummaryRef.current) {
      console.log('[nextTurn] Blocked: summary is generating (A akışı)');
      return;
    }

    const lastMsg = state.messages[state.messages.length - 1];

    // 🆕 [OTURUM_SONLANDI] kontrolü - etiket artık silinmediği için çalışacak
    if (lastMsg && lastMsg.content.includes('[OTURUM_SONLANDI]')) {
      console.log('[nextTurn] Oturum sonlandı etiketi tespit edildi. COMPLETED.');
      setState(prev => ({ ...prev, status: DebateStatus.COMPLETED }));
      return;
    }

    const participants = config.participants;
    const lastSpeakerId = lastMsg?.participantId;
    let nextSpeaker;
    let prompt;

    // Non-moderator list (for safety) - 🆕 DİSKALİFİYE EDİLENLERİ ÇIKAR
    // REF kullanıyoruz çünkü useState asenkron, ref senkron güncel değeri verir
    const nonModParticipants = participants.filter(
      p => p.role !== Role.MODERATOR && !disqualifiedIdsRef.current.has(p.id)
    );

    console.log(`[nextTurn] Active participants: ${nonModParticipants.map(p => p.name).join(', ')}`);
    console.log(`[nextTurn] Disqualified IDs: ${[...disqualifiedIdsRef.current].join(', ') || 'none'}`);

    // If moderator spoke and hiç katılımcı yoksa, ikinci kez moderatöre söz verme
    if (lastSpeakerId === config.moderator.id && nonModParticipants.length === 0) {
      console.warn('[DebateArena] Moderator already spoke and no participants found. Skipping extra moderator turn.');
      return;
    }

    // 🆕 İlk tur kontrolü: Mesaj yoksa moderatör başlar
    if (state.messages.length === 0) {
      nextSpeaker = config.moderator;
      prompt = `Yeni oturum başladı. Kısa açılış yap ve ilk tartışma sorusunu sor.`;
    } else if (!lastSpeakerId || lastSpeakerId === config.moderator.id) {
      nextSpeaker = nonModParticipants[0] || participants[1];
      prompt = `Konuyla ilgili teknik önerini sun: "${config.topic}". Kod veya şema eklemeyi unutma.`;
    } else {
      const currentNonModIdx = nonModParticipants.findIndex(p => p.id === lastSpeakerId);

      if (currentNonModIdx >= 0 && currentNonModIdx < nonModParticipants.length - 1) {
        nextSpeaker = nonModParticipants[currentNonModIdx + 1];
        prompt = `Önceki öneriyi eleştir veya mimariye kendi katmanını ekle. Spesifik ol.`;
      } else {
        nextSpeaker = config.moderator;
        let modInstructions = `${state.currentRound}. Turdaki teknik ilerlemeyi özetle.`;

        if (config.autoFinish) {
          modInstructions += ` KRİTİK: Sağlam bir mimari plan oluşup oluşmadığını kontrol et. Eğer plan olgunlaştıysa, "Nihai Planı" sun ve onay iste. Eğer önceki mesajlarda [ONAYLIYORUM] görüyorsan, yanıtının sonuna [OTURUM_SONLANDI] yaz.`;
        } else {
          modInstructions += ` Ekibi bir sonraki katmana yönlendir.`;
        }
        prompt = modInstructions;
      }
    }

    // 🆕 A AKIŞI: Tur sonu = son katılımcı konuştuğunda (moderatör çağrılmadan önce) özet üret.
    // Bu sayede: Kehribar özet kartı + animasyon -> sonra moderatör yeni tur direktifi -> sonra katılımcılar
    const isNonMod = nextSpeaker?.id === config.moderator.id;
    if (isNonMod && lastSpeakerId && lastSpeakerId !== config.moderator.id) {
      const currentNonModIdx = nonModParticipants.findIndex(p => p.id === lastSpeakerId);
      const isLastNonModSpeaker = currentNonModIdx >= 0 && currentNonModIdx === nonModParticipants.length - 1;
      if (isLastNonModSpeaker) {
        await finalizeRoundAndThenModerator();
        return;
      }
    }

    await executeTurn(nextSpeaker!, prompt);
  }, [state, config]);

  const executeTurn = async (participant: typeof config.participants[0], instruction: string) => {
    // 🆕 REF'İ ÖNCE AYARLA - Race condition'ı önler
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    setState(prev => ({ ...prev, activeParticipantId: participant.id }));

    try {
      // 🆕 ROUND HESAPLAMA FIX: lastMessage.round bazlı
      const lastMsg = state.messages[state.messages.length - 1];
      const lastRound = lastMsg?.round || 0;
      const nextRound = (participant.role === Role.MODERATOR && lastRound > 0)
        ? lastRound + 1  // Moderatör konuşunca yeni tur
        : Math.max(lastRound, 1); // Katılımcı aynı turda

      // API yanıt süresini ölç
      const apiStartTime = Date.now();

      // 🆕 CLOSURE FIX: state.previousRoundSummary yerine REF kullan
      // State closure'da eski değer olabilir, ref her zaman güncel
      const result = await generateTurnResponse(
        config.apiKey,
        participant,
        state.messages,
        config.topic,
        config.participants,
        config.autoFinish,
        previousRoundSummaryRef.current  // 🆕 REF kullanıyoruz
      );

      const responseTimeMs = Date.now() - apiStartTime;
      console.log(`[Performance] ${participant.name} (${participant.modelId}): ${(responseTimeMs / 1000).toFixed(1)}s`);

      let content = result.text;
      let finishedByConsensus = false;

      // 🆕 BOŞ/KISA MESAJ KONTROLÜ + 3 RETRY + DİSKALİFİYE
      const MIN_CONTENT_LENGTH = 10; // Minimum 10 karakter

      if (!content || content.trim().length < MIN_CONTENT_LENGTH) {
        console.warn(`[Empty Response] ${participant.name} boş/kısa yanıt verdi (Deneme 1/${MAX_RETRY_ATTEMPTS}). Retry başlıyor...`);

        let retrySuccess = false;

        // 🆕 3 DENEME SİSTEMİ
        for (let attempt = 2; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
          setRetryAttempt(attempt);
          console.log(`[Retry] ${participant.name} - Deneme ${attempt}/${MAX_RETRY_ATTEMPTS}...`);

          // Biraz bekle (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000; // 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));

          try {
            const retryResult = await generateTurnResponse(
              config.apiKey,
              participant,
              state.messages,
              config.topic,
              config.participants,
              config.autoFinish,
              previousRoundSummaryRef.current
            );

            if (retryResult.text && retryResult.text.trim().length >= MIN_CONTENT_LENGTH) {
              content = retryResult.text;
              console.log(`[Retry Success] ${participant.name} deneme ${attempt}'de yanıt verdi! ✅`);
              retrySuccess = true;
              break;
            } else {
              console.warn(`[Retry ${attempt}] ${participant.name} hala boş yanıt verdi.`);
            }
          } catch (retryError: any) {
            console.error(`[Retry ${attempt}] ${participant.name} hata aldı:`, retryError.message);
          }
        }

        // Retry state'ini sıfırla
        setRetryAttempt(0);

        if (!retrySuccess) {
          // Tüm denemeler başarısız - DİSKALİFİYE MODAL göster
          console.error(`[Retry Failed] ${participant.name} ${MAX_RETRY_ATTEMPTS} denemede de yanıt üretemedi.`);
          setFailedParticipant(participant);
          setShowDisqualifyModal(true);

          // 🆕 FIX: Processing'i durdur VE activeParticipantId'yi sıfırla
          isProcessingRef.current = false;
          setIsProcessing(false);
          setProcessingStartTime(null);
          setState(prev => ({
            ...prev,
            activeParticipantId: null,
            status: DebateStatus.PAUSED
          }));
          return;
        }
      }

      // 🆕 [OTURUM_SONLANDI] FIX: Etiketi SİLME, sadece flag'i ayarla
      if (config.autoFinish && content.includes('[OTURUM_SONLANDI]')) {
        if (state.messages.length > 5) {
          finishedByConsensus = true;
        }
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        participantId: participant.id,
        content: content, // 🆕 Orijinal content (etiket dahil olabilir)
        timestamp: Date.now(),
        round: nextRound,
        tokensUsed: result.usage,
        cost: result.cost,
        type: participant.role === Role.MODERATOR ? 'summary' : 'text',
        responseTimeMs,
        modelId: participant.modelId
      };

      setState(prev => {
        const newMessages = [...prev.messages, newMessage];
        const newRounds = [...prev.rounds];

        const newState: DebateState = {
          ...prev,
          messages: newMessages,
          rounds: newRounds,
          totalTokens: prev.totalTokens + (newMessage.tokensUsed || 0),
          totalCost: prev.totalCost + (newMessage.cost || 0),
          activeParticipantId: null,
          error: undefined,
          // 🆕 A AKIŞI: Moderatör mesajı artık yeni tur başlatma direktifi (tur numarası burada güncellenir)
          currentRound: participant.role === Role.MODERATOR ? nextRound : (prev.currentRound || 1),
        };

        if (finishedByConsensus) {
          newState.status = DebateStatus.COMPLETED;
        } else if (prev.isSemiAuto) {
          newState.status = DebateStatus.PAUSED;
        }

        return newState;
      });
    } catch (error: any) {
      console.error("Turn failed:", error);

      // 🆕 KREDİ HATASI KONTROLÜ
      if (error.isCreditsError) {
        setCreditsError({
          show: true,
          modelId: error.modelId || participant.modelId,
          details: error.details || 'API krediniz veya limitiniz tükendi.',
          settingsUrl: error.settingsUrl || 'https://openrouter.ai/settings/keys'
        });
        setState(prev => ({
          ...prev,
          status: DebateStatus.PAUSED,
          activeParticipantId: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: DebateStatus.PAUSED,
          activeParticipantId: null,
          error: `Model Hatası (${participant.name}): ${error.message}`
        }));
      }
    }

    // 🆕 REF'İ DE SIFIRLA - Artık özet de bitmiş durumda
    isProcessingRef.current = false;
    setIsProcessing(false);
    setProcessingStartTime(null);
  };

  const handleAdminInjection = async (text: string) => {
    if (!text.trim()) return;

    if (state.status === DebateStatus.COMPLETED) {
      setState(prev => ({ ...prev, status: DebateStatus.RUNNING }));
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      participantId: 'human-admin',
      content: text,
      timestamp: Date.now(),
      round: state.currentRound,
      tokensUsed: 0,
      cost: 0,
      type: 'intervention'
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
    setHumanInput('');

    setTimeout(() => {
      executeTurn(config.moderator, `Sistem Yöneticisi (İnsan) az önce şunu ekledi: "${text}". Bu girdiyi dikkate alarak süreci yönet.`);
    }, 100);
  };

  const handleApprove = () => {
    handleAdminInjection("YÖNETİCİ KARARI: [ONAYLIYORUM]. Nihai plan kabul edilmiştir. Oturumu sonlandır.");
    setShowRatification(false);
  };

  const handleReject = () => {
    if (!rejectReason) return;
    handleAdminInjection(`YÖNETİCİ VETOSU: [REDDEDİYORUM]. Gerekçe: ${rejectReason}. Planı buna göre derhal revize edin.`);
    setRejectReason('');
    setShowRejectInput(false);
    setShowRatification(false);
  };

  const getParticipant = (id: string) => config.participants.find(p => p.id === id);

  const chartData = config.participants.map(p => {
    const msgs = state.messages.filter(m => m.participantId === p.id);
    return {
      name: p.name,
      tokens: msgs.reduce((acc, curr) => acc + (curr.tokensUsed || 0), 0),
      color: p.color
    };
  });

  const toggleAutoMode = () => {
    if (autoPlayMode === 'off') setAutoPlayMode('semi');
    else if (autoPlayMode === 'semi') setAutoPlayMode('full');
    else setAutoPlayMode('off');
  };

  const getAutoLabel = () => {
    if (autoPlayMode === 'off') return t.autoMode;
    if (autoPlayMode === 'semi') return t.semiMode;
    return 'FULL';
  };

  const isPlayDisabled =
    isProcessing ||
    (autoPlayMode === 'full' && state.status === DebateStatus.RUNNING && !showRatification) ||
    (autoPlayMode === 'semi' && state.status === DebateStatus.RUNNING && !isRoundComplete() && !showRatification);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)] relative">

      {/* 🆕 TOAST CONTAINER - Sağ üst köşe */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-6 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in-right ${toast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : toast.type === 'warning'
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                  : toast.type === 'error'
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                }`}
            >
              <span className="text-lg">{toast.icon}</span>
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Left: Participants & Stats */}
      <div className="lg:col-span-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
        <Card>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{t.metrics}</h3>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-mono text-emerald-400">${state.totalCost.toFixed(5)}</span>
            <span className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
              <Flame className="w-3 h-3" /> {t.cashBurn}
            </span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#cbd5e1' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Participants */}
        <div className="space-y-2">
          {config.participants.map(p => {
            const isDisqualified = disqualifiedIds.has(p.id);
            return (
              <Card
                key={p.id}
                className={`p-3 transition-all ${isDisqualified
                  ? 'opacity-40 border-red-500/30 bg-red-950/20'
                  : state.activeParticipantId === p.id
                    ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                    : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={p.avatarUrl}
                      alt={p.name}
                      className={`w-10 h-10 rounded-full border ${isDisqualified ? 'border-red-500 grayscale' : 'border-slate-700'}`}
                    />
                    {state.activeParticipantId === p.id && !isDisqualified && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
                    )}
                    {isDisqualified && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-[8px]">🚫</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className={`text-sm font-bold truncate ${isDisqualified ? 'text-red-400 line-through' : 'text-white'}`}>
                      {p.name} {isDisqualified && '(DQ)'}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Zap className={`w-2.5 h-2.5 ${isDisqualified ? 'text-red-400' : 'text-primary-400'}`} />
                      <span className="text-[10px] font-mono text-slate-400 truncate">{p.modelName}</span>
                    </div>
                  </div>
                </div>
                {state.activeParticipantId === p.id && !isDisqualified && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary-300 font-mono animate-pulse">
                        {retryAttempt > 0
                          ? `🔄 Yeniden deniyor...`
                          : t.thinking}
                      </span>
                      {/* 🆕 RETRY INDICATOR */}
                      {retryAttempt > 0 && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map(i => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${i < retryAttempt
                                ? 'bg-red-500'
                                : i === retryAttempt
                                  ? 'bg-amber-500 animate-pulse scale-125'
                                  : 'bg-slate-600'
                                }`}
                              title={`Deneme ${i}`}
                            />
                          ))}
                          <span className="text-xs text-amber-400 font-mono ml-1">
                            ({retryAttempt}/{MAX_RETRY_ATTEMPTS})
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-mono ${elapsedSeconds > 60 ? 'text-amber-400' : elapsedSeconds > 30 ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {elapsedSeconds > 0 && `${elapsedSeconds}s`}
                      {elapsedSeconds > 60 && ' ⚠️'}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Controls - Premium Glassmorphism Design */}
        <div className="relative">
          {/* Glow Effect Background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-75" />

          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            {/* Mode Indicator Bar */}
            <div className={`h-1 transition-all duration-500 ${autoPlayMode === 'off' ? 'bg-slate-600' :
              autoPlayMode === 'semi' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                'bg-gradient-to-r from-emerald-400 to-cyan-400'
              }`} />

            {/* Auto Mode Pills */}
            <div className="p-4">
              <div className="flex gap-2 p-1.5 bg-black/40 rounded-xl">
                {[
                  { mode: 'off' as const, label: 'Manuel', icon: '⏸', color: 'slate' },
                  { mode: 'semi' as const, label: 'Yarı', icon: '⚡', color: 'amber' },
                  { mode: 'full' as const, label: 'Tam', icon: '🚀', color: 'emerald' }
                ].map(({ mode, label, icon, color }) => (
                  <button
                    key={mode}
                    onClick={() => setAutoPlayMode(mode)}
                    className={`flex-1 relative py-2.5 px-4 rounded-lg font-semibold text-xs transition-all duration-300 ${autoPlayMode === mode
                      ? color === 'slate'
                        ? 'bg-slate-700 text-white shadow-lg'
                        : color === 'amber'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                          : 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                    {autoPlayMode === mode && mode === 'full' && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Action Buttons */}
            <div className="p-4 flex items-center justify-center gap-3">
              {/* Main Play Button */}
              <button
                onClick={() => nextTurn()}
                disabled={isPlayDisabled}
                className={`group relative flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${isPlayDisabled
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-105 active:scale-95'
                  }`}
              >
                {!isPlayDisabled && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                )}
                <span className="relative flex items-center gap-2">
                  {autoPlayMode === 'semi' && isRoundComplete() ? (
                    <><StepForward className="w-4 h-4" /> Sonraki Tur</>
                  ) : (
                    <><Play className="w-4 h-4" /> İlerle</>
                  )}
                </span>
              </button>

              {/* Pause Button */}
              <button
                onClick={() => setState(prev => ({
                  ...prev,
                  status: prev.status === DebateStatus.RUNNING ? DebateStatus.PAUSED : DebateStatus.RUNNING
                }))}
                className={`p-3 rounded-xl transition-all duration-300 ${state.status === DebateStatus.PAUSED
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                title={state.status === DebateStatus.PAUSED ? 'Devam Et' : 'Duraklat'}
              >
                <Pause className="w-4 h-4" />
              </button>

              {/* Exit Button - 🆕 handleClose kullanıyor */}
              <button
                onClick={handleClose}
                className="p-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all duration-300"
                title="Oturumu Kapat (Kayıt yapılır)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Status Messages */}
            {(autoPlayMode === 'semi' && isRoundComplete()) && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-xs font-medium">Tur tamamlandı — Devam için butona basın</span>
                </div>
              </div>
            )}

            {isGeneratingSummary && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-400 text-xs font-medium">Tur özeti üretiliyor...</span>
                </div>
              </div>
            )}

            {/* Toast bildirimleri artık sağ üst köşede gösterilecek */}
          </div>
        </div>
      </div>

      {/* Main Arena */}
      <div className="lg:col-span-3 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="h-14 px-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-gradient-to-b from-primary-500 to-secondary rounded-full" />
            <h1 className="font-bold text-sm text-white truncate max-w-[300px]">{config.topic}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={state.status === DebateStatus.RUNNING ? 'success' : state.status === DebateStatus.COMPLETED ? 'primary' : 'default'} pulse={state.status === DebateStatus.RUNNING}>
              {t.round} {state.currentRound}
            </Badge>
            <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded">
              <span className="text-[10px] text-slate-500">A</span>
              <input
                type="range" min="12" max="18" value={textSize}
                onChange={(e) => setTextSize(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <span className="text-xs text-white">A</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {state.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
              <p>Sistem Başlatılıyor...</p>
            </div>
          )}

          {state.messages.map((msg, msgIndex) => {
            if (msg.type === 'intervention') {
              return (
                <div key={msg.id} className="flex justify-center my-4 animate-fade-in">
                  <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 max-w-[90%]">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span><strong>MÜDAHALe:</strong> {msg.content}</span>
                  </div>
                </div>
              );
            }

            const sender = getParticipant(msg.participantId) || {
              name: 'Admin',
              avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=random',
              color: '#fff',
              role: Role.HUMAN
            };
            const isMod = sender.role === Role.MODERATOR;
            const cleanContent = msg.content.replace('[OTURUM_SONLANDI]', '');

            // 🆕 A AKIŞI: Tur raporu, rounds[].endIndex üzerinden deterministik gösterilir
            const roundMeta = state.rounds.find(r => r.number === msg.round);
            const isEndOfRoundMessage = !!roundMeta && roundMeta.isComplete && roundMeta.endIndex === msgIndex;
            const shouldShowRoundReport = isEndOfRoundMessage;
            const roundSummary = shouldShowRoundReport ? getRoundSummary(msg.round) : undefined;

            return (
              <React.Fragment key={msg.id}>
                <div className={`flex gap-4 animate-fade-in-up ${isMod ? 'justify-center' : ''}`}>
                  {!isMod && (
                    <img src={sender.avatarUrl} className="w-10 h-10 rounded-full border border-slate-700 mt-1" alt={sender.name} />
                  )}
                  <div className={`${isMod ? 'w-full max-w-[80%]' : 'max-w-[85%]'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: sender.color }}>
                        {sender.name}
                        {/* 🆕 Model adını göster */}
                        {sender.modelName && (
                          <span className="font-normal text-slate-500"> - {sender.modelName.split('/').pop()?.split(':')[0]}</span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-600">{t.round} {msg.round}</span>
                    </div>
                    <div
                      className={`p-4 rounded-2xl ${isMod
                        ? 'bg-slate-800/60 border border-slate-700 text-slate-200'
                        : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                    >
                      <pre className="whitespace-pre-wrap font-sans" style={{ fontSize: `${textSize}px` }}>
                        {cleanContent}
                      </pre>
                    </div>
                    {/* Yanıt Süresi ve Token Bilgisi */}
                    {msg.responseTimeMs && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                        <span className={`font-mono ${msg.responseTimeMs > 60000 ? 'text-red-400' :
                          msg.responseTimeMs > 30000 ? 'text-amber-400' :
                            msg.responseTimeMs > 10000 ? 'text-yellow-400' : 'text-emerald-400'
                          }`}>
                          ⏱️ {(msg.responseTimeMs / 1000).toFixed(1)}s
                        </span>
                        {msg.tokensUsed > 0 && (
                          <span className="text-slate-600">
                            📊 {msg.tokensUsed} token
                          </span>
                        )}
                        {msg.cost > 0 && (
                          <span className="text-slate-600">
                            💰 ${msg.cost.toFixed(5)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TUR RAPORU KARTI */}
                {shouldShowRoundReport && (
                  <div className="flex justify-center my-4 animate-fade-in">
                    <div className="w-full max-w-[85%] bg-amber-950/30 border border-amber-500/30 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleRoundReport(msg.round)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-900/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500/20 p-2 rounded-lg">
                            <ClipboardList className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-amber-300 text-sm">
                              Tur {msg.round} Raporu
                            </h4>
                            <p className="text-[10px] text-amber-500/70">
                              {roundSummary
                                ? 'Özet hazır'
                                : (isGeneratingSummary && summarizingRoundNumber === msg.round)
                                  ? 'Özet üretiliyor...'
                                  : 'Özet bekleniyor'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isGeneratingSummary && summarizingRoundNumber === msg.round && !roundSummary && (
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                          )}
                          {expandedRoundReports.has(msg.round) ? (
                            <ChevronUp className="w-5 h-5 text-amber-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                      </button>

                      {/* 🆕 ÖZET ÜRETİLİRKEN ANİMASYON (kehribar kutu içinde) */}
                      {isGeneratingSummary && summarizingRoundNumber === msg.round && !roundSummary && (
                        <div className="px-4 pb-4 border-t border-amber-500/20 pt-3">
                          <div className="relative w-full h-12 overflow-hidden rounded-lg bg-slate-900/40 border border-amber-500/20">
                            {/* Yıldız çizgisi */}
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            </div>

                            {/* Kayan yıldız (özet üretimi boyunca tekrarlar) */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 animate-star-slide"
                              style={{ animation: 'star-slide 1.5s ease-in-out infinite' }}
                            >
                              <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1 rounded-full border border-amber-500/50 shadow-lg shadow-amber-500/20">
                                <span className="text-amber-400 text-lg">⭐</span>
                                <span className="text-amber-300 text-xs font-medium whitespace-nowrap">
                                  Tur {msg.round} özeti hazırlanıyor...
                                </span>
                                <span className="text-amber-400 text-lg">⭐</span>
                              </div>
                            </div>

                            {/* Parıltı efekti */}
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
                              style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Genişletilmiş Özet İçeriği */}
                      {expandedRoundReports.has(msg.round) && roundSummary && (
                        <div className="px-4 pb-4 space-y-3 border-t border-amber-500/20 pt-3">
                          {/* İlerleme Çubuğu - YENİ */}
                          {typeof roundSummary.progressPercent === 'number' && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  Hedef İlerleme
                                </h5>
                                <span className="text-xs font-bold text-amber-300">
                                  %{roundSummary.progressPercent}
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${roundSummary.progressPercent >= 80 ? 'bg-emerald-500' :
                                    roundSummary.progressPercent >= 60 ? 'bg-yellow-500' :
                                      roundSummary.progressPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${roundSummary.progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Özet Maddeleri */}
                          <div>
                            <h5 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                              Somut Çıktılar
                            </h5>
                            <ul className="space-y-1">
                              {roundSummary.summary.map((item, i) => (
                                <li key={i} className="text-xs text-amber-200/80 flex gap-2">
                                  <span className="text-amber-500">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Çatışmalar - YENİ */}
                          {roundSummary.conflicts && roundSummary.conflicts.length > 0 && (
                            <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
                              <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">
                                ⚠️ Tespit Edilen Çatışmalar
                              </h5>
                              <ul className="space-y-1">
                                {roundSummary.conflicts.map((item, i) => (
                                  <li key={i} className="text-xs text-red-200/80 flex gap-2">
                                    <span className="text-red-500">🔥</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Kim Ne Dedi (Tez-Antitez) */}
                          {roundSummary.speakerHighlights && roundSummary.speakerHighlights.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2">
                                Kim Ne Dedi
                              </h5>
                              <ul className="space-y-1">
                                {roundSummary.speakerHighlights.map((sh, i) => (
                                  <li key={i} className="text-xs text-violet-200/80 flex gap-2">
                                    <span className="text-violet-500 font-bold shrink-0">{sh.name}:</span>
                                    <span>{sh.contribution}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Kararlar */}
                          {roundSummary.decisions && roundSummary.decisions.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                                ✅ Kesinleşen Kararlar
                              </h5>
                              <ul className="space-y-1">
                                {roundSummary.decisions.map((item, i) => (
                                  <li key={i} className="text-xs text-emerald-200/80 flex gap-2">
                                    <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Açık Sorular */}
                          {roundSummary.openQuestions && roundSummary.openQuestions.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-2">
                                ❓ Açık Sorular
                              </h5>
                              <ul className="space-y-1">
                                {roundSummary.openQuestions.map((item, i) => (
                                  <li key={i} className="text-xs text-sky-200/80 flex gap-2">
                                    <span className="text-sky-500">→</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Sonraki Tur Direktifi - YENİ */}
                          {roundSummary.nextDirective && (
                            <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-3">
                              <h5 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                                🎯 Sonraki Tur Direktifi
                              </h5>
                              <p className="text-xs text-blue-200/90">{roundSummary.nextDirective}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Özet henüz yoksa mesaj */}
                      {expandedRoundReports.has(msg.round) && !roundSummary && (
                        <div className="px-4 pb-4 text-center border-t border-amber-500/20 pt-3">
                          {isGeneratingSummary ? (
                            <div className="flex items-center justify-center gap-2 text-amber-400 text-xs">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Özet üretiliyor...</span>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-500/70">
                              Bu tur için henüz özet üretilmedi.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {state.status === DebateStatus.COMPLETED && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="bg-emerald-500/10 text-emerald-400 px-6 py-2 rounded-full border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider text-sm">Oturum Tamamlandı</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTranscript}
                  icon={<Copy className="w-4 h-4" />}
                >
                  {copied ? 'Kopyalandı' : 'Metni Kopyala'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadTranscript}
                  icon={<Download className="w-4 h-4" />}
                >
                  Metni İndir
                </Button>
              </div>
              {/* 🆕 Anasayfaya Dön butonu */}
              <Button
                variant="primary"
                size="md"
                onClick={handleClose}
                icon={<Home className="w-4 h-4" />}
                className="w-full mt-2"
              >
                🏠 Anasayfaya Dön
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 🆕 Disqualify Modal */}
        {showDisqualifyModal && failedParticipant && (
          <div className="px-6 pb-2 animate-slide-up">
            <Card className="bg-red-950/90 border-red-500/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/20 p-3 rounded-xl text-red-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">⚠️ Katılımcı Yanıt Veremedi</h4>
                  <p className="text-xs text-red-300">
                    <strong>{failedParticipant.name}</strong> ({failedParticipant.modelName}) 2 denemede de yanıt üretemedi.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 🆕 FIX: failedParticipant'ı kopyala çünkü setFailedParticipant(null) yapacağız
                    const participantToRetry = failedParticipant;

                    setShowDisqualifyModal(false);
                    setFailedParticipant(null);

                    // 🆕 FIX: Aynı katılımcıyla tekrar dene (nextTurn DEĞİL!)
                    // Status'u RUNNING yap ve aynı kişiyle executeTurn çağır
                    setState(prev => ({
                      ...prev,
                      status: DebateStatus.RUNNING
                    }));

                    // executeTurn'ü aynı katılımcıyla çağır
                    setTimeout(() => {
                      const prompt = participantToRetry.role === Role.MODERATOR
                        ? `${state.currentRound}. Turdaki teknik ilerlemeyi özetle.`
                        : `Konuyla ilgili teknik görüşünü sun: "${config.topic}"`;
                      executeTurn(participantToRetry, prompt);
                    }, 500);
                  }}
                >
                  🔄 Tekrar Dene
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const failedId = failedParticipant.id;
                    console.log(`[Disqualify] Disqualifying ${failedParticipant.name} (${failedId})`);

                    // 🆕 REF'İ ÖNCE GÜNCELLE (senkron) - nextTurn hemen görecek
                    disqualifiedIdsRef.current = new Set([...disqualifiedIdsRef.current, failedId]);

                    // 🆕 FIX: State'i güncelle - status'u RUNNING yap ve activeParticipantId'yi sıfırla
                    setState(prev => ({
                      ...prev,
                      activeParticipantId: null,
                      status: DebateStatus.RUNNING // Münazaraya devam et
                    }));

                    // State'i de güncelle (UI için)
                    setDisqualifiedIds(prev => new Set([...prev, failedId]));
                    setShowDisqualifyModal(false);
                    setFailedParticipant(null);

                    // 🆕 FIX: Ref zaten güncel, state için biraz bekle
                    setTimeout(() => {
                      console.log('[Disqualify] Continuing with next participant...');
                      console.log('[Disqualify] Current disqualified IDs:', [...disqualifiedIdsRef.current]);
                      nextTurn();
                    }, 500);
                  }}
                >
                  🚫 Diskalifiye Et & Devam
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDisqualifyModal(false);
                    setFailedParticipant(null);
                    setState(prev => ({ ...prev, status: DebateStatus.PAUSED }));
                  }}
                >
                  ⏸️ Duraklat
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 🆕 Kredi/Limit Hatası Modal */}
        {creditsError?.show && (
          <div className="px-6 pb-2 animate-slide-up">
            <Card className="bg-amber-950/90 border-amber-500/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-amber-500/20 p-3 rounded-xl text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">💳 API Kredi/Limit Hatası</h4>
                  <p className="text-xs text-amber-300">
                    <strong>{creditsError.modelId}</strong> modeli için API krediniz veya limitiniz tükendi.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3 mb-4 text-xs text-slate-300">
                <p className="mb-2"><strong>Detay:</strong> {creditsError.details}</p>
                <p className="mb-2"><strong>Çözüm seçenekleri:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>OpenRouter hesabınıza kredi yükleyin</li>
                  <li>API anahtarınızın limit ayarlarını kontrol edin</li>
                  <li>Ücretsiz model kullanın (örn: <code className="bg-slate-800 px-1 rounded">:free</code> ile biten modeller)</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(creditsError.settingsUrl, '_blank');
                  }}
                >
                  🔗 OpenRouter Ayarları
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCreditsError(null);
                    // Münazara duraklatıldı, kullanıcı kredi yükleyip tekrar başlatabilir
                  }}
                >
                  ✓ Anladım
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Ratification Console (NEXUS) */}
        {showRatification && !showRejectInput && state.status !== DebateStatus.COMPLETED && (
          <div className="px-6 pb-2 animate-slide-up">
            <Card className="bg-slate-800/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.ratificationTitle}</h4>
                  <p className="text-xs text-slate-400">{t.ratificationDesc}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowRejectInput(true)}
                  icon={<XCircle className="w-4 h-4" />}
                >
                  {t.reject}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  glow
                  icon={<Check className="w-4 h-4" />}
                >
                  {t.approve}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Reject Input */}
        {showRejectInput && (
          <div className="px-6 pb-2 animate-slide-up">
            <Card className="bg-rose-950/20 border-rose-900/50">
              <label className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4" /> Veto Gerekçesi
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t.rejectPlaceholder}
                className="w-full bg-slate-950/50 border border-rose-900/30 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none h-20 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={() => setShowRejectInput(false)}>
                  İptal
                </Button>
                <Button variant="danger" size="sm" onClick={handleReject} disabled={!rejectReason.trim()}>
                  Veto Et & Gönder
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Input (SYNAPSE God Mode) */}
        {!showRatification && !showRejectInput && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2 shrink-0">
            <input
              type="text"
              value={humanInput}
              onChange={(e) => setHumanInput(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="flex-1 bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary-500/50 outline-none placeholder-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAdminInjection(humanInput)}
            />
            <Button
              onClick={() => handleAdminInjection(humanInput)}
              disabled={!humanInput.trim()}
              icon={<Send className="w-4 h-4" />}
            >
              {t.inject}
            </Button>
          </div>
        )}

        {/* Error Banner */}
        {state.error && (
          <div className="absolute bottom-20 left-4 right-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded-lg flex justify-between items-center shadow-lg animate-pulse">
            <span className="font-mono text-sm">⚠️ {state.error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState(p => ({ ...p, status: DebateStatus.RUNNING, error: undefined }))}
            >
              Tekrar Dene
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateArena;

