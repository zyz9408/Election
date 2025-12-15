
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessageToGemini, resetGame, startNewGameWithProfile, updateApiConfig, restoreGameHistory } from './services/geminiService';
import { Message, GameState, CharacterProfile, ApiConfig } from './types';
import { Typewriter } from './components/Typewriter';

// Icons
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const RestartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-zinc-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DEFAULT_CONFIG: ApiConfig = {
  apiKey: '',
  baseUrl: '',
  model: 'gemini-3-pro-preview',
};

const DEFAULT_CHARACTER: CharacterProfile = {
  name: '阿强',
  role: '四九 (草鞋)',
  appearance: '身穿旧皮衣，眼神冷峻，右脸有一道浅疤',
  background: '在果栏长大，跟师爷苏混了三年，做事利落话不多。'
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    started: false,
    loading: false,
    error: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_CONFIG);

  // Character Creation State
  const [character, setCharacter] = useState<CharacterProfile>(DEFAULT_CHARACTER);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load config from local storage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('triad_api_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setApiConfig({ ...DEFAULT_CONFIG, ...parsed });
        updateApiConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
  }, []);

  const saveConfig = (newConfig: ApiConfig) => {
    setApiConfig(newConfig);
    updateApiConfig(newConfig);
    localStorage.setItem('triad_api_config', JSON.stringify(newConfig));
    setShowSettings(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, gameState.loading, gameState.started]);

  const processResponse = useCallback((response: { text: string, options: string[] }) => {
    const responseMessage: Message = { 
      role: 'model', 
      content: response.text, 
      options: response.options,
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, responseMessage]);
  }, []);

  const handleStartGame = async () => {
    if (!apiConfig.apiKey && !process.env.API_KEY) {
       setShowSettings(true);
       alert("请先设置 API Key");
       return;
    }

    setGameState(prev => ({ ...prev, started: true, loading: true }));
    try {
      const response = await startNewGameWithProfile(character);
      processResponse(response);
    } catch (e: any) {
      console.error(e);
      let errorMsg = "连接龙头失败，请检查API设置。";
      if (e.message?.includes('429') || e.message?.includes('Quota')) {
        errorMsg = "API 额度已耗尽 (Quota Exceeded)。请检查 API Key 或稍后再试。";
      }
      setGameState(prev => ({ ...prev, error: errorMsg, started: false }));
    } finally {
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSend = async (textOverride?: string) => {
    // Check for "Check Settings" shortcut from error messages
    if (textOverride === '检查设置') {
        setShowSettings(true);
        return;
    }

    const userText = textOverride || input.trim();
    if (!userText || gameState.loading) return;

    if (!textOverride) setInput('');
    
    // Optimistic update
    const newMessage: Message = { role: 'user', content: userText, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setGameState(prev => ({ ...prev, loading: true }));

    try {
      const aiResponse = await sendMessageToGemini(userText);
      processResponse(aiResponse);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "（通讯中断...请检查API配置）", timestamp: Date.now() }]);
    } finally {
      setGameState(prev => ({ ...prev, loading: false }));
      // Focus back on input only if not on mobile (sometimes annoying) but generally good
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleRegenerate = async () => {
    if (gameState.loading || messages.length < 2) return;
    
    // Check if last message is model
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'model') return;

    const lastUserMsg = messages[messages.length - 2];
    if (lastUserMsg.role !== 'user') return; // Should not happen given game flow

    setGameState(prev => ({ ...prev, loading: true }));
    
    // 1. Remove the last model message from UI
    // 2. Remove the last user message from UI (because handleSend will re-add it)
    const newHistory = messages.slice(0, -2);
    setMessages(newHistory);

    try {
      // Restore backend history to state BEFORE the last user message
      await restoreGameHistory(newHistory, character);
      
      // Resend the user message
      await handleSend(lastUserMsg.content);
    } catch (e) {
      console.error("Regenerate failed", e);
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleJumpToEvent = async (index: number) => {
    if (gameState.loading) return;
    if (!window.confirm("确定要回到这一刻吗？之后的江湖经历将被重写。")) return;

    // We jump to the state AFTER the selected message.
    // Ideally user selects a Model message (a scene).
    const targetMessages = messages.slice(0, index + 1);
    
    setGameState(prev => ({ ...prev, loading: true }));
    setMessages(targetMessages);
    setShowTimeline(false);

    try {
        await restoreGameHistory(targetMessages, character);
    } catch (e) {
        console.error("Jump failed", e);
        // If restore fails, we might have desynced UI, but usually it just means next send will fail.
    } finally {
        setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRestart = () => {
    if (window.confirm("确定要重新开始吗？所有江湖恩怨将一笔勾销。")) {
      resetGame();
      setMessages([]);
      setInput('');
      setCharacter(DEFAULT_CHARACTER); // Reset character input state to defaults
      setGameState({ started: false, loading: false, error: null });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Get the last message to check for options
  const lastMessage = messages[messages.length - 1];
  const showOptions = !gameState.loading && lastMessage?.role === 'model' && lastMessage?.options && lastMessage.options.length > 0;
  const canRegenerate = !gameState.loading && lastMessage?.role === 'model' && messages.length >= 2;

  // Render Character Creation Screen
  if (!gameState.started) {
    return (
      <div className="flex flex-col min-h-screen bg-triad-black font-serif text-gray-300 items-center justify-center p-4 relative">
        {/* Settings Button (Top Right) */}
        <div className="absolute top-4 right-4 z-50">
           <button 
             onClick={() => setShowSettings(true)}
             className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
           >
             <SettingsIcon />
           </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">API 设置</h2>
                
                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Base URL (Optional)</label>
                  <input 
                    type="text" 
                    value={apiConfig.baseUrl || ''}
                    onChange={(e) => setApiConfig({...apiConfig, baseUrl: e.target.value})}
                    placeholder="https://generativelanguage.googleapis.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-triad-red outline-none"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">留空则使用默认 Google Gemini 地址。</p>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">API Key</label>
                  <input 
                    type="password" 
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({...apiConfig, apiKey: e.target.value})}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-triad-red outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Model Name</label>
                   <input 
                    type="text" 
                    value={apiConfig.model}
                    onChange={(e) => setApiConfig({...apiConfig, model: e.target.value})}
                    placeholder="gemini-3-pro-preview"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-triad-red outline-none"
                  />
                   <div className="flex flex-wrap gap-2 mt-2">
                     {['gemini-3-pro-preview', 'gemini-2.5-flash', 'gpt-4o', 'deepseek-chat'].map(m => (
                       <button 
                         key={m}
                         onClick={() => setApiConfig({...apiConfig, model: m})}
                         className="text-[10px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
                       >
                         {m}
                       </button>
                     ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => saveConfig(apiConfig)}
                    className="px-4 py-2 text-sm bg-triad-red hover:bg-red-900 text-white rounded"
                  >
                    保存设置
                  </button>
                </div>
             </div>
          </div>
        )}

        <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <header className="bg-zinc-950 p-6 border-b border-zinc-800 text-center">
             <h1 className="text-3xl font-bold tracking-widest text-triad-red uppercase drop-shadow-md mb-2">
              和联胜：话事人
            </h1>
            <p className="text-zinc-500 text-sm">
              创建你的角色档案
            </p>
          </header>
          
          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 flex justify-center items-start pt-2">
                <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-700">
                  <UserIcon />
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-1 uppercase tracking-wider">姓名 / 花名</label>
                  <input 
                    type="text" 
                    value={character.name}
                    onChange={e => setCharacter({...character, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-triad-red focus:ring-1 focus:ring-triad-red outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-zinc-400 text-sm mb-1 uppercase tracking-wider">身份 / 职位</label>
                  <input 
                    type="text" 
                    value={character.role}
                    onChange={e => setCharacter({...character, role: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-triad-red focus:ring-1 focus:ring-triad-red outline-none transition"
                    placeholder="例如：四九、蓝灯笼、红棍"
                  />
                </div>
              </div>
            </div>

            <div>
               <label className="block text-zinc-400 text-sm mb-1 uppercase tracking-wider">外貌特征</label>
               <input 
                  type="text" 
                  value={character.appearance}
                  onChange={e => setCharacter({...character, appearance: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-triad-red focus:ring-1 focus:ring-triad-red outline-none transition"
                  placeholder="例如：高大威猛，戴金劳，穿人字拖"
                />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-1 uppercase tracking-wider">背景故事</label>
              <textarea 
                value={character.background}
                onChange={e => setCharacter({...character, background: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-triad-red focus:ring-1 focus:ring-triad-red outline-none h-24 transition resize-none"
                placeholder="你的老大是谁？你有什么特长？"
              />
            </div>

            {gameState.error && (
              <div className="text-red-500 text-sm text-center bg-red-900/20 p-2 rounded">
                {gameState.error}
              </div>
            )}

            <button 
              onClick={handleStartGame}
              disabled={gameState.loading}
              className="w-full bg-triad-red hover:bg-red-900 text-white font-bold py-4 rounded transition-all tracking-[0.2em] uppercase shadow-lg flex justify-center items-center gap-2 group"
            >
              {gameState.loading ? (
                <span>正在入会...</span>
              ) : (
                <>
                  <span>入会 (开始游戏)</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Main Game
  return (
    <div className="flex flex-col h-full bg-triad-black font-serif text-gray-300 relative selection:bg-triad-red selection:text-white">
      
      {/* Header */}
      <header className="flex-none p-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-sm z-10 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-triad-red uppercase drop-shadow-md">
            和联胜 <span className="text-zinc-500 text-sm align-middle ml-2 font-sans tracking-normal">话事人 ELECTION</span>
          </h1>
          <div className="text-xs text-zinc-600 font-sans mt-1">
             {character.name} | {character.role}
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setShowTimeline(true)}
            className="p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
            title="查看时间线 (回溯)"
          >
            <ClockIcon />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
            title="设置"
          >
            <SettingsIcon />
          </button>
          <button 
            onClick={handleRestart}
            className="p-2 text-zinc-500 hover:text-red-500 transition-colors rounded-full hover:bg-zinc-800"
            title="重新开始"
          >
            <RestartIcon />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 container mx-auto max-w-4xl scroll-smooth">
        {messages.map((msg, idx) => (
          <div 
            key={msg.timestamp + idx} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group relative`}
          >
            {/* Message Bubble */}
            <div 
              className={`max-w-[90%] md:max-w-[80%] rounded-lg p-4 leading-relaxed tracking-wide shadow-xl border ${
                msg.role === 'user' 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200' 
                  : 'bg-black/50 border-zinc-900 text-zinc-300 border-l-4 border-l-triad-red'
              }`}
            >
              {msg.role === 'model' && idx === messages.length - 1 && gameState.loading === false ? (
                 <Typewriter text={msg.content} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>

            {/* Regenerate Button (Only for last model message) */}
            {msg.role === 'model' && idx === messages.length - 1 && canRegenerate && (
                <button 
                    onClick={handleRegenerate}
                    className="mt-2 text-xs flex items-center gap-1 text-zinc-500 hover:text-triad-red transition-colors opacity-0 group-hover:opacity-100"
                    title="重新生成回答"
                >
                    <RefreshIcon /> 重新生成
                </button>
            )}
          </div>
        ))}
        
        {/* Loading Indicator */}
        {gameState.loading && (
          <div className="flex justify-start animate-pulse">
             <div className="bg-black/50 border-zinc-900 border-l-4 border-l-zinc-600 rounded-lg p-4 text-zinc-500 text-sm italic">
                正在权衡利弊
             </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="flex-none p-4 md:p-6 bg-zinc-900 border-t border-zinc-800">
        <div className="container mx-auto max-w-4xl flex flex-col gap-4">
          
          {/* Options Chips */}
          {showOptions && (
            <div className="flex flex-wrap gap-2 justify-start animate-fade-in-up">
              {lastMessage.options!.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(option)}
                  className="bg-zinc-800/80 hover:bg-triad-red/90 text-zinc-300 hover:text-white px-4 py-2 rounded-full border border-zinc-700 hover:border-triad-red transition-all text-sm shadow-sm active:scale-95 text-left"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={gameState.loading}
              placeholder={gameState.loading ? "等待回应..." : "输入你的行动..."}
              className="flex-1 bg-zinc-950 text-white placeholder-zinc-600 border border-zinc-700 rounded-md px-4 py-3 focus:outline-none focus:border-triad-red focus:ring-1 focus:ring-triad-red transition-all font-sans"
              autoFocus
            />
            <button
              onClick={() => handleSend()}
              disabled={gameState.loading || !input.trim()}
              className="bg-triad-red hover:bg-red-900 text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              <span className="hidden md:inline">行动</span>
              <SendIcon />
            </button>
          </div>
        </div>
      </footer>
      
      {/* Timeline Drawer (Right Side) */}
      {showTimeline && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                onClick={() => setShowTimeline(false)}
              ></div>
              <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-700 h-full shadow-2xl overflow-y-auto flex flex-col">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80 backdrop-blur sticky top-0">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <ClockIcon /> 往日风云
                      </h2>
                      <button onClick={() => setShowTimeline(false)} className="text-zinc-500 hover:text-white">✕</button>
                  </div>
                  <div className="p-4 space-y-4">
                      {messages.map((msg, idx) => {
                          if (msg.role !== 'model') return null;
                          // Find previous user message
                          const prevUserMsg = messages[idx - 1];
                          const summary = msg.content.substring(0, 60).replace(/\n/g, ' ') + '...';
                          
                          return (
                              <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded p-3 hover:border-triad-red transition group">
                                  {prevUserMsg && (
                                    <div className="text-xs text-zinc-500 mb-1 border-b border-zinc-900 pb-1">
                                        抉择: {prevUserMsg.content}
                                    </div>
                                  )}
                                  <div className="text-sm text-zinc-300 mb-2">
                                      {summary}
                                  </div>
                                  <button 
                                    onClick={() => handleJumpToEvent(idx)}
                                    className="w-full py-1 bg-zinc-800 hover:bg-triad-red text-xs text-white rounded transition"
                                  >
                                      回到这一刻
                                  </button>
                              </div>
                          )
                      })}
                      {messages.length === 0 && <div className="text-zinc-500 text-center py-10">暂无经历</div>}
                  </div>
              </div>
          </div>
      )}

      {/* Settings Modal (Also available in game) */}
       {showSettings && gameState.started && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">API 设置</h2>
                
                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Base URL (Optional)</label>
                  <input 
                    type="text" 
                    value={apiConfig.baseUrl || ''}
                    onChange={(e) => setApiConfig({...apiConfig, baseUrl: e.target.value})}
                    placeholder="https://generativelanguage.googleapis.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-triad-red outline-none"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">留空则使用默认 Google Gemini 地址。</p>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">API Key</label>
                  <input 
                    type="password" 
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({...apiConfig, apiKey: e.target.value})}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-triad-red outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Model Name</label>
                   <input 
                    type="text" 
                    value={apiConfig.model}
                    onChange={(e) => setApiConfig({...apiConfig, model: e.target.value})}
                    placeholder="gemini-3-pro-preview"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-triad-red outline-none"
                  />
                   <div className="flex flex-wrap gap-2 mt-2">
                     {['gemini-3-pro-preview', 'gemini-2.5-flash', 'gpt-4o', 'deepseek-chat'].map(m => (
                       <button 
                         key={m}
                         onClick={() => setApiConfig({...apiConfig, model: m})}
                         className="text-[10px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
                       >
                         {m}
                       </button>
                     ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => saveConfig(apiConfig)}
                    className="px-4 py-2 text-sm bg-triad-red hover:bg-red-900 text-white rounded"
                  >
                    保存设置
                  </button>
                </div>
             </div>
          </div>
        )}
    </div>
  );
}

export default App;
