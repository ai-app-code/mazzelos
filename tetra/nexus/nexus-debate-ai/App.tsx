
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ModelCatalog } from './components/ModelCatalog';
import { DebateSetup } from './components/DebateSetup';
import { DebateArena } from './components/DebateArena';
import { ApiKeyManager } from './components/ApiKeyManager';
import { Dashboard } from './components/Dashboard';
import { ModelPool } from './components/ModelPool';
import { MOCK_MODELS } from './constants';
import { DebateConfig, LLMModel, Provider, HistoryItem } from './types';
import { Language } from './translations';
import { fetchOpenRouterModels } from './services/openRouterService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [currentDebateConfig, setCurrentDebateConfig] = useState<DebateConfig | null>(null);
  const [isDebateActive, setIsDebateActive] = useState(false);
  const [lang, setLang] = useState<Language>('tr');
  
  // Keys storage - Lazy Init
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
      try {
          const savedKeys = localStorage.getItem('nexus_api_keys');
          let loadedKeys = savedKeys ? JSON.parse(savedKeys) : {};
          // Ensure default OpenRouter key exists if not present
          if (!loadedKeys[Provider.OPENROUTER]) {
            loadedKeys[Provider.OPENROUTER] = "";
            localStorage.setItem('nexus_api_keys', JSON.stringify(loadedKeys));
          }
          return loadedKeys;
      } catch (e) {
          return {};
      }
  });
  
  // Data
  const [allModels, setAllModels] = useState<LLMModel[]>(() => {
      try {
        const cachedModels = localStorage.getItem('nexus_cached_models');
        if (cachedModels) {
            const parsed = JSON.parse(cachedModels);
            // Merge mock and cached, avoiding duplicates based on ID
            const combined = [...MOCK_MODELS];
            parsed.forEach((m: LLMModel) => {
                if (!combined.find(existing => existing.id === m.id)) {
                    combined.push(m);
                }
            });
            return combined;
        }
      } catch(e) { console.error("Error loading cached models", e); }
      return MOCK_MODELS;
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
      try {
        const savedHistory = localStorage.getItem('nexus_history');
        return savedHistory ? JSON.parse(savedHistory) : [];
      } catch(e) { return []; }
  });
  
  // Model Pool (Selected models for debate) - Lazy Init for Persistence
  const [modelPool, setModelPool] = useState<string[]>(() => {
      try {
          const savedPool = localStorage.getItem('nexus_model_pool');
          console.log("Hydrating Model Pool from Storage:", savedPool);
          return savedPool ? JSON.parse(savedPool) : [];
      } catch (e) {
          console.error("Failed to load model pool", e);
          return [];
      }
  });

  // Effects mainly for sync logic that doesn't need immediate hydration
  useEffect(() => {
      // Refresh history when view changes (in case a debate just finished)
      if (activeView === 'dashboard') {
          const savedHistory = localStorage.getItem('nexus_history');
          if (savedHistory) {
              setHistory(JSON.parse(savedHistory));
          }
      }
  }, [activeView]);

  const handleToggleConnection = (provider: string, key: string | null) => {
      const newKeys = { ...apiKeys };
      if (key) {
          newKeys[provider] = key;
      } else {
          delete newKeys[provider];
      }
      setApiKeys(newKeys);
      localStorage.setItem('nexus_api_keys', JSON.stringify(newKeys));

      if (provider === Provider.OPENROUTER && key) {
          syncOpenRouterModels(key);
      }
  };

  const handleTogglePool = (modelId: string) => {
      setModelPool(prev => {
          const newPool = prev.includes(modelId) 
              ? prev.filter(id => id !== modelId) 
              : [...prev, modelId];
          
          // Save immediately
          localStorage.setItem('nexus_model_pool', JSON.stringify(newPool));
          return newPool;
      });
  };
  
  const handleClearPool = () => {
      if (window.confirm('TÃ¼m havuzu temizlemek istediÄŸine emin misin?')) {
        setModelPool([]);
        localStorage.setItem('nexus_model_pool', JSON.stringify([]));
      }
  };

  const syncOpenRouterModels = async (key: string) => {
      console.log("Syncing OpenRouter models...");
      const fetched = await fetchOpenRouterModels(key);
      if (fetched.length > 0) {
          localStorage.setItem('nexus_cached_models', JSON.stringify(fetched));
          localStorage.setItem('nexus_last_fetch_ts', Date.now().toString());
          setAllModels(prev => {
              // Keep existing non-OpenRouter models, replace OpenRouter ones with new fetch results
              const others = prev.filter(m => m.provider !== Provider.OPENROUTER);
              // Or better: merge to avoid losing manual entries if any
              // For simplicity in this demo: Append new ones that don't exist
              const existingIds = new Set(prev.map(m => m.id));
              const newModels = fetched.filter(m => !existingIds.has(m.id));
              return [...prev, ...newModels];
          });
      }
  };

  const handleStartDebate = (config: DebateConfig) => {
    setCurrentDebateConfig(config);
    setIsDebateActive(true);
    setActiveView('active_debate');
  };

  const handleCloseDebate = () => {
      setIsDebateActive(false);
      setActiveView('dashboard'); // Go to dashboard to see results
  };

  const connectedProvidersMap = Object.keys(apiKeys).reduce((acc, key) => {
      acc[key] = true;
      return acc;
  }, {} as Record<string, boolean>);

  const renderContent = () => {
    if (isDebateActive && currentDebateConfig) {
        return <DebateArena config={currentDebateConfig} onClose={handleCloseDebate} lang={lang} allModels={allModels} />;
    }

    switch (activeView) {
      case 'dashboard':
          return <Dashboard history={history} lang={lang} />;
      case 'catalog':
        return (
            <ModelCatalog 
                models={allModels} 
                lang={lang} 
                connectedProviders={connectedProvidersMap}
                apiKeys={apiKeys}
                onNavigateToApi={() => setActiveView('api')}
                onSyncOpenRouter={(key) => syncOpenRouterModels(key)}
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
                  onRemoveFromPool={(id) => handleTogglePool(id)}
                  onNavigateToCatalog={() => setActiveView('catalog')}
                  onNavigateToSetup={() => setActiveView('debate')}
                  onClearPool={handleClearPool}
              />
          );
      case 'debate':
        return (
            <DebateSetup 
                onStart={handleStartDebate} 
                lang={lang} 
                allModels={allModels}
                poolModelIds={modelPool}
            />
        );
      case 'active_debate':
         return currentDebateConfig ? <DebateArena config={currentDebateConfig} onClose={handleCloseDebate} lang={lang} allModels={allModels} /> : <DebateSetup onStart={handleStartDebate} lang={lang} allModels={allModels} poolModelIds={modelPool} />;
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
      <Sidebar 
          activeView={isDebateActive ? 'debate' : activeView} 
          onNavigate={(view) => {
              if (isDebateActive) {
                  const msg = "Aktif simÃ¼lasyondan Ã§Ä±kmak istiyor musunuz? Ä°lerleme kaybolacak.";
                  if (window.confirm(msg)) {
                      setIsDebateActive(false);
                      setActiveView(view);
                  }
              } else {
                  setActiveView(view);
              }
          }}
          lang={lang}
          setLang={setLang}
      />
      
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Header / Top Bar */}
        <header className="h-16 border-b border-slate-900/50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 z-20">
            <div className="text-sm breadcrumbs text-slate-500">
                <span className="text-slate-300 font-medium capitalize">{activeView.replace('_', ' ')}</span>
                {isDebateActive && <span className="mx-2">/</span>}
                {isDebateActive && <span className="text-primary-400 animate-pulse">CanlÄ± Oturum</span>}
            </div>
            
            <div className="flex items-center gap-4">
                {/* Pool Indicator */}
                <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Havuz:
                    </span>
                    <span className="text-sm font-mono text-primary-400">{modelPool.length}</span>
                </div>

                {/* Mock User Profile */}
                <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-medium text-white">Sistem YÃ¶neticisi</div>
                        <div className="text-[10px] text-slate-500">Nexus V1.2</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20"></div>
                </div>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 lg:p-8 relative z-10">
            {renderContent()}
        </div>

        {/* Ambient Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-900/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] bg-accent-900/5 rounded-full blur-[100px]" />
        </div>
      </main>
    </div>
  );
};

export default App;

