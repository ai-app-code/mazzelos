import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title = 'Silme Onayı', message = 'Bu kaydı silmek istediğinize emin misiniz?', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-slate-800 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}
