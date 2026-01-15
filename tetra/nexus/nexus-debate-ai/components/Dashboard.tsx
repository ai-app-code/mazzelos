
import React, { useMemo } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { HistoryItem, DebateMode } from '../types';
import { translations, Language } from '../translations';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { DollarSign, Zap, Activity, History, ArrowUpRight } from 'lucide-react';

interface DashboardProps {
  history: HistoryItem[];
  lang: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ history, lang }) => {
  const t = translations[lang].dashboard;

  // Calculated Stats
  const stats = useMemo(() => {
    const totalSpend = history.reduce((acc, curr) => acc + curr.totalCost, 0);
    const totalRounds = history.reduce((acc, curr) => acc + curr.roundCount, 0);
    // Mocking token count based on cost roughly for demo
    const estTokens = totalSpend * 400000; 

    return {
        spend: totalSpend,
        tokens: estTokens,
        runs: history.length
    };
  }, [history]);

  const chartData = useMemo(() => {
      // Last 7 runs or days
      return history.slice(-7).map((h, i) => ({
          name: `Sim ${i+1}`,
          cost: h.totalCost,
          tokens: h.roundCount * 1500 // approximation
      }));
  }, [history]);

  const providerData = [
      { name: 'Google', value: 45, color: '#3b82f6' },
      { name: 'OpenRouter', value: 30, color: '#8b5cf6' },
      { name: 'Others', value: 25, color: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">{t.title}</h2>
            <p className="text-slate-400">{t.subtitle}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign className="w-24 h-24" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-slate-400 font-medium text-sm">{t.totalSpend}</span>
                </div>
                <div className="text-3xl font-mono font-bold text-white">
                    ${stats.spend.toFixed(4)}
                </div>
                <div className="mt-2 flex items-center text-xs text-emerald-500">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> +12% from last week
                </div>
            </Card>

            <Card className="relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap className="w-24 h-24" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400">
                        <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-slate-400 font-medium text-sm">{t.totalTokens}</span>
                </div>
                <div className="text-3xl font-mono font-bold text-white">
                    {(stats.tokens / 1000).toFixed(1)}k
                </div>
                <div className="mt-2 text-xs text-slate-500">
                    Estimated tokens processed
                </div>
            </Card>

            <Card className="relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="w-24 h-24" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-accent-500/10 rounded-lg text-accent-400">
                        <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-slate-400 font-medium text-sm">{t.debatesRun}</span>
                </div>
                <div className="text-3xl font-mono font-bold text-white">
                    {stats.runs}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                    Completed sessions
                </div>
            </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
            <Card className="lg:col-span-2 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-6">{t.costTrend}</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val.toFixed(2)}`} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                itemStyle={{ color: '#818cf8' }}
                            />
                            <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="flex flex-col">
                <h3 className="text-lg font-bold text-white mb-6">{t.providerDistribution}</h3>
                <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={providerData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {providerData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <span className="text-2xl font-bold text-white">100%</span>
                         <span className="text-xs text-slate-500">Usage</span>
                    </div>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    {providerData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></span>
                            {d.name}
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* Recent History List */}
        <Card>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">{t.recentActivity}</h3>
                <History className="w-4 h-4 text-slate-500" />
            </div>
            
            <div className="space-y-2">
                {history.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm italic">
                        {t.noActivity}
                    </div>
                ) : (
                    history.slice().reverse().map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-12 rounded-full ${item.mode === DebateMode.ADVERSARIAL ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                <div>
                                    <h4 className="font-medium text-white text-sm">{item.topic}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="capitalize">{item.mode} Mode</span>
                                        <span>•</span>
                                        <span>{item.roundCount} Rounds</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-emerald-400 font-medium text-sm">
                                    ${item.totalCost.toFixed(5)}
                                </div>
                                <button className="text-xs text-primary-400 hover:text-primary-300 mt-1 font-medium">
                                    {t.view}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    </div>
  );
};
