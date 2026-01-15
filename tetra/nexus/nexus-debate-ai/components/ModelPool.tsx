
import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { LLMModel } from '../types';
import { Trash2, ArrowRight, Layers, BoxSelect } from 'lucide-react';
import { translations, Language } from '../translations';

interface ModelPoolProps {
  poolModelIds: string[];
  allModels: LLMModel[];
  lang: Language;
  onRemoveFromPool: (id: string) => void;
  onNavigateToCatalog: () => void;
  onNavigateToSetup: () => void;
  onClearPool: () => void;
}

export const ModelPool: React.FC<ModelPoolProps> = ({ 
    poolModelIds, 
    allModels, 
    lang, 
    onRemoveFromPool,
    onNavigateToCatalog,
    onNavigateToSetup,
    onClearPool
}) => {
  const t = translations[lang].pool;
  
  const poolModels = allModels.filter(m => poolModelIds.includes(m.id));

  if (poolModels.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-800">
                  <Layers className="w-10 h-10 text-slate-600" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{t.empty}</h2>
                  <p className="text-slate-400 max-w-md mx-auto">{t.emptyDesc}</p>
              </div>
              <button 
                onClick={onNavigateToCatalog}
                className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20"
              >
                  <BoxSelect className="w-5 h-5" />
                  {t.goToCatalog}
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    {t.title}
                    <Badge variant="info" className="text-lg px-3 py-1">{poolModels.length}</Badge>
                </h2>
                <p className="text-slate-400 mt-1">{t.subtitle}</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={onClearPool}
                    className="px-4 py-2 text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-rose-900"
                >
                    {t.clearAll}
                </button>
                <button 
                    onClick={onNavigateToSetup}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                >
                    {t.goToSetup}
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poolModels.map(model => (
                <Card key={model.id} className="relative group border-l-4 border-l-primary-500">
                    <div className="absolute top-4 right-4">
                        <button 
                            onClick={() => onRemoveFromPool(model.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                            title={t.remove}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="pr-12">
                        <h3 className="text-lg font-bold text-white truncate">{model.name}</h3>
                        <p className="text-sm text-primary-400 font-mono mb-2">{model.provider}</p>
                        <p className="text-sm text-slate-400 line-clamp-2 h-10">{model.description}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                        <div className="flex gap-2">
                           {model.tags.slice(0, 2).map(tag => (
                               <span key={tag} className="bg-slate-800 px-2 py-1 rounded">{tag}</span>
                           ))}
                        </div>
                        <div className="font-mono text-slate-300">
                            ${model.inputCost.toFixed(2)} / 1M
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
};
