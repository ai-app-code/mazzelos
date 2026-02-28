import { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components/Toast';
import Dashboard from './components/Dashboard';
import AddRecord from './components/AddRecord';
import Faturalar from './components/Faturalar';
import Taksitler from './components/Taksitler';
import Raporlar from './components/Raporlar';
import Gecmis from './components/Gecmis';
import Ayarlar from './components/Ayarlar';

const TAB_MAP: Record<string, string> = {
  'panel': 'Panel',
  'faturalar': 'Faturalar',
  'taksitler': 'Taksitler',
  'raporlar': 'Raporlar',
  'gecmis': 'Geçmiş',
  'ayarlar': 'Ayarlar',
};

const REVERSE_TAB_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(TAB_MAP)) {
  REVERSE_TAB_MAP[v] = k;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getStateFromURL(): { view: string; tab: string } {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') || 'dashboard';
  const tabParam = params.get('tab') || 'panel';
  const tab = TAB_MAP[tabParam.toLowerCase()] || 'Panel';
  return { view, tab };
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => getStateFromURL().view);
  const [activeTab, setActiveTab] = useState(() => getStateFromURL().tab);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addRecordPrefill, setAddRecordPrefill] = useState<{ kurum?: string } | null>(null);

  useEffect(() => {
    const handlePopstate = () => {
      const { view, tab } = getStateFromURL();
      setCurrentView(view);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, []);

  const navigateTo = useCallback((tab: string, view: string = 'dashboard') => {
    const params = new URLSearchParams();
    if (view === 'add-record') {
      params.set('view', 'add-record');
    } else {
      const tabKey = REVERSE_TAB_MAP[tab] || 'panel';
      if (tabKey !== 'panel') {
        params.set('tab', tabKey);
      }
    }
    const newUrl = `/masrafci/${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
    setCurrentView(view);
    setActiveTab(tab);
  }, []);

  const handleRecordCreated = useCallback(() => {
    setRefreshKey(k => k + 1);
    setAddRecordPrefill(null);
    navigateTo('Panel', 'dashboard');
  }, [navigateTo]);

  const handleAddExpenseWithPrefill = useCallback((prefill: { kurum: string }) => {
    setAddRecordPrefill(prefill);
    navigateTo(activeTab, 'add-record');
  }, [navigateTo, activeTab]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleDeleted = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const renderContent = () => {
    if (currentView === 'add-record') {
      return (
        <AddRecord
          onCancel={() => navigateTo('Panel', 'dashboard')}
          onSaved={handleRecordCreated}
          selectedMonth={selectedMonth}
          prefill={addRecordPrefill}
        />
      );
    }
    switch (activeTab) {
      case 'Panel':
        return <Dashboard onAddExpense={() => navigateTo(activeTab, 'add-record')} onAddExpenseWithPrefill={handleAddExpenseWithPrefill} onRefresh={handleRefresh} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} refreshKey={refreshKey} />;
      case 'Faturalar':
        return <Faturalar selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} refreshKey={refreshKey} onDeleted={handleDeleted} onAddRecord={() => navigateTo(activeTab, 'add-record')} />;
      case 'Taksitler':
        return <Taksitler selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} refreshKey={refreshKey} onDeleted={handleDeleted} onAddRecord={() => navigateTo(activeTab, 'add-record')} />;
      case 'Raporlar':
        return <Raporlar selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} refreshKey={refreshKey} />;
      case 'Geçmiş':
        return <Gecmis selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} refreshKey={refreshKey} onDeleted={handleDeleted} onAddRecord={() => navigateTo(activeTab, 'add-record')} />;
      case 'Ayarlar':
        return <Ayarlar />;
      default:
        return <Dashboard onAddExpense={() => navigateTo(activeTab, 'add-record')} onAddExpenseWithPrefill={handleAddExpenseWithPrefill} onRefresh={handleRefresh} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} refreshKey={refreshKey} />;
    }
  };

  return (
    <ToastProvider>
      <div className="font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {renderContent()}
      </div>
    </ToastProvider>
  );
}
