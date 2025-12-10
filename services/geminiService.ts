
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ProcessingOptions, ApiConfig, ApiProvider } from "../types";

// --- Google GenAI Implementation ---

const getGoogleClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- OpenAI Compatible Implementation ---

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    total_tokens: number;
  };
}

const callOpenAICompatible = async (
  file: File,
  prompt: string,
  config: ApiConfig,
  options: ProcessingOptions
): Promise<any> => {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  
  // Construct dynamic instructions
  let extraInstructions = [];
  if (options.includeConfidence) extraInstructions.push('"confidence": (number 0-1)');
  if (options.includeTags) extraInstructions.push('"tags": ["tag1", "tag2"]');
  if (options.includeOCR) extraInstructions.push('"ocr_text": "extracted text from image (if any)"');
  if (options.includeColors) extraInstructions.push('"colors": ["#HexCode1", "#HexCode2"] (dominant colors)');
  if (options.includeCategory) extraInstructions.push('"category": "general category (e.g. Portrait, Landscape, UI)"');
  if (options.includeReasoning) extraInstructions.push('"reasoning": "brief explanation of the analysis"');

  const jsonInstruction = `
    Please respond in strict JSON format without markdown code blocks.
    Your main task is to caption the image based on the prompt: "${prompt}"
    
    Required JSON Structure:
    {
      "caption": "detailed description...",
      ${extraInstructions.join(',\n      ')}
    }
  `;

  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: jsonInstruction },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`
          }
        }
      ]
    }
  ];

  const url = `${config.baseUrl?.replace(/\/+$/, '')}/chat/completions`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.modelId,
      messages: messages,
      max_tokens: 1500,
      temperature: 0.2,
      // response_format: { type: "json_object" } // Optional: Enable if model supports it
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data: OpenAIResponse = await response.json();
  const content = data.choices[0].message.content;

  // Attempt to clean markdown json blocks ```json ... ```
  const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
  
  return JSON.parse(cleanContent);
};


// --- Unified Exported Functions ---

/**
 * Optimizes a prompt using the selected provider
 */
export const optimizePrompt = async (userIdea: string, config: ApiConfig): Promise<string> => {
  const prompt = `You are an expert Prompt Engineer. Refine this idea into a precise image captioning prompt (keep language consistent with input): "${userIdea}"`;

  if (config.provider === ApiProvider.GOOGLE) {
    try {
      const ai = getGoogleClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
      });
      return response.text?.trim() || "";
    } catch (e) {
      console.error("Google optimize error", e);
      throw e;
    }
  } else {
    try {
      const url = `${config.baseUrl?.replace(/\/+$/, '')}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: [{ role: "user", content: prompt }],
        })
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (e) {
      console.error("OpenAI optimize error", e);
      throw e;
    }
  }
};

/**
 * Main Analysis Function
 */
export const analyzeImage = async (
  file: File,
  prompt: string,
  config: ApiConfig,
  options: ProcessingOptions
): Promise<AnalysisResult> => {
  const startTime = performance.now();

  let parsedResult: any = {};
  
  try {
    if (config.provider === ApiProvider.GOOGLE) {
      const ai = getGoogleClient(config.apiKey);
      const base64Data = await fileToBase64(file);

      // Build Schema Dynamically
      const properties: Record<string, Schema> = {
        caption: { type: Type.STRING, description: "Detailed description based on prompt." },
      };
      const requiredFields = ["caption"];

      if (options.includeConfidence) {
        properties.confidence = { type: Type.NUMBER, description: "Confidence score 0-1." };
      }
      if (options.includeTags) {
        properties.tags = { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key visual tags." };
      }
      if (options.includeOCR) {
        properties.ocr_text = { type: Type.STRING, description: "All visible text in the image. Empty if none." };
      }
      if (options.includeColors) {
        properties.colors = { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dominant colors in Hex format (e.g. #FF0000)." };
      }
      if (options.includeCategory) {
        properties.category = { type: Type.STRING, description: "General category of the image (e.g. Scenery, Document, Person)." };
      }
      if (options.includeReasoning) {
        properties.reasoning = { type: Type.STRING, description: "Brief reasoning for why the caption was generated this way." };
      }

      const response = await ai.models.generateContent({
        model: config.modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: properties,
            required: requiredFields,
          },
        }
      });
      
      try {
        parsedResult = JSON.parse(response.text || "{}");
      } catch (e) {
        parsedResult = { caption: response.text || "Error parsing JSON" };
      }

    } else {
      // OpenAI / Custom / Doubao / DeepSeek / etc.
      parsedResult = await callOpenAICompatible(file, prompt, config, options);
    }

    const endTime = performance.now();
    const inferenceTime = Math.round(endTime - startTime);

    return {
      caption: parsedResult.caption || "No caption generated",
      confidence: parsedResult.confidence,
      tags: parsedResult.tags,
      ocrText: parsedResult.ocr_text,
      colors: parsedResult.colors,
      category: parsedResult.category,
      reasoning: parsedResult.reasoning,
      modelName: config.modelId,
      inferenceTimeMs: inferenceTime,
      timestamp: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error("Analysis failed", error);
    throw error;
  }
};
