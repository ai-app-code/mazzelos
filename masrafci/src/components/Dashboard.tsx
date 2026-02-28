import { useState, useEffect } from 'react';
import { Plus, TrendingDown, Banknote, Landmark, ArrowRight, CalendarDays, FileText, CreditCard, PieChart, Loader2 } from 'lucide-react';
import MonthSelector from './MonthSelector';
import ReminderBanner from './ReminderBanner';
import { fetchSummary } from '../api';
import type { Summary, MasrafRecord } from '../types';

interface DashboardProps {
  onAddExpense: () => void;
  onAddExpenseWithPrefill?: (prefill: { kurum: string }) => void;
  onRefresh?: () => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  refreshKey: number;
}

function formatTutar(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('tr-TR');
  } catch {
    return iso;
  }
}

export default function Dashboard({ onAddExpense, onAddExpenseWithPrefill, onRefresh, selectedMonth, onMonthChange, refreshKey }: DashboardProps) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSummary(selectedMonth)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedMonth, refreshKey]);

  const toplam = data?.toplam_gider ?? 0;
  const faturalar = data?.yaklasan_faturalar ?? [];
  const taksitler = data?.aktif_taksitler ?? [];
  const sonIslemler = data?.son_islemler ?? [];
  const kategoriler = data?.kategori_dagilimi ?? [];

  const enCokKat = kategoriler.length > 0 ? kategoriler[0] : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1 transition-colors">Panel</h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">Aylık harcamalarınızı ve yaklaşan taksitlerinizi takip edin</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-3">
          <MonthSelector value={selectedMonth} onChange={onMonthChange} />
          <button
            onClick={onAddExpense}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Yeni Kayıt
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {onAddExpenseWithPrefill && (
            <ReminderBanner
              selectedMonth={selectedMonth}
              refreshKey={refreshKey}
              onAddRecord={onAddExpenseWithPrefill}
              onRefresh={onRefresh || (() => {})}
            />
          )}

          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Toplam Gider</div>
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatTutar(toplam)}₺</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Fatura Sayısı</div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{faturalar.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">ödenmemiş fatura</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aktif Taksit</div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{taksitler.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">devam eden taksit</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sol: Yaklaşan Faturalar + Kategoriler */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-gray-900 dark:text-white mb-6">Yaklaşan Faturalar</h3>
                {faturalar.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Bu ay için ödenmemiş fatura yok.</p>
                ) : (
                  <div className="space-y-4">
                    {faturalar.map((f: MasrafRecord) => (
                      <div key={f.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900 dark:text-white">{f.ad}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Son: {formatDate(f.son_odeme)}</div>
                          </div>
                        </div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{formatTutar(f.tutar)}₺</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-gray-900 dark:text-white mb-6">Kategoriler</h3>
                {kategoriler.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Henüz veri yok.</p>
                ) : (
                  <>
                    <div className="flex justify-center mb-6">
                      <div className="relative w-32 h-32 rounded-full border-[12px] border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">En Çok</div>
                          <div className="font-bold text-gray-900 dark:text-white">{enCokKat?.kategori}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-sm">
                      {kategoriler.slice(0, 4).map(k => (
                        <div key={k.kategori} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-gray-600 dark:text-gray-400">{k.kategori}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Orta: Aktif Taksitler */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex-1 transition-colors">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6">Aktif Taksitler</h3>
                {taksitler.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Bu ay için aktif taksit yok.</p>
                ) : (
                  <div className="space-y-4">
                    {taksitler.map((t: MasrafRecord) => {
                      const paid = t.taksit_odenen || 0;
                      const total = t.taksit_sayisi || 1;
                      const pct = Math.round((paid / total) * 100);
                      return (
                        <div key={t.id} className="border border-gray-100 dark:border-slate-800 rounded-xl p-5 hover:border-blue-100 dark:hover:border-blue-800 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <PieChart className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">{t.ad}</div>
                                {t.kart && <div className="text-xs text-gray-500 dark:text-gray-400">{t.kart}</div>}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between mb-2">
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">AYLIK</div>
                              <div className="font-bold text-gray-900 dark:text-white">{formatTutar(t.aylik_tutar || 0)}₺</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">İLERLEME</div>
                              <div className="font-bold text-gray-900 dark:text-white">{paid}/{total}</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 mt-3">
                            <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sağ: Son İşlemler */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Son İşlemler</h3>
                {sonIslemler.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Henüz işlem yok.</p>
                ) : (
                  <div className="relative pl-4 border-l-2 border-gray-100 dark:border-slate-800 space-y-6">
                    {sonIslemler.slice(0, 5).map((s: MasrafRecord) => (
                      <div key={s.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{s.ad}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{formatDate(s.created_at)}</div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">-{formatTutar(s.tutar)}₺</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
