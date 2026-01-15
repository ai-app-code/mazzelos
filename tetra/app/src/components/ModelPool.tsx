import React, { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { translations, Language } from '@/translations';
import { LLMModel } from '@/types';
import { Trash2, Plus, Download, Upload, RotateCcw, ArrowRight, Layers } from 'lucide-react';

interface ModelPoolProps {
  poolModelIds: string[];
  allModels: LLMModel[];
  lang: Language;
  onRemoveFromPool: (modelId: string) => void;
  onNavigateToCatalog: () => void;
  onNavigateToSetup: () => void;
  onClearPool: () => void;
  onImportModels?: (models: LLMModel[]) => void;
  onRestoreDefaults?: () => void;
}

export const ModelPool: React.FC<ModelPoolProps> = ({
  poolModelIds,
  allModels,
  lang,
  onRemoveFromPool,
  onNavigateToCatalog,
  onNavigateToSetup,
  onClearPool,
  onImportModels,
  onRestoreDefaults,
}) => {
  const t = translations[lang].pool;
  const [activeTab, setActiveTab] = useState<'pool' | 'add'>('pool');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const poolModels = allModels.filter(m => poolModelIds.includes(m.id));

  // Export to JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(poolModels, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hibrit_model_pool.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportModels) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const models = JSON.parse(event.target?.result as string);
        if (Array.isArray(models)) {
          onImportModels(models);
        }
      } catch (err) {
        alert('Geçersiz JSON dosyası');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>
        <Badge variant="primary" className="text-sm px-3 py-1">
          {poolModelIds.length} model
        </Badge>
      </div>

      {/* Tabs (SYNAPSE style) */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('pool')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
            activeTab === 'pool'
              ? 'bg-slate-800 text-white border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          {t.myPool}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
            activeTab === 'add'
              ? 'bg-slate-800 text-white border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          {t.addNew}
        </button>
      </div>

      {activeTab === 'pool' ? (
        <>
          {/* Action Bar */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
              {t.exportJson}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-4 h-4" />}
            >
              {t.importJson}
            </Button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            {onRestoreDefaults && (
              <Button variant="outline" size="sm" onClick={onRestoreDefaults} icon={<RotateCcw className="w-4 h-4" />}>
                {t.restoreDefaults}
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={onClearPool} icon={<Trash2 className="w-4 h-4" />}>
              {t.clearAll}
            </Button>
          </div>

          {/* Pool Content */}
          {poolModels.length === 0 ? (
            <Card className="text-center py-12">
              <Layers className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <h3 className="text-xl font-bold text-white mb-2">{t.empty}</h3>
              <p className="text-slate-500 mb-6">{t.emptyDesc}</p>
              <Button onClick={onNavigateToCatalog} icon={<Plus className="w-4 h-4" />}>
                {t.goToCatalog}
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {poolModels.map(model => (
                  <Card key={model.id} hover className="group relative">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="primary">{model.provider}</Badge>
                      <button
                        onClick={() => onRemoveFromPool(model.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded-lg text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-white font-bold mb-1 truncate">{model.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mb-3 truncate">{model.id}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {model.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between text-xs border-t border-slate-800 pt-3">
                      <span className="text-slate-500">
                        Ctx: <span className="text-white font-mono">{model.contextWindow.toLocaleString()}</span>
                      </span>
                      <span className="text-emerald-400 font-mono">
                        ${model.inputCost.toFixed(2)}/M
                      </span>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Start Debate Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  size="lg" 
                  onClick={onNavigateToSetup}
                  glow
                  icon={<ArrowRight className="w-5 h-5" />}
                  className="px-8"
                >
                  {t.goToSetup}
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        /* Add New Tab */
        <Card className="text-center py-12">
          <Plus className="w-16 h-16 mx-auto mb-4 text-slate-700" />
          <h3 className="text-xl font-bold text-white mb-2">Model Ekle</h3>
          <p className="text-slate-500 mb-6">Model Kataloğu'na giderek yeni modeller ekleyebilirsiniz.</p>
          <Button onClick={onNavigateToCatalog} icon={<ArrowRight className="w-4 h-4" />}>
            {t.goToCatalog}
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ModelPool;





