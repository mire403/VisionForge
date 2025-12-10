import React from 'react';
import { 
  BarChart, Bar, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { StatsData } from '../types';

interface StatsChartProps {
  data: StatsData;
}

const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = React.useState<'tags' | 'histogram' | 'curve'>('curve');

  const tagData = [...data.tagFrequency].sort((a, b) => b.value - a.value).slice(0, 8);
  const histData = data.confidenceDistribution;
  const curveData = data.confidenceTrend.map((item, index) => ({
    ...item,
    index: index + 1,
  }));

  const tabLabels: Record<string, string> = {
    tags: '热门标签',
    histogram: '置信度',
    curve: '趋势'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let displayValue = payload[0].value;
      let displayLabel = label;

      if (activeTab === 'curve') {
          displayValue = `${(Number(payload[0].value) * 100).toFixed(0)}%`;
          displayLabel = `第 ${label} 张`;
      }

      return (
        <div className="bg-[#1D1D1F]/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-white/10 flex flex-col gap-0.5">
          {displayLabel && <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{displayLabel}</span>}
          <span className="font-mono text-sm font-bold text-white tracking-tight">{displayValue}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80 w-full flex flex-col bg-white rounded-[2rem] shadow-clay overflow-hidden relative group border border-white/60">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 z-10 shrink-0">
        <h4 className="text-sm font-extrabold tracking-tight text-clay-text">数据洞察</h4>
        <div className="flex bg-clay-bg p-1 rounded-full">
          {['curve', 'tags', 'histogram'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`
                px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300
                ${activeTab === tab 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-clay-subtext hover:text-black'}
              `}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-2 pb-2 min-h-0">
          {data.totalProcessed === 0 ? (
             <div className="flex h-full items-center justify-center pb-8">
                <div className="text-center space-y-2">
                   <div className="w-12 h-12 rounded-full bg-clay-bg mx-auto flex items-center justify-center">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                   </div>
                   <span className="text-xs font-medium text-clay-subtext">等待数据...</span>
                </div>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'tags' ? (
                <BarChart data={tagData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#86868B', fontSize: 10, fontWeight: 600}} 
                    dy={10}
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#86868B', fontSize: 10, fontWeight: 500}} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#F2F2F7', radius: 8}} />
                  <Bar dataKey="value" barSize={32} radius={[8, 8, 8, 8]}>
                    {tagData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#FF3B30' : '#E5E5EA'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : activeTab === 'histogram' ? (
                <BarChart data={histData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                  <XAxis 
                    dataKey="range" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#86868B', fontSize: 10, fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    allowDecimals={false}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#86868B', fontSize: 10, fontWeight: 500}} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#F2F2F7', radius: 8}} />
                  <Bar dataKey="count" barSize={32} radius={[6, 6, 6, 6]}>
                     {histData.map((_, index) => (
                       <Cell key={`cell-${index}`} fill="#34C759" />
                     ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={curveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9500" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF9500" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                  <XAxis 
                    dataKey="index" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#86868B', fontSize: 10, fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 1]}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#86868B', fontSize: 10, fontWeight: 500}} 
                    tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#FF9500" 
                    strokeWidth={3}
                    fill="url(#colorValue)" 
                    animationDuration={1000}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
      </div>
    </div>
  );
};

export default StatsChart;