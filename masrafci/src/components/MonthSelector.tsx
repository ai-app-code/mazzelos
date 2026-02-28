import { Calendar } from 'lucide-react';

const AY_ISIMLERI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function getLast12Months(): { value: string; label: string }[] {
  const now = new Date();
  const months: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push({ value: `${y}-${m}`, label: `${AY_ISIMLERI[d.getMonth()]} ${y}` });
  }
  return months;
}

interface MonthSelectorProps {
  value: string;
  onChange: (month: string) => void;
  className?: string;
}

export default function MonthSelector({ value, onChange, className = '' }: MonthSelectorProps) {
  const months = getLast12Months();

  return (
    <div className={`relative flex items-center w-full sm:w-auto ${className}`}>
      <Calendar className="absolute left-3 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full sm:w-auto min-w-[11rem] pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors outline-none appearance-none cursor-pointer"
      >
        {months.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
