import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area, CartesianGrid, ReferenceLine 
} from 'recharts';
import { StatsData } from '../types';

interface StatsChartProps {
  data: StatsData;
}

const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'tags' | 'histogram' | 'curve'>('tags');

  // --- Data Prep ---
  
  // 1. Tag Frequency (Top 10)
  const tagData = [...data.tagFrequency]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // 2. Histogram Data
  const histData = data.confidenceDistribution;

  // 3. Curve Data (Add index for X-axis)
  const curveData = data.confidenceTrend.map((item, index) => ({
    ...item,
    index: index + 1, // rank 1, 2, 3...
    percent: ((index + 1) / data.confidenceTrend.length) * 100 // percentile
  }));

  const renderContent = () => {
    if (data.totalProcessed === 0) {
      return <div className="flex h-full items-center justify-center text-gray-500 text-sm italic">暂无数据，请先运行任务。</div>;
    }

    switch (activeTab) {
      case 'tags':
        if (tagData.length === 0) return <div className="flex h-full items-center justify-center text-gray-500 text-sm italic">暂无标签数据。</div>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tagData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 11}} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.2}}
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={20}>
                {tagData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#38bdf8' : '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'histogram':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.2}}
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff', fontSize: '12px' }}
                formatter={(value: number) => [`${value} 张`, '数量']}
              />
              <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={40}>
                {histData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.6 + (index * 0.1)} fill="#a78bfa" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'curve':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="index" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: '样本排序 (Rank)', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#64748b' }} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 1]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff', fontSize: '12px' }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '置信度']}
                labelFormatter={(label) => `Rank: ${label}`}
              />
              <ReferenceLine y={0.8} stroke="#fbbf24" strokeDasharray="3 3" label={{ position: 'insideTopLeft',  value: 'High Conf (0.8)', fill: '#fbbf24', fontSize: 10 }} />
              <Area type="monotone" dataKey="value" stroke="#34d399" fillOpacity={1} fill="url(#colorConf)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="h-72 w-full bg-slate-850 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">数据分布可视与分析</h3>
        <div className="flex bg-slate-800 rounded p-0.5">
          <button 
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1 text-[10px] font-medium rounded transition-all ${activeTab === 'tags' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
          >
            词频排行
          </button>
          <button 
            onClick={() => setActiveTab('histogram')}
            className={`px-3 py-1 text-[10px] font-medium rounded transition-all ${activeTab === 'histogram' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
          >
            置信度直方图
          </button>
          <button 
            onClick={() => setActiveTab('curve')}
            className={`px-3 py-1 text-[10px] font-medium rounded transition-all ${activeTab === 'curve' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
          >
            置信度曲线
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 p-4 min-h-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default StatsChart;