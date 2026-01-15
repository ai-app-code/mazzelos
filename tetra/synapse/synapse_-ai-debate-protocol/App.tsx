
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { ModelPool } from './components/ModelPool';
import { DebateArena } from './components/DebateArena';
import { Dashboard } from './components/Dashboard';
import { DebateConfig, DebateState, DebateStatus, LLMModel, ParticipantRole, Message, DebateParticipant } from './types';
import { generateTurnResponse } from './services/debateEngine';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { DEFAULT_API_KEY, DEFAULT_MODELS } from './constants';

// --- Layout Components ---

const Navbar: React.FC = () => {
  const location = useLocation();
  const navItems = [
    { name: 'Kurulum', path: '/' },
    { name: 'Model Havuzu', path: '/pool' },
    { name: 'Oturum Arenası', path: '/arena' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  return (
    <nav className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
      <div className="max-w-[1800px] mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SYNAPSE <span className="text-xs text-primary font-normal tracking-widest opacity-70">AI LAB</span></span>
        </div>
        <div className="flex gap-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                location.pathname === item.path 
                ? 'text-white bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

// --- Setup Page Components ---

interface SetupPageProps {
  onStartDebate: (config: DebateConfig) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  savedModels: LLMModel[];
  onRemoveModel: (id: string) => void; // Added prop for deleting from pool
  initialConfig?: DebateConfig | null; 
}

const SetupPage: React.FC<SetupPageProps> = ({ onStartDebate, apiKey, setApiKey, savedModels, onRemoveModel, initialConfig }) => {
  const [topic, setTopic] = useState("Yazılım projelerinde Monolith mimariden Microservices mimarisine geçişin maliyet/fayda analizi.");
  const [rounds, setRounds] = useState(5);
  const [autoFinish, setAutoFinish] = useState(true);
  
  const [participants, setParticipants] = useState<DebateParticipant[]>([
    {
      id: 'mod',
      name: 'Nexus (Lead Architect)',
      role: ParticipantRole.MODERATOR,
      modelId: '',
      modelName: '',
      systemPrompt: 'Sen deneyimli bir Baş Yazılım Mimarısın. Görevin, teknik ekibin tartışmasını yönetmek, konudan sapmalarını engellemek ve her tur sonunda teknik çıkarımlar yapmak.',
      color: '#8b5cf6',
      avatarUrl: 'https://ui-avatars.com/api/?name=Mod&background=8b5cf6&color=fff'
    },
    {
      id: 'p1',
      name: 'DevOps Uzmanı',
      role: ParticipantRole.PARTICIPANT,
      modelId: '',
      modelName: '',
      systemPrompt: 'Sen kıdemli bir DevOps mühendisisin. Önceliğin sistem kararlılığı, dağıtım kolaylığı ve ölçeklenebilirlik. Microservices mimarisini operasyonel yük açısından değerlendir.',
      color: '#3b82f6',
      avatarUrl: 'https://ui-avatars.com/api/?name=DevOps&background=3b82f6&color=fff'
    },
  ]);

  // Load initial config if provided (Edit & Restart scenario)
  useEffect(() => {
    if (initialConfig) {
      setTopic(initialConfig.topic);
      setRounds(initialConfig.rounds);
      setAutoFinish(initialConfig.autoFinish);
      setParticipants(initialConfig.participants);
    }
  }, [initialConfig]);

  // Handle consensus mode constraints on round slider
  useEffect(() => {
    if (autoFinish) {
      setRounds(50); // Set to "Unlimited" safety cap
    } else if (rounds === 50) {
      setRounds(10); // Revert to a reasonable default if disabling autoFinish
    }
  }, [autoFinish]);

  const [editingParticipantId, setEditingParticipantId] = useState<string | null>('mod');

  const handleModelAssign = (model: LLMModel) => {
    if (!editingParticipantId) return;
    setParticipants(prev => prev.map(p => {
      if (p.id === editingParticipantId) {
        return { ...p, modelId: model.id, modelName: model.name };
      }
      return p;
    }));
  };

  const addParticipant = () => {
    const id = `p${Date.now()}`;
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setParticipants(prev => [...prev, {
      id,
      name: 'Yeni Uzman',
      role: ParticipantRole.PARTICIPANT,
      modelId: '',
      modelName: '',
      systemPrompt: 'Sen alanında uzman bir danışmansın. Konuya kendi bakış açınla katkı sağla.',
      color: randomColor,
      avatarUrl: `https://ui-avatars.com/api/?name=New&background=${randomColor.replace('#','')}&color=fff`
    }]);
    setEditingParticipantId(id);
  };

  const removeParticipant = (id: string) => {
    if (id === 'mod') return;
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (editingParticipantId === id) setEditingParticipantId('mod');
  };

  const updateParticipant = (id: string, updates: Partial<DebateParticipant>) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleStart = () => {
    if (!apiKey) {
      alert("Lütfen OpenRouter API anahtarını girin.");
      return;
    }
    const invalidParticipants = participants.filter(p => !p.modelId);
    if (invalidParticipants.length > 0) {
      alert(`Lütfen şu katılımcılar için model seçin: ${invalidParticipants.map(p => p.name).join(', ')}`);
      return;
    }
    onStartDebate({
      topic,
      rounds,
      autoFinish,
      participants,
      apiKey
    });
  };

  const activeParticipant = participants.find(p => p.id === editingParticipantId);

  return (
    <div className="max-w-[1800px] mx-auto py-8 px-6 space-y-8 animate-fade-in h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
      <div className="text-center space-y-3 mb-6">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 pb-2">
          Synapse AI Lab
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light">
          İşbirlikçi yapay zeka tartışma protokolü.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        
        {/* LEFT: Configuration */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          
          <div className={`bg-surface/30 border border-white/10 p-4 rounded-xl shadow-lg transition-all ${apiKey ? 'border-green-500/30 bg-green-900/10' : 'border-blue-500/30'}`}>
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  OpenRouter API
                </h2>
                {apiKey && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded">BAĞLANDI</span>}
             </div>
             <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-primary outline-none"
              />
          </div>

          <div className="bg-surface/30 border border-white/10 p-6 rounded-2xl shadow-xl space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Oturum Konusu</label>
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary outline-none resize-none text-sm"
                  placeholder="Tartışılacak konuyu girin..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className={`p-3 bg-black/20 rounded-xl border border-white/5 ${autoFinish ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold text-gray-400 uppercase">Tur Limiti</label>
                       <span className="text-white font-mono text-lg">{autoFinish ? '∞' : rounds}</span>
                    </div>
                    <input 
                      type="range" min="1" max="20" value={rounds} 
                      onChange={(e) => setRounds(parseInt(e.target.value))}
                      disabled={autoFinish}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                 </div>

                 <div 
                   onClick={() => setAutoFinish(!autoFinish)}
                   className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${autoFinish ? 'bg-green-500/10 border-green-500/50' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                 >
                    <label className="text-xs font-bold text-gray-400 uppercase cursor-pointer">Fikir Birliği</label>
                    <div className="flex items-center gap-2 mt-2">
                       <div className={`w-10 h-5 rounded-full relative transition-colors ${autoFinish ? 'bg-green-500' : 'bg-gray-700'}`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${autoFinish ? 'left-6' : 'left-1'}`}></div>
                       </div>
                       <span className={`text-xs font-bold ${autoFinish ? 'text-green-400' : 'text-gray-500'}`}>
                          {autoFinish ? 'AKTİF' : 'PASİF'}
                       </span>
                    </div>
                 </div>
              </div>
              {autoFinish && <p className="text-[10px] text-gray-500">Fikir birliği modu: Tur limiti güvenlik amacıyla 50'ye sabitlenir. Moderatör çözüm bulunduğunda bitirir.</p>}
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ekip Yapısı</h3>
                <button onClick={addParticipant} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                   <span>+ Uzman Ekle</span>
                </button>
             </div>

             <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {participants.map((p) => {
                   const isEditing = editingParticipantId === p.id;
                   const isMod = p.role === ParticipantRole.MODERATOR;
                   
                   return (
                     <div key={p.id} 
                        className={`bg-[#1a1a1a] border relative ${isEditing ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10'} rounded-xl overflow-hidden transition-all`}
                        onClick={() => setEditingParticipantId(p.id)}
                     >
                        {isEditing && (
                           <div className="absolute top-1/2 -right-2 transform -translate-y-1/2">
                               <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[10px] border-l-primary border-b-[8px] border-b-transparent"></div>
                           </div>
                        )}
                        <div className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 ${isEditing ? 'bg-white/5' : ''}`}>
                           <div className="w-10 h-10 rounded-full border-2 flex-shrink-0 overflow-hidden" style={{ borderColor: p.color }}>
                              <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                 <input 
                                   className="bg-transparent text-white font-bold text-sm focus:outline-none focus:border-b border-white/20 w-2/3"
                                   value={p.name}
                                   onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                                   onClick={(e) => e.stopPropagation()}
                                 />
                                 {isMod && <Badge color="purple">MOD</Badge>}
                                 {!isMod && (
                                    <button onClick={(e) => { e.stopPropagation(); removeParticipant(p.id); }} className="text-gray-600 hover:text-red-400 p-1">
                                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                 )}
                              </div>
                              <div className="text-xs truncate mt-1 font-mono flex items-center gap-1">
                                 {p.modelName ? (
                                    <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{p.modelName}</span>
                                 ) : (
                                    <span className="text-yellow-500 flex items-center gap-1 animate-pulse">
                                       <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                       Model Seçin →
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>
                        
                        {isEditing && (
                           <div className="p-4 border-t border-white/5 bg-black/20 space-y-3 animate-fade-in">
                              <div>
                                 <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Rol Tanımı (Prompt)</label>
                                 <textarea 
                                    value={p.systemPrompt}
                                    onChange={(e) => updateParticipant(p.id, { systemPrompt: e.target.value })}
                                    className="w-full h-20 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:ring-1 focus:ring-primary outline-none resize-y"
                                 />
                              </div>
                           </div>
                        )}
                     </div>
                   );
                })}
             </div>
          </div>

          <Button onClick={handleStart} disabled={!apiKey} size="lg" className="w-full py-4 shadow-xl shadow-primary/20">
             OTURUMU BAŞLAT
          </Button>

        </div>

        {/* RIGHT: Pool Selector */}
        <div className="lg:col-span-7 xl:col-span-8 h-full">
           <div className="bg-surface/20 border border-white/10 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
              </div>

              <div className="mb-6 border-b border-white/5 pb-4 relative z-10">
                 <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Havuzdan Model Ata</h2>
                      <p className="text-gray-400 text-sm">
                        {activeParticipant 
                          ? <span><span className="text-primary font-bold">{activeParticipant.name}</span> için model seçiyorsunuz.</span> 
                          : "Soldan bir katılımcı seçerek başlayın."}
                      </p>
                    </div>
                    <Link to="/pool">
                       <Button variant="outline" size="sm" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}>
                          Havuza Model Ekle
                       </Button>
                    </Link>
                 </div>
              </div>

              {savedModels.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-gray-700 rounded-xl bg-black/20 z-10">
                    <h3 className="text-lg font-bold text-white mb-2">Havuzunuz Boş</h3>
                    <p className="text-gray-400 mb-6 max-w-sm">Listenizde hiç model yok. Önce "Model Havuzu" sayfasına giderek modelleri keşfedin ve ekleyin.</p>
                    <Link to="/pool">
                      <Button variant="primary">Model Havuzuna Git</Button>
                    </Link>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-10 z-10">
                    {savedModels.map(model => {
                       const isSelected = activeParticipant?.modelId === model.id;
                       return (
                          <div 
                             key={model.id}
                             onClick={() => activeParticipant && handleModelAssign(model)}
                             className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                                : activeParticipant 
                                   ? 'bg-surface/60 border-white/5 hover:border-primary/50 hover:bg-surface/80 hover:-translate-y-1' 
                                   : 'opacity-50 cursor-not-allowed bg-black/20 border-white/5'
                             }`}
                          >
                             {/* Delete Button (Added & Adjusted) */}
                             <button
                               onClick={(e) => {
                                  e.stopPropagation();
                                  if(window.confirm(`${model.name} modelini havuzdan silmek istediğinize emin misiniz?`)) {
                                     onRemoveModel(model.id);
                                  }
                               }}
                               className="absolute top-2 right-2 text-gray-500 hover:text-red-500 hover:bg-red-500/20 bg-black/50 opacity-0 group-hover:opacity-100 transition-all p-1.5 z-50 rounded-full"
                               title="Modeli Sil"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>

                             <div className="flex justify-between items-start mb-2 pr-10">
                                <Badge color={isSelected ? 'green' : 'blue'}>{model.provider}</Badge>
                                {isSelected ? (
                                   <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-full">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      SEÇİLDİ
                                   </div>
                                ) : (
                                   <div className="opacity-0 group-hover:opacity-100 text-xs text-primary font-bold transition-opacity">
                                      SEÇ
                                   </div>
                                )}
                             </div>
                             
                             <h4 className="font-bold text-white text-sm truncate mb-1" title={model.name}>{model.name}</h4>
                             <p className="text-[10px] text-gray-500 font-mono truncate mb-3">{model.id}</p>
                             
                             <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-white/5 pt-2">
                                <span>Ctx: {model.contextWindow.toLocaleString()}</span>
                                <span className="font-mono text-gray-300">${model.promptPrice.toFixed(2)}/M</span>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Shell ---

const App: React.FC = () => {
  // Initialize with DEFAULT_API_KEY if localStorage is empty
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('synapse_or_key') || DEFAULT_API_KEY);
  
  // Persist Saved Models (Pool)
  // Fallback to DEFAULT_MODELS if local storage is empty
  const [savedModels, setSavedModels] = useState<LLMModel[]>(() => {
     const saved = localStorage.getItem('synapse_model_pool');
     return saved ? JSON.parse(saved) : DEFAULT_MODELS;
  });

  const [config, setConfig] = useState<DebateConfig | null>(null);
  const [debateState, setDebateState] = useState<DebateState>({
    status: DebateStatus.IDLE,
    currentRound: 0,
    messages: [],
    totalCost: 0,
    totalTokens: 0,
    activeParticipantId: null,
    startTime: 0,
    isSemiAuto: false // Default to automatic
  });

  useEffect(() => {
    // Only save to localStorage if it's different (or if we want to ensure it persists)
    if (apiKey) localStorage.setItem('synapse_or_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('synapse_model_pool', JSON.stringify(savedModels));
  }, [savedModels]);

  const addModelToPool = (model: LLMModel) => {
     if (!savedModels.find(m => m.id === model.id)) {
        setSavedModels(prev => [...prev, model]);
     }
  };

  const removeModelFromPool = (modelId: string) => {
     setSavedModels(prev => prev.filter(m => m.id !== modelId));
  };

  const restoreDefaultModels = () => {
     if(window.confirm("Tüm model listeniz sıfırlanacak ve varsayılan modeller yüklenecek. Onaylıyor musunuz?")) {
        setSavedModels(DEFAULT_MODELS);
     }
  };

  const clearModelPool = () => {
     if(window.confirm("DİKKAT: Tüm model havuzunuz silinecek. Bu işlem geri alınamaz (Varsayılanları Geri Yükle ile düzeltebilirsiniz). Devam edilsin mi?")) {
        setSavedModels([]);
     }
  };

  const importModels = (newModels: LLMModel[]) => {
    setSavedModels(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const uniqueNew = newModels.filter(m => !existingIds.has(m.id));
      return [...prev, ...uniqueNew];
    });
  };

  const processNextTurn = useCallback(async () => {
    if (!config || debateState.status !== DebateStatus.RUNNING) return;

    const participants = config.participants;
    let nextParticipantIndex = 0;
    
    // Determine next speaker
    const lastMsg = debateState.messages[debateState.messages.length - 1];
    const chatHistory = debateState.messages.filter(m => m.type !== 'intervention');
    const lastChatMsg = chatHistory[chatHistory.length - 1];

    if (lastChatMsg) {
      const lastIdx = participants.findIndex(p => p.id === lastChatMsg.participantId);
      nextParticipantIndex = (lastIdx + 1) % participants.length;
    }

    const speaker = participants[nextParticipantIndex];
    
    // Round Management
    if (speaker.role === ParticipantRole.MODERATOR) {
        if (chatHistory.length > 0 && nextParticipantIndex === 0) {
             if (debateState.currentRound >= config.rounds) {
                 setDebateState(prev => ({ ...prev, status: DebateStatus.COMPLETED, activeParticipantId: null }));
                 return;
             }
             setDebateState(prev => ({ ...prev, currentRound: prev.currentRound + 1 }));
        } else if (chatHistory.length === 0) {
            setDebateState(prev => ({ ...prev, currentRound: 1, startTime: Date.now() }));
        }
    }

    setDebateState(prev => ({ ...prev, activeParticipantId: speaker.id, error: undefined }));

    try {
      const result = await generateTurnResponse(
        config.apiKey, 
        speaker, 
        debateState.messages, 
        config.topic, 
        config.participants,
        config.autoFinish 
      );
      
      let content = result.text;
      let finishedByConsensus = false;

      // Ensure we don't finish prematurely if the debate just started (< 5 messages)
      if (config.autoFinish && content.includes('[OTURUM_SONLANDI]')) {
         if (debateState.messages.length > 5) {
            finishedByConsensus = true;
         }
         content = content.replace('[OTURUM_SONLANDI]', '').trim();
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        participantId: speaker.id,
        content: content,
        timestamp: Date.now(),
        round: debateState.currentRound || 1,
        tokensUsed: result.usage,
        cost: (result.usage / 1000000) * 1, // Approx cost
        type: speaker.role === ParticipantRole.MODERATOR ? 'summary' : 'text'
      };

      setDebateState(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        totalTokens: prev.totalTokens + (newMessage.tokensUsed || 0),
        totalCost: prev.totalCost + (newMessage.cost || 0),
        activeParticipantId: null,
        // CRITICAL FIX: Explicitly enforce PAUSE if semi-auto is on, regardless of previous status
        status: finishedByConsensus 
            ? DebateStatus.COMPLETED 
            : (prev.isSemiAuto ? DebateStatus.PAUSED : prev.status)
      }));

    } catch (error: any) {
      console.error("Turn failed", error);
      setDebateState(prev => ({ 
        ...prev, 
        status: DebateStatus.PAUSED, 
        error: `Model Hatası (${speaker.name}): ${error.message}` 
      }));
    }

  }, [config, debateState.messages, debateState.status, debateState.currentRound, debateState.isSemiAuto]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (debateState.status === DebateStatus.RUNNING) {
      timeout = setTimeout(() => {
        processNextTurn();
      }, 3000); 
    }
    return () => clearTimeout(timeout);
  }, [debateState.status, debateState.messages, processNextTurn]);

  const handleUserIntervention = (text: string) => {
     // Inject a special message into the stream
     const interventionMsg: Message = {
        id: Date.now().toString(),
        participantId: 'user-admin',
        content: text,
        timestamp: Date.now(),
        round: debateState.currentRound,
        tokensUsed: 0,
        cost: 0,
        type: 'intervention'
     };

     setDebateState(prev => ({
        ...prev,
        messages: [...prev.messages, interventionMsg],
     }));
  };

  return (
    <HashRouter>
      <div className="h-screen bg-background text-gray-100 font-sans selection:bg-primary/30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 w-full max-w-[1800px] mx-auto overflow-hidden">
          <Routes>
            <Route path="/" element={
              <SetupPage 
                apiKey={apiKey} 
                setApiKey={setApiKey}
                savedModels={savedModels}
                onRemoveModel={removeModelFromPool}
                initialConfig={config}
                onStartDebate={(c) => {
                  setConfig(c);
                  setDebateState({
                    status: DebateStatus.RUNNING, 
                    currentRound: 1, 
                    messages: [], 
                    totalCost: 0, 
                    totalTokens: 0, 
                    activeParticipantId: null, 
                    startTime: 0,
                    isSemiAuto: false
                  });
                  window.location.hash = '#/arena';
                }} 
              />
            } />
            <Route path="/pool" element={
               <ModelPool 
                 apiKey={apiKey} 
                 savedModels={savedModels} 
                 onAddModel={addModelToPool} 
                 onRemoveModel={removeModelFromPool}
                 onImportModels={importModels}
                 onRestoreDefaults={restoreDefaultModels}
                 onClearPool={clearModelPool}
               />
            } />
            <Route path="/arena" element={
              config ? (
                <div className="h-full px-4 py-4">
                   {debateState.error && (
                     <div className="mb-2 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded-lg flex justify-between items-center shadow-lg animate-pulse text-sm">
                        <span className="font-mono font-bold">⚠️ {debateState.error}</span>
                        <Button variant="outline" size="sm" onClick={() => setDebateState(p => ({...p, status: DebateStatus.RUNNING, error: undefined}))}>
                           Tekrar Dene
                        </Button>
                     </div>
                   )}
                   <DebateArena 
                    config={config} 
                    state={debateState} 
                    onPauseResume={() => setDebateState(prev => ({ 
                      ...prev, 
                      status: prev.status === DebateStatus.RUNNING ? DebateStatus.PAUSED : DebateStatus.RUNNING 
                    }))}
                    onReset={() => {
                       // New Session: clear config, go to setup
                       setConfig(null);
                       window.location.hash = '#/';
                    }}
                    onRestart={() => {
                        // Restart with edit: Keep config, go to setup
                        window.location.hash = '#/';
                    }}
                    onRetry={() => setDebateState(p => ({...p, status: DebateStatus.RUNNING, error: undefined}))}
                    onChangeModel={(participantId) => {
                       const newModelId = prompt("Yeni Model ID girin (örn: google/gemini-pro):");
                       if (newModelId && config) {
                          const modelName = prompt("Model Görünen Adı:") || newModelId;
                          config.participants = config.participants.map(p => 
                             p.id === participantId ? { ...p, modelId: newModelId, modelName: modelName } : p
                          );
                          setDebateState(p => ({...p, status: DebateStatus.RUNNING, error: undefined}));
                       }
                    }}
                    onToggleSemiAuto={() => setDebateState(p => ({...p, isSemiAuto: !p.isSemiAuto}))}
                    onUserIntervention={handleUserIntervention}
                   />
                </div>
              ) : (
                <Navigate to="/" replace />
              )
            } />
            <Route path="/dashboard" element={
               config ? (
                  <div className="h-full overflow-y-auto custom-scrollbar">
                     <Dashboard config={config} state={debateState} />
                  </div>
               ) : (
                  <div className="text-center pt-20 text-gray-500">
                     <p>Henüz aktif bir oturum verisi yok.</p>
                     <Link to="/" className="text-primary hover:underline">Yeni Oturum Başlat</Link>
                  </div>
               )
            } />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
