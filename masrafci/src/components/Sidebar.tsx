import { Home, Wallet, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-30
      w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 
      flex flex-col justify-between shrink-0
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-xl">
            <Wallet className="w-6 h-6" />
            <span>Ev Ekonomisi</span>
          </div>
          <button 
            className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-medium transition-colors">
            <Home className="w-5 h-5" />
            Ev Ekonomisi
          </button>
        </div>
      </div>
    </aside>
  );
}


