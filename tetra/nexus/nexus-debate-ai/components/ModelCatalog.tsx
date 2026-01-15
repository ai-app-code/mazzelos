
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { LLMModel, Provider } from '../types';
import { Search, Wifi, WifiOff, Cpu, Wallet, CloudDownload, Database, Plus, Check } from 'lucide-react';
import { translations, Language } from '../translations';

interface ModelCatalogProps {
  models: LLMModel[];
  lang: Language;
  connectedProviders: Record<string, boolean>;
  apiKeys: Record<string, string>;
  onNavigateToApi: () => void;
  onSyncOpenRouter: (key: string) => Promise<void>;
  selectedModelIds: string[];
  onToggleSelection: (modelId: string) => void;
}

export const ModelCatalog: React.FC<ModelCatalogProps> = ({ 
    models, 
    lang, 
    connectedProviders, 
    apiKeys, 
    onNavigateToApi, 
    onSyncOpenRouter,
    selectedModelIds,
    onToggleSelection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [isSyncing, setIsSyncing] = useState(false);
  const t = translations[lang].catalog;

  // "Cron Job" Simulation: Check on mount if we need to fetch OpenRouter models
  useEffect(() => {
      const checkAndFetch = async () => {
          const openRouterKey = apiKeys[Provider.OPENROUTER];
          if (!openRouterKey) return; // No key, no fetch

          const lastFetch = localStorage.getItem('nexus_last_fetch_ts');
          const now = Date.now();
          const ONE_DAY = 24 * 60 * 60 * 1000;
          const ONE_HOUR = 60 * 60 * 1000; 

          // Fetch if never fetched OR if data is older than 1 hour
          if (!lastFetch || (now - parseInt(lastFetch) > ONE_HOUR)) {
              setIsSyncing(true);
              await onSyncOpenRouter(openRouterKey);
              setIsSyncing(false);
          }
      };
      
      checkAndFetch();
  }, [apiKeys, onSyncOpenRouter]);

  const providers = ['All', ...Array.from(new Set(models.map(m => m.provider)))];

  // Optimization: Memoize the filtering logic
  const { displayedModels, totalMatches } = useMemo(() => {
      const openRouterModels = models.filter(m => m.provider === Provider.OPENROUTER);
      const otherModels = models.filter(m => m.provider !== Provider.OPENROUTER);

      let filtered = [];

      if (searchTerm.trim().length > 0) {
          const lowerTerm = searchTerm.toLowerCase();
          const matchedOpenRouter = openRouterModels.filter(m => m.name.toLowerCase().includes(lowerTerm));
          const matchedOthers = otherModels.filter(m => m.name.toLowerCase().includes(lowerTerm));
          filtered = [...matchedOthers, ...matchedOpenRouter];
      } else {
          // No search: Show Others + Top 100 OpenRouter
          filtered = [...otherModels, ...openRouterModels.slice(0, 100)];
      }

      if (selectedProvider !== 'All') {
          filtered = filtered.filter(m => m.provider === selectedProvider);
      }

      const totalFound = filtered.length;
      const finalRenderList = filtered.slice(0, 100); 

      return { displayedModels: finalRenderList, totalMatches: totalFound };
  }, [models, searchTerm, selectedProvider]);

  const isProviderConnected = (provider: string) => {
      if (provider === Provider.GOOGLE) return true; // Env managed
      return connectedProviders[provider] || false;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            {t.title}
            {isSyncing && (
                <Badge variant="info" className="animate-pulse flex items-center gap-1">
                    <CloudDownload className="w-3 h-3" /> Syncing...
                </Badge>
            )}
          </h2>
          <p className="text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        
        {/* Search Box */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 relative group focus-within:border-primary-500/50 transition-colors w-full md:w-auto">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input 
                type="text" 
                placeholder={lang === 'tr' ? 'OpenRouter modellerini ara...' : 'Search OpenRouter models...'}
                className="bg-transparent border-none focus:ring-0 text-sm text-white w-full md:w-64 placeholder-slate-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-primary-400 bg-primary-500/10 px-1.5 rounded">
                    {totalMatches > 100 ? '100+' : totalMatches}
                </div>
            )}
        </div>
      </div>

      {/* Provider Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {providers.map(provider => (
            <button
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${selectedProvider === provider 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                `}
            >
                {provider}
            </button>
        ))}
      </div>
      
      {/* Context Info */}
      {!searchTerm && (selectedProvider === 'All' || selectedProvider === Provider.OPENROUTER) && (
           <div className="text-xs text-slate-500 flex items-center gap-2 px-1 bg-slate-900/50 p-2 rounded border border-slate-800/50">
               <Database className="w-3 h-3" />
               {lang === 'tr' 
                  ? 'Varsayılan olarak top 100 OpenRouter modeli listelenir. Tüm veritabanında aramak için yukarıyı kullanın.' 
                  : 'Showing Top 100 OpenRouter models by default. Use search above to query full database.'}
           </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedModels.map((model) => {
            const connected = isProviderConnected(model.provider);
            const isSelected = selectedModelIds.includes(model.id);

            return (
            <Card 
                key={model.id} 
                className={`relative group overflow-hidden h-full flex flex-col transition-all duration-300 ${isSelected ? 'border-primary-500/60 bg-primary-900/10 shadow-lg shadow-primary-500/10' : ''}`}
            >
                {/* Selection Toggle (Top Right) */}
                <div className="absolute top-4 right-4 z-20">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelection(model.id);
                        }}
                        className={`
                            p-2 rounded-lg transition-all
                            ${isSelected 
                                ? 'bg-primary-500 text-white hover:bg-primary-600' 
                                : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700 hover:text-white border border-slate-700'}
                        `}
                        title={isSelected ? "Remove from Pool" : "Add to Debate Pool"}
                     >
                         {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                     </button>
                </div>

                <div className="absolute top-0 right-16 p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                    {connected ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            {t.online}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-slate-500 text-xs font-mono bg-slate-800/50 px-2 py-1 rounded-full">
                            <WifiOff className="w-3 h-3" />
                            {t.offline}
                        </div>
                    )}
                </div>

                <div className="mb-4 pr-16">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border transition-colors ${connected ? 'bg-slate-800 border-slate-700 group-hover:border-primary-500/30' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                        <Cpu className={`w-5 h-5 ${connected ? 'text-primary-400' : 'text-slate-600'}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-white truncate" title={model.name}>{model.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">{model.provider}</p>
                </div>

                <p className="text-slate-400 text-sm mb-6 h-10 line-clamp-2 leading-relaxed">
                    {model.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6 h-12 overflow-hidden">
                    {model.tags.map(tag => (
                        <Badge key={tag} variant="neutral" className="text-[10px] uppercase tracking-wider">
                            {tag}
                        </Badge>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500">{t.inputCost}</span>
                        <span className="text-sm font-mono text-slate-300">${model.inputCost.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs text-slate-500">{t.outputCost}</span>
                        <span className="text-sm font-mono text-slate-300">${model.outputCost.toFixed(2)}</span>
                    </div>
                </div>
                
                {/* Connection Overlay */}
                {!connected && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <p className="text-slate-400 mb-4 text-sm px-6 text-center">Authentication required for {model.provider}</p>
                        <button 
                            onClick={onNavigateToApi}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg shadow-primary-600/20"
                        >
                            <Wallet className="w-4 h-4" />
                            {t.connect}
                        </button>
                    </div>
                )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
