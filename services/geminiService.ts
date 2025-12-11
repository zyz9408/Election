

import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, STORY_TIMELINE, NPC_TRAITS } from "../constants";
import { CharacterProfile, ApiConfig } from "../types";

let chatSession: Chat | null = null;
let currentConfig: ApiConfig = { apiKey: '', model: 'gemini-3-pro-preview' };
// For OpenAI compatible endpoints, we need to maintain history manually if we aren't using the SDK
let messageHistory: {role: string, content: string}[] = []; 

export const updateApiConfig = (config: ApiConfig) => {
  currentConfig = config;
  resetGame();
};

const buildSystemPrompt = (characterProfile?: CharacterProfile) => {
   // Construct Character Context
    let characterContext = "";
    if (characterProfile) {
      characterContext = `
**当前玩家角色设定**
姓名：${characterProfile.name}
身份：${characterProfile.role}
外貌特征：${characterProfile.appearance}
背景故事：${characterProfile.background}
`;
    } else {
      characterContext = `
**当前玩家角色设定**
姓名：阿强
身份：和联胜四九（基层成员）
跟谁：师爷苏
`;
    }

    return `${SYSTEM_INSTRUCTION}\n\n${characterContext}\n\n=== 关键NPC特征 (NPC BIBLE) ===\n${NPC_TRAITS}\n\n=== 剧情大纲 (Timeline) ===\n${STORY_TIMELINE}`;
}

const initializeChat = async (characterProfile?: CharacterProfile) => {
  // If we already have a session and it matches the current generic/sdk mode, we might reuse, 
  // but simpler to just rebuild if null.
  if (chatSession && !currentConfig.baseUrl) return; // Only return if using official SDK and session exists. Generic needs manual handling.

  const apiKey = currentConfig.apiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const fullSystemInstruction = buildSystemPrompt(characterProfile);

  // === Google GenAI SDK Mode (Default or if no custom BaseURL) ===
  if (!currentConfig.baseUrl) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      chatSession = ai.chats.create({
        model: currentConfig.model || 'gemini-3-pro-preview',
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: 0.4, 
          thinkingConfig: { thinkingBudget: 8192 },
          maxOutputTokens: 20000, 
          tools: [{ googleSearch: {} }]
        },
      });
      return;
    } catch (error) {
      console.error("Failed to initialize Gemini Chat:", error);
      throw error;
    }
  } 
  
  // === Generic OpenAI Compatible Mode ===
  // If baseUrl is present, we initialize our manual history for the generic fetcher
  messageHistory = [
    { role: "system", content: fullSystemInstruction }
  ];
};

const cleanResponseText = (text: string): string => {
  return text
    .replace(/^```[a-z]*\s*/i, '') 
    .replace(/```$/, '')           
    .replace(/^\s*[\(\（][^\)\）]*[\)\）]\s*/, '') 
    .replace(/^\s*[\.\…\-\—\>\`\~]+/, '') 
    .trim();
};

// Generic OpenAI Fetcher
const fetchOpenAICompatible = async (userMessage: string): Promise<string> => {
    const apiKey = currentConfig.apiKey;
    const baseUrl = currentConfig.baseUrl?.replace(/\/+$/, ''); // remove trailing slash
    const endpoint = `${baseUrl}/chat/completions`;

    messageHistory.push({ role: "user", content: userMessage });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: currentConfig.model,
            messages: messageHistory,
            temperature: 0.7, // Generic models might need higher temp if they don't support thinking
            max_tokens: 4096 // Safe default for most OpenAI-likes
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";
    
    if (assistantMessage) {
        messageHistory.push({ role: "assistant", content: assistantMessage });
    }
    
    return assistantMessage;
};


export const startNewGameWithProfile = async (profile: CharacterProfile): Promise<{ text: string, options: string[] }> => {
  resetGame();
  
  // Pre-initialize generic history if needed because initializeChat might be lazy or strictly for SDK
  // We call initializeChat to setup the session OR the initial history array
  await initializeChat(profile);

  return sendMessageToGemini("游戏开始");
};

export const sendMessageToGemini = async (userMessage: string): Promise<{ text: string, options: string[] }> => {
  try {
    let rawText = "";

    // Check if we are using custom BaseURL (Generic Mode) or Standard SDK
    if (currentConfig.baseUrl) {
        // === GENERIC OPENAI MODE ===
        // Ensure history is initialized
        if (messageHistory.length === 0) {
            await initializeChat(); // Will populate system prompt
        }
        rawText = await fetchOpenAICompatible(userMessage);

    } else {
        // === STANDARD GEMINI SDK MODE ===
        const chat = await initializeChat(); // Ensure chatSession exists
        if (!chatSession) throw new Error("Chat session invalid");
        
        const result = await chatSession.sendMessage({
          message: userMessage
        });
        rawText = result.text || "";
    }

    // Common parsing logic
    const separator = "///OPTIONS///";
    if (rawText.includes(separator)) {
      const parts = rawText.split(separator);
      const content = cleanResponseText(parts[0]);
      const optionsRaw = parts[1].trim();
      
      const options = optionsRaw
        .split('\n')
        .map(o => o.trim())
        .map(o => o.replace(/^[-\d\.]+\s*/, '')) 
        .filter(o => o.length > 0);

      return { text: content, options: options };
    }

    return { text: cleanResponseText(rawText), options: [] };

  } catch (error) {
    console.error("API Error:", error);
    return { 
      text: `（系统错误：无法连接到主机... ${error instanceof Error ? error.message : 'Unknown Error'}）`, 
      options: [] 
    };
  }
};

export const resetGame = () => {
  chatSession = null;
  messageHistory = [];
};
