import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { translations, Language } from '@/translations';
import { LLMModel, Provider } from '@/types';
import { testModelAccess } from '@/services/openRouterService';
import { Search, Plus, Check, RefreshCw, ExternalLink, Loader2, AlertTriangle, X } from 'lucide-react';

interface ModelCatalogProps {
  models: LLMModel[];
  lang: Language;
  connectedProviders: Record<string, boolean>;
  apiKeys: Record<string, string>;
  onNavigateToApi: () => void;
  onSyncOpenRouter: (key: string) => void;
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
  onToggleSelection,
}) => {
  const t = translations[lang].catalog;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  // Model test states
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [modelErrors, setModelErrors] = useState<Record<string, string>>({});
  const [modelSuccess, setModelSuccess] = useState<Record<string, boolean>>({});

  // Get unique providers
  const providers = [...new Set(models.map(m => m.provider))];

  // Filter models
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = !activeProvider || model.provider === activeProvider;
    return matchesSearch && matchesProvider;
  });

  const handleSync = async () => {
    const orKey = apiKeys[Provider.OPENROUTER];
    if (orKey) {
      setSyncing(true);
      await onSyncOpenRouter(orKey);
      setSyncing(false);
    }
  };

  // Havuza ekleme - önce erişim kontrolü yap
  const handleAddToPool = async (model: LLMModel) => {
    const isSelected = selectedModelIds.includes(model.id);
    
    // Eğer zaten seçiliyse, direkt kaldır (test gerekmez)
    if (isSelected) {
      onToggleSelection(model.id);
      return;
    }

    // OpenRouter modeli için erişim testi yap
    const orKey = apiKeys[Provider.OPENROUTER];
    if (!orKey) {
      setModelErrors({ ...modelErrors, [model.id]: 'API anahtarı bulunamadı' });
      return;
    }

    // Test başlat
    setTestingModelId(model.id);
    setModelErrors({ ...modelErrors, [model.id]: '' }); // Önceki hatayı temizle
    
    console.log(`[ModelCatalog] Testing access for: ${model.id}`);
    
    const result = await testModelAccess(orKey, model.id);
    
    setTestingModelId(null);
    
    if (result.success) {
      // Test başarılı - havuza ekle
      setModelSuccess({ ...modelSuccess, [model.id]: true });
      setModelErrors({ ...modelErrors, [model.id]: '' });
      onToggleSelection(model.id);
      
      // 3 saniye sonra başarı işaretini kaldır
      setTimeout(() => {
        setModelSuccess(prev => ({ ...prev, [model.id]: false }));
      }, 3000);
    } else {
      // Test başarısız - hata göster, ekleme
      console.error(`[ModelCatalog] Access denied for ${model.id}:`, result.error);
      setModelErrors({ ...modelErrors, [model.id]: result.error || 'Erişim reddedildi' });
    }
  };

  // Hata mesajını temizle
  const clearError = (modelId: string) => {
    setModelErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[modelId];
      return newErrors;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSync}
            disabled={syncing || !apiKeys[Provider.OPENROUTER]}
            icon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
          >
            {t.syncModels}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
          />
        </div>

        {/* Provider Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveProvider(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              !activeProvider 
                ? 'bg-primary-500 text-white' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Tümü
          </button>
          {providers.map(provider => (
            <button
              key={provider}
              onClick={() => setActiveProvider(activeProvider === provider ? null : provider)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeProvider === provider 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {provider}
            </button>
          ))}
        </div>
      </div>

      {/* Pool Status */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Havuzda:</span>
        <Badge variant={selectedModelIds.length > 0 ? 'success' : 'default'}>
          {selectedModelIds.length} model
        </Badge>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map(model => {
          const isSelected = selectedModelIds.includes(model.id);
          const isProviderConnected = connectedProviders[model.provider] || model.provider === Provider.OPENROUTER;

          return (
            <Card 
              key={model.id} 
              hover 
              className={`relative transition-all ${isSelected ? 'border-primary-500 shadow-lg shadow-primary-500/20' : ''}`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <Badge variant={isProviderConnected ? 'success' : 'default'}>
                  {model.provider}
                </Badge>
                <Badge variant={isProviderConnected ? 'success' : 'warning'}>
                  {isProviderConnected ? t.online : t.offline}
                </Badge>
              </div>

              <h3 className="text-white font-bold mb-1 truncate" title={model.name}>{model.name}</h3>
              <p className="text-xs text-slate-500 font-mono mb-3 truncate" title={model.id}>{model.id}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {model.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Pricing */}
              <div className="flex justify-between text-xs border-t border-slate-800 pt-3 mb-3">
                <div>
                  <span className="text-slate-500">{t.inputCost}:</span>
                  <span className="text-white ml-1 font-mono">${model.inputCost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t.outputCost}:</span>
                  <span className="text-white ml-1 font-mono">${model.outputCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Context Window */}
              <div className="text-xs text-slate-500 mb-4">
                Bağlam: <span className="text-white font-mono">{model.contextWindow.toLocaleString()}</span> token
              </div>

              {/* Error Message */}
              {modelErrors[model.id] && (
                <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-red-400 break-words">{modelErrors[model.id]}</p>
                    </div>
                    <button 
                      onClick={() => clearError(model.id)}
                      className="text-red-400 hover:text-red-300 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {modelSuccess[model.id] && !isSelected && (
                <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-emerald-400">Erişim onaylandı!</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isProviderConnected ? (
                  <Button
                    variant={isSelected ? 'secondary' : modelErrors[model.id] ? 'danger' : 'primary'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToPool(model)}
                    disabled={testingModelId === model.id}
                    icon={
                      testingModelId === model.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isSelected ? (
                        <Check className="w-3 h-3" />
                      ) : modelErrors[model.id] ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )
                    }
                  >
                    {testingModelId === model.id 
                      ? 'Test Ediliyor...' 
                      : isSelected 
                        ? t.removeFromPool 
                        : modelErrors[model.id]
                          ? 'Tekrar Dene'
                          : t.addToPool
                    }
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={onNavigateToApi}
                    icon={<ExternalLink className="w-3 h-3" />}
                  >
                    {t.connect}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Arama kriterlerine uygun model bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

export default ModelCatalog;

