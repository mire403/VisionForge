# VisionForge — 大模型图片训练 & 描述工具生成器

一个面向图像训练数据准备与批量标注的轻量级桌面/网页工具。支持自定义模型API、即时可视化、JSONL导出及统计分析。

<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E4%B8%BB%E9%A1%B5.png" alt="主页" width="880"/> <p style="font-size:12px;color:#94a3b8">主页</p> </div>

## ✨ 项目亮点

**✅ 多提供商 & 自定义API支持**：预置 Google / OpenAI / DeepSeek / 豆包(Doubao) / 通义千问(QWEN) / GLM / Claude，且可输入任意 Base URL + API Key + Model ID。

**✅ Prompt双区交互**：主 Prompt 区（用于图片标注/训练生成） + AI 优化助手（输入想法 → 一键优化并填充到主 Prompt）。

**✅ 三种输入方式**：图片文件 / 图片文件夹（多图） / JSONL（可选，自动识别字段并映射）。

**✅ 可选输出字段**：Caption、Tags、Confidence、OCR 文字、主色调 (HEX)、场景分类、推理/Chain、Embedding（可选 API）。

**✅ 实时运行视图**：点击运行前仍保留数据集网格预览，点击运行后自动切换为实时日志/列表视图，展示每张图片的进度与输出。

**✅ 统计与可视化**：标签词频、置信度直方图、置信度排序曲线（ranked confidence）、并支持将图导出为图片。

**✅ 导出功能**：标准 JSONL（每行一条）、可选扩展字段、TXT 报告（统计）及图表导出。

## 📷 页面使用图片展示

**主页（导入文件后，显示缩略图及数量）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E4%B8%BB%E9%A1%B5%E5%AF%BC%E5%85%A5%E6%96%87%E4%BB%B6%E5%90%8E.png" width="880"/> <p style="font-size:12px;color:#94a3b8">上传文件夹/图片后会自动预览与统计数量</p> </div>

**模型选择界面（预置 + 可自定义）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E6%A8%A1%E5%9E%8B%E9%80%89%E6%8B%A9.png" /> <p style="font-size:12px;color:#94a3b8">预置 Provider 列表 + 可编辑 Base URL / API Key / 自定义 Model ID</p> </div>

**默认输出（仅勾选“标签”，使用默认 Prompt）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E9%BB%98%E8%AE%A4%E8%BE%93%E5%87%BA%EF%BC%88%E6%A0%87%E7%AD%BE%2B%E9%BB%98%E8%AE%A4%E6%8F%90%E7%A4%BA%E8%AF%8D%EF%BC%89.png" width="880"/> <p style="font-size:12px;color:#94a3b8">默认只勾选标签时的 JSONL 输出示例与列表视图</p> </div>

**全部勾选输出（含 OCR / colors / category / reasoning 等）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E5%85%A8%E9%83%A8%E5%8B%BE%E9%80%89%E5%90%8E%E7%9A%84%E8%BE%93%E5%87%BA.png" alt="主页" width="880"/> <p style="font-size:12px;color:#94a3b8">当勾选更多输出后，结果 JSONL 每行会包含更多字段</p> </div>

**置信度直方图（实时）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E7%BD%AE%E4%BF%A1%E5%BA%A6%E7%9B%B4%E6%96%B9%E5%9B%BE.png" width="880"/> <p style="font-size:12px;color:#94a3b8">置信度区间分布（例如 0–20%, 20–40% ...）</p> </div>

**置信度曲线（实时排序置信度）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/%E7%BD%AE%E4%BF%A1%E5%BA%A6%E6%9B%B2%E7%BA%BF.png" width="880"/> <p style="font-size:12px;color:#94a3b8">把样本按置信度排序并作曲线</p> </div>

**AI 优化助手示例：输入“遥感标注意图” → 优化输出（先是总结，再给出专业 Prompt）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/ai%E4%BC%98%E5%8C%96%E6%80%BB%E7%BB%93.png" width="880"/> <p style="font-size:12px;color:#94a3b8">AI 优化助手对用户意图进行结构化扩写</p> </div>

