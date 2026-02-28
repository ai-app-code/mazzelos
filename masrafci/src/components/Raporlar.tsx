import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, PieChart, Loader2 } from 'lucide-react';
import MonthSelector from './MonthSelector';
import { fetchSummary } from '../api';
import type { Summary } from '../types';

interface RaporlarProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  refreshKey: number;
}

function formatTutar(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COLORS = ['bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-green-500', 'bg-gray-400'];

export default function Raporlar({ selectedMonth, onMonthChange, refreshKey }: RaporlarProps) {
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
  const kategoriler = data?.kategori_dagilimi ?? [];
  const enCok = kategoriler.length > 0 ? kategoriler[0] : null;
  const kayitSayisi = (data?.son_islemler ?? []).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1 transition-colors">Raporlar</h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">Gelir ve giderlerinizin detaylı analizleri</p>
        </div>
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Toplam Gider</div>
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{formatTutar(toplam)}₺</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{kayitSayisi} kayıt</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Kategori Sayısı</div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{kategoriler.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">farklı kategori</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">En Çok Harcanan</div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{enCok?.kategori || '-'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {enCok ? `${formatTutar(enCok.toplam)}₺ (${enCok.adet} kayıt)` : 'Veri yok'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6">Kategori Bazlı Harcamalar</h3>
              {kategoriler.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">Henüz veri yok.</p>
              ) : (
                <div className="space-y-4">
                  {kategoriler.map((item, idx) => {
                    const pct = toplam > 0 ? Math.round((item.toplam / toplam) * 100) : 0;
                    return (
                      <div key={item.kategori}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{item.kategori}</span>
                          <span className="font-bold text-gray-900 dark:text-white">{formatTutar(item.toplam)}₺</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                          <div className={`${COLORS[idx % COLORS.length]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Grafik Görünümü Yakında</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">Detaylı harcama grafikleri ve trend analizleri çok yakında bu alanda yer alacak.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
