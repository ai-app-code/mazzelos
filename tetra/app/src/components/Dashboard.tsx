import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { translations, Language } from '@/translations';
import { HistoryItem, DebateMode, DebateArchive } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Zap, Activity, Clock, TrendingUp, Eye, X, Copy, Download, PlayCircle, Trash2 } from 'lucide-react';
import api from '@/services/api';

interface DashboardProps {
  history: HistoryItem[];
  lang: Language;
  onReviveDebate?: (archive: DebateArchive) => void;
  onDeleteDebate?: (id: string) => void;  // 🆕 Silme callback
  onHistoryChange?: () => void;            // 🆕 History güncelleme callback
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

// Transcript log yapısı
interface TranscriptLog {
  id: string;
  topic: string;
  createdAt: number;
  transcript: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ history, lang, onReviveDebate, onDeleteDebate, onHistoryChange }) => {
  const t = translations[lang].dashboard;

  // Transcript görüntüleme modal state
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [archives, setArchives] = useState<DebateArchive[]>([]);

  // Backend'den arşivleri yükle
  useEffect(() => {
    const loadArchives = async () => {
      try {
        const data = await api.archives.get();
        setArchives(data);
      } catch (err) {
        console.error('Failed to load archives from backend:', err);
      }
    };
    loadArchives();
  }, []);

  // Calculate stats
  const totalSpend = history.reduce((acc, h) => acc + h.totalCost, 0);
  const totalDebates = history.length;
  const totalRounds = history.reduce((acc, h) => acc + h.roundCount, 0);

  // Arşivden transcript al
  const getArchiveById = (id: string): DebateArchive | null => {
    return archives.find(a => a.id === id) || null;
  };

  // Canlandırma işlemi
  const handleReviveDebate = (item: HistoryItem) => {
    const archive = getArchiveById(item.id);
    if (archive && onReviveDebate) {
      onReviveDebate(archive);
    } else if (!archive) {
      alert('Bu münazaranın zengin arşiv kaydı bulunamadı. Sadece yeni kaydedilen münazaralar canlandırılabilir.');
    }
  };

  const handleViewTranscript = (item: HistoryItem) => {
    const archive = getArchiveById(item.id);
    if (archive && archive.transcript) {
      setSelectedTranscript({
        id: archive.id,
        topic: archive.topic,
        createdAt: archive.createdAt,
        transcript: archive.transcript
      });
    } else {
      alert('Bu münazaranın transcript kaydı bulunamadı.');
    }
  };

  const handleCopyTranscript = () => {
    if (selectedTranscript) {
      navigator.clipboard.writeText(selectedTranscript.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 🆕 Windows "Farklı Kaydet" dialogu ile indirme
  const handleDownloadTranscript = async () => {
    if (!selectedTranscript) return;

    const fileName = `${selectedTranscript.topic.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 50)}_transcript.txt`;
    const content = selectedTranscript.transcript;

    // Modern tarayıcılarda File System Access API kullan
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Metin Dosyası',
              accept: { 'text/plain': ['.txt'] },
            },
            {
              description: 'Markdown Dosyası',
              accept: { 'text/markdown': ['.md'] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        console.log('[Dashboard] Dosya kaydedildi:', handle.name);
      } catch (err: any) {
        // Kullanıcı iptal ettiyse hata verme
        if (err.name !== 'AbortError') {
          console.error('[Dashboard] Kaydetme hatası:', err);
          // Fallback: Eski yöntem
          fallbackDownload(content, fileName);
        }
      }
    } else {
      // Eski tarayıcılar için fallback
      fallbackDownload(content, fileName);
    }
  };

  // Fallback indirme (eski tarayıcılar için)
  const fallbackDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🆕 Münazara silme
  const handleDeleteDebate = async (item: HistoryItem) => {
    const confirmed = window.confirm(
      `⚠️ SİLME ONAYI\n\n"${item.topic.slice(0, 50)}..."\n\nBu münazara kalıcı olarak silinecek. Emin misiniz?`
    );

    if (!confirmed) return;

    try {
      // Backend'den sil
      await api.history.delete(item.id);
      await api.archives.delete(item.id);

      // Local state'i güncelle
      setArchives(prev => prev.filter(a => a.id !== item.id));

      // Parent component'e bildir
      if (onDeleteDebate) {
        onDeleteDebate(item.id);
      }
      if (onHistoryChange) {
        onHistoryChange();
      }

      console.log(`[Dashboard] Münazara silindi: ${item.id}`);
    } catch (error) {
      console.error('[Dashboard] Silme hatası:', error);
      alert('Silme işlemi başarısız oldu.');
    }
  };

  // Mock trend data
  const trendData = history.slice(-7).map((h, i) => ({
    name: `Gün ${i + 1}`,
    maliyet: h.totalCost * 100,
  }));

  // Mode distribution
  const modeDistribution = [
    { name: 'Mühendislik', value: history.filter(h => h.mode === DebateMode.COLLABORATIVE).length || 1 },
    { name: 'Münazara', value: history.filter(h => h.mode === DebateMode.ADVERSARIAL).length || 1 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
        <p className="text-slate-400">{t.subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full -mr-10 -mt-10" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.totalSpend}</p>
              <p className="text-3xl font-bold text-emerald-400">${totalSpend.toFixed(4)}</p>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card hover className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-500/20 to-transparent rounded-full -mr-10 -mt-10" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.debatesRun}</p>
              <p className="text-3xl font-bold text-primary-400">{totalDebates}</p>
            </div>
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </Card>

        <Card hover className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full -mr-10 -mt-10" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Toplam Tur</p>
              <p className="text-3xl font-bold text-amber-400">{totalRounds}</p>
            </div>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-bold text-white">{t.costTrend}</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData.length > 0 ? trendData : [{ name: 'Veri Yok', maliyet: 0 }]}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="maliyet" stroke="#6366f1" fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Mode Distribution */}
        <Card>
          <h3 className="text-sm font-bold text-white mb-4">{t.providerDistribution}</h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {modeDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs text-slate-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">{t.recentActivity}</h3>
        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{t.noActivity}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(-10).reverse().map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium truncate max-w-[300px]">{item.topic}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString('tr-TR')} {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {item.roundCount} tur • {item.participantCount} katılımcı
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleViewTranscript(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-primary-500/20 hover:bg-primary-500/30 rounded-lg text-primary-400"
                    title="Transcript'i İncele"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {onReviveDebate && (
                    <button
                      onClick={() => handleReviveDebate(item)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400"
                      title="Münazarayı Canlandır"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                  )}
                  {/* 🆕 Silme Butonu */}
                  <button
                    onClick={() => handleDeleteDebate(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                    title="Münazarayı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Badge variant={item.mode === DebateMode.COLLABORATIVE ? 'primary' : 'purple'}>
                    {item.mode === DebateMode.COLLABORATIVE ? 'MÜH' : 'MÜN'}
                  </Badge>
                  <span className="text-sm font-mono text-emerald-400">${item.totalCost.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Transcript Modal */}
      {selectedTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col m-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white truncate max-w-[500px]">
                  {selectedTranscript.topic}
                </h2>
                <p className="text-xs text-slate-500">
                  {new Date(selectedTranscript.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTranscript}
                  icon={<Copy className="w-4 h-4" />}
                >
                  {copied ? 'Kopyalandı!' : 'Kopyala'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadTranscript}
                  icon={<Download className="w-4 h-4" />}
                >
                  İndir
                </Button>
                <button
                  onClick={() => setSelectedTranscript(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
                {selectedTranscript.transcript}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
