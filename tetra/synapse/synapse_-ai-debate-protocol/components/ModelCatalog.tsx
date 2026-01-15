
import React, { useState, useEffect } from 'react';
import { LLMModel } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { fetchOpenRouterModels } from '../services/openRouterService';
import { Button } from './ui/Button';

interface ModelCatalogProps {
  apiKey: string;
  onAction: (model: LLMModel) => void;
  actionLabel: string;
  existingModelIds?: string[];
}

export const ModelCatalog: React.FC<ModelCatalogProps> = ({ apiKey, onAction, actionLabel, existingModelIds = [] }) => {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!apiKey) {
      setModels([]);
      return;
    }

    const loadModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedModels = await fetchOpenRouterModels(apiKey);
        setModels(fetchedModels);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Modeller yüklenirken bir hata oluştu.");
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [apiKey]);

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.provider.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const displayModels = filteredModels.slice(0, 50);

  if (!apiKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <h3 className="text-xl font-bold text-gray-400">API Anahtarı Gerekli</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex gap-2">
           <input 
             type="text" 
             placeholder="Global model ara (örn: gpt-4, claude-3, llama)..." 
             className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-32 bg-surface/40 rounded-xl animate-pulse border border-white/5"></div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pr-2 flex-1 pb-10">
          {displayModels.map((model) => {
            const isAdded = existingModelIds.includes(model.id);
            return (
              <Card 
                key={model.id} 
                className="flex flex-col h-full bg-surface/40 hover:bg-surface/60 transition-colors border-white/5"
                noPadding
              >
                <div className="p-4 flex flex-col h-full gap-2">
                  <div className="flex justify-between items-start">
                    <Badge color="blue">{model.provider}</Badge>
                    <span className="text-[10px] text-gray-500 font-mono">${model.promptPrice.toFixed(2)}/M</span>
                  </div>
                  
                  <h3 className="font-bold text-white text-sm leading-tight break-words" title={model.name}>{model.name}</h3>
                  <div className="text-[10px] text-gray-500 font-mono truncate mb-2">{model.id}</div>
                  
                  <div className="mt-auto pt-3">
                     <Button 
                       onClick={() => onAction(model)} 
                       disabled={isAdded}
                       size="sm" 
                       variant={isAdded ? 'outline' : 'primary'}
                       className="w-full"
                     >
                        {isAdded ? 'Eklendi' : actionLabel}
                     </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
