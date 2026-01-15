import React from 'react';
import { LayoutDashboard, Box, Layers, Users, Terminal, Activity, FileText } from 'lucide-react';
import { translations, Language } from '@/translations';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  lang: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, lang }) => {
  const t = translations[lang].nav;

  const menu = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'catalog', icon: Box, label: t.catalog },
    { id: 'pool', icon: Layers, label: t.pool },
    { id: 'debate', icon: Users, label: t.debate },
    { id: 'templates', icon: FileText, label: 'Prompt Şablonları' },
    { id: 'api', icon: Terminal, label: t.api },
  ];

  return (
    <aside className="w-20 lg:w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen sticky top-0 z-50">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-900">
        <div className="relative">
          <Activity className="w-8 h-8 text-primary-500" />
          <div className="absolute -inset-1 bg-primary-500/20 rounded-full blur-md -z-10" />
        </div>
        <div className="hidden lg:flex flex-col ml-3">
          <span className="font-black text-xl tracking-tight bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            TETRA
          </span>
          <span className="text-[9px] text-slate-500 font-medium -mt-0.5 tracking-widest">
            AI DEBATE PROTOCOL
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-2 px-3">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all duration-200 group
              ${activeView === item.id
                ? 'bg-primary-600/10 text-primary-400'
                : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
            `}
          >
            <item.icon className={`w-6 h-6 ${activeView === item.id ? 'stroke-2' : 'stroke-[1.5]'}`} />
            <span className={`hidden lg:block ml-3 font-medium ${activeView === item.id ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
            {activeView === item.id && (
              <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Mazzel OS'ye Dön Butonu */}
      <div className="px-3 pb-3">
        <a
          href={import.meta.env.VITE_MAZZEL_BASE_URL || '/'}
          className="w-full flex items-center justify-center lg:justify-start p-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 text-violet-300 hover:border-violet-500/50 transition-all duration-200 group"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden lg:block ml-3 font-medium text-sm">Mazzel OS'ye Dön</span>
        </a>
      </div>

      {/* Status */}
      <div className="p-4 border-t border-slate-900 space-y-4">
        <div className="bg-slate-900 rounded-xl p-4 hidden lg:block">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t.status}</h4>
          <div className="flex items-center gap-2 text-emerald-500 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {t.operational}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
