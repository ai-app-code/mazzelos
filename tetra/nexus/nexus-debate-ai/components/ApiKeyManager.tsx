
import React, { useState } from 'react';
import { translations, Language } from '../translations';
import { Provider } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Shield, CheckCircle, XCircle, Key, Lock, Server, Edit2 } from 'lucide-react';

interface ApiKeyManagerProps {
  lang: Language;
  connectedProviders: Record<string, boolean>;
  apiKeys: Record<string, string>;
  onToggleConnection: (provider: string, key: string | null) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ lang, connectedProviders, apiKeys, onToggleConnection }) => {
  const t = translations[lang].api;
  
  // Temporary state for inputs
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const handleConnect = (provider: string) => {
    const key = inputs[provider];
    if (key && key.length > 5) {
        onToggleConnection(provider, key);
        setEditing(prev => ({...prev, [provider]: false}));
        setInputs(prev => ({...prev, [provider]: ''}));
    }
  };

  const handleDisconnect = (provider: string) => {
      if (window.confirm(lang === 'tr' ? 'Bu anahtarı silmek istediğinize emin misiniz?' : 'Are you sure you want to remove this API key?')) {
        onToggleConnection(provider, null);
        setEditing(prev => ({...prev, [provider]: false}));
      }
  };

  const providersList = [
      { id: Provider.OPENROUTER, name: 'OpenRouter', icon: Server, color: 'text-purple-400', borderColor: 'group-hover:border-purple-500/50' },
      { id: Provider.OPENAI, name: 'OpenAI', icon: Server, color: 'text-green-400', borderColor: 'group-hover:border-green-500/50' },
      { id: Provider.ANTHROPIC, name: 'Anthropic', icon: Server, color: 'text-amber-400', borderColor: 'group-hover:border-amber-500/50' },
      { id: Provider.GROK, name: 'xAI Grok', icon: Server, color: 'text-slate-200', borderColor: 'group-hover:border-slate-500/50' },
      { id: Provider.GOOGLE, name: 'Google Gemini', icon: Server, color: 'text-blue-400', borderColor: 'group-hover:border-blue-500/50', isSystem: true },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">{t.title}</h2>
        <p className="text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            {t.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providersList.map((provider) => {
            const isConnected = connectedProviders[provider.id] || (provider.isSystem && process.env.API_KEY);
            const isEditing = editing[provider.id];
            
            // Mask the stored key
            const storedKey = apiKeys[provider.id] || '';
            const maskedKey = storedKey ? `${storedKey.substring(0, 4)}••••••••${storedKey.substring(storedKey.length - 4)}` : '';

            return (
                <Card key={provider.id} className={`relative group transition-all duration-300 ${isConnected ? 'bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-900/20' : ''} ${provider.borderColor}`}>
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center ${provider.color}`}>
                                <provider.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{provider.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    {isConnected ? (
                                        <Badge variant="success" className="animate-pulse flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
                                        </Badge>
                                    ) : (
                                        <Badge variant="neutral">Disconnected</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isConnected ? (
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        ) : (
                            <XCircle className="w-6 h-6 text-slate-600" />
                        )}
                    </div>

                    {provider.isSystem ? (
                         <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 flex items-center gap-3 text-slate-400 text-sm italic">
                            <Lock className="w-4 h-4" />
                            {t.systemManaged}
                         </div>
                    ) : (
                        <div className="space-y-4">
                            {!isConnected || isEditing ? (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input 
                                            type="password" 
                                            placeholder="sk-..."
                                            value={inputs[provider.id] || ''}
                                            onChange={(e) => setInputs(prev => ({...prev, [provider.id]: e.target.value}))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                                            autoFocus={isEditing}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleConnect(provider.id)}
                                            className="flex-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {isEditing ? (lang === 'tr' ? 'Güncelle' : 'Update') : t.connect}
                                        </button>
                                        {isEditing && (
                                            <button 
                                                onClick={() => setEditing(prev => ({...prev, [provider.id]: false}))}
                                                className="px-4 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800"
                                            >
                                                X
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between bg-emerald-950/10 border border-emerald-500/10 rounded-lg p-3">
                                        <span className="text-emerald-500 font-mono text-xs tracking-widest">{maskedKey}</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditing(prev => ({...prev, [provider.id]: true}))} 
                                                className="p-1 text-slate-500 hover:text-white transition-colors"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDisconnect(provider.id)}
                                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline text-right"
                                    >
                                        {t.disconnect}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            );
        })}
      </div>
      
      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs mt-8">
        <Lock className="w-3 h-3" />
        {t.secure}
      </div>
    </div>
  );
};
