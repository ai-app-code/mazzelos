import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Language, translations } from '@/translations';
import { PromptTemplates as PromptTemplatesType } from '@/services/api';
import { 
  FileText, Users, Gavel, GraduationCap, Swords, 
  Save, RotateCcw, Check, ChevronDown, ChevronUp,
  Sparkles, AlertCircle
} from 'lucide-react';

interface PromptTemplatesProps {
  templates: PromptTemplatesType;
  onSave: (templates: PromptTemplatesType) => Promise<void>;
  onReset: () => Promise<void>;
  lang: Language;
}

type DebateMode = 'NEXUS' | 'ADVERSARIAL' | 'SYMPOSIUM';

const MODE_CONFIG: Record<DebateMode, { 
  icon: React.ReactNode; 
  color: string; 
  gradient: string;
  description: string;
}> = {
  NEXUS: {
    icon: <Users className="w-5 h-5" />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    description: 'İşbirlikçi karar alma, uzlaşı odaklı'
  },
  ADVERSARIAL: {
    icon: <Swords className="w-5 h-5" />,
    color: 'rose',
    gradient: 'from-rose-500 to-orange-500',
    description: 'Karşıt görüşlü tartışma, argüman kalitesi'
  },
  SYMPOSIUM: {
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    description: 'Akademik sempozyum, bilimsel metodoloji'
  }
};

export const PromptTemplates: React.FC<PromptTemplatesProps> = ({
  templates,
  onSave,
  onReset,
  lang
}) => {
  const [activeMode, setActiveMode] = useState<DebateMode>('NEXUS');
  const [editedTemplates, setEditedTemplates] = useState<PromptTemplatesType>(templates);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['moderator', 'participant']));

  const currentTemplate = editedTemplates[activeMode];
  const config = MODE_CONFIG[activeMode];

  const handleChange = (field: 'moderator' | 'participant', value: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [activeMode]: {
        ...prev[activeMode],
        [field]: value
      }
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedTemplates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Tüm prompt şablonları varsayılan değerlere dönecek. Onaylıyor musunuz?')) return;
    
    setIsResetting(true);
    try {
      await onReset();
      // Templates prop'u güncellenecek, state'i de güncelle
      setTimeout(() => {
        setEditedTemplates(templates);
      }, 500);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Güncellenmiş templates'i senkronize et
  React.useEffect(() => {
    setEditedTemplates(templates);
  }, [templates]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Prompt Şablonları
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Münazara modlarına göre sistem promptlarını özelleştirin
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
            icon={<RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />}
          >
            Varsayılana Dön
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            glow={!isSaving}
            icon={saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          >
            {saveSuccess ? 'Kaydedildi!' : isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-900/50 rounded-xl border border-slate-800">
        {(Object.keys(MODE_CONFIG) as DebateMode[]).map(mode => {
          const modeConfig = MODE_CONFIG[mode];
          const isActive = activeMode === mode;
          
          return (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`flex-1 flex items-center justify-center gap-3 py-3.5 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-r ${modeConfig.gradient} text-white shadow-lg`
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {modeConfig.icon}
              <span>{mode}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Description */}
      <Card className="bg-slate-900/30 border-slate-800">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient}`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-bold text-white">{activeMode}</h3>
            <p className="text-sm text-slate-400">{config.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4" />
            <span>Bu şablonlar münazara başladığında otomatik uygulanır</span>
          </div>
        </div>
      </Card>

      {/* Moderator Prompt */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('moderator')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Gavel className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Moderatör Prompt'u</h3>
              <p className="text-xs text-slate-500">Oturum yöneticisi için sistem talimatları</p>
            </div>
          </div>
          {expandedSections.has('moderator') ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {expandedSections.has('moderator') && (
          <div className="p-4 pt-0 border-t border-slate-800">
            <textarea
              value={currentTemplate?.moderator || ''}
              onChange={(e) => handleChange('moderator', e.target.value)}
              className="w-full h-64 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 font-mono resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
              placeholder="Moderatör için sistem prompt'u girin..."
            />
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Bu prompt moderatöre her mesajda system role olarak gönderilir</span>
            </div>
          </div>
        )}
      </Card>

      {/* Participant Prompt */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('participant')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Katılımcı Prompt'u</h3>
              <p className="text-xs text-slate-500">Tüm katılımcılar için genel talimatlar</p>
            </div>
          </div>
          {expandedSections.has('participant') ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {expandedSections.has('participant') && (
          <div className="p-4 pt-0 border-t border-slate-800">
            <textarea
              value={currentTemplate?.participant || ''}
              onChange={(e) => handleChange('participant', e.target.value)}
              className="w-full h-64 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 font-mono resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
              placeholder="Katılımcılar için sistem prompt'u girin..."
            />
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Bu prompt tüm katılımcılara (moderatör hariç) uygulanır</span>
            </div>
          </div>
        )}
      </Card>

      {/* Tips */}
      <Card className="bg-gradient-to-br from-violet-950/30 to-fuchsia-950/30 border-violet-500/20">
        <h4 className="font-bold text-violet-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          İpuçları
        </h4>
        <ul className="space-y-2 text-sm text-violet-200/70">
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span><strong>[OTURUM_SONLANDI]</strong> etiketi ile münazara otomatik sonlandırılabilir</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Markdown formatı desteklenir (kod blokları, listeler, vb.)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Konu başlığı <code className="bg-violet-500/20 px-1 rounded">{'{topic}'}</code> değişkeni ile prompt'a eklenir</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Tur sayısı için <code className="bg-violet-500/20 px-1 rounded">{'{maxRounds}'}</code> kullanılabilir</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default PromptTemplates;



