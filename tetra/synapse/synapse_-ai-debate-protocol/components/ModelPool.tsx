
import React, { useState, useRef } from 'react';
import { LLMModel } from '../types';
import { ModelCatalog } from './ModelCatalog';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface ModelPoolProps {
  apiKey: string;
  savedModels: LLMModel[];
  onAddModel: (model: LLMModel) => void;
  onRemoveModel: (modelId: string) => void;
  onImportModels: (models: LLMModel[]) => void;
  onRestoreDefaults: () => void;
  onClearPool: () => void;
}

export const ModelPool: React.FC<ModelPoolProps> = ({ 
  apiKey, 
  savedModels, 
  onAddModel, 
  onRemoveModel, 
  onImportModels,
  onRestoreDefaults,
  onClearPool
}) => {
  const [activeTab, setActiveTab] = useState<'pool' | 'search'>('pool');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedModels, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `synapse_pool_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const models = JSON.parse(json);
        if (Array.isArray(models)) {
           onImportModels(models);
           alert(`${models.length} model başarıyla içe aktarıldı/güncellendi.`);
        } else {
           alert("Geçersiz dosya formatı. JSON bir dizi (array) olmalıdır.");
        }
      } catch (err) {
        console.error(err);
        alert("Dosya okuma hatası: Geçersiz JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-[1800px] mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Model Havuzu</h1>
          <p className="text-gray-400">Münazaralarda kullanmak üzere favori modellerinizi burada toplayın.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 md:mt-0">
           <div className="flex bg-white/5 p-1 rounded-lg">
             <button 
               onClick={() => setActiveTab('pool')}
               className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'pool' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
             >
               Havuzum ({savedModels.length})
             </button>
             <button 
               onClick={() => setActiveTab('search')}
               className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'search' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
             >
               Yeni Model Ekle
             </button>
           </div>
           
           {activeTab === 'pool' && (
              <div className="flex gap-2">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange}
                 />
                 <Button variant="outline" size="sm" onClick={handleExport} title="Yedek dosyasını indir">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    İndir
                 </Button>
                 <Button variant="outline" size="sm" onClick={handleImportClick} title="Yedek dosyasından yükle">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Yükle
                 </Button>
                 <div className="w-px h-8 bg-white/10 mx-1"></div>
                 <Button variant="ghost" size="sm" onClick={onRestoreDefaults} title="Varsayılan modellere dön" className="text-gray-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                 </Button>
                 <Button variant="ghost" size="sm" onClick={onClearPool} title="Havuzu Tamamen Boşalt" className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </Button>
              </div>
           )}
        </div>
      </div>

      {activeTab === 'pool' && (
        <div className="space-y-6">
          {savedModels.length === 0 ? (
            <div className="text-center py-20 bg-surface/30 rounded-2xl border-2 border-dashed border-gray-700">
               <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Havuzunuz Boş</h3>
               <p className="text-gray-400 mb-6">Henüz hiç model eklemediniz. "Yeni Model Ekle" sekmesinden modelleri keşfedin.</p>
               <div className="flex justify-center gap-3">
                 <Button onClick={() => setActiveTab('search')}>Model Ara</Button>
                 <Button variant="outline" onClick={onRestoreDefaults}>Varsayılanları Yükle</Button>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {savedModels.map(model => (
                 <Card key={model.id} className="relative group hover:border-primary/50 transition-all bg-surface/50">
                    <div className="flex justify-between items-start mb-3">
                       <Badge color="blue">{model.provider}</Badge>
                       <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm(`${model.name} modelini havuzdan silmek istediğinize emin misiniz?`)) {
                               onRemoveModel(model.id);
                            }
                         }}
                         className="text-gray-500 hover:text-red-500 transition-colors p-1"
                         title="Havuzdan Çıkar"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 truncate" title={model.name}>{model.name}</h3>
                    <div className="text-xs text-gray-500 font-mono mb-4 truncate">{model.id}</div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-t border-white/5 pt-3">
                       <div>
                          <span className="block text-gray-600 uppercase text-[10px]">Context</span>
                          <span className="font-mono text-white">{model.contextWindow.toLocaleString()}</span>
                       </div>
                       <div>
                          <span className="block text-gray-600 uppercase text-[10px]">Input $/M</span>
                          <span className="font-mono text-green-400">${model.promptPrice.toFixed(2)}</span>
                       </div>
                    </div>
                 </Card>
               ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="bg-surface/20 border border-white/10 rounded-2xl p-6 min-h-[600px] flex flex-col">
           <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Global Katalog (OpenRouter)</h2>
              <p className="text-gray-400 text-sm">Listeden beğendiğiniz modelleri havuzunuza ekleyin.</p>
           </div>
           <div className="flex-1 overflow-hidden">
             <ModelCatalog 
               apiKey={apiKey} 
               onAction={onAddModel}
               actionLabel="Havuza Ekle"
               existingModelIds={savedModels.map(m => m.id)}
             />
           </div>
        </div>
      )}
    </div>
  );
};
