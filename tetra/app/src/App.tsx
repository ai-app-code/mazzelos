import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ModelCatalog } from './components/ModelCatalog';
import { ModelPool } from './components/ModelPool';
import { DebateSetup } from './components/DebateSetup';
import { DebateArena } from './components/DebateArena';
import { ApiKeyManager } from './components/ApiKeyManager';
import { PromptTemplates } from './components/PromptTemplates';
import { DEFAULT_MODELS, DEFAULT_API_KEY } from './constants';
import { DebateConfig, LLMModel, Provider, HistoryItem, DebateArchive, Role, DebateMode } from './types';
import { Language } from './translations';
import { fetchOpenRouterModels } from './services/openRouterService';
import api, { PromptTemplates as PromptTemplatesType } from './services/api';

const App: React.FC = () => {
  // Navigation state
  const [activeView, setActiveView] = useState('dashboard');
  const [currentDebateConfig, setCurrentDebateConfig] = useState<DebateConfig | null>(null);
  const [isDebateActive, setIsDebateActive] = useState(false);
  const [lang] = useState<Language>('tr');
  const [isLoading, setIsLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  
  // Models
  const [allModels, setAllModels] = useState<LLMModel[]>(DEFAULT_MODELS);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Model Pool
  const [modelPool, setModelPool] = useState<string[]>([]);
  
  // Prompt Templates
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplatesType>({});

  // Backend'den verileri yükle
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        // Health check
        await api.health.check();
        setBackendConnected(true);
        
        // API Keys yükle
        const keys = await api.keys.get();
        if (!keys[Provider.OPENROUTER]) {
          keys[Provider.OPENROUTER] = DEFAULT_API_KEY;
          await api.keys.save(keys);
        }
        setApiKeys(keys);
        
        // Model Pool yükle
        const pool = await api.pool.get();
        setModelPool(pool);
        
        // History yükle
        const hist = await api.history.get();
        setHistory(hist);
        
        // Cached models yükle
        const cached = await api.cachedModels.get();
        if (cached.length > 0) {
          const combined = [...DEFAULT_MODELS];
          cached.forEach((m: LLMModel) => {
            if (!combined.find(existing => existing.id === m.id)) {
              combined.push(m);
            }
          });
          setAllModels(combined);
        }
        
        // Prompt templates yükle
        const templates = await api.templates.get();
        setPromptTemplates(templates);
        
        console.log('✅ Backend verileri yüklendi');
      } catch (err) {
        console.error('❌ Backend bağlantısı başarısız:', err);
        setBackendConnected(false);
        // Fallback: Default değerler
        setApiKeys({ [Provider.OPENROUTER]: DEFAULT_API_KEY });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFromBackend();
  }, []);

  // Refresh history when view changes to dashboard
  useEffect(() => {
    if (activeView === 'dashboard' && backendConnected) {
      api.history.get().then(setHistory).catch(console.error);
    }
  }, [activeView, backendConnected]);

  // Handle API key connection/disconnection
  const handleToggleConnection = async (provider: string, key: string | null) => {
    const newKeys = { ...apiKeys };
    if (key) {
      newKeys[provider] = key;
    } else {
      delete newKeys[provider];
    }
    setApiKeys(newKeys);
    
    // Backend'e kaydet
    if (backendConnected) {
      await api.keys.save(newKeys);
    }

    // Sync OpenRouter models when connected
    if (provider === Provider.OPENROUTER && key) {
      syncOpenRouterModels(key);
    }
  };

  // Toggle model in pool
  const handleTogglePool = async (modelId: string) => {
    const newPool = modelPool.includes(modelId)
      ? modelPool.filter(id => id !== modelId)
      : [...modelPool, modelId];
    
    setModelPool(newPool);
    
    // Backend'e kaydet
    if (backendConnected) {
      await api.pool.save(newPool);
    }
  };

  // Clear pool
  const handleClearPool = async () => {
    if (window.confirm('Tüm havuzu temizlemek istediğine emin misin?')) {
      setModelPool([]);
      if (backendConnected) {
        await api.pool.save([]);
      }
    }
  };

  // Restore default models
  const handleRestoreDefaults = async () => {
    if (window.confirm('Model listeniz varsayılanlara sıfırlanacak. Onaylıyor musunuz?')) {
      setAllModels(DEFAULT_MODELS);
      if (backendConnected) {
        await api.cachedModels.save([]);
      }
    }
  };

  // Import models
  const handleImportModels = async (newModels: LLMModel[]) => {
    const existingIds = new Set(allModels.map(m => m.id));
    const uniqueNew = newModels.filter(m => !existingIds.has(m.id));
    const combined = [...allModels, ...uniqueNew];
    setAllModels(combined);
    
    if (backendConnected) {
      await api.cachedModels.save(combined);
    }
  };

  // Sync OpenRouter models
  const syncOpenRouterModels = async (key: string) => {
    console.log("Syncing OpenRouter models...");
    const fetched = await fetchOpenRouterModels(key);
    if (fetched.length > 0) {
      if (backendConnected) {
        await api.cachedModels.save(fetched);
      }
      setAllModels(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newModels = fetched.filter(m => !existingIds.has(m.id));
        return [...prev, ...newModels];
      });
    }
  };

  // Start debate
  const handleStartDebate = (config: DebateConfig) => {
    setCurrentDebateConfig(config);
    setIsDebateActive(true);
    setActiveView('active_debate');
  };

  // Close debate
  const handleCloseDebate = () => {
    setIsDebateActive(false);
    setActiveView('dashboard');
  };

  // CANLANDIRMA: Eski münazarayı yeniden başlat
  const handleReviveDebate = (archive: DebateArchive) => {
    // Arşivden config oluştur
    const reviveConfig: DebateConfig = {
      topic: buildReviveTopic(archive),  // Özel canlandırma bağlamı
      rounds: archive.maxRounds,
      autoFinish: archive.autoFinish,
      mode: archive.mode,
      moderator: {
        id: archive.moderator.id,
        name: archive.moderator.name,
        modelId: archive.moderator.modelId,
        modelName: archive.moderator.modelName,
        role: archive.moderator.role,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${archive.moderator.id}`,
        systemPrompt: archive.moderator.systemPrompt,
        color: archive.moderator.color
      },
      participants: archive.participants.map(p => ({
        id: p.id,
        name: p.name,
        modelId: p.modelId,
        modelName: p.modelName,
        role: p.role,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`,
        systemPrompt: p.systemPrompt,
        color: p.color
      })),
      apiKey: apiKeys[Provider.OPENROUTER] || ''
    };

    console.log('[Revive] Starting revived debate from archive:', archive.id);
    handleStartDebate(reviveConfig);
  };

  // Canlandırma topic'i oluştur (tüm bağlamı sıkıştır)
  const buildReviveTopic = (archive: DebateArchive): string => {
    // Son tur özeti
    const lastRound = archive.rounds.length > 0 ? archive.rounds[archive.rounds.length - 1] : null;
    const lastSummary = lastRound?.summary;

    let reviveTopic = `
═══════════════════════════════════════════════════════════════════════════
🔄 CANLANDIRILAN MÜNAZARA - KALDIGI YERDEN DEVAM
═══════════════════════════════════════════════════════════════════════════

📋 ORİJİNAL KONU:
${archive.topic}

📊 DURUM:
- Toplam ${archive.rounds.length} tur tamamlandı
- İlerleme: %${archive.finalStatus.progressPercent}
- Durum: ${archive.isCompleted ? 'Tamamlanmış (yeniden açılıyor)' : 'Yarıda kalmış'}

`;

    // Kesinleşen kararlar
    if (archive.finalStatus.decisions.length > 0) {
      reviveTopic += `
✅ KESİNLEŞEN KARARLAR (BU KONULAR KAPANDI):
${archive.finalStatus.decisions.map(d => `• ${d}`).join('\n')}

`;
    }

    // Açık sorular
    if (archive.finalStatus.openQuestions.length > 0) {
      reviveTopic += `
❓ AÇIK SORULAR (ÇÖZÜLMESİ GEREKEN):
${archive.finalStatus.openQuestions.map(q => `• ${q}`).join('\n')}

`;
    }

    // Çatışmalar
    if (archive.finalStatus.conflicts.length > 0) {
      reviveTopic += `
⚠️ ÇÖZÜLMEDEN KALAN ÇATIŞMALAR:
${archive.finalStatus.conflicts.map(c => `• ${c}`).join('\n')}

`;
    }

    // Son turda kim ne dedi
    if (lastSummary?.speakerHighlights && lastSummary.speakerHighlights.length > 0) {
      reviveTopic += `
👥 SON TURDA KİM NE DEDİ:
${lastSummary.speakerHighlights.map(sh => `• ${sh.name}: ${sh.contribution}`).join('\n')}

`;
    }

    // Direktif
    reviveTopic += `
═══════════════════════════════════════════════════════════════════════════
🎯 MODERATÖR DİREKTİFİ:
Bu münazara daha önce ${archive.rounds.length} tur sürmüş. Yukarıdaki bağlamı kullanarak:
1. Kısa bir "Hoşgeldiniz, kaldığımız yerden devam ediyoruz" mesajı ver
2. Son durumu 2-3 cümleyle özetle
3. Açık sorulardan/çatışmalardan BİRİNİ ele al
4. Ekibe NET bir görev ver

TEKRAR ESKİ KARARLARI TARTIŞMA. İLERİ GİT.
═══════════════════════════════════════════════════════════════════════════
`;

    return reviveTopic;
  };

  // Connected providers map
  const connectedProvidersMap = Object.keys(apiKeys).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<string, boolean>);

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#020617] items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">TETRA</h2>
          <p className="text-slate-500 text-sm">Backend'e bağlanılıyor...</p>
        </div>
      </div>
    );
  }

  // Render content based on active view
  const renderContent = () => {
    if (isDebateActive && currentDebateConfig) {
      return (
        <DebateArena
          config={currentDebateConfig}
          onClose={handleCloseDebate}
          lang={lang}
          allModels={allModels}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard history={history} lang={lang} onReviveDebate={handleReviveDebate} />;
      
      case 'catalog':
        return (
          <ModelCatalog
            models={allModels}
            lang={lang}
            connectedProviders={connectedProvidersMap}
            apiKeys={apiKeys}
            onNavigateToApi={() => setActiveView('api')}
            onSyncOpenRouter={syncOpenRouterModels}
            selectedModelIds={modelPool}
            onToggleSelection={handleTogglePool}
          />
        );
      
      case 'pool':
        return (
          <ModelPool
            poolModelIds={modelPool}
            allModels={allModels}
            lang={lang}
            onRemoveFromPool={handleTogglePool}
            onNavigateToCatalog={() => setActiveView('catalog')}
            onNavigateToSetup={() => setActiveView('debate')}
            onClearPool={handleClearPool}
            onImportModels={handleImportModels}
            onRestoreDefaults={handleRestoreDefaults}
          />
        );
      
      case 'debate':
        return (
          <DebateSetup
            onStart={handleStartDebate}
            lang={lang}
            allModels={allModels}
            poolModelIds={modelPool}
            apiKey={apiKeys[Provider.OPENROUTER] || ''}
            promptTemplates={promptTemplates}
          />
        );
      
      case 'templates':
        return (
          <PromptTemplates
            templates={promptTemplates}
            onSave={async (updated) => {
              setPromptTemplates(updated);
              if (backendConnected) {
                await api.templates.save(updated);
              }
            }}
            onReset={async () => {
              if (backendConnected) {
                const result = await api.templates.reset();
                if (result.templates) {
                  setPromptTemplates(result.templates);
                }
              }
            }}
            lang={lang}
          />
        );
      
      case 'api':
        return (
          <ApiKeyManager
            lang={lang}
            connectedProviders={connectedProvidersMap}
            apiKeys={apiKeys}
            onToggleConnection={handleToggleConnection}
          />
        );
      
      default:
        return <Dashboard history={history} lang={lang} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-primary-500/30">
      {/* Sidebar */}
      <Sidebar
        activeView={isDebateActive ? 'debate' : activeView}
        onNavigate={(view) => {
          if (isDebateActive) {
            const msg = "Aktif simülasyondan çıkmak istiyor musunuz? İlerleme kaybolacak.";
            if (window.confirm(msg)) {
              setIsDebateActive(false);
              setActiveView(view);
            }
          } else {
            setActiveView(view);
          }
        }}
        lang={lang}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-900/50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 z-20">
          <div className="text-sm breadcrumbs text-slate-500">
            <span className="text-slate-300 font-medium capitalize">{activeView.replace('_', ' ')}</span>
            {isDebateActive && <span className="mx-2">/</span>}
            {isDebateActive && <span className="text-primary-400 animate-pulse">Canlı Oturum</span>}
          </div>

          <div className="flex items-center gap-4">
            {/* Backend Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              backendConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-xs font-medium">{backendConnected ? 'Backend' : 'Offline'}</span>
            </div>
            
            {/* Pool Indicator */}
            <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Havuz:</span>
              <span className="text-sm font-mono text-primary-400">{modelPool.length}</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-white">Sistem Yöneticisi</div>
                <div className="text-[10px] text-slate-500">TETRA v2.0</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 lg:p-8 relative z-10 custom-scrollbar">
          {renderContent()}
        </div>

        {/* Ambient Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] bg-accent-500/5 rounded-full blur-[100px]" />
        </div>
      </main>
    </div>
  );
};

export default App;
