import { Search, Bell, Menu, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Header({ activeTab, setActiveTab, currentView, setCurrentView, toggleSidebar, theme, toggleTheme }: HeaderProps) {
  const tabs = ['Panel', 'Faturalar', 'Taksitler', 'Raporlar', 'Geçmiş', 'Ayarlar'];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0 transition-colors duration-200">
      <div className="h-16 flex items-center justify-between px-4 lg:px-6">
        <div className="flex-1 flex items-center gap-4">
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {currentView === 'dashboard' ? (
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                placeholder="Fatura veya taksit ara..." 
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
              />
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <button onClick={() => setCurrentView('dashboard')} className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Ana Sayfa</button>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <button onClick={() => setCurrentView('dashboard')} className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Ev Ekonomisi</button>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">Yeni Harcama</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <nav className="hidden lg:flex items-center gap-6">
            {tabs.map(tab => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentView('dashboard'); }}
                className={`text-sm font-medium transition-colors ${activeTab === tab && currentView === 'dashboard' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 lg:border-l lg:border-gray-200 dark:lg:border-slate-800 lg:pl-6">
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <button className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800/50 overflow-hidden shrink-0">
              <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Tabs */}
      <div className="lg:hidden px-4 pb-2 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-slate-800 pt-2">
        <nav className="flex items-center gap-4 min-w-max">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentView('dashboard'); }}
              className={`text-sm font-medium whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors ${activeTab === tab && currentView === 'dashboard' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

