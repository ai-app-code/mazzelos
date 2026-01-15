
import React from 'react';
import { DebateConfig, DebateState } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface DashboardProps {
  config: DebateConfig;
  state: DebateState;
}

export const Dashboard: React.FC<DashboardProps> = ({ config, state }) => {
  // Calculate stats per participant
  const participantStats = config.participants.map(p => {
    const msgs = state.messages.filter(m => m.participantId === p.id);
    const totalTokens = msgs.reduce((acc, m) => acc + (m.tokensUsed || 0), 0);
    const totalCost = msgs.reduce((acc, m) => acc + (m.cost || 0), 0);
    const msgCount = msgs.length;
    return { ...p, totalTokens, totalCost, msgCount };
  });

  const sortedByCost = [...participantStats].sort((a, b) => b.totalCost - a.totalCost);
  const maxCost = sortedByCost[0]?.totalCost || 1; // Avoid div by zero

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analiz Paneli</h1>
          <p className="text-gray-400">Oturum verileri, maliyet analizi ve model performans metrikleri.</p>
        </div>
        <div className="text-right">
           <div className="text-sm text-gray-500 uppercase tracking-wider">Toplam Süre</div>
           <div className="font-mono text-2xl text-white">
             {state.startTime ? Math.floor((Date.now() - state.startTime) / 60000) + ' dk' : '0 dk'}
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-900/20 to-black border-blue-500/30">
           <div className="flex flex-col">
             <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Toplam Maliyet</span>
             <span className="text-4xl font-bold text-white font-mono">${state.totalCost.toFixed(5)}</span>
             <span className="text-xs text-gray-500 mt-2">Tahmini API harcaması</span>
           </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30">
           <div className="flex flex-col">
             <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Toplam Token</span>
             <span className="text-4xl font-bold text-white font-mono">{state.totalTokens.toLocaleString()}</span>
             <span className="text-xs text-gray-500 mt-2">Girdi + Çıktı</span>
           </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/20 to-black border-green-500/30">
           <div className="flex flex-col">
             <span className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">Mesaj Hacmi</span>
             <span className="text-4xl font-bold text-white font-mono">{state.messages.length}</span>
             <span className="text-xs text-gray-500 mt-2">Toplam tur etkileşimi</span>
           </div>
        </Card>
      </div>

      {/* Cost Burn Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="h-full">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Cash Burn (Model Bazlı Harcama)
          </h3>
          <div className="space-y-6">
            {sortedByCost.map(p => (
              <div key={p.id} className="relative">
                <div className="flex justify-between text-sm mb-2">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                      <span className="text-white font-medium">{p.name}</span>
                      <span className="text-xs text-gray-500 bg-white/5 px-1 rounded">{p.modelName}</span>
                   </div>
                   <span className="font-mono text-gray-300">${p.totalCost.toFixed(5)}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-1000" 
                     style={{ width: `${(p.totalCost / maxCost) * 100}%`, backgroundColor: p.color }}
                   ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="h-full">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Oturum Özeti
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
             <div className="p-4 bg-white/5 rounded-lg">
                <span className="text-xs text-gray-500 uppercase">Konu</span>
                <p className="text-white font-medium mt-1">{config.topic}</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Tur Sayısı</span>
                  <p className="text-white font-mono text-xl">{state.currentRound} / {config.rounds}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Katılımcı</span>
                  <p className="text-white font-mono text-xl">{config.participants.length}</p>
                </div>
             </div>
             
             <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-400 mb-2">Son Aktiviteler</h4>
                <div className="space-y-2">
                  {state.messages.slice(-5).reverse().map(m => {
                    const p = config.participants.find(x => x.id === m.participantId);
                    return (
                      <div key={m.id} className="text-xs flex gap-2 items-center text-gray-500 border-l-2 pl-3 py-1" style={{ borderLeftColor: p?.color }}>
                         <span className="font-mono opacity-50">{new Date(m.timestamp).toLocaleTimeString()}</span>
                         <span className="text-gray-300 font-bold">{p?.name}:</span>
                         <span className="truncate max-w-[200px]">{m.content.substring(0, 50)}...</span>
                      </div>
                    );
                  })}
                </div>
             </div>
          </div>
        </Card>
      </div>

      {/* Detailed Logs */}
      <Card noPadding>
         <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Detaylı İşlem Kaydı</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="text-xs text-gray-500 uppercase bg-white/5">
                     <th className="p-4 font-medium">Zaman</th>
                     <th className="p-4 font-medium">Konuşmacı</th>
                     <th className="p-4 font-medium">Model</th>
                     <th className="p-4 font-medium text-right">Token</th>
                     <th className="p-4 font-medium text-right">Maliyet</th>
                  </tr>
               </thead>
               <tbody className="text-sm divide-y divide-white/5">
                  {state.messages.map(m => {
                     const p = config.participants.find(x => x.id === m.participantId);
                     return (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                           <td className="p-4 font-mono text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</td>
                           <td className="p-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p?.color }}></div>
                                 <span className="text-white font-medium">{p?.name}</span>
                              </div>
                           </td>
                           <td className="p-4 text-gray-400 font-mono text-xs">{p?.modelId}</td>
                           <td className="p-4 text-right font-mono text-yellow-500">{m.tokensUsed}</td>
                           <td className="p-4 text-right font-mono text-green-500">${m.cost.toFixed(6)}</td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  );
};
