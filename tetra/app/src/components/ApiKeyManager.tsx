import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { translations, Language } from '@/translations';
import { Provider } from '@/types';
import { Key, Link, Unlink, Eye, EyeOff, Shield } from 'lucide-react';

interface ApiKeyManagerProps {
  lang: Language;
  connectedProviders: Record<string, boolean>;
  apiKeys: Record<string, string>;
  onToggleConnection: (provider: string, key: string | null) => void;
}

const PROVIDERS = [
  {
    id: Provider.OPENROUTER,
    name: 'OpenRouter',
    description: 'Access 100+ models via unified API',
    color: '#6366f1',
    placeholder: 'sk-or-v1-...',
  },
  {
    id: Provider.GOOGLE,
    name: 'Google Gemini',
    description: 'Google\'s multimodal AI models',
    color: '#4285f4',
    placeholder: 'AIza...',
  },
  {
    id: Provider.OPENAI,
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 and more',
    color: '#10a37f',
    placeholder: 'sk-...',
  },
  {
    id: Provider.ANTHROPIC,
    name: 'Anthropic',
    description: 'Claude models',
    color: '#cc785c',
    placeholder: 'sk-ant-...',
  },
  {
    id: Provider.GROK,
    name: 'xAI Grok',
    description: 'Grok models from xAI',
    color: '#1da1f2',
    placeholder: 'xai-...',
  },
];

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
  lang,
  connectedProviders,
  apiKeys,
  onToggleConnection,
}) => {
  const t = translations[lang].api;
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const handleConnect = (providerId: string) => {
    if (keyInput.trim()) {
      onToggleConnection(providerId, keyInput);
      setKeyInput('');
      setEditingProvider(null);
    }
  };

  const handleDisconnect = (providerId: string) => {
    if (window.confirm(`${providerId} bağlantısını kesmek istediğinize emin misiniz?`)) {
      onToggleConnection(providerId, null);
    }
  };

  const toggleShowKey = (providerId: string) => {
    setShowKey(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 7) + '••••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
        <p className="text-slate-400">{t.subtitle}</p>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">Güvenlik Bildirimi</h4>
            <p className="text-sm text-slate-400">{t.secure}</p>
          </div>
        </div>
      </Card>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map(provider => {
          const isConnected = connectedProviders[provider.id];
          const savedKey = apiKeys[provider.id];
          const isEditing = editingProvider === provider.id;

          return (
            <Card 
              key={provider.id} 
              hover 
              className={`transition-all ${isConnected ? 'border-emerald-500/30' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${provider.color}20` }}
                  >
                    <Key className="w-5 h-5" style={{ color: provider.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{provider.name}</h3>
                    <p className="text-xs text-slate-500">{provider.description}</p>
                  </div>
                </div>
                <Badge variant={isConnected ? 'success' : 'default'}>
                  {isConnected ? t.connected : t.notConnected}
                </Badge>
              </div>

              {isConnected && !isEditing ? (
                <div className="space-y-3">
                  {/* Masked Key Display */}
                  <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-3 py-2">
                    <span className="text-sm font-mono text-slate-400 flex-1">
                      {showKey[provider.id] ? savedKey : maskKey(savedKey || '')}
                    </span>
                    <button
                      onClick={() => toggleShowKey(provider.id)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
                    >
                      {showKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setEditingProvider(provider.id);
                        setKeyInput(savedKey || '');
                      }}
                    >
                      {t.edit}
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDisconnect(provider.id)}
                      icon={<Unlink className="w-4 h-4" />}
                    >
                      {t.disconnect}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={isEditing ? keyInput : ''}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={provider.placeholder}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none"
                  />
                  <div className="flex gap-2">
                    {isEditing && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingProvider(null);
                          setKeyInput('');
                        }}
                      >
                        İptal
                      </Button>
                    )}
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleConnect(provider.id)}
                      disabled={!keyInput.trim()}
                      icon={<Link className="w-4 h-4" />}
                    >
                      {t.connect}
                    </Button>
                  </div>
                </div>
              )}

              {/* System Managed Notice for OpenRouter */}
              {provider.id === Provider.OPENROUTER && isConnected && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <span className="text-xs text-emerald-400">{t.systemManaged}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ApiKeyManager;





