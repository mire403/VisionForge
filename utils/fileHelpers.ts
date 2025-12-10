
import { ImageItem, AnalysisResult, StatsData } from "../types";

export const parseJsonlFile = async (file: File): Promise<{ imagePath: string; originalData: any }[]> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => {
    try {
      const data = JSON.parse(line);
      // Heuristic to find image path field
      const imagePath = data.image || data.file_name || data.path || "";
      return { imagePath, originalData: data };
    } catch (e) {
      return { imagePath: "", originalData: {} };
    }
  });
};

export const generateJsonlExport = (items: ImageItem[]): string => {
  return items
    .filter(item => item.status === 'success' && item.result)
    .map(item => {
      const base = {
        image: item.file.name,
        prompt_output: item.result?.caption,
      };
      
      // Merge extra fields if they exist
      const extra = {
        ...(item.result?.confidence !== undefined && { confidence: item.result.confidence }),
        ...(item.result?.tags !== undefined && { tags: item.result.tags }),
        ...(item.result?.ocrText !== undefined && { ocr_text: item.result.ocrText }),
        ...(item.result?.colors !== undefined && { colors: item.result.colors }),
        ...(item.result?.category !== undefined && { category: item.result.category }),
        ...(item.result?.reasoning !== undefined && { reasoning: item.result.reasoning }),
        ...(item.result?.embedding !== undefined && { embedding: item.result.embedding }),
        ...(item.result?.inferenceTimeMs !== undefined && { stats: { time_ms: item.result.inferenceTimeMs, model: item.result.modelName } }),
        ...item.originalJsonlData // Preserve original data if needed, usually we overwrite prompt_output
      };

      return JSON.stringify({ ...base, ...extra });
    })
    .join('\n');
};

export const generateStatsText = (stats: StatsData): string => {
  const distText = stats.confidenceDistribution
    .map(d => `  [${d.range.padEnd(8)}]: ${d.count} 张`)
    .join('\n');

  return `
VisionForge 批量处理报告
========================
生成时间: ${new Date().toLocaleString()}
处理总数: ${stats.totalProcessed}
平均耗时: ${stats.averageTimeMs.toFixed(2)} ms

------------------------
1. 置信度分布 (Confidence Distribution)
------------------------
${distText}

------------------------
2. 热门标签 (Top Tags)
------------------------
${stats.tagFrequency.map(t => `- ${t.name}: ${t.value}`).join('\n')}
  `.trim();
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
