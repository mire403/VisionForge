import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ModelType, ImageItem, ProcessingOptions, StatsData, ApiProvider, ApiConfig } from './types';
import * as AiService from './services/geminiService';
import * as FileHelpers from './utils/fileHelpers';
import StatsChart from './components/StatsChart';

const generateId = () => Math.random().toString(36).substring(2, 9);

const PROVIDER_PRESETS = {
  [ApiProvider.GOOGLE]: { label: 'Google Gemini', defaultUrl: '', defaultModel: ModelType.GEMINI_FLASH },
  [ApiProvider.OPENAI]: { label: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  [ApiProvider.DEEPSEEK]: { label: 'DeepSeek', defaultUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  [ApiProvider.DOUBAO]: { label: '豆包 (Doubao)', defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-vision-pro-32k' },
  [ApiProvider.QWEN]: { label: '通义千问 (Qwen)', defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-vl-max' },
  [ApiProvider.GLM]: { label: '智谱 GLM', defaultUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4v' },
  [ApiProvider.CLAUDE]: { label: 'Claude', defaultUrl: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.5-sonnet' },
  [ApiProvider.CUSTOM]: { label: '自定义 (Custom)', defaultUrl: '', defaultModel: '' },
};

// --- Clay UI Components ---

const Label = ({ children }: { children: React.ReactNode }) => (
  <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-clay-subtext mb-3 pl-1">{children}</h5>
);

const ClayInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="w-full input-clay placeholder-gray-400"
  />
);

const ClaySelect = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select 
      {...props}
      className="w-full input-clay appearance-none cursor-pointer pr-10"
    >
      {children}
    </select>
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-clay-text opacity-50">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </div>
);

const Checkbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <label className="flex items-center gap-3 cursor-pointer group py-1.5">
    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 ${checked ? 'bg-clay-text text-white shadow-md scale-100' : 'bg-clay-subtle hover:bg-white scale-95'}`}>
      {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
    </div>
    <span className={`text-sm font-medium transition-colors ${checked ? 'text-clay-text' : 'text-clay-subtext group-hover:text-clay-text'}`}>{label}</span>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
  </label>
);

const ShutterButton = ({ onClick, disabled, loading, label, icon }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="
      w-full h-14 px-6 rounded-2xl bg-gradient-to-r from-clay-orange to-clay-red text-white font-bold text-sm
      shadow-glow-red hover:scale-[1.02] active:scale-95 
      transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none
      flex items-center justify-center gap-2
    "
  >
    {loading ? (
      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    ) : icon}
    <span>{label}</span>
  </button>
);

// --- Main Application ---

export default function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [provider, setProvider] = useState<ApiProvider>(ApiProvider.GOOGLE);
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [modelId, setModelId] = useState<string>(ModelType.GEMINI_FLASH);
  const [mainPrompt, setMainPrompt] = useState<string>("请详细描述这张图片。");
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleProviderChange = (newProvider: ApiProvider) => {
    setProvider(newProvider);
    setBaseUrl(PROVIDER_PRESETS[newProvider].defaultUrl);
    setModelId(PROVIDER_PRESETS[newProvider].defaultModel);
    if (newProvider === ApiProvider.GOOGLE) setApiKey(process.env.API_KEY || '');
    else setApiKey('');
  };

  const getApiConfig = (): ApiConfig => {
    return { provider, apiKey, baseUrl, modelId };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      setItems(prev => [...prev, ...files.map(file => ({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle' as const,
      }))]);
    }
  };

  const handleOptimizePrompt = async () => {
    if (!ideaPrompt.trim()) return;
    if (!apiKey) return alert("需要 API Key");
    setIsOptimizing(true);
    try {
      const optimized = await AiService.optimizePrompt(ideaPrompt, getApiConfig());
      setMainPrompt(optimized);
      setIdeaPrompt(""); 
    } catch (err: any) {
      alert(`错误: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const runProcessing = async () => {
    if (items.length === 0 || !apiKey) return;
    setIsProcessing(true);
    setProgress(0);
    setViewMode('list'); 
    
    const config = getApiConfig();
    let completed = 0;
    const queue = items.filter(i => i.status === 'idle' || i.status === 'error');
    
    for (const item of queue) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i));
      try {
        const result = await AiService.analyzeImage(item.file, mainPrompt, config, options);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', result } : i));
      } catch (err) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: "Failed" } : i));
      }
      completed++;
      setProgress((completed / queue.length) * 100);
    }
    setIsProcessing(false);
  };

  const statsData: StatsData = useMemo(() => {
    const processed = items.filter(i => i.status === 'success' && i.result);
    const totalTime = processed.reduce((acc, curr) => acc + (curr.result?.inferenceTimeMs || 0), 0);
    const allTags = processed.flatMap(i => i.result?.tags || []);
    const tagFreq: Record<string, number> = {};
    allTags.forEach(t => tagFreq[t] = (tagFreq[t] || 0) + 1);
    const confidences = processed.map(i => i.result?.confidence || 0);
    const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const hist = bins.slice(0, -1).map((lower, idx) => {
       const upper = bins[idx + 1];
       return { range: `${(lower*100).toFixed(0)}-${(upper*100).toFixed(0)}%`, count: confidences.filter(c => c >= lower && c < upper).length };
    });
    return {
      totalProcessed: processed.length,
      averageTimeMs: processed.length ? totalTime / processed.length : 0,
      tagFrequency: Object.entries(tagFreq).map(([name, value]) => ({ name, value })),
      confidenceDistribution: hist,
      confidenceTrend: processed.map(i => ({ id: i.id, value: i.result?.confidence || 0 })).sort((a, b) => b.value - a.value),
    };
  }, [items]);

  useEffect(() => () => items.forEach(i => URL.revokeObjectURL(i.previewUrl)), []);

  return (
    <div className="flex h-screen w-full p-4 lg:p-6 gap-6 overflow-hidden">
      
      {/* 1. FLOATING DOCK (Left Control) */}
      <aside className="w-[300px] shrink-0 h-full flex flex-col animate-slide-up">
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-clay flex flex-col overflow-hidden relative border border-white/50">
          
          {/* Header */}
          <div className="pt-8 px-6 pb-2 shrink-0">
             <div className="flex items-center gap-3 mb-0.5">
               {/* LOGO: The Focus Frame - Minimalist, Physical, Non-AI */}
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-clay-orange to-clay-red flex items-center justify-center text-white shadow-lg shrink-0">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                 </svg>
               </div>
               <span className="text-xl font-extrabold tracking-tight text-clay-text">VisionForge</span>
             </div>
             <p className="text-[10px] font-bold text-clay-subtext ml-[3.25rem] leading-tight">大模型图片训练 & 描述工具生成器</p>
          </div>

          {/* Controls - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 space-y-6 py-6 scroll-smooth mask-image-bottom">
            
            {/* Engine */}
            <section className="space-y-3">
              <Label>核心引擎</Label>
              <div className="space-y-3 p-1">
                <ClaySelect value={provider} onChange={(e) => handleProviderChange(e.target.value as ApiProvider)}>
                  {Object.values(ApiProvider).map(p => <option key={p} value={p}>{PROVIDER_PRESETS[p].label}</option>)}
                </ClaySelect>
                
                {provider !== ApiProvider.GOOGLE && (
                   <div className="space-y-3 animate-pop">
                     <ClayInput value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="API Base URL" />
                     <ClayInput type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" />
                   </div>
                )}

                {/* Dynamic Model Input: Select for Google, Input for others */}
                {provider === ApiProvider.GOOGLE ? (
                  <ClaySelect value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    <option value={ModelType.GEMINI_FLASH}>Gemini 2.5 Flash</option>
                    <option value={ModelType.GEMINI_PRO}>Gemini 3.0 Pro</option>
                  </ClaySelect>
                ) : (
                  <ClayInput 
                    value={modelId} 
                    onChange={e => setModelId(e.target.value)} 
                    placeholder="输入模型 ID (如 gpt-4-vision)" 
                  />
                )}
              </div>
            </section>

            {/* Import */}
            <section className="space-y-3">
               <Label>素材库</Label>
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className="h-20 rounded-2xl bg-clay-input hover:bg-clay-text hover:text-white transition-all duration-300 flex flex-col items-center justify-center gap-1 group border border-transparent hover:border-black/5">
                    <svg className="text-clay-subtext group-hover:text-white transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[10px] font-bold">导入图片</span>
                 </button>
                 <button onClick={() => folderInputRef.current?.click()} className="h-20 rounded-2xl bg-clay-input hover:bg-clay-text hover:text-white transition-all duration-300 flex flex-col items-center justify-center gap-1 group border border-transparent hover:border-black/5">
                    <svg className="text-clay-subtext group-hover:text-white transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span className="text-[10px] font-bold">文件夹</span>
                 </button>
               </div>
               <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
               {/* @ts-ignore */}
               <input type="file" webkitdirectory="" multiple ref={folderInputRef} className="hidden" onChange={handleImageUpload} />
            </section>

            {/* Analysis */}
            <section className="space-y-2">
              <Label>分析策略</Label>
              <div className="bg-clay-input rounded-3xl p-4">
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { k: 'includeTags', l: '自动打标' },
                    { k: 'includeConfidence', l: '置信度评分' },
                    { k: 'includeOCR', l: 'OCR 文字提取' },
                    { k: 'includeColors', l: '色调分析' },
                    { k: 'includeReasoning', l: '思维链推理' }
                  ].map(opt => (
                    <Checkbox key={opt.k} label={opt.l} checked={options[opt.k as keyof ProcessingOptions] as boolean} onChange={e => setOptions({...options, [opt.k]: e.target.checked})} />
                  ))}
                </div>
              </div>
            </section>

          </div>

          {/* Footer Actions (Fixed) */}
          <div className="p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-10 shrink-0 space-y-3">
             <ShutterButton 
                onClick={runProcessing}
                disabled={isProcessing || items.length === 0}
                loading={isProcessing}
                label={isProcessing ? "正在处理..." : "开始运行"}
                icon={
                   // Run Icon: Play/Triangle
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M8 5v14l11-7z" />
                   </svg>
                }
              />
             <div className="grid grid-cols-2 gap-2">
               <button onClick={() => FileHelpers.downloadFile(FileHelpers.generateJsonlExport(items), 'export.jsonl', 'application/json')} className="h-10 rounded-xl text-[10px] font-bold bg-clay-input text-clay-text hover:bg-clay-subtext hover:text-white transition-all flex items-center justify-center gap-1">
                 JSONL
               </button>
               <button onClick={() => FileHelpers.downloadFile(FileHelpers.generateStatsText(statsData), 'report.txt', 'text/plain')} className="h-10 rounded-xl text-[10px] font-bold bg-clay-input text-clay-text hover:bg-clay-subtext hover:text-white transition-all flex items-center justify-center gap-1">
                 报告
               </button>
             </div>
          </div>

        </div>
      </aside>

      {/* 2. INFINITE CANVAS (Right Workspace) */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden animate-slide-up" style={{animationDelay: '100ms'}}>
         
         {/* Top Bar */}
         <header className="h-24 flex items-center justify-between shrink-0 pl-4 pr-8 z-20">
            <div className="flex bg-white/60 p-1.5 rounded-full shadow-inner-soft backdrop-blur-sm">
              <button onClick={() => setViewMode('grid')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-black shadow-float' : 'text-gray-400 hover:text-black'}`}>网格</button>
              <button onClick={() => setViewMode('list')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-black shadow-float' : 'text-gray-400 hover:text-black'}`}>列表</button>
            </div>

            <div className="flex items-center gap-4">
              {items.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-white/50">
                  <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-clay-orange animate-pulse' : 'bg-clay-mint'}`}></div>
                  <span className="text-xs font-bold text-gray-500">{items.length} 资源就绪</span>
                </div>
              )}
            </div>
         </header>

         {/* Scrollable Area */}
         <div className="flex-1 overflow-y-auto pr-6 pl-4 pb-20 scroll-smooth">
            <div className="max-w-6xl mx-auto space-y-10 pt-2">
               
               {/* THE CREATOR STAGE (Prompt) */}
               <div className="bg-white rounded-[3rem] shadow-clay p-10 relative group border border-white/60">
                  <div className="flex justify-between items-start mb-6">
                    <Label>提示词构建</Label>
                    <div className="flex items-center gap-2 bg-clay-bg pl-3 pr-1 py-1 rounded-full">
                       <input 
                          value={ideaPrompt} 
                          onChange={e => setIdeaPrompt(e.target.value)} 
                          placeholder="AI 优化: 输入简单想法..." 
                          className="bg-transparent text-xs w-48 outline-none text-black placeholder-gray-400 font-medium"
                        />
                       <button onClick={handleOptimizePrompt} disabled={isOptimizing} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-clay-orange hover:scale-110 transition-transform">
                          {isOptimizing ? <div className="w-3 h-3 border-2 border-clay-orange border-t-transparent rounded-full animate-spin"/> : (
                             // Optimize Icon: Star/Sparkle
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
                          )}
                       </button>
                    </div>
                  </div>
                  
                  <textarea 
                     value={mainPrompt}
                     onChange={e => setMainPrompt(e.target.value)}
                     className="w-full min-h-[120px] text-3xl font-bold text-black resize-none outline-none leading-tight placeholder-gray-200 bg-transparent tracking-tight"
                     placeholder="在此输入您的视觉指令..."
                  />
               </div>

               {/* DATA VIZ */}
               {statsData.totalProcessed > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                    <div className="col-span-1 flex flex-col gap-6">
                       <div className="bg-white p-8 rounded-[2rem] shadow-float flex-1 border border-white flex flex-col justify-center">
                          <Label>Processed</Label>
                          <span className="text-7xl font-extrabold text-black tracking-tighter mt-2">{statsData.totalProcessed}</span>
                       </div>
                       <div className="bg-white p-8 rounded-[2rem] shadow-float flex-1 border border-white flex flex-col justify-center">
                          <Label>Avg Time</Label>
                          <div className="flex items-baseline gap-2 mt-2">
                             <span className="text-6xl font-extrabold text-black tracking-tighter">{statsData.averageTimeMs.toFixed(0)}</span>
                             <span className="text-base font-bold text-gray-400">ms</span>
                          </div>
                       </div>
                    </div>
                    <div className="col-span-1 lg:col-span-2">
                       <StatsChart data={statsData} />
                    </div>
                 </div>
               )}

               {/* GALLERY */}
               {items.length > 0 && (
                 <div className="animate-slide-up" style={{animationDelay: '100ms'}}>
                    <div className="flex items-center justify-between mb-8 pl-2">
                      <h3 className="text-2xl font-bold tracking-tight text-black">预览</h3>
                      <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">{items.filter(i=>i.status==='success').length} 项完成</span>
                    </div>
                    
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                         {items.map((item, idx) => (
                            <div key={item.id} className="group relative flex flex-col bg-white rounded-[2rem] shadow-float hover:shadow-clay hover:-translate-y-2 transition-all duration-300 p-4 pb-6 border border-white/50">
                               <div className="relative aspect-[4/3] rounded-[1.5rem] bg-gray-100 overflow-hidden mb-5">
                                  <img 
                                    src={item.previewUrl} 
                                    className={`w-full h-full object-cover transition-all duration-700 ${item.status === 'success' ? 'scale-100 blur-0' : 'scale-110 blur-sm opacity-80'}`} 
                                  />
                                  <div className={`absolute top-4 right-4 w-3 h-3 rounded-full border-[3px] border-white shadow-sm transition-colors duration-500 ${item.status === 'success' ? 'bg-clay-mint' : item.status === 'error' ? 'bg-clay-red' : 'bg-gray-300'}`}></div>
                               </div>
                               
                               <div className="px-2 flex flex-col gap-2">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="text-[10px] font-bold text-gray-400 truncate max-w-[100px] tracking-wide uppercase">{item.file.name}</span>
                                     {item.result?.confidence && <span className="text-[10px] font-bold text-clay-blue bg-blue-50 px-2 py-0.5 rounded-md">{(item.result.confidence * 100).toFixed(0)}%</span>}
                                  </div>
                                  <p className="text-sm text-black font-semibold leading-relaxed line-clamp-2 min-h-[2.5rem]">{item.result?.caption}</p>
                                  <div className="flex gap-1.5 flex-wrap mt-2">
                                     {item.result?.tags?.slice(0, 3).map(t => (
                                        <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-orange-50 text-clay-orange">{t}</span>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-[2.5rem] shadow-clay border border-gray-100 overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                               <tr>
                                  <th className="p-6 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Asset</th>
                                  <th className="p-6 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 w-1/2">Output</th>
                                  <th className="p-6 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Meta</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                               {items.map(item => (
                                 <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="p-6 align-top">
                                       <img src={item.previewUrl} className="w-20 h-20 object-cover rounded-2xl shadow-sm bg-gray-200" />
                                    </td>
                                    <td className="p-6 align-top">
                                       <p className="text-sm text-black font-medium leading-relaxed">{item.result?.caption || 'Pending...'}</p>
                                    </td>
                                    <td className="p-6 align-top">
                                       <div className="flex flex-wrap gap-2">
                                         {item.result?.tags?.map(t => (
                                            <span key={t} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500">{t}</span>
                                         ))}
                                       </div>
                                       {item.result?.colors && <div className="flex gap-1 mt-3">{item.result.colors.map(c => <div key={c} className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{background: c}}/>)}</div>}
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                    )}
                 </div>
               )}
            </div>
         </div>
      </main>
    </div>
  );
}