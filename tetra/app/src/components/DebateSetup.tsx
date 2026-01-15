import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { translations, Language } from '@/translations';
import { LLMModel, Participant, Role, DebateConfig, DebateMode } from '@/types';
import { COLORS, AVATARS, DEFAULT_TOPIC } from '@/constants';
import { testModelAccess } from '@/services/openRouterService';
import api, { PromptTemplates as PromptTemplatesType } from '@/services/api';
import {
  Play, Plus, Trash2, Edit3, Users, Cog, FileText, Zap, X,
  AlertTriangle, CheckCircle, Loader2, Eye, EyeOff, Sparkles,
  Swords, GraduationCap
} from 'lucide-react';

// Saved setup interface
interface SavedSetup {
  participants?: Participant[];
  rounds?: number;
  autoFinish?: boolean;
  mode?: DebateMode;
  lastTopic?: string;
}

// Uniq katılımcı isimleri (Yunan alfabesi + Türkçe)
const PARTICIPANT_NAMES = [
  'Alfa', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Kappa', 'Lambda', 'Sigma', 'Omega', 'Phoenix', 'Atlas', 'Orion', 'Nova'
];

// 🆕 MODERATÖR İÇİN ÖNERİLEN MODELLER
// Bu modeller hızlı, kararlı ve tur özeti üretimi için optimize edilmiştir
// OpenRouter API sağlayıcı kararlılığı nedeniyle bu modeller önerilir
const RECOMMENDED_MODERATOR_MODELS = [
  'google/gemini-2.5-flash-preview',
  'google/gemini-2.0-flash-001',
  'google/gemini-3-flash-preview',
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'x-ai/grok-4.1-fast',
];

interface DebateSetupProps {
  onStart: (config: DebateConfig) => void;
  lang: Language;
  allModels: LLMModel[];
  poolModelIds: string[];
  apiKey: string;
  promptTemplates?: PromptTemplatesType;
}

// Default participants
const createDefaultParticipants = (moderatorPrompt: string, participantPrompt: string): Participant[] => [
  {
    id: 'mod',
    name: 'Nexus (Baş Mimar)',
    role: Role.MODERATOR,
    modelId: '',
    modelName: '',
    systemPrompt: moderatorPrompt || 'Sen deneyimli bir Baş Yazılım Mimarısın. Görevin, teknik ekibin tartışmasını yönetmek, konudan sapmalarını engellemek ve her tur sonunda teknik çıkarımlar yapmak.',
    color: COLORS[0],
    avatarUrl: AVATARS[0],
  },
  {
    id: 'p1',
    name: 'DevOps Uzmanı',
    role: Role.PARTICIPANT,
    modelId: '',
    modelName: '',
    systemPrompt: participantPrompt || 'Sen kıdemli bir DevOps mühendisisin. Önceliğin sistem kararlılığı, dağıtım kolaylığı ve ölçeklenebilirlik.',
    color: COLORS[1],
    avatarUrl: AVATARS[1],
  },
];

// Mode to template key mapping
const MODE_TO_TEMPLATE: Record<DebateMode, string> = {
  [DebateMode.COLLABORATIVE]: 'NEXUS',
  [DebateMode.ADVERSARIAL]: 'ADVERSARIAL',
};

