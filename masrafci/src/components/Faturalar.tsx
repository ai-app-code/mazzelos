import { useState, useEffect } from 'react';
import { FileText, Calendar, Trash2, Loader2, Plus } from 'lucide-react';
import MonthSelector from './MonthSelector';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { fetchRecords, deleteRecord } from '../api';
import type { MasrafRecord } from '../types';

interface FaturalarProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  refreshKey: number;
  onDeleted: () => void;
  onAddRecord: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; }
}

function formatTutar(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Faturalar({ selectedMonth, onMonthChange, refreshKey, onDeleted, onAddRecord }: FaturalarProps) {
  const [records, setRecords] = useState<MasrafRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    fetchRecords({ type: 'fatura', month: selectedMonth })
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedMonth, refreshKey]);

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteRecord(deleteTarget);
      setRecords(prev => prev.filter(r => r.id !== deleteTarget));
      toast.success('Fatura silindi');
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1 transition-colors">Faturalar</h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">Tum faturalarinizi ve odeme durumlarini takip edin</p>
        </div>
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Bu ay icin fatura kaydi bulunamadi.</p>
          <button onClick={onAddRecord} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all">
            <Plus className="w-5 h-5" />
            Kayit Ekle
          </button>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {records.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white truncate">{r.ad}</div>
                    {r.kurum && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{r.kurum}</div>}
                    {r.abone_no && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">Abone: {r.abone_no}</div>}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(r.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tutar</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatTutar(r.tutar)}TL</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Son Odeme</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(r.son_odeme)}</span>
                </div>

                <div className="mt-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    r.durum === 'odendi'
                      ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                  }`}>
                    {r.durum === 'odendi' ? 'Odendi' : 'Odenmedi'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fatura / Kurum</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tutar</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Son Odeme</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-sm">{r.ad}</div>
                            {r.kurum && <div className="text-xs text-gray-500 dark:text-gray-400">{r.kurum}</div>}
                            {r.abone_no && <div className="text-xs text-gray-400 dark:text-gray-500">Abone: {r.abone_no}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{formatTutar(r.tutar)}TL</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(r.son_odeme)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.durum === 'odendi'
                            ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {r.durum === 'odendi' ? 'Odendi' : 'Odenmedi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget(r.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
