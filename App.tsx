
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ModelType, ImageItem, ProcessingOptions, StatsData, ApiProvider, ApiConfig } from './types';
import * as AiService from './services/geminiService';
import * as FileHelpers from './utils/fileHelpers';
import StatsChart from './components/StatsChart';

const generateId = () => Math.random().toString(36).substring(2, 9);

// Presets for UI convenience
const PROVIDER_PRESETS = {
  [ApiProvider.GOOGLE]: { label: 'Google Gemini', defaultUrl: '', defaultModel: ModelType.GEMINI_FLASH },
  [ApiProvider.OPENAI]: { label: 'OpenAI (ChatGPT)', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  [ApiProvider.DEEPSEEK]: { label: 'DeepSeek', defaultUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  [ApiProvider.DOUBAO]: { label: '豆包 (Doubao)', defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-vision-pro-32k' },
  [ApiProvider.QWEN]: { label: '通义千问 (Qwen)', defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-vl-max' },
  [ApiProvider.GLM]: { label: '智谱 (GLM-4V)', defaultUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4v' },
  [ApiProvider.CLAUDE]: { label: 'Claude (via OpenRouter/Compatible)', defaultUrl: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.5-sonnet' },
  [ApiProvider.CUSTOM]: { label: '完全自定义 (Custom API)', defaultUrl: '', defaultModel: '' },
};

export default function App() {
  // --- State ---
  const [items, setItems] = useState<ImageItem[]>([]);
  
  // API Configuration State
  const [provider, setProvider] = useState<ApiProvider>(ApiProvider.GOOGLE);
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [modelId, setModelId] = useState<string>(ModelType.GEMINI_FLASH);
  const [customModelName, setCustomModelName] = useState<string>('');

  // Prompt State
  const [mainPrompt, setMainPrompt] = useState<string>("请详细描述这张图片，用于训练数据。");
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Options
  const [options, setOptions] = useState<ProcessingOptions>({
    includeConfidence: false,
    includeTags: true,
    includeEmbedding: false,
    includeStats: true,
    includeOCR: false,
    includeColors: false,
    includeCategory: false,
    includeReasoning: false,
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const jsonlInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleProviderChange = (newProvider: ApiProvider) => {
    setProvider(newProvider);
    setBaseUrl(PROVIDER_PRESETS[newProvider].defaultUrl);
    setModelId(PROVIDER_PRESETS[newProvider].defaultModel);
    
    // Clear API key if switching from env var default to others, unless it's Google again
    if (newProvider === ApiProvider.GOOGLE) {
      setApiKey(process.env.API_KEY || '');
    } else {
      setApiKey(''); // User needs to enter their key for other providers
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newItems: ImageItem[] = files.map(file => ({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle',
      }));
      setItems(prev => [...prev, ...newItems]);
    }
  };

  const handleJsonlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("JSONL 已上传。注意：在此 Web 演示中，请同时上传对应的图片文件夹以便匹配文件名。");
  };

  const getApiConfig = (): ApiConfig => {
    let finalModelId = modelId;
    if (provider === ApiProvider.GOOGLE && modelId === 'custom') {
      finalModelId = customModelName;
    }
    return {
      provider,
      apiKey,
      baseUrl,
      modelId: finalModelId,
    };
  };

  const handleOptimizePrompt = async () => {
    if (!ideaPrompt.trim()) return;
    if (!apiKey) {
      alert("请输入 API Key");
      return;
    }
    setIsOptimizing(true);
    try {
      const optimized = await AiService.optimizePrompt(ideaPrompt, getApiConfig());
      setMainPrompt(optimized);
    } catch (err: any) {
      alert(`优化失败: ${err.message || '未知错误'}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const runProcessing = async () => {
    if (items.length === 0) return;
    if (!apiKey) {
      alert("请填写 API Key (Please enter API Key)");
      return;
    }

    // Auto switch to list view for monitoring
    setViewMode('list');
    setIsProcessing(true);
    setProgress(0);

    const config = getApiConfig();
    let completed = 0;
    
    // Create a queue of idle/error items
    const queue = items.filter(i => i.status === 'idle' || i.status === 'error');
    
    for (const item of queue) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i));

      try {
        const result = await AiService.analyzeImage(item.file, mainPrompt, config, options);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', result } : i));
      } catch (err) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: "API Error" } : i));
      }

      completed++;
      setProgress((completed / queue.length) * 100);
    }

    setIsProcessing(false);
  };

  const handleExportJsonl = () => {
    const content = FileHelpers.generateJsonlExport(items);
    FileHelpers.downloadFile(content, 'vision_dataset.jsonl', 'application/json');
  };

  const handleExportStats = () => {
    const content = FileHelpers.generateStatsText(statsData);
    FileHelpers.downloadFile(content, 'stats_report.txt', 'text/plain');
  };

  // --- Computed Stats ---
  const statsData: StatsData = useMemo(() => {
    const processed = items.filter(i => i.status === 'success' && i.result);
    const totalTime = processed.reduce((acc, curr) => acc + (curr.result?.inferenceTimeMs || 0), 0);
    const allTags = processed.flatMap(i => i.result?.tags || []);
    
    const tagFreq: Record<string, number> = {};
    allTags.forEach(t => tagFreq[t] = (tagFreq[t] || 0) + 1);

    // Confidence Histogram
    const confidences = processed.map(i => i.result?.confidence || 0);
    const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const hist = bins.slice(0, -1).map((lower, idx) => {
       const upper = bins[idx + 1];
       const count = confidences.filter(c => c >= lower && c < upper).length;
       return { range: `${(lower*100).toFixed(0)}-${(upper*100).toFixed(0)}%`, count };
    });
    // Add 1.0 inclusive to last bin
    hist[hist.length-1].count += confidences.filter(c => c === 1.0).length;

    // Confidence Trend (Sorted)
    const sortedConf = processed
      .map(i => ({ id: i.id, value: i.result?.confidence || 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      totalProcessed: processed.length,
      averageTimeMs: processed.length ? totalTime / processed.length : 0,
      tagFrequency: Object.entries(tagFreq).map(([name, value]) => ({ name, value })),
      confidenceDistribution: hist,
      confidenceTrend: sortedConf,
    };
  }, [items]);

  useEffect(() => {
    return () => items.forEach(i => URL.revokeObjectURL(i.previewUrl));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">V</div>
          <h1 className="text-xl font-bold tracking-tight text-white">VisionForge</h1>
        </div>

        {/* 1. API Configuration */}
        <div className="space-y-4 p-4 bg-slate-850 rounded-lg border border-slate-700">
          <label className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">API 配置</label>
          
          {/* Provider Selector */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">API 提供商 (Provider)</label>
            <select 
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ApiProvider)}
              className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2 text-sm focus:border-indigo-500 outline-none"
            >
              {Object.values(ApiProvider).map(p => (
                <option key={p} value={p}>{PROVIDER_PRESETS[p].label}</option>
              ))}
            </select>
          </div>

          {/* Base URL (Visible for all except Google, editable) */}
          {provider !== ApiProvider.GOOGLE && (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">API 地址 (Base URL)</label>
              <input 
                type="text" 
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2 text-sm focus:border-indigo-500 outline-none placeholder-slate-600"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                * 若使用代理或兼容接口，请修改此地址。
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div>
             <label className="text-xs text-slate-500 mb-1 block">API Key</label>
             <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2 text-sm focus:border-indigo-500 outline-none"
              />
          </div>

          {/* Model ID Input */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">模型 (Model ID)</label>
            {provider === ApiProvider.GOOGLE ? (
              <>
                <select 
                  value={modelId}
                  onChange={(e) => {
                    if (e.target.value === 'switch_to_custom') {
                      handleProviderChange(ApiProvider.CUSTOM);
                    } else {
                      setModelId(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2 text-sm focus:border-indigo-500 outline-none mb-2"
                >
                  <option value={ModelType.GEMINI_FLASH}>Gemini 2.5 Flash</option>
                  <option value={ModelType.GEMINI_PRO}>Gemini 3.0 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="custom">仅自定义模型 ID (Custom ID)</option>
                  <option disabled>──────────</option>
                  <option value="switch_to_custom">↳ 切换到自定义 API...</option>
                </select>
                {modelId === 'custom' && (
                   <input 
                     type="text" 
                     value={customModelName}
                     onChange={(e) => setCustomModelName(e.target.value)}
                     placeholder="输入 Gemini Model ID..."
                     className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2 text-sm focus:border-indigo-500 outline-none"
                   />
                )}
              </>
            ) : (
              <input 
                type="text" 
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g., gpt-4o, doubao-vision-pro"
                className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2 text-sm focus:border-indigo-500 outline-none"
              />
            )}
          </div>
        </div>

        {/* 2. Inputs */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">数据源</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md p-3 text-xs flex flex-col items-center gap-2 transition-colors"
            >
              <span className="text-xl">🖼️</span>
              选择文件
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()} 
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md p-3 text-xs flex flex-col items-center gap-2 transition-colors"
            >
              <span className="text-xl">📁</span>
              选择文件夹
            </button>
          </div>
          <button 
             onClick={() => jsonlInputRef.current?.click()}
             className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md py-2 px-3 text-xs text-left flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">📄</span>
            导入 JSONL (可选)
          </button>

          {/* Hidden Inputs */}
          <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
          <input 
            type="file" 
            // @ts-ignore
            webkitdirectory="" 
            multiple 
            ref={folderInputRef} 
            className="hidden" 
            onChange={handleImageUpload} 
          />
          <input type="file" accept=".jsonl" ref={jsonlInputRef} className="hidden" onChange={handleJsonlUpload} />
        </div>

        {/* 3. Output Options */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">输出内容配置</label>
          <div className="bg-slate-850 p-3 rounded-md border border-slate-700 grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.includeTags} onChange={e => setOptions({...options, includeTags: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" />
              <span className="text-xs">标签 (Tags)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.includeConfidence} onChange={e => setOptions({...options, includeConfidence: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" />
              <span className="text-xs">置信度</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.includeOCR} onChange={e => setOptions({...options, includeOCR: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" />
              <span className="text-xs">OCR 文字</span>
            </label>
             <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.includeColors} onChange={e => setOptions({...options, includeColors: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" />
              <span className="text-xs">主色调</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.includeCategory} onChange={e => setOptions({...options, includeCategory: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" />
              <span className="text-xs">场景分类</span>
            </label>
             <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.includeReasoning} onChange={e => setOptions({...options, includeReasoning: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" />
              <span className="text-xs">推理/Chain</span>
            </label>
          </div>
        </div>

        {/* 4. Actions */}
        <div className="mt-auto space-y-3 pt-6 border-t border-slate-800">
          <button 
            onClick={runProcessing}
            disabled={isProcessing || items.length === 0}
            className={`w-full py-3 px-4 rounded-md font-bold text-white shadow-lg flex items-center justify-center gap-2 ${isProcessing || items.length === 0 ? 'bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500'}`}
          >
            {isProcessing ? '处理中...' : '▶ 批量运行'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExportJsonl} className="bg-slate-800 border border-slate-700 text-slate-300 py-2 rounded hover:bg-slate-700 text-xs font-medium">
              导出 JSONL
            </button>
            <button onClick={handleExportStats} className="bg-slate-800 border border-slate-700 text-slate-300 py-2 rounded hover:bg-slate-700 text-xs font-medium">
              导出报告
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Top Bar */}
        <header className="bg-slate-900 border-b border-slate-800 p-6 shrink-0 z-10">
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-300">系统提示词 (Prompt)</span>
              </label>
              <textarea 
                value={mainPrompt}
                onChange={e => setMainPrompt(e.target.value)}
                className="w-full h-24 bg-slate-850 border border-slate-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-mono text-slate-300"
              />
            </div>
            <div className="xl:w-1/3 space-y-2">
              <label className="flex justify-between items-center">
                <span className="text-sm font-semibold text-indigo-400">✨ AI 优化助手</span>
              </label>
              <div className="relative h-24">
                <textarea 
                  value={ideaPrompt}
                  onChange={e => setIdeaPrompt(e.target.value)}
                  placeholder="在左侧写下简单想法（例如：提取文字、描述风格...），点击闪电图标 ⚡ 让 AI 帮你扩写成专业 Prompt。"
                  className="w-full h-full bg-slate-850 border border-slate-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none pr-12 placeholder-slate-500"
                />
                <button 
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing}
                  className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 rounded-md hover:bg-indigo-500 text-white disabled:opacity-50"
                  title="生成优化后的 Prompt"
                >
                  {isOptimizing ? '...' : '⚡'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Stats Dashboard */}
          {statsData.totalProcessed > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-sm"></span>
                数据分析
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="space-y-4">
                    <div className="bg-slate-850 p-4 rounded-lg border border-slate-700">
                      <p className="text-slate-400 text-xs uppercase tracking-wider">已处理</p>
                      <p className="text-2xl font-bold text-white">{statsData.totalProcessed} <span className="text-sm text-slate-500 font-normal">/ {items.length}</span></p>
                    </div>
                    <div className="bg-slate-850 p-4 rounded-lg border border-slate-700">
                      <p className="text-slate-400 text-xs uppercase tracking-wider">平均耗时</p>
                      <p className="text-2xl font-bold text-emerald-400">{statsData.averageTimeMs.toFixed(0)} <span className="text-sm text-slate-500 font-normal">ms</span></p>
                    </div>
                 </div>
                 <div className="lg:col-span-2">
                    <StatsChart data={statsData} />
                 </div>
              </div>
            </section>
          )}

          {/* Dataset & Results Section */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <span className="w-2 h-6 bg-emerald-500 rounded-sm"></span>
                 数据集
                 <span className="ml-2 px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full">{items.length}</span>
              </h2>
              
              <div className="flex items-center gap-4">
                {isProcessing && (
                  <div className="text-xs text-indigo-400 animate-pulse font-mono">
                    处理中: {progress.toFixed(0)}%
                  </div>
                )}
                {/* View Switcher */}
                <div className="bg-slate-800 p-1 rounded-lg flex gap-1">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="网格视图"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="列表视图"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500">
                <span className="text-4xl mb-4">🖼️</span>
                <p>暂无图片</p>
                <p className="text-sm">请在侧边栏添加文件</p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  /* --- GRID VIEW --- */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(item => (
                      <div key={item.id} className="bg-slate-850 rounded-lg border border-slate-800 overflow-hidden flex flex-col hover:border-slate-600 transition-colors group">
                        <div className="h-40 bg-slate-900 relative">
                          <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2">
                             {item.status === 'success' && <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow">OK</span>}
                             {item.status === 'pending' && <span className="bg-indigo-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow animate-pulse">Running</span>}
                             {item.status === 'error' && <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow">Error</span>}
                          </div>
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-400 truncate w-3/4" title={item.file.name}>{item.file.name}</p>
                            {item.result?.confidence && (
                               <span className="text-[10px] text-slate-500" title="置信度">{(item.result.confidence * 100).toFixed(0)}%</span>
                            )}
                          </div>
                          
                          {item.result ? (
                            <>
                              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed bg-slate-900/50 p-2 rounded border border-slate-800/50">
                                {item.result.caption}
                              </p>
                              {item.result.category && <p className="text-[10px] text-indigo-400">分类: {item.result.category}</p>}
                              {item.result.tags && item.result.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                  {item.result.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700">#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex-1 flex items-center justify-center text-xs text-slate-600 italic">
                              {item.status === 'idle' ? '等待处理' : item.status === 'pending' ? '分析中...' : '处理失败'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* --- LIST VIEW --- */
                  <div className="bg-slate-850 rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-slate-900 text-slate-200 uppercase text-xs font-semibold">
                        <tr>
                          <th className="px-4 py-3 w-16">状态</th>
                          <th className="px-4 py-3 w-24">预览</th>
                          <th className="px-4 py-3">文件名</th>
                          <th className="px-4 py-3 w-1/3">描述 (Caption)</th>
                          <th className="px-4 py-3">分析详情</th>
                          <th className="px-4 py-3 w-24 text-right">耗时</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              {item.status === 'idle' && <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" title="等待"></span>}
                              {item.status === 'pending' && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block" title="运行中"></span>}
                              {item.status === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="完成"></span>}
                              {item.status === 'error' && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="错误"></span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-12 h-12 bg-slate-900 rounded overflow-hidden border border-slate-700">
                                <img src={item.previewUrl} className="w-full h-full object-cover" />
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-300 max-w-[150px] truncate" title={item.file.name}>
                              {item.file.name}
                            </td>
                            <td className="px-4 py-3">
                               {item.result ? (
                                 <div className="text-slate-300 text-xs leading-relaxed max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                   {item.result.caption}
                                 </div>
                               ) : <span className="text-slate-600 italic">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              {item.result ? (
                                <div className="space-y-1 text-xs">
                                  {item.result.category && (
                                    <div className="flex gap-2"><span className="text-slate-500">分类:</span> <span className="text-indigo-400">{item.result.category}</span></div>
                                  )}
                                  {item.result.colors && (
                                     <div className="flex gap-1 items-center">
                                       <span className="text-slate-500">色彩:</span> 
                                       {item.result.colors.map(c => (
                                         <span key={c} className="w-3 h-3 rounded-full border border-slate-600" style={{backgroundColor: c}} title={c}></span>
                                       ))}
                                     </div>
                                  )}
                                  {item.result.ocrText && (
                                    <div className="flex gap-2"><span className="text-slate-500">OCR:</span> <span className="text-slate-300 truncate max-w-[200px]">{item.result.ocrText}</span></div>
                                  )}
                                  {item.result.reasoning && (
                                    <details className="cursor-pointer text-slate-500 hover:text-slate-300">
                                      <summary>查看推理过程</summary>
                                      <p className="mt-1 p-2 bg-slate-900 rounded text-slate-400 italic border-l-2 border-indigo-500">{item.result.reasoning}</p>
                                    </details>
                                  )}
                                  {item.result.tags && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.result.tags.slice(0, 4).map(t => <span key={t} className="px-1 bg-slate-800 rounded border border-slate-700 text-[10px]">{t}</span>)}
                                      {item.result.tags.length > 4 && <span className="text-[10px] text-slate-600">+{item.result.tags.length - 4}</span>}
                                    </div>
                                  )}
                                </div>
                              ) : <span className="text-slate-600 italic">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-emerald-500">
                              {item.result?.inferenceTimeMs ? `${item.result.inferenceTimeMs}ms` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
