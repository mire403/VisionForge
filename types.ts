
export enum ModelType {
  GEMINI_FLASH = 'gemini-2.5-flash',
  GEMINI_PRO = 'gemini-3-pro-preview',
}

export enum ApiProvider {
  GOOGLE = 'google',
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  DOUBAO = 'doubao',
  QWEN = 'qwen',
  GLM = 'glm',
  CLAUDE = 'claude',
  CUSTOM = 'custom',
}

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  baseUrl?: string; // For custom/openai compatible
  modelId: string;
}

export interface ProcessingOptions {
  includeConfidence: boolean;
  includeTags: boolean;
  includeEmbedding: boolean; // Requires separate API call
  includeStats: boolean;
  // New Options
  includeOCR: boolean;      // Extract text
  includeColors: boolean;   // Extract hex colors
  includeCategory: boolean; // General classification
  includeReasoning: boolean; // Why did output this?
}

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  result?: AnalysisResult;
  errorMsg?: string;
  originalJsonlData?: any; // To preserve extra fields from JSONL import
}

export interface AnalysisResult {
  caption: string;
  confidence?: number;
  tags?: string[];
  embedding?: number[];
  // New Fields
  ocrText?: string;
  colors?: string[];
  category?: string;
  reasoning?: string;
  
  modelName: string;
  inferenceTimeMs: number;
  timestamp: string;
}

export interface StatsData {
  totalProcessed: number;
  averageTimeMs: number;
  tagFrequency: { name: string; value: number }[];
  confidenceDistribution: { range: string; count: number }[];
  confidenceTrend: { id: string; value: number }[];
}
