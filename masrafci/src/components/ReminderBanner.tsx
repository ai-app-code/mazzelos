import { useState, useEffect } from 'react';
import { Bell, Plus, Clock, CalendarOff, X, XCircle } from 'lucide-react';
import { runReminderCheck, performReminderAction } from '../api';
import { useToast } from './Toast';
import type { ReminderEvent, ReminderAction } from '../types';

interface ReminderBannerProps {
  selectedMonth: string;
  refreshKey: number;
  onAddRecord: (prefill: { kurum: string }) => void;
  onRefresh: () => void;
}

export default function ReminderBanner({ selectedMonth, refreshKey, onAddRecord, onRefresh }: ReminderBannerProps) {
  const [events, setEvents] = useState<ReminderEvent[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    setDismissed(false);
    runReminderCheck(selectedMonth)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [selectedMonth, refreshKey]);

  const handleAction = async (eventId: number, action: ReminderAction, displayName: string) => {
    try {
      const res = await performReminderAction(eventId, action);
      setEvents(prev => prev.filter(e => e.id !== eventId));

      if (action === 'add_now' && res.redirect === 'add-record') {
        onAddRecord({ kurum: displayName });
      } else if (action === 'snooze_3d') {
        toast.info('3 gun ertelendi');
      } else if (action === 'skip_month') {
        toast.info('Bu ay icin atlandI');
      } else if (action === 'disable_rule') {
        toast.info('Hatirlatici kapatildi');
      }
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Islem basarisiz');
    }
  };

  if (loading || dismissed || events.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-200">Fatura Hatirlaticilari</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300/80">{events.length} fatura bekleniyor</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-300 transition-colors p-1"
          title="Gizle"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div
            key={event.id}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <div className="font-bold text-gray-900 dark:text-white">{event.display_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Beklenen: {event.expected_start_day}-{event.expected_end_day}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction(event.id, 'add_now', event.display_name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Simdi Ekle
              </button>
              <button
                onClick={() => handleAction(event.id, 'snooze_3d', event.display_name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                3 Gun Ertele
              </button>
              <button
                onClick={() => handleAction(event.id, 'skip_month', event.display_name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
              >
                <CalendarOff className="w-3.5 h-3.5" />
                Bu Ay Gelmedi
              </button>
              <button
                onClick={() => handleAction(event.id, 'disable_rule', event.display_name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Kapat
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
