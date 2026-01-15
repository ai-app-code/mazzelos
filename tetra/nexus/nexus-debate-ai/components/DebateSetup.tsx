
import React, { useState, useEffect } from 'react';
import { DebateConfig, LLMModel, Participant, Role, DebateMode } from '../types';
import { AVATARS, COLORS } from '../constants';
import { Badge } from './ui/Badge';
import { Plus, Trash2, BrainCircuit, Save, X, Swords, Handshake, Target, Zap, Settings, Shield, User, MonitorPlay, Sparkles, Filter, ChevronRight } from 'lucide-react';
import { translations, Language } from '../translations';

interface DebateSetupProps {
  onStart: (config: DebateConfig) => void;
  lang: Language;
  allModels: LLMModel[];
  poolModelIds: string[];
}

const DEFAULT_MODERATOR: Participant = {
    id: 'mod',
    modelId: 'gemini-2.5-flash',
    name: 'Baş Teknoloji Sorumlusu (CTO)',
    role: Role.MODERATOR,
    avatarUrl: AVATARS[3],
    systemInstruction: 'Sen CTO\'sun. Amacın ekibi SOMUT, UYGULANABİLİR bir teknik çözüme yönlendirmek. Muğlak cevapları kabul etme. Kod, şema ve matematik talep et. En sonda "Onay Protokolü"nü yönet.',
    color: COLORS[4]
};

