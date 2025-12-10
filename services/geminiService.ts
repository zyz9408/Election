import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, STORY_TIMELINE } from "../constants";
import { CharacterProfile } from "../types";

let chatSession: Chat | null = null;

const initializeChat = async (characterProfile?: CharacterProfile) => {
  if (chatSession) return chatSession;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

    // Combining the static System Instruction with the Timeline and Character Context
    const fullSystemInstruction = `${SYSTEM_INSTRUCTION}\n\n${characterContext}\n\n=== 剧情大纲 (Timeline) ===\n${STORY_TIMELINE}`;

    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7, 
        maxOutputTokens: 1000,
        tools: [{ googleSearch: {} }]
      },
    });

    return chatSession;
  } catch (error) {
    console.error("Failed to initialize Gemini Chat:", error);
    throw error;
  }
};

export const startNewGameWithProfile = async (profile: CharacterProfile): Promise<{ text: string, options: string[] }> => {
  resetGame();
  await initializeChat(profile);
  // Send the first trigger message
  return sendMessageToGemini("游戏开始");
};

export const sendMessageToGemini = async (userMessage: string): Promise<{ text: string, options: string[] }> => {
  try {
    // If chat is not initialized, initialize with default (fallback)
    const chat = await initializeChat();
    
    // Using chat.sendMessage to keep session history automatically.
    const result = await chat.sendMessage({
      message: userMessage
    });

    const rawText = result.text || "";
    
    // Parse the options from the text based on the delimiter defined in constants.ts
    const separator = "///OPTIONS///";
    if (rawText.includes(separator)) {
      const parts = rawText.split(separator);
      const content = parts[0].trim();
      const optionsRaw = parts[1].trim();
      
      // Clean up options (remove bullets, numbers, empty lines)
      const options = optionsRaw
        .split('\n')
        .map(o => o.trim())
        .map(o => o.replace(/^[-\d\.]+\s*/, '')) // Remove leading "- " or "1. "
        .filter(o => o.length > 0);

      return { text: content, options: options };
    }

    return { text: rawText, options: [] };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "（系统错误：无法连接到“和联胜”网络...请检查您的网络连接或稍后再试。）", 
      options: [] 
    };
  }
};

export const resetGame = () => {
  chatSession = null;
};