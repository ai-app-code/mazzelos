
import React, { useEffect, useRef, useState } from 'react';
import { DebateConfig, DebateState, DebateStatus, ParticipantRole } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface DebateArenaProps {
  config: DebateConfig;
  state: DebateState;
  onPauseResume: () => void;
  onReset: () => void;
  onRestart: () => void;
  onRetry?: () => void;
  onChangeModel?: (participantId: string) => void;
  onToggleSemiAuto: () => void;
  onUserIntervention: (text: string) => void;
}

export const DebateArena: React.FC<DebateArenaProps> = ({ 
  config, 
  state, 
  onPauseResume, 
  onReset,
  onRestart,
  onRetry,
  onChangeModel,
  onToggleSemiAuto,
  onUserIntervention
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textSize, setTextSize] = useState(13); // Default to smaller size
  const [interventionText, setInterventionText] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [state.messages]);

  const getParticipant = (id: string) => config.participants.find(p => p.id === id);

  const handleSendIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (interventionText.trim()) {
      onUserIntervention(interventionText);
      setInterventionText("");
    }
  };

  return (
    // MAIN CONTAINER: Fixed height calculation ensures no page scroll
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      
      {/* Left: Participants & Stats (Sidebar) */}
      <div className="lg:w-80 flex flex-col gap-3 flex-shrink-0 h-full overflow-hidden">
        {/* Stats Card */}
        <Card className="bg-surface/80 backdrop-blur-md border-white/10 flex-shrink-0">
          <div className="flex flex-col space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Canlı Metrikler
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-black/30 rounded border border-white/5">
                <span className="text-[10px] text-gray-400 block">Tur</span>
                <span className="font-mono text-sm text-primary font-bold">
                   {state.currentRound}/{config.autoFinish ? '∞' : config.rounds}
                </span>
              </div>
              <div className="p-2 bg-black/30 rounded border border-white/5">
                <span className="text-[10px] text-gray-400 block">Maliyet</span>
                <span className="font-mono text-sm text-green-400">${state.totalCost.toFixed(4)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
               <span className="text-[10px] text-gray-400">Durum</span>
               <Badge color={state.status === DebateStatus.RUNNING ? 'green' : state.status === DebateStatus.COMPLETED ? 'blue' : 'gray'} pulse={state.status === DebateStatus.RUNNING}>
                {state.status === DebateStatus.RUNNING ? 'CANLI' : state.status === DebateStatus.COMPLETED ? 'TAMAMLANDI' : 'DURAKLATILDI'}
               </Badge>
            </div>
          </div>
        </Card>

        {/* Participants List - Scrollable within sidebar */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 min-h-0">
          {config.participants.map(p => (
            <div 
              key={p.id} 
              className={`relative border-l-2 pl-3 py-2 transition-all duration-300 rounded-r-lg ${
                state.activeParticipantId === p.id 
                ? 'bg-white/5 border-l-4 shadow-lg' 
                : 'border-white/5 hover:bg-white/5 opacity-70 hover:opacity-100'
              }`}
              style={{ borderLeftColor: p.color }}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                  <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">{p.name}</h4>
                  <p className="text-[9px] text-gray-500 truncate">{p.modelName}</p>
                </div>
                {state.activeParticipantId === p.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Controls - Fixed at bottom of sidebar */}
        <div className="pt-2 flex-shrink-0 space-y-2">
            
            {/* Mode Toggle */}
            <div onClick={onToggleSemiAuto} className="cursor-pointer bg-black/30 border border-white/5 rounded-lg p-2 flex items-center justify-between hover:bg-white/5 transition-all">
               <span className="text-[10px] text-gray-400 font-bold uppercase">Yarı Otomatik Mod</span>
               <div className={`w-8 h-4 rounded-full relative transition-colors ${state.isSemiAuto ? 'bg-primary' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${state.isSemiAuto ? 'left-4.5' : 'left-0.5'}`}></div>
               </div>
            </div>

            <button 
              onClick={onPauseResume}
              disabled={state.status === DebateStatus.COMPLETED}
              className={`w-full py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-all shadow-lg transform active:scale-95 border ${
                state.status === DebateStatus.RUNNING 
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20' 
                : state.status === DebateStatus.COMPLETED
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700'
                : 'bg-primary/20 text-blue-400 border-primary/30 hover:bg-primary/30 animate-pulse'
              }`}
            >
              {state.status === DebateStatus.RUNNING ? 'Duraklat' : state.status === DebateStatus.COMPLETED ? 'Oturum Bitti' : 'Devam Et'}
            </button>

            {state.status === DebateStatus.COMPLETED && (
               <div className="grid grid-cols-2 gap-2 animate-fade-in-up">
                  <Button variant="outline" size="sm" onClick={onRestart} className="text-[10px]">
                     Düzenle & Yeniden
                  </Button>
                  <Button variant="primary" size="sm" onClick={onReset} className="text-[10px]">
                     Yeni Oturum
                  </Button>
               </div>
            )}
        </div>
      </div>

      {/* Center: Chat Feed (Main Area) */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm relative">
          
          {/* Sticky Header */}
          <div className="h-14 px-4 border-b border-white/5 bg-[#0f0f0f]/90 backdrop-blur flex justify-between items-center z-20 flex-shrink-0">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-secondary rounded-full flex-shrink-0"></div>
                <h1 className="font-bold text-sm text-gray-200 truncate">{config.topic}</h1>
             </div>

             <div className="flex items-center gap-3">
               <div className="hidden md:flex items-center gap-2 bg-black/50 px-2 py-1 rounded border border-white/5">
                  <span className="text-[10px] text-gray-500 font-bold">A</span>
                  <input 
                    type="range" min="11" max="18" step="1"
                    value={textSize}
                    onChange={(e) => setTextSize(parseInt(e.target.value))}
                    className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-gray-300 font-bold">A</span>
               </div>
             </div>
          </div>

          {/* Scrollable Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar bg-[#0a0a0a]">
            {state.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 animate-fade-in opacity-50">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03 8-9 8s9 3.582 9 8z" /></svg>
                 </div>
                 <p className="text-sm font-mono">Oturum Başlatılıyor...</p>
              </div>
            )}
            
            {state.messages.map((msg) => {
              if (msg.type === 'intervention') {
                 return (
                    <div key={msg.id} className="flex justify-center my-4 animate-fade-in w-full">
                       <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 w-full max-w-[95%]">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          <span><strong className="uppercase">Müdahale:</strong> {msg.content}</span>
                       </div>
                    </div>
                 )
              }

              const p = getParticipant(msg.participantId);
              const isMod = p?.role === ParticipantRole.MODERATOR;
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isMod ? 'justify-center my-6' : 'my-2'} animate-fade-in-up w-full px-2`}>
                  {!isMod && (
                    <div className="flex-shrink-0 mt-1">
                       <img src={p?.avatarUrl} className="w-8 h-8 rounded-full shadow-lg opacity-90 ring-1 ring-black" alt={p?.name}/>
                    </div>
                  )}
                  
                  {/* MESSAGE BUBBLE CONTAINER: REMOVED max-w-4xl, using percentages or max-w-[95%] for wide feel */}
                  <div className={`flex flex-col ${isMod ? 'w-full max-w-[90%] items-center' : 'max-w-[95%]'}`}>
                     
                     <div className={`relative px-5 py-3 shadow-md backdrop-blur-sm border transition-all ${
                       isMod 
                        ? 'bg-transparent border-t border-b border-white/10 py-4 text-center w-full' 
                        : 'bg-[#151515] border-white/5 rounded-2xl rounded-tl-none hover:bg-[#1a1a1a]'
                     }`}
                     style={!isMod ? { borderLeft: `2px solid ${p?.color}` } : {}}
                     >
                        {!isMod && (
                          <div className="flex items-center gap-2 mb-1.5 opacity-70">
                            <span className="text-[11px] font-bold tracking-wide" style={{ color: p?.color }}>{p?.name}</span>
                            <span className="text-[9px] text-gray-600">•</span>
                            <span className="text-[9px] text-gray-500 font-mono">{msg.tokensUsed} token</span>
                          </div>
                        )}
                        
                        {isMod && (
                           <div className="flex items-center gap-2 mb-2 justify-center">
                              <span className="text-[10px] font-bold text-secondary tracking-[0.2em] uppercase">Moderatör</span>
                           </div>
                        )}

                        <div 
                          className={`whitespace-pre-wrap font-light text-gray-200 leading-relaxed ${isMod ? 'italic text-gray-400' : ''}`}
                          style={{ fontSize: `${textSize}px` }}
                        >
                          {msg.content}
                        </div>
                     </div>
                  </div>
                </div>
              );
            })}
            
            {/* Thinking Indicator */}
            {state.status === DebateStatus.RUNNING && (
              <div className="flex items-center gap-3 pl-12 py-2 opacity-40 w-full px-4">
                 <span className="text-[10px] text-primary font-mono animate-pulse">
                    {state.activeParticipantId ? `${getParticipant(state.activeParticipantId!)?.name} yazıyor...` : 'Düşünülüyor...'}
                 </span>
                 <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-0"></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-150"></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-300"></div>
                 </div>
              </div>
            )}
            
            {/* Error Banner */}
            {state.error && (
               <div className="sticky bottom-4 mx-4 p-3 bg-red-900/40 border border-red-500/30 backdrop-blur rounded-lg flex items-center justify-between shadow-xl z-30">
                  <div className="flex items-center gap-2 text-red-300">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <span className="text-xs font-mono truncate max-w-[200px] md:max-w-md">{state.error}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                     {state.activeParticipantId && onChangeModel && (
                        <Button variant="secondary" size="sm" onClick={() => onChangeModel(state.activeParticipantId!)} className="text-xs py-1 h-7">
                           Model Değiştir
                        </Button>
                     )}
                     {onRetry && <Button variant="primary" size="sm" onClick={onRetry} className="text-xs py-1 h-7">Tekrar</Button>}
                  </div>
               </div>
            )}
          </div>

          {/* Intervention Input (God Mode) */}
          <form onSubmit={handleSendIntervention} className="p-3 bg-black/50 border-t border-white/5 flex gap-2 flex-shrink-0">
              <input 
                type="text" 
                value={interventionText}
                onChange={(e) => setInterventionText(e.target.value)}
                placeholder="Moderatör Müdahalesi: Ekibe bir direktif ver..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
              />
              <Button type="submit" size="sm" disabled={!interventionText.trim()} className="px-4">
                 GÖNDER
              </Button>
          </form>
      </div>
    </div>
  );
};