**AI 优化后的 Prompt 输出（可一键填充到主 Prompt）**
<div align="center"> <img src="https://github.com/mire403/VisionForge/blob/main/picture/ai%E4%BC%98%E5%8C%96%E6%8F%90%E7%A4%BA%E8%AF%8D%E8%BE%93%E5%87%BA.png" width="880"/> <p style="font-size:12px;color:#94a3b8">把生成的专业化 Prompt 直接应用到训练流程中</p> </div>

## 📐 产品概念设计

VisionForge面向工程师与数据标注人员，目标是把“图片 → 结构化训练样本（JSONL）”这个流程变得快捷、可复现、可追溯。它在前端实现批量上传、Prompt管理、运行队列、实时日志与统计可视化，后端以可插拔的AI Provider Adapter调用任意兼容模型生成结构化输出。

## 🧭 UI 原型

### 侧栏（左） — API 配置 / 输入 / 输出选项 / 操作按钮

Provider 下拉（Google/OpenAI/DeepSeek/豆包/Qwen/GLM/Claude/Custom）

Base URL、API Key、Model ID（Custom 情况下可编辑）

选择文件（文件 / 文件夹）、导入 JSONL（可选）

输出勾选：Tags / Confidence / OCR / Colors / Category / Reasoning / Embedding / Export JSONL / Export Stats / Export Charts

运行按钮（Run） / 导出按钮（JSONL / TXT / Charts）

### 顶部 — Prompt 区

左：主 Prompt 文本域（用于图片标注）

右：AI 优化助手文本域 + ⚡ 优化按钮 → 一键填充

### 主区域 — 中间显示区

默认：Grid 照片网格预览（每个卡片显示缩略图、文件名、状态）

运行时：切换到 List 实时日志视图（显示每张图片的 status / preview / caption / tags / confidence / inference time / reasoning expandable）

### 底部 / 模块 — Stats 面板（折叠/展开）

Tabs：词频排行 / 置信度直方图 / 置信度曲线（可切换）

支持导出图表为图片

## 🔧 数据结构（JSONL 输出格式 Strict definition）

**基础行（最小字段）**：

```json
{
  "image": "xxx.png",
  "prompt_output": "模型生成的主要描述"
}
```

**可选扩展字段（根据输出选项）**：

```json
{
  "image": "xxx.png",
  "prompt_output": "详细描述..."
  "confidence": 0.912,            // float 0-1
  "tags": ["car", "road", "tree"],// tag list
  "ocr_text": "示例文字",         // OCR 提取
  "colors": ["#1f2937","#e11d48"],// dominant colors hex
  "category": "aerial",           // e.g., "portrait","landscape","aerial","document"
  "reasoning": "因为图像中出现了X..., 所以...", // chain-of-thought / brief reasoning
  "embedding": [0.00123, ...],    // optional vector (float[])
  "stats": { "time_ms": 452, "model": "gpt-4o" },
  "model_name": "gpt-4o",
  "timestamp": "2025-12-08T12:34:56.789Z"
}
```

每一行为单独 JSON（换行分隔），方便训练管线逐行读取。

## 🔁 核心流程

1.用户配置 Provider（或使用默认）与 Model ID / API Key。

2.用户上传图片或选择 JSONL（若 JSONL 存在 → 解析并映射 image 字段，优先进入标注/训练流程）。

3.用户编辑或使用 AI 优化助手生成主 Prompt。

4.点击 运行 (Run)：

页面自动切换为实时运行列表视图（Grid 保留在后台）。

前端构建请求队列（只对 idle/error 条目重试），逐张调用 analyzeImage(file, prompt, config, options)。

每张图片的状态依次为 pending -> success | error，并更新卡片/行显示与 stats。

5.运行结束 → 用户可导出 JSONL、TXT 报告与 Charts。

## 🧩 后端与架构说明（Adapter Pattern）

