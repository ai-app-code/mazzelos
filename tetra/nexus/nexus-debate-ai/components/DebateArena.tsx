
import React, { useState, useEffect, useRef } from 'react';
import { DebateConfig, DebateState, DebateStatus, Message, Role, Participant, HistoryItem, LLMModel } from '../types';
import { generateDebateTurn } from '../services/geminiService';
import { Card } from './ui/Card';
import { Play, Pause, RotateCcw, MessageSquare, Flame, CheckCircle2, Zap, StepForward, AlertCircle, Gavel, XCircle, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { translations, Language } from '../translations';

interface DebateArenaProps {
  config: DebateConfig;
  onClose: () => void;
  lang: Language;
  allModels: LLMModel[];
}

type AutoPlayMode = 'off' | 'semi' | 'full';

export const DebateArena: React.FC<DebateArenaProps> = ({ config, onClose, lang, allModels }) => {
  const t = translations['tr'].arena;
  
  const [state, setState] = useState<DebateState>({
    status: DebateStatus.SETUP,
    currentRound: 0,
    history: [],
    totalCost: 0,
    activeParticipantId: null,
  });

  const [humanInput, setHumanInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoPlayMode, setAutoPlayMode] = useState<AutoPlayMode>('off');
  
  // Ratification State
  const [showRatification, setShowRatification] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isRoundComplete = () => {
      if (state.history.length === 0) return false;
      const lastMsg = state.history[state.history.length - 1];
      return lastMsg.participantId === config.moderator.id;
  };

  // Check if moderator is asking for a vote
  useEffect(() => {
      if (state.history.length > 0) {
          const lastMsg = state.history[state.history.length - 1];
          if (lastMsg.participantId === config.moderator.id) {
              const content = lastMsg.content.toLowerCase();
              if (content.includes('nihai plan') || content.includes('oylama') || content.includes('onay') || content.includes('approval')) {
                  setShowRatification(true);
                  // Pause auto play to let admin vote
                  if (autoPlayMode === 'full') setAutoPlayMode('semi');
              } else {
                  setShowRatification(false);
                  setShowRejectInput(false);
              }
          }
      }
  }, [state.history, config.moderator.id, autoPlayMode]);

  useEffect(() => {
    if (state.status === DebateStatus.SETUP) {
      startDebate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.history]);

  useEffect(() => {
      if (state.status === DebateStatus.COMPLETED) {
          saveToHistory();
          setAutoPlayMode('off');
          setShowRatification(false); 
      }
  }, [state.status]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (state.status === DebateStatus.RUNNING && !isProcessing && autoPlayMode !== 'off') {
        
        if (autoPlayMode === 'semi' && isRoundComplete() && state.currentRound > 0) {
            return; 
        }

        // If waiting for ratification, do not auto-proceed
        if (showRatification) return;

        timeoutId = setTimeout(() => {
            nextTurn();
        }, 2000);
    }
    return () => clearTimeout(timeoutId);
  }, [autoPlayMode, state.status, isProcessing, state.history, showRatification]); 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveToHistory = () => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          topic: config.topic,
          mode: config.mode,
          totalCost: state.totalCost,
          roundCount: state.currentRound,
          participantCount: config.participants.length + 1
      };

      const existing = localStorage.getItem('nexus_history');
      const history = existing ? JSON.parse(existing) : [];
      history.push(newItem);
      localStorage.setItem('nexus_history', JSON.stringify(history));
  };

  const startDebate = async () => {
    setState(prev => ({ ...prev, status: DebateStatus.RUNNING, currentRound: 1 }));
    await executeTurn(config.moderator, `Şu mühendislik problemini tanıt: "${config.topic}". Hedefimiz SOMUT BİR SPESİFİKASYON çıkarmak. Modumuz: ${config.mode}. Gereksinimleri tanımlayarak başla.`);
  };

  const nextTurn = async () => {
    if (state.status !== DebateStatus.RUNNING || isProcessing) return;

    const lastMsg = state.history[state.history.length - 1];
    if (lastMsg && lastMsg.content.includes('<<TERMINATE_SESSION>>')) {
        setState(prev => ({ ...prev, status: DebateStatus.COMPLETED }));
        return;
    }

    let nextSpeaker: Participant;
    let prompt: string;

    const participants = config.participants;
    const lastSpeakerId = lastMsg?.participantId;

    if (!lastSpeakerId || lastSpeakerId === config.moderator.id) {
      nextSpeaker = participants[0];
      prompt = `Konuyla ilgili teknik önerini sun: "${config.topic}". Kod veya şema eklemeyi unutma.`;
    } else {
      const currentIdx = participants.findIndex(p => p.id === lastSpeakerId);
      
      if (currentIdx >= 0 && currentIdx < participants.length - 1) {
        nextSpeaker = participants[currentIdx + 1];
        prompt = `Önceki öneriyi eleştir veya mimariye kendi katmanını ekle. Spesifik ol.`;
      } else {
        nextSpeaker = config.moderator;
        
        let modInstructions = `${state.currentRound}. Turdaki teknik ilerlemeyi özetle.`;
        
        if (config.autoFinish) {
            modInstructions += ` KRİTİK: Sağlam bir mimari plan oluşup oluşmadığını kontrol et. Eğer plan olgunlaştıysa, "Nihai Planı" (Final Blueprint) sun ve katılımcılardan (ve Yöneticiden) bir sonraki turda onay iste. Eğer önceki mesajlarda [ONAYLIYORUM] görüyorsan, cevabının en sonuna <<TERMINATE_SESSION>> yaz.`;
        } else {
            modInstructions += ` Ekibi bir sonraki katmana yönlendir (örn. Veritabanından API'ye veya UI'ya geçiş).`;
        }
        
        prompt = modInstructions;
      }
    }

    if (!config.autoFinish && state.currentRound > config.rounds) {
        if (lastSpeakerId === config.moderator.id) {
            setState(prev => ({ ...prev, status: DebateStatus.COMPLETED }));
            return;
        }
    }

    await executeTurn(nextSpeaker, prompt);
  };

  const executeTurn = async (participant: Participant, instruction: string) => {
    setIsProcessing(true);
    setState(prev => ({ ...prev, activeParticipantId: participant.id }));

    const historyContext = state.history.map(m => {
       const p = [config.moderator, ...config.participants].find(x => x.id === m.participantId);
       return { role: p ? p.name : 'Bilinmeyen', text: m.content };
    });

    const systemContext = `${participant.systemInstruction || 'Yardımcı bir asistansın.'} Şu anda ${config.mode} modunda, şu konu üzerine bir oturumdasın: ${config.topic}.`;

    const result = await generateDebateTurn(
        participant.modelId,
        systemContext,
        historyContext,
        instruction
    );

    const displayContent = result.text.replace('<<TERMINATE_SESSION>>', '').trim();
    const cost = (result.inputTokens * 0.5 + result.outputTokens * 1.5) / 1000000; 

    const newMessage: Message = {
        id: Date.now().toString(),
        participantId: participant.id,
        content: result.text, 
        timestamp: Date.now(),
        round: state.currentRound,
        tokensUsed: result.inputTokens + result.outputTokens,
        cost: cost
    };

    setState(prev => {
        const newState = {
            ...prev,
            history: [...prev.history, newMessage],
            totalCost: prev.totalCost + cost,
            activeParticipantId: null
        };
        
        if (participant.role === Role.MODERATOR && prev.history.length > 0) {
            newState.currentRound = prev.currentRound + 1;
        }

        return newState;
    });

    setIsProcessing(false);
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
        cost: 0
    };

    setState(prev => ({
        ...prev,
        history: [...prev.history, newMessage]
    }));
    
    // Resume debate by forcing moderator to acknowledge
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

  const getModelName = (modelId: string) => {
      const model = allModels.find(m => m.id === modelId);
      return model ? model.name : modelId;
  };

  const chartData = [config.moderator, ...config.participants].map(p => {
      const msgs = state.history.filter(m => m.participantId === p.id);
      return {
          name: p.name,
          tokens: msgs.reduce((acc, curr) => acc + (curr.tokensUsed || 0), 0),
          cost: msgs.reduce((acc, curr) => acc + (curr.cost || 0), 0),
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-100px)]">
      
      {/* Sidebar: Participants & Stats */}
      <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{t.metrics}</h3>
            <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-mono text-emerald-400">${state.totalCost.toFixed(5)}</span>
                <span className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {t.cashBurn}
                </span>
            </div>
            <div className="h-32 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis hide />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#cbd5e1' }}
                            cursor={{fill: 'transparent'}}
                        />
                        <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                 </ResponsiveContainer>
            </div>
        </div>

        <div className="space-y-3">
            {[config.moderator, ...config.participants].map(p => (
                <Card 
                    key={p.id} 
                    className={`p-4 transition-all duration-500 ${state.activeParticipantId === p.id ? 'border-primary-500 shadow-lg shadow-primary-500/20 scale-105' : 'border-slate-800 opacity-80'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                            {state.activeParticipantId === p.id && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                            <p className="text-xs text-slate-500">{p.role}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/50">
                                <Zap className="w-2.5 h-2.5 text-primary-400" />
                                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]" title={getModelName(p.modelId)}>
                                    {getModelName(p.modelId)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {state.activeParticipantId === p.id && (
                        <div className="mt-3 text-xs text-primary-300 font-mono animate-pulse">
                            {t.thinking}
                        </div>
                    )}
                </Card>
            ))}
        </div>
        
        {/* Controls */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex justify-center gap-4">
             <button 
                onClick={toggleAutoMode}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border transition-all 
                ${autoPlayMode !== 'off' 
                    ? 'bg-primary-900/30 text-primary-400 border-primary-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                    : 'bg-slate-900 text-slate-600 border-slate-800'}`}
             >
                <div className={`text-[10px] font-bold mb-0.5 ${autoPlayMode !== 'off' ? 'animate-pulse' : ''}`}>{getAutoLabel()}</div>
                <div className="flex gap-1">
                    {autoPlayMode === 'off' && <div className="w-2 h-2 rounded-full bg-slate-700"></div>}
                    {autoPlayMode === 'semi' && <div className="w-2 h-2 rounded-full bg-primary-400"></div>}
                    {autoPlayMode === 'full' && <div className="flex gap-0.5"><div className="w-2 h-2 rounded-full bg-primary-400"></div><div className="w-2 h-2 rounded-full bg-primary-400"></div></div>}
                </div>
             </button>

             <button 
                onClick={() => nextTurn()} 
                disabled={isPlayDisabled}
                className={`p-3 rounded-full text-white transition-all shadow-lg 
                    ${isPlayDisabled 
                        ? 'bg-slate-800 opacity-50 cursor-not-allowed' 
                        : (autoPlayMode === 'semi' && isRoundComplete()) 
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 animate-pulse'
                            : 'bg-primary-600 hover:bg-primary-500 shadow-primary-600/20'
                    }`}
             >
                {autoPlayMode === 'semi' && isRoundComplete() ? <StepForward className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
             </button>
             
             <button 
                onClick={() => setState(prev => ({ ...prev, status: DebateStatus.PAUSED }))}
                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
                <Pause className="w-5 h-5 fill-current" />
             </button>
             
             <button 
                 onClick={onClose}
                 className="p-3 rounded-full bg-rose-900/50 hover:bg-rose-900 text-rose-200 border border-rose-800 transition-colors ml-2"
             >
                <RotateCcw className="w-5 h-5" />
             </button>
        </div>
        
        {autoPlayMode === 'semi' && isRoundComplete() && (
            <div className="bg-emerald-900/30 text-emerald-400 text-xs px-3 py-2 rounded-lg border border-emerald-500/20 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4" />
                Tur Tamamlandı. Devam etmek için ilerletin.
            </div>
        )}
      </div>

      {/* Main Arena */}
      <div className="lg:col-span-3 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
              {state.history.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                      <p>Sistem Başlatılıyor...</p>
                  </div>
              )}
              
              {state.history.map((msg) => {
                  const sender = [config.moderator, ...config.participants].find(p => p.id === msg.participantId) || {
                      name: 'Admin',
                      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=random',
                      color: '#fff',
                      role: Role.HUMAN
                  };
                  const isUser = sender.role === Role.HUMAN;
                  const isMod = sender.role === Role.MODERATOR;
                  const cleanContent = msg.content.replace('<<TERMINATE_SESSION>>', '');

                  return (
                      <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
                          <img src={sender.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-800 shadow-lg mt-1 object-cover" />
                          <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end flex flex-col' : ''}`}>
                              <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-bold" style={{ color: sender.color }}>{sender.name}</span>
                                  <span className="text-[10px] text-slate-600">{isMod ? 'MODERATOR' : 'PARTICIPANT'} • {t.round} {msg.round}</span>
                              </div>
                              <div className={`
                                  p-5 rounded-2xl text-sm leading-relaxed shadow-md relative overflow-x-auto
                                  ${isMod 
                                    ? 'bg-slate-800/80 text-slate-200 border border-slate-700' 
                                    : isUser 
                                        ? 'bg-primary-600 text-white' 
                                        : 'bg-slate-900 text-slate-300 border border-slate-800'}
                              `}>
                                  <pre className="whitespace-pre-wrap font-sans">{cleanContent}</pre>
                                  <div className="absolute -right-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-xs text-white px-2 py-1 rounded">
                                      ${msg.cost?.toFixed(5)}
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}

              {state.status === DebateStatus.COMPLETED && (
                  <div className="flex justify-center py-6">
                      <div className="bg-emerald-500/10 text-emerald-400 px-6 py-2 rounded-full border border-emerald-500/20 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-bold uppercase tracking-wider text-sm">Plan Onaylandı & Oturum Sonlandı</span>
                      </div>
                  </div>
              )}
              
              {isProcessing && (
                   <div className="flex gap-4 opacity-50 animate-pulse">
                       <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                       <div className="space-y-2 flex-1">
                           <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                           <div className="h-16 bg-slate-800 rounded w-3/4"></div>
                       </div>
                   </div>
              )}
              <div ref={messagesEndRef} />
          </div>

          {/* Ratification Console */}
          {showRatification && !showRejectInput && state.status !== DebateStatus.COMPLETED && (
              <div className="px-6 pb-2 animate-slide-up">
                  <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-2xl flex items-center justify-between">
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
                            <button 
                                onClick={() => setShowRejectInput(true)}
                                className="px-4 py-2 bg-rose-900/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                {t.reject}
                            </button>
                            <button 
                                onClick={handleApprove}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                <Check className="w-4 h-4" />
                                {t.approve}
                            </button>
                        </div>
                  </div>
              </div>
          )}

          {/* Reject Input */}
          {showRejectInput && (
               <div className="px-6 pb-2 animate-slide-up">
                   <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 shadow-2xl space-y-3">
                       <label className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                           <XCircle className="w-4 h-4" /> Veto Gerekçesi
                       </label>
                       <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder={t.rejectPlaceholder}
                            className="w-full bg-slate-950/50 border border-rose-900/30 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-rose-500/50 outline-none h-20 resize-none"
                            autoFocus
                       />
                       <div className="flex justify-end gap-2">
                           <button 
                               onClick={() => setShowRejectInput(false)}
                               className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium"
                           >
                               İptal
                           </button>
                           <button 
                               onClick={handleReject}
                               disabled={!rejectReason.trim()}
                               className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                           >
                               Veto Et & Gönder
                           </button>
                       </div>
                   </div>
               </div>
          )}

          {/* Regular Input */}
          {!showRatification && !showRejectInput && (
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input 
                    type="text" 
                    value={humanInput}
                    onChange={(e) => setHumanInput(e.target.value)}
                    placeholder={t.inputPlaceholder}
                    className="flex-1 bg-slate-800 border-none rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary-500/50 outline-none placeholder-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminInjection(humanInput)}
                />
                <button 
                    onClick={() => handleAdminInjection(humanInput)}
                    disabled={!humanInput.trim()}
                    className="bg-slate-800 hover:bg-primary-600 text-white px-4 rounded-lg disabled:opacity-50 transition-colors font-medium text-sm"
                >
                    {t.inject}
                </button>
            </div>
          )}
      </div>
    </div>
  );
};