export const DebateSetup: React.FC<DebateSetupProps> = ({ onStart, lang, allModels, poolModelIds }) => {
  const t = translations['tr'].setup;
  
  const [topic, setTopic] = useState('Yapay Zeka Destekli Ölçeklenebilir Mikroservis Mimarisi');
  const [rounds, setRounds] = useState(3);
  const [autoFinish, setAutoFinish] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [moderator, setModerator] = useState<Participant>(DEFAULT_MODERATOR);
  const [mode, setMode] = useState<DebateMode>(DebateMode.COLLABORATIVE);
  
  const [showAllModels, setShowAllModels] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [tempPrompt, setTempPrompt] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('nexus_debate_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            setTopic(config.topic);
            setRounds(config.rounds);
            if (config.autoFinish !== undefined) setAutoFinish(config.autoFinish);
            setParticipants(config.participants);
            setModerator(config.moderator);
            if (config.mode) setMode(config.mode);
        } catch (e) {
            initDefaultParticipants(DebateMode.COLLABORATIVE);
        }
    } else {
        initDefaultParticipants(DebateMode.COLLABORATIVE);
    }
  }, []);

  const initDefaultParticipants = (selectedMode: DebateMode) => {
      setParticipants([]);
      
      const p1: Participant = {
          id: 'p1',
          modelId: poolModelIds.length > 0 ? poolModelIds[0] : 'gemini-3-pro-preview',
          name: selectedMode === DebateMode.ADVERSARIAL ? 'Savunan Taraf' : 'Kıdemli Yazılım Mimarı',
          role: Role.PARTICIPANT,
          avatarUrl: AVATARS[0],
          systemInstruction: selectedMode === DebateMode.ADVERSARIAL 
             ? 'Belirli bir görüşü ikna edici bir şekilde savun. Mantık ve retorik kullan.' 
             : 'Sen Kıdemli Yazılım Mimarisin. Ölçeklenebilirlik, veritabanı tasarımı (SQL/NoSQL) ve mikroservisler üzerine odaklan. JSON şemaları ve API tanımları üret.',
          color: COLORS[2]
      };
      const p2: Participant = {
          id: 'p2',
          modelId: poolModelIds.length > 1 ? poolModelIds[1] : 'gemini-2.5-flash',
          name: selectedMode === DebateMode.ADVERSARIAL ? 'Karşı Taraf' : 'Güvenlik Lideri (SecOps)',
          role: Role.PARTICIPANT,
          avatarUrl: AVATARS[1],
          systemInstruction: selectedMode === DebateMode.ADVERSARIAL 
             ? 'Varsayımları sorgulayan eleştirel bir düşünürsün. Argümanlardaki açıkları bul.' 
             : 'Sen Güvenlik ve DevOps Liderisin. Güvenlik açıkları, yetkilendirme (OAuth2/JWT) ve altyapı (Kubernetes/Docker) üzerine odaklan. Somut konfigürasyon kodları yaz.',
          color: COLORS[0]
      };
      setParticipants([p1, p2]);
      
      setModerator(prev => ({
          ...prev,
          name: selectedMode === DebateMode.ADVERSARIAL ? 'Münazara Moderatörü' : 'Baş Teknoloji Sorumlusu (CTO)',
          systemInstruction: selectedMode === DebateMode.ADVERSARIAL
             ? 'Sen sıkı bir münazara moderatörüsün. Katılımcıların konu dışına çıkmasını engelle, mantık hatalarını belirt.'
             : 'Sen CTO\'sun. Amacın SOMUT BİR UYGULAMA PLANI çıkarmak. Katılımcıları kod ve şema yazmaya zorla. En sonda "Nihai Planı" sun ve oturumu sonlandırmadan önce tüm ajanlardan [ONAYLIYORUM] oyu iste.'
      }));
  };

  const handleModeChange = (newMode: DebateMode) => {
      setMode(newMode);
      initDefaultParticipants(newMode);
  };

  const addParticipant = () => {
      const newId = `p${participants.length + 1}_${Date.now()}`;
      const nextPoolModel = poolModelIds[participants.length % poolModelIds.length] || 'gemini-2.5-flash';

      const names = mode === DebateMode.COLLABORATIVE 
        ? ['Veri Bilimcisi', 'Frontend Lideri', 'QA Mühendisi', 'Ürün Yöneticisi'] 
        : [`Katılımcı ${participants.length + 1}`];
      
      const prompts = mode === DebateMode.COLLABORATIVE
        ? [
            'Sen Kıdemli Veri Bilimci\'sin. Modeller için Python kodu (PyTorch/sklearn), matematik formülleri (LaTeX) ve veri hatları (pipeline) sağla.',
            'Sen Frontend Mimarı\'sın. React/Next.js bileşen yapısı, state yönetimi ve UI/UX akışlarına odaklan.',
            'Sen QA Lideri\'sin. Test senaryoları (Jest/Cypress) ve CI/CD pipeline tanımları yaz.'
          ]
        : ['Sen benzersiz bakış açıları sunan yetenekli bir tartışmacısın.'];

      const nextName = names[participants.length % names.length] || `Ajan ${participants.length + 1}`;
      
      setParticipants([...participants, {
          id: newId,
          modelId: nextPoolModel,
          name: nextName,
          role: Role.PARTICIPANT,
          avatarUrl: AVATARS[participants.length % AVATARS.length],
          systemInstruction: prompts[participants.length % prompts.length],
          color: COLORS[participants.length % COLORS.length]
      }]);
  };

  const populateFromPool = () => {
      if (poolModelIds.length === 0) return;
      
      const poolParticipants = poolModelIds.map((mid, idx) => {
          const modelInfo = allModels.find(m => m.id === mid);
          const name = mode === DebateMode.COLLABORATIVE 
            ? `Uzman Ajan ${idx + 1}` 
            : `Tartışmacı ${idx + 1}`;
          
          return {
            id: `pool_${mid}_${Date.now()}`,
            modelId: mid,
            name: modelInfo ? `${modelInfo.name.split(' ')[0]} Uzmanı` : name,
            role: Role.PARTICIPANT,
            avatarUrl: AVATARS[idx % AVATARS.length],
            systemInstruction: mode === DebateMode.COLLABORATIVE 
                ? 'Sen teknik bir uzmansın. Kod, matematik ve somut spesifikasyonlar sağla.' 
                : 'Sen stratejik bir tartışmacısın.',
            color: COLORS[idx % COLORS.length]
          };
      });
      
      if (window.confirm('Mevcut katılımcılar silinecek ve havuzdakiler eklenecek. Emin misiniz?')) {
          setParticipants(poolParticipants);
      }
  };

  const updateParticipant = (id: string, field: keyof Participant, value: any) => {
      if (id === moderator.id) {
          setModerator({...moderator, [field]: value});
      } else {
          setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
      }
  };

  const removeParticipant = (index: number) => {
      setParticipants(participants.filter((_, i) => i !== index));
  };

  const openPromptEditor = (p: Participant) => {
      setEditingParticipantId(p.id);
      setTempPrompt(p.systemInstruction || '');
  };

  const savePrompt = () => {
      if (editingParticipantId) {
          updateParticipant(editingParticipantId, 'systemInstruction', tempPrompt);
          setEditingParticipantId(null);
      }
  };

  const handleStart = () => {
      const config: DebateConfig = {
          topic,
          rounds,
          autoFinish,
          moderator,
          participants,
          mode
      };
      
      localStorage.setItem('nexus_debate_config', JSON.stringify(config));
      onStart(config);
  };

  const ModelSelectOptions = ({ currentId }: { currentId: string }) => {
      const poolModels = allModels.filter(m => poolModelIds.includes(m.id));
      const otherModels = allModels.filter(m => !poolModelIds.includes(m.id));
      
      return (
          <>
            <optgroup label="Havuzdaki Modeller">
                {poolModels.map(m => (
                    <option key={m.id} value={m.id}>★ {m.name}</option>
                ))}
            </optgroup>
            
            {showAllModels && (
                <optgroup label="Diğerleri">
                    {otherModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </optgroup>
            )}
            
            {!showAllModels && !poolModelIds.includes(currentId) && currentId && (
                 <option value={currentId}>{currentId} (Havuz Dışı)</option>
            )}
          </>
      );
  };

  return (
    <div className="min-h-full pb-32 pt-6 relative animate-fade-in max-w-4xl mx-auto px-4">
        
        {/* Step 1: The Objective */}
        <div className="mb-12 text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <Target className="w-4 h-4 text-primary-500" />
                Adım 1: Görev Tanımı
            </div>
            
            <div className="relative group">
                <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-slate-800 text-center py-4 text-3xl md:text-5xl font-bold text-white placeholder-slate-700 focus:border-primary-500 outline-none transition-all"
                    placeholder="Tartışılacak konuyu girin..."
                />
                <div className="absolute -bottom-6 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 text-xs">
                    Örn: "Monolitikten Mikroservislere Geçiş Stratejisi"
                </div>
            </div>
        </div>

        {/* Step 2: The Rules (Configuration) */}
        <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 mb-12">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                
                {/* Mode Selection */}
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">Simülasyon Modu</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleModeChange(DebateMode.COLLABORATIVE)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${mode === DebateMode.COLLABORATIVE ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                        >
                            <Handshake className={`w-6 h-6 mb-2 ${mode === DebateMode.COLLABORATIVE ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <div className={`font-bold text-sm ${mode === DebateMode.COLLABORATIVE ? 'text-white' : 'text-slate-400'}`}>Mühendislik</div>
                            <div className="text-[10px] text-slate-500 mt-1">İşbirlikçi Çözüm</div>
                        </button>
                        <button
                            onClick={() => handleModeChange(DebateMode.ADVERSARIAL)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${mode === DebateMode.ADVERSARIAL ? 'border-rose-500 bg-rose-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                        >
                            <Swords className={`w-6 h-6 mb-2 ${mode === DebateMode.ADVERSARIAL ? 'text-rose-400' : 'text-slate-500'}`} />
                            <div className={`font-bold text-sm ${mode === DebateMode.ADVERSARIAL ? 'text-white' : 'text-slate-400'}`}>Münazara</div>
                            <div className="text-[10px] text-slate-500 mt-1">Çatışmalı Tartışma</div>
                        </button>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-24 bg-slate-800 hidden md:block"></div>

                {/* Round & Auto-Finish */}
                <div className="flex-1 w-full space-y-6">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400 font-medium">Etkileşim Turu</span>
                            <span className="text-white font-bold">{rounds} Tur</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="15" 
                            value={rounds}
                            onChange={(e) => setRounds(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                        <div className="flex flex-col">
                             <span className="text-sm font-bold text-slate-300">Onay Protokolü</span>
                             <span className="text-[10px] text-slate-500">Mutabakat sağlanırsa erken bitir</span>
                         </div>
                         <button 
                            onClick={() => setAutoFinish(!autoFinish)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${autoFinish ? 'bg-primary-500' : 'bg-slate-700'}`}
                         >
                             <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${autoFinish ? 'translate-x-4' : 'translate-x-0'}`}></div>
                         </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Step 3: The Team */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <User className="w-4 h-4 text-primary-500" />
                    Adım 2: Operasyon Timi
                </div>
                
                <div className="flex items-center gap-3">
                     <button 
                        onClick={() => setShowAllModels(!showAllModels)}
                        className="text-xs font-medium text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
                     >
                         <Filter className="w-3 h-3" />
                         {showAllModels ? "Tümünü Göster" : "Sadece Havuz"}
                     </button>
                     {poolModelIds.length > 0 && (
                         <button 
                            onClick={populateFromPool}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors flex items-center gap-2"
                         >
                             <Sparkles className="w-3 h-3" />
                             Havuzdan Doldur
                         </button>
                     )}
                </div>
            </div>

            {/* Moderator Section */}
            <div className="bg-slate-900/60 rounded-2xl border-l-4 border-l-primary-500 border-y border-r border-slate-800 p-6 relative group overflow-hidden">
                <div className="absolute right-0 top-0 p-2 bg-slate-950/50 rounded-bl-xl border-l border-b border-slate-800 text-[10px] font-bold text-primary-400 uppercase tracking-widest">
                    Moderatör
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative">
                        <img src={moderator.avatarUrl} className="w-16 h-16 rounded-xl border-2 border-slate-700 object-cover shadow-lg" />
                        <div className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-1 rounded-md shadow-sm">
                            <Shield className="w-3 h-3" />
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full space-y-3 text-center md:text-left">
                        <div>
                             <input 
                                type="text" 
                                value={moderator.name}
                                onChange={(e) => updateParticipant(moderator.id, 'name', e.target.value)}
                                className="bg-transparent text-xl font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-primary-500 outline-none w-full transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1">Oturumun lideri ve karar vericisi.</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-950 rounded-lg px-3 py-2 border border-slate-800 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-slate-500" />
                                <select 
                                    value={moderator.modelId}
                                    onChange={(e) => updateParticipant(moderator.id, 'modelId', e.target.value)}
                                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                                >
                                    <ModelSelectOptions currentId={moderator.modelId} />
                                </select>
                            </div>
                            <button 
                                onClick={() => openPromptEditor(moderator)}
                                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                            >
                                <BrainCircuit className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Participants List */}
            <div className="space-y-3">
                {participants.map((p, index) => (
                    <div key={p.id} className="bg-slate-900/30 rounded-xl border border-slate-800 p-4 flex flex-col md:flex-row items-center gap-4 group hover:border-slate-700 transition-all">
                        <div className="relative">
                             <img src={p.avatarUrl} className="w-12 h-12 rounded-lg border border-slate-700 object-cover opacity-80 group-hover:opacity-100" />
                             <span className="absolute -top-2 -left-2 bg-slate-800 text-slate-500 text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-slate-700">
                                 {index + 1}
                             </span>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                             <input 
                                type="text" 
                                value={p.name}
                                onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                                className="bg-transparent font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-primary-500 outline-none w-full text-sm"
                            />
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-950 rounded-lg px-2 py-1.5 border border-slate-800 flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-slate-600" />
                                    <select 
                                        value={p.modelId}
                                        onChange={(e) => updateParticipant(p.id, 'modelId', e.target.value)}
                                        className="bg-transparent text-xs text-slate-300 focus:outline-none w-full"
                                    >
                                        <ModelSelectOptions currentId={p.modelId} />
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openPromptEditor(p)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <BrainCircuit className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => removeParticipant(index)}
                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                <button 
                    onClick={addParticipant}
                    className="w-full py-4 border border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-primary-400 hover:border-primary-500/30 hover:bg-primary-900/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Ajan Ekle
                </button>
            </div>
        </div>

        {/* Footer Start Button */}
        <div className="fixed bottom-0 left-0 lg:left-20 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-900 p-6 z-40 flex justify-center shadow-2xl">
            <button 
                onClick={handleStart}
                className={`
                    px-10 py-4 rounded-xl font-bold text-lg text-white shadow-xl flex items-center gap-3 transition-all hover:-translate-y-1 active:translate-y-0 w-full md:w-auto justify-center
                    ${mode === DebateMode.ADVERSARIAL ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}
                `}
            >
                <MonitorPlay className="w-6 h-6" />
                SİSTEMİ BAŞLAT
                <ChevronRight className="w-5 h-5 opacity-50" />
            </button>
        </div>

        {/* System Prompt Editor Modal */}
        {editingParticipantId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
                        <div className="flex items-center gap-3">
                            <BrainCircuit className="w-5 h-5 text-primary-400" />
                            <h3 className="text-base font-bold text-white">Nöral Konfigürasyon</h3>
                        </div>
                        <button onClick={() => setEditingParticipantId(null)} className="text-slate-500 hover:text-white bg-slate-800 p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-0 flex-1 relative">
                        <textarea 
                            value={tempPrompt}
                            onChange={(e) => setTempPrompt(e.target.value)}
                            className="w-full h-full bg-slate-950 text-slate-200 p-6 font-mono text-sm outline-none resize-none leading-relaxed selection:bg-primary-500/30"
                            placeholder="Sen yardımcı bir asistansın..."
                        />
                    </div>
                    <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
                        <button 
                            onClick={savePrompt}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20 text-sm"
                        >
                            <Save className="w-4 h-4" />
                            Kaydet
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