export const DebateSetup: React.FC<DebateSetupProps> = ({
  onStart,
  lang,
  allModels,
  poolModelIds,
  apiKey,
  promptTemplates = {},
}) => {
  const t = translations[lang].setup;

  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [rounds, setRounds] = useState(5);
  const [autoFinish, setAutoFinish] = useState(true);
  const [mode, setMode] = useState<DebateMode>(DebateMode.COLLABORATIVE);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [setupLoaded, setSetupLoaded] = useState(false);

  // Model test states
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  // Get current template based on mode
  const getCurrentTemplate = () => {
    const templateKey = MODE_TO_TEMPLATE[mode];
    return promptTemplates[templateKey] || { moderator: '', participant: '', description: '' };
  };

  // Initialize participants with template prompts
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const template = getCurrentTemplate();
    return createDefaultParticipants(template.moderator, template.participant);
  });

  // Load saved setup from backend on mount
  useEffect(() => {
    const loadSavedSetup = async () => {
      try {
        const saved: SavedSetup = await api.setup.get();
        console.log('[DebateSetup] Loaded saved setup:', saved);

        if (saved) {
          if (saved.mode) setMode(saved.mode);
          if (saved.rounds) setRounds(saved.rounds);
          if (typeof saved.autoFinish === 'boolean') setAutoFinish(saved.autoFinish);
          if (saved.lastTopic) setTopic(saved.lastTopic);
          if (saved.participants && saved.participants.length > 0) {
            // 🆕 VALİDASYON: Havuzda olmayan modelleri temizle
            const validatedParticipants = saved.participants.map(p => {
              if (p.modelId && !poolModelIds.includes(p.modelId)) {
                console.warn(`[DebateSetup] Model artık havuzda yok, temizleniyor: ${p.modelId} (${p.name})`);
                return { ...p, modelId: '', modelName: '' };
              }
              return p;
            });
            setParticipants(validatedParticipants);
          }
        }
        setSetupLoaded(true);
      } catch (err) {
        console.error('[DebateSetup] Failed to load setup:', err);
        setSetupLoaded(true);
      } finally {
        setIsLoadingSetup(false);
      }
    };

    loadSavedSetup();
  }, [poolModelIds]); // 🆕 poolModelIds değiştiğinde tekrar kontrol et

  // Save setup to backend when settings change (debounced)
  useEffect(() => {
    if (!setupLoaded) return; // Don't save until we've loaded

    const saveTimeout = setTimeout(async () => {
      const setupToSave: SavedSetup = {
        participants,
        rounds,
        autoFinish,
        mode,
        lastTopic: topic,
      };

      try {
        await api.setup.save(setupToSave);
        console.log('[DebateSetup] Saved setup to backend');
      } catch (err) {
        console.error('[DebateSetup] Failed to save setup:', err);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimeout);
  }, [participants, rounds, autoFinish, mode, topic, setupLoaded]);

  // Update prompts when mode changes (only if not loading)
  useEffect(() => {
    if (isLoadingSetup) return; // Don't override during load

    const template = getCurrentTemplate();
    if (template.moderator || template.participant) {
      setParticipants(prev => prev.map(p => {
        if (p.role === Role.MODERATOR && template.moderator) {
          return { ...p, systemPrompt: template.moderator };
        } else if (p.role === Role.PARTICIPANT && template.participant) {
          return { ...p, systemPrompt: template.participant };
        }
        return p;
      }));
    }
  }, [mode, promptTemplates, isLoadingSetup]);

  const poolModels = allModels.filter(m => poolModelIds.includes(m.id));
  const currentTemplate = getCurrentTemplate();

  const addParticipant = () => {
    const id = `p${Date.now()}`;
    const colorIndex = participants.length % COLORS.length;
    const template = getCurrentTemplate();

    // Kullanılmamış bir isim bul
    const usedNames = participants.map(p => p.name);
    const availableName = PARTICIPANT_NAMES.find(name => !usedNames.includes(name))
      || `Uzman ${participants.length}`;

    setParticipants(prev => [...prev, {
      id,
      name: availableName,
      role: Role.PARTICIPANT,
      modelId: '',
      modelName: '',
      systemPrompt: template.participant || 'Sen alanında uzman bir danışmansın. Konuya kendi bakış açınla katkı sağla.',
      color: COLORS[colorIndex],
      avatarUrl: `https://ui-avatars.com/api/?name=${availableName.charAt(0)}&background=${COLORS[colorIndex].replace('#', '')}&color=fff`,
    }]);
  };

  const removeParticipant = (id: string) => {
    if (id === 'mod') return;
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const assignModel = (participantId: string, model: LLMModel) => {
    updateParticipant(participantId, {
      modelId: model.id,
      modelName: model.name,
      contextWindow: model.contextWindow  // Dinamik max_tokens için
    });
  };

  const populateFromPool = () => {
    if (poolModels.length === 0) return;

    const updatedParticipants = participants.map((p, index) => {
      if (p.modelId) return p; // Already assigned
      const model = poolModels[index % poolModels.length];
      return { ...p, modelId: model.id, modelName: model.name };
    });
    setParticipants(updatedParticipants);
  };

  // Test all selected models before starting
  const testAllModels = async (): Promise<{ allPassed: boolean; results: Record<string, { success: boolean; error?: string }> }> => {
    try {
      setIsTesting(true);
      setTestResults({});

      // Get unique model IDs to test
      const uniqueModels = [...new Set(participants.map(p => p.modelId).filter(id => id))];

      if (uniqueModels.length === 0) {
        setIsTesting(false);
        return { allPassed: false, results: {} };
      }

      const results: Record<string, { success: boolean; error?: string }> = {};
      let allPassed = true;

      console.log("[DebateSetup] Testing models:", uniqueModels);

      for (const modelId of uniqueModels) {
        try {
          const result = await testModelAccess(apiKey, modelId);
          results[modelId] = result;
          setTestResults({ ...results });

          if (!result.success) {
            allPassed = false;
          }
        } catch (modelError: any) {
          console.error(`[DebateSetup] Error testing model ${modelId}:`, modelError);
          results[modelId] = { success: false, error: modelError.message || 'Test hatası' };
          setTestResults({ ...results });
          allPassed = false;
        }
      }

      setIsTesting(false);
      return { allPassed, results };
    } catch (error: any) {
      console.error("[DebateSetup] Error in testAllModels:", error);
      setIsTesting(false);
      return { allPassed: false, results: {} };
    }
  };

  const handleStart = async () => {
    try {
      // Basit doğrulamalar
      if (!topic.trim()) {
        alert("❌ Lütfen bir tartışma konusu girin.");
        return;
      }

      if (!apiKey) {
        alert("❌ API anahtarı bulunamadı. API Anahtarları sayfasına gidin.");
        return;
      }

      const invalidParticipants = participants.filter(p => !p.modelId);
      if (invalidParticipants.length > 0) {
        alert(`❌ Lütfen şu katılımcılar için model seçin: ${invalidParticipants.map(p => p.name).join(', ')}`);
        return;
      }

      // 🆕 MODERATÖR MODEL KONTROLÜ
      // Tur özeti üretimi kritik bir görevdir, yavaş modeller sorun çıkarabilir
      const moderatorCheck = participants.find(p => p.role === Role.MODERATOR);
      if (moderatorCheck && moderatorCheck.modelId) {
        const isRecommended = RECOMMENDED_MODERATOR_MODELS.some(
          recId => moderatorCheck.modelId.toLowerCase().includes(recId.split('/')[1].toLowerCase())
        );

        if (!isRecommended) {
          const continueWithRisk = window.confirm(
            `⚠️ MODERATÖR MODEL UYARISI\n\n` +
            `Seçilen model: ${moderatorCheck.modelName}\n\n` +
            `Bu model tur özeti üretimi için optimize edilmemiş olabilir. ` +
            `OpenRouter API sağlayıcı kararlılığı nedeniyle aşağıdaki modeller önerilir:\n\n` +
            `✅ Gemini 2.5/3 Flash\n` +
            `✅ GPT-4o-mini\n` +
            `✅ Grok 4.1 Fast\n` +
            `✅ Claude 3 Haiku\n\n` +
            `Yine de devam etmek istiyor musunuz?`
          );

          if (!continueWithRisk) {
            return;
          }
        }
      }

      // Model testleri
      const { allPassed, results } = await testAllModels();

      if (!allPassed) {
        // Show which models failed - use returned results, not state
        const failedModels = Object.entries(results)
          .filter(([_, result]) => !result.success)
          .map(([modelId, result]) => {
            const participant = participants.find(p => p.modelId === modelId);
            return `${participant?.name || modelId}: ${result.error}`;
          });

        if (failedModels.length > 0) {
          const continueAnyway = window.confirm(
            `⚠️ Bazı modeller çalışmıyor:\n\n${failedModels.join('\n')}\n\nÜcretsiz modeller deneyin:\n- google/gemini-2.0-flash-exp:free\n- meta-llama/llama-3.2-3b-instruct:free\n\nYine de devam etmek istiyor musunuz?`
          );
          if (!continueAnyway) return;
        }
      }

      const moderator = participants.find(p => p.role === Role.MODERATOR)!;
      const others = participants.filter(p => p.role !== Role.MODERATOR);

      console.log("[DebateSetup] Starting debate with config:", { topic, rounds, autoFinish, mode, participantCount: participants.length });

      onStart({
        topic,
        rounds: autoFinish ? 50 : rounds,
        autoFinish,
        mode,
        moderator,
        participants: [moderator, ...others],
        apiKey,
      });
    } catch (error: any) {
      console.error("[DebateSetup] Error starting debate:", error);
      alert(`❌ Münazara başlatılırken hata oluştu:\n\n${error.message || error}`);
    }
  };

  const editingParticipant = participants.find(p => p.id === editingPromptId);

  // Mode icons
  const getModeIcon = (m: DebateMode) => {
    switch (m) {
      case DebateMode.COLLABORATIVE: return <Cog className="w-5 h-5 text-primary-400" />;
      case DebateMode.ADVERSARIAL: return <Swords className="w-5 h-5 text-purple-400" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
        <p className="text-slate-400">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Topic */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-bold text-white">{t.topicLabel}</h3>
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none resize-none text-sm"
              placeholder="Tartışılacak konuyu girin..."
            />
          </Card>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              hover
              className={`cursor-pointer transition-all ${mode === DebateMode.COLLABORATIVE ? 'border-primary-500 shadow-lg shadow-primary-500/20' : ''}`}
              onClick={() => setMode(DebateMode.COLLABORATIVE)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                  <Cog className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="font-bold text-white">{t.modeCollaborative}</h3>
              </div>
              <p className="text-xs text-slate-500">Ekip işbirliği yaparak somut bir çözüm üretir.</p>
              {currentTemplate.description && mode === DebateMode.COLLABORATIVE && (
                <div className="mt-2 flex items-center gap-1 text-xs text-primary-400">
                  <Sparkles className="w-3 h-3" />
                  <span>NEXUS şablonu aktif</span>
                </div>
              )}
            </Card>

            <Card
              hover
              className={`cursor-pointer transition-all ${mode === DebateMode.ADVERSARIAL ? 'border-purple-500 shadow-lg shadow-purple-500/20' : ''}`}
              onClick={() => setMode(DebateMode.ADVERSARIAL)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Swords className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-bold text-white">{t.modeAdversarial}</h3>
              </div>
              <p className="text-xs text-slate-500">Tez ve antitez çatışması ile derinlemesine analiz.</p>
              {currentTemplate.description && mode === DebateMode.ADVERSARIAL && (
                <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
                  <Sparkles className="w-3 h-3" />
                  <span>ADVERSARIAL şablonu aktif</span>
                </div>
              )}
            </Card>
          </div>

          {/* Active Template Preview */}
          {(currentTemplate.moderator || currentTemplate.participant) && (
            <Card className="bg-gradient-to-br from-violet-950/30 to-fuchsia-950/30 border-violet-500/20">
              <button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-violet-300">Aktif Prompt Şablonu</h4>
                    <p className="text-xs text-violet-400/70">{currentTemplate.description || MODE_TO_TEMPLATE[mode]}</p>
                  </div>
                </div>
                {showPromptPreview ? (
                  <EyeOff className="w-4 h-4 text-violet-400" />
                ) : (
                  <Eye className="w-4 h-4 text-violet-400" />
                )}
              </button>

              {showPromptPreview && (
                <div className="mt-4 space-y-3 border-t border-violet-500/20 pt-4">
                  <div>
                    <h5 className="text-xs font-bold text-violet-400 mb-1">Moderatör Prompt'u:</h5>
                    <p className="text-xs text-violet-200/70 bg-violet-950/50 p-2 rounded-lg max-h-24 overflow-auto">
                      {currentTemplate.moderator || 'Tanımlanmamış'}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-violet-400 mb-1">Katılımcı Prompt'u:</h5>
                    <p className="text-xs text-violet-200/70 bg-violet-950/50 p-2 rounded-lg max-h-24 overflow-auto">
                      {currentTemplate.participant || 'Tanımlanmamış'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Settings Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Rounds Slider */}
            <Card className={autoFinish ? 'opacity-50' : ''}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-white">{t.roundsLabel}</span>
                <span className="text-xl font-mono text-primary-400">{autoFinish ? '∞' : rounds}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value))}
                disabled={autoFinish}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </Card>

            {/* Auto Finish Toggle */}
            <Card
              hover
              className={`cursor-pointer ${autoFinish ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
              onClick={() => setAutoFinish(!autoFinish)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-white">{t.autoFinishLabel}</h4>
                  <p className="text-xs text-slate-500">{t.autoFinishDesc}</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${autoFinish ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoFinish ? 'left-7' : 'left-1'}`} />
                </div>
              </div>
            </Card>
          </div>

          {/* Participants */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-white">Ekip Yapısı</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={populateFromPool} disabled={poolModels.length === 0}>
                  {t.populatePool}
                </Button>
                <Button variant="ghost" size="sm" onClick={addParticipant} icon={<Plus className="w-4 h-4" />}>
                  {t.addParticipant}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {participants.map(p => (
                <div
                  key={p.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 flex-shrink-0 overflow-hidden"
                      style={{ borderColor: p.color }}
                    >
                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                          className="bg-transparent text-white font-bold text-sm focus:outline-none border-b border-transparent hover:border-slate-700 focus:border-primary-500"
                        />
                        {p.role === Role.MODERATOR && <Badge variant="purple">MOD</Badge>}
                      </div>

                      {p.modelId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded font-mono">
                            {p.modelName}
                          </span>
                          {/* Model test status indicator */}
                          {testResults[p.modelId] && (
                            testResults[p.modelId].success ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-400" title={testResults[p.modelId].error}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Hata
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400 animate-pulse">⚠ Model seçilmedi</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPromptId(p.id)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {p.role !== Role.MODERATOR && (
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {poolModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => assignModel(p.id, model)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${p.modelId === model.id
                          ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                      >
                        {model.name}
                      </button>
                    ))}
                    {poolModels.length === 0 && (
                      <span className="text-xs text-slate-500 italic">Havuzda model yok</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <h3 className="text-sm font-bold text-white mb-4">Oturum Özeti</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Mod:</span>
                <Badge variant={mode === DebateMode.COLLABORATIVE ? 'primary' : 'purple'}>
                  {mode === DebateMode.COLLABORATIVE ? 'Mühendislik' : 'Münazara'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Şablon:</span>
                <span className="text-violet-400 text-xs">{MODE_TO_TEMPLATE[mode]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turlar:</span>
                <span className="text-white font-mono">{autoFinish ? '∞' : rounds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Katılımcı:</span>
                <span className="text-white">{participants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Onay Protokolü:</span>
                <span className={autoFinish ? 'text-emerald-400' : 'text-slate-500'}>
                  {autoFinish ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 mt-4 pt-4 space-y-3">
              {/* Test results summary */}
              {Object.keys(testResults).length > 0 && (
                <div className="text-xs space-y-1">
                  {Object.entries(testResults).map(([modelId, result]) => {
                    const participant = participants.find(p => p.modelId === modelId);
                    return (
                      <div
                        key={modelId}
                        className={`flex items-center gap-2 px-2 py-1 rounded ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                      >
                        {result.success ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span className="truncate">{participant?.name || modelId}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                glow
                onClick={handleStart}
                disabled={!apiKey || participants.some(p => !p.modelId) || isTesting}
                icon={isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              >
                {isTesting ? 'Modeller Test Ediliyor...' : t.startDebate}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* System Prompt Modal */}
      {editingPromptId && editingParticipant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t.promptModalTitle}</h3>
              <button
                onClick={() => setEditingPromptId(null)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{t.promptModalDesc}</p>
            <textarea
              value={editingParticipant.systemPrompt}
              onChange={(e) => updateParticipant(editingPromptId, { systemPrompt: e.target.value })}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary-500/50 outline-none resize-none text-sm"
            />
            <div className="flex justify-end mt-4">
              <Button onClick={() => setEditingPromptId(null)}>
                {t.close}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DebateSetup;