项目设计为前端为主的 SPA（React + TypeScript），服务层封装为 services/* adapter：

services/geminiService.ts（实际是通用 AI Adapter）

Google SDK 路径（使用 @google/genai）

OpenAI-兼容路径（fetch 到 ${baseUrl}/chat/completions）

动态构造 JSON Schema（当使用 Google 时）；或构造系统 + user messages（OpenAI 兼容）

返回统一 AnalysisResult（见 types）

types.ts：定义 ApiProvider, ApiConfig, ProcessingOptions, ImageItem, AnalysisResult, StatsData

utils/fileHelpers.ts：JSONL 解析/生成、统计 TXT 生成、文件下载 helpers

前端（React）负责：队列管理、UI、charts（recharts）、文件预览、导出

架构要点：

前端直接调用外部 API（需要用户提供 Key，或通过反向代理/后端代理来避免 Key 泄露）

支持“自定义” Provider，方便对接企业内部 API 或代理地址

## 🧪 API 调用模板 示例（三家示例）

下面示例仅为调用模板，具体字段请根据目标 API 文档微调（timeout、multipart 等）

### 1) Google Genmini

```ts
// using @google/genai
const ai = new GoogleGenAI({ apiKey: config.apiKey });
const response = await ai.models.generateContent({
  model: config.modelId, // e.g., 'gemini-2.5-flash'
  contents: {
    parts: [
      { inlineData: { mimeType: file.type, data: base64 } },
      { text: prompt }
    ]
  },
  config: {
     responseMimeType: "application/json",
     responseSchema: {
       type: Type.OBJECT,
       properties: { caption: { type: Type.STRING }, confidence: { type: Type.NUMBER }, ... },
       required: ["caption"]
     }
  }
});
```

### 2) OpenAI-compatible（Chat Completions）

```js
const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
const messages = [
  { role: "system", content: "You are an image captioning assistant. Respond in strict JSON." },
  { role: "user", content: `${jsonInstruction}` },
  { role: "user", content: `data:${file.type};base64,${base64data}` } // some compatible APIs accept data uri
];

const resp = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ model: modelId, messages, max_tokens: 1500, temperature: 0.2 })
});
const data = await resp.json();
const content = data.choices[0].message.content;
const parsed = JSON.parse(cleanedContent);
```

### 3) Claude / Doubao / DeepSeek（OpenAI 兼容示例同上）

多数第三方厂商提供 OpenAI-兼容接口或自定义兼容层，请在 Base URL 中填写对应 endpoint（或代理地址）。

**🧾 关键代码片段（摘录自项目，供快速使用）**

**types.ts（核心类型）**

```ts
export enum ApiProvider { GOOGLE='google', OPENAI='openai', DEEPSEEK='deepseek', DOUBAO='doubao', QWEN='qwen', GLM='glm', CLAUDE='claude', CUSTOM='custom' }

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  baseUrl?: string;
  modelId: string;
}

export interface ProcessingOptions { includeConfidence: boolean; includeTags: boolean; includeEmbedding: boolean; includeStats: boolean; includeOCR: boolean; includeColors: boolean; includeCategory: boolean; includeReasoning: boolean; }

export interface AnalysisResult { caption: string; confidence?: number; tags?: string[]; embedding?: number[]; ocrText?: string; colors?: string[]; category?: string; reasoning?: string; modelName: string; inferenceTimeMs: number; timestamp: string; }
```

**fileHelpers.generateJsonlExport**

```ts
export const generateJsonlExport = (items: ImageItem[]): string => {
  return items.filter(i=>i.status==='success'&&i.result).map(item=>{
    const base = { image: item.file.name, prompt_output: item.result?.caption };
    const extra = {
      ...(item.result?.confidence !== undefined && { confidence: item.result.confidence }),
      ...(item.result?.tags !== undefined && { tags: item.result.tags }),
      ...(item.result?.ocrText !== undefined && { ocr_text: item.result.ocrText }),
      ...(item.result?.colors !== undefined && { colors: item.result.colors }),
      ...(item.result?.category !== undefined && { category: item.result.category }),
      ...(item.result?.reasoning !== undefined && { reasoning: item.result.reasoning }),
      ...(item.result?.embedding !== undefined && { embedding: item.result.embedding }),
      ...(item.result?.inferenceTimeMs !== undefined && { stats: { time_ms: item.result.inferenceTimeMs, model: item.result.modelName } }),
      ...item.originalJsonlData
    };
    return JSON.stringify({ ...base, ...extra });
  }).join('\n');
}
```

**UI 行为（运行时）**

runProcessing()：收集 items 队列、逐个调用 analyzeImage(file, prompt, config, options)，更新 item.status & item.result，更新进度 bar 与 StatsData。

## 🔬 JSONL 输入（导入）说明

**支持字段映射（自动识别）**：

image / file_name / path → 对应图片文件名或相对路径

caption / prompt_output → 已有的描述（导入为原始 JSONL 时会保留到 originalJsonlData）

导入逻辑：

如果用户导入 JSONL 且同时上传了对应图片文件夹，系统会自动把 JSONL 中的 image 字段与上传图片名称匹配并把原始 JSONL 数据映射到 ImageItem.originalJsonlData，以便导出时保留或覆盖。

**示例输入 JSONL 行**：

```json
{"image":"img001.png","caption":"a road with cars","meta":{"source":"collected"}}
```

## ✅ 未来可扩展功能

 **半自动标注核验模式**：AI 先生成候选 caption/tags → 人工批量确认/修正 → 保存为最终 JSONL。

 **Active Learning**：针对置信度低的样本优先人工标注，提高标签质量。

 **后端代理 & 密钥管理**：避免前端暴露 API Key；支持服务器端中继与审计。

 **版本化数据集**：每次导出带 version id、hash & changelog。

 **地物特征专用模块**：为遥感赠送地物词典（道路、建筑、植被、水体等）与空间关系模板。

 **批处理并发控制**：支持并发数设置、失败重试策略、断点续传。

 **更高级可视化**：PCA/t-SNE 可视化 embedding、词云、交互式点选样本。

 **链接本地模型与gpu**:未来可尝试看是否可以链接需部署本地的模型权重文件并调用本地or服务器端的gpu进行数据处理。


## 🚀 快速上手（Run Locally）

1.克隆项目

```bash
git clone https://github.com/mire403/VisionForge.git
cd VisionForge
```

2.安装依赖（Node >= 18）

```bash
npm install
# 或
yarn
```

3.运行（开发模式）

```bash
npm run dev
# 或
yarn dev
```

4.打包（生产）

```bash
npm run build
# 或
yarn build
```

5.可选：使用 Docker（示例 Dockerfile）

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
# serve build with a simple static server
RUN npm i -g serve
CMD ["serve","-s","build","-l","3000"]
```

构建并运行：

```bash
docker build -t visionforge .
docker run -p 3000:3000 visionforge
```

## 🔐 安全与部署建议

**API Key 管理**：建议在生产部署时使用后端中继（server-side proxy），避免前端直接暴露 API Key。

**CORS & Rate Limits**：注意第三方 Provider 的调用频率限制，建议实现并发控制与退避重试。

**合规**：处理用户数据（尤其遥感、人物图片）时，注意隐私与合规性问题。

## 📦 常见问题 & Tips

Q: 我可以直接把 OpenAI Key 填到前端吗？

A: 可行用于测试，但生产环境请使用后端代理以保护 Key。

Q: 如何在没有 Ground Truth 的情况下绘制“校准曲线”？

A: 本工具提供**ranked confidence curve**（置信度排序曲线）。真正的 calibration curve 需要真实标签以计算预测概率 vs 真实准确率。

Q: 如果 JSONL 的 image 字段是相对路径怎么办？

A: 上传图片时请保证文件名一致或写入同级目录以便匹配，工具会根据文件名做匹配。

## ❤️ 致谢

UI 使用 Tailwind CSS（暗色主题）。

Charts 使用 Recharts（直方图 / 曲线 / 条形图）。

文件处理与导出都在 utils/fileHelpers.ts 中统一实现（JSONL 导出同时保留导入的原始字段以便可溯）。

如果你觉得这个项目对你有帮助，请给仓库**点一个 ⭐ Star**！
你的鼓励是我继续优化此项目的最大动力 😊

## 📣 结语

VisionForge 帮你把“海量图片 → 高质量训练样本（JSONL）”这件事变得可视、可控、可导出。无论你要做遥感标注、数据集清洗、微调数据准备或只是想快速批量生成 caption，这个工具都能显著提升效率。赶快把你的图片拖进来，试试 AI 优化助手吧！🚀
