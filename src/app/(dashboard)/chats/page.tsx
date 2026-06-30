'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';

// --- Type Definitions ---
interface Visitor {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  device_os: string | null;
  device_browser: string | null;
}

interface Message {
  id?: string;
  sender_type: 'visitor' | 'bot' | 'agent';
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  visitor_id: string;
  status: string;
  bot_status: string; // "ACTIVE" or "MUTED"
  created_at: string;
  visitor?: Visitor | null;
  messages?: Message[];
}

interface Business {
  id: string;
  name: string;
}

const getCountryFlag = (country: string | null) => {
  if (!country) return '📍';
  const lower = country.toLowerCase();
  if (lower.includes('pakistan')) return '🇵🇰';
  if (lower.includes('united states')) return '🇺🇸';
  if (lower.includes('united kingdom')) return '🇬🇧';
  if (lower.includes('canada')) return '🇨🇦';
  if (lower.includes('india')) return '🇮🇳';
  if (lower.includes('germany')) return '🇩🇪';
  if (lower.includes('france')) return '🇫🇷';
  if (lower.includes('australia')) return '🇦🇺';
  return '📍';
};

export default function ChatsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Canned Responses / Quick Replies states
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<any[]>([]);
  const [selectedSuggestIdx, setSelectedSuggestIdx] = useState(0);
  const [showSuggestPopup, setShowSuggestPopup] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Notification Tracking Refs
  const seenMessageIds = useRef<Set<string>>(new Set());
  const activeConvRef = useRef<Conversation | null>(null);

  // Sync activeConv state to a ref for background callbacks
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Request browser Notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Fetch quick replies once on mount
  useEffect(() => {
    apiFetch<any[]>('/quick-replies')
      .then(data => setQuickReplies(data))
      .catch(err => console.error("Failed to load quick replies", err));
  }, []);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    
    // Check if the cursor or typing is in slash mode
    const slashIdx = val.lastIndexOf('/');
    if (slashIdx !== -1) {
      const searchWord = val.substring(slashIdx + 1).toLowerCase();
      // If there are spaces after the slash, close it
      if (searchWord.includes(' ')) {
        setShowSuggestPopup(false);
        return;
      }
      
      const filtered = quickReplies.filter(r => r.shortcut.toLowerCase().startsWith(searchWord));
      setSuggestedReplies(filtered);
      setSelectedSuggestIdx(0);
      setShowSuggestPopup(filtered.length > 0);
    } else {
      setShowSuggestPopup(false);
    }
  };

  const insertQuickReply = (reply: any) => {
    const val = inputValue;
    const slashIdx = val.lastIndexOf('/');
    if (slashIdx !== -1) {
      const prefix = val.substring(0, slashIdx);
      setInputValue(prefix + reply.text);
    } else {
      setInputValue(reply.text);
    }
    setShowSuggestPopup(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestPopup && suggestedReplies.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestIdx(prev => (prev + 1) % suggestedReplies.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestIdx(prev => (prev - 1 + suggestedReplies.length) % suggestedReplies.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertQuickReply(suggestedReplies[selectedSuggestIdx]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestPopup(false);
      }
    }
  };

  // 1. Fetch Initial Data & Polling Logic
  const fetchData = async (isPoll = false) => {
    try {
      const [bizData, convsData] = await Promise.all([
        apiFetch<Business>('/businesses/me'),
        apiFetch<Conversation[]>('/chat/conversations')
      ]);
      setBusiness(bizData);
      setConversations(convsData);
      
      // Notification Scanner
      let shouldAlert = false;
      let targetAlertMsg: Message | null = null;
      let targetAlertConv: Conversation | null = null;

      for (const conv of convsData) {
        if (conv.messages && conv.messages.length > 0) {
          const lastMsg = conv.messages[conv.messages.length - 1];
          if (lastMsg.sender_type === 'visitor' && lastMsg.id) {
            if (!seenMessageIds.current.has(lastMsg.id)) {
              seenMessageIds.current.add(lastMsg.id);
              
              // Only alert if message is recent (within 40 seconds)
              const msgTime = lastMsg.created_at ? new Date(lastMsg.created_at).getTime() : Date.now();
              const diffSec = (Date.now() - msgTime) / 1000;
              
              if (diffSec < 40 && isPoll) {
                shouldAlert = true;
                targetAlertMsg = lastMsg;
                targetAlertConv = conv;
              }
            }
          }
        }
      }

      if (shouldAlert && targetAlertMsg && targetAlertConv) {
        // If it is NOT the currently focused conversation OR the browser tab is hidden
        const isNotActiveChat = !activeConvRef.current || activeConvRef.current.id !== targetAlertConv.id;
        const isHidden = document.hidden;

        if (isNotActiveChat || isHidden) {
          if (Notification.permission === 'granted') {
            const visitorName = targetAlertConv.visitor?.name || `Visitor ${targetAlertConv.visitor_id.substring(0, 4)}`;
            const notification = new Notification(`New message from ${visitorName}`, {
              body: targetAlertMsg.content,
            });
            
            notification.onclick = () => {
              window.focus();
              if (targetAlertConv) {
                setActiveConv(targetAlertConv);
              }
            };
          }
        }
      }

      // Update selected conversation in-place to get fresh metadata
      if (activeConvRef.current) {
        const fresh = convsData.find(c => c.id === activeConvRef.current?.id);
        if (fresh) {
          setActiveConv(fresh);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };

  useEffect(() => {
    // Initial fetch (not considered a poll alert trigger to prevent history backlogs)
    fetchData(false);
    
    // Auto-refresh the conversations list every 4 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  // 2. Load Messages & Connect WebSocket when a conversation is selected
  useEffect(() => {
    if (!activeConv || !business) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const loadChatHistory = async () => {
      try {
        const history = await apiFetch<Message[]>(`/chat/conversations/${activeConv.id}/messages`);
        setMessages(history);
        
        // Add existing messages to seen set to avoid duplicate alerts
        history.forEach(m => {
          if (m.id) seenMessageIds.current.add(m.id);
        });
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    loadChatHistory();

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/api/v1/websockets/ws/agent/${business.id}/${activeConv.id}`);
    
    ws.onopen = () => console.log('Agent connected to WS:', activeConv.id);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
        
        // Eager register to prevent duplicate polling alerts
        if (data.id) {
          seenMessageIds.current.add(data.id);
        }

        // Trigger real-time sound for active chats
        if (data.sender_type === 'visitor') {
          // Browser alert if tab is hidden
          if (document.hidden && Notification.permission === 'granted') {
            const visitorName = activeConvRef.current?.visitor?.name || `Visitor ${activeConvRef.current?.visitor_id.substring(0, 4)}`;
            const notification = new Notification(`New message from ${visitorName}`, {
              body: data.content,
            });
            notification.onclick = () => {
              window.focus();
            };
          }
        }
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };
    
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [activeConv?.id, business]);

  // 3. Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 4. Send Message Handler
  const handleSend = () => {
    if (!inputValue.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const text = inputValue.trim();
    
    // Optimistic UI Update
    setMessages(prev => [...prev, { sender_type: 'agent', content: text }]);
    
    // Send over WS
    wsRef.current.send(text);
    setInputValue('');
  };

  const getVisitorInitials = (conv: Conversation) => {
    if (conv.visitor?.name) {
      return conv.visitor.name.substring(0, 2).toUpperCase();
    }
    return conv.visitor_id.substring(0, 2).toUpperCase();
  };

  const getVisitorDisplayName = (conv: Conversation) => {
    if (conv.visitor?.name) {
      return conv.visitor.name;
    }
    return `Visitor ${conv.visitor_id.substring(0, 4)}`;
  };

  return (
    <div className="flex h-full p-6 gap-6 animate-fade-in bg-slate-50/50">
      
      {/* Left Pane: Conversations List */}
      <div className="w-80 flex flex-col bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden shrink-0 relative z-10">
        <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-20">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Active Chats</h2>
          <p className="text-sm text-slate-500 mt-1">Manage ongoing conversations</p>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
          {conversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 p-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-2xl">📭</span>
              </div>
              <p className="text-center font-medium">No active chats right now</p>
            </div>
          ) : (
            <ul className="p-3 space-y-2">
              {conversations.map((conv) => (
                <li 
                   key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`group p-4 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    activeConv?.id === conv.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 translate-x-1' 
                      : 'bg-white hover:bg-indigo-50 border border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${
                        activeConv?.id === conv.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'
                      }`}>
                        {getVisitorInitials(conv)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className={`font-semibold text-sm truncate max-w-[150px] ${activeConv?.id === conv.id ? 'text-white' : 'text-slate-800'}`}>
                          {getVisitorDisplayName(conv)}
                        </h4>
                        <span className={`text-[10px] block truncate max-w-[150px] ${activeConv?.id === conv.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {conv.visitor?.email || 'No email registered'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-colors ${
                      conv.bot_status === 'MUTED'
                        ? (activeConv?.id === conv.id ? 'bg-amber-500/20 text-amber-100' : 'bg-amber-100 text-amber-700')
                        : (activeConv?.id === conv.id ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700')
                    }`}>
                      {conv.bot_status === 'MUTED' ? '● Manual' : '● AI Active'}
                    </span>
                    <span className={`text-[10px] font-medium ${activeConv?.id === conv.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Center Pane: Chat Window */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative z-10">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center z-20 sticky top-0 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner border border-indigo-50">
                  <span className="text-indigo-700 font-bold text-lg">
                    {getVisitorInitials(activeConv)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                    {getVisitorDisplayName(activeConv)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-xs font-medium text-slate-500">
                      {activeConv.visitor?.email ? `${activeConv.visitor.email} • Active now` : 'Active now'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* AI Toggle Button */}
                <button
                  onClick={async () => {
                    try {
                      const updated = await apiFetch<Conversation>(`/chat/conversations/${activeConv.id}/toggle-bot`, {
                        method: 'POST'
                      });
                      setActiveConv(updated);
                      setConversations(prev => prev.map(c => c.id === updated.id ? { ...c, bot_status: updated.bot_status } : c));
                    } catch (err) {
                      console.error("Failed to toggle bot", err);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                    activeConv.bot_status === 'MUTED'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
                  </svg>
                  {activeConv.bot_status === 'MUTED' ? 'AI: Muted (Click to Activate)' : 'AI: Active (Click to Mute)'}
                </button>

                <button 
                  className="px-5 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all hover:border-indigo-200 outline-none"
                  onClick={() => alert('Resolve feature coming soon!')}
                >
                  Resolve Chat
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <span className="text-4xl">👋</span>
                  <p className="font-medium text-sm">Say hello to the visitor!</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isAgent = msg.sender_type === 'agent';
                const isBot = msg.sender_type === 'bot';
                
                return (
                  <div key={idx} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className="flex flex-col max-w-[75%]">
                      {/* Name Label */}
                      <span className={`text-[11px] font-semibold mb-1 px-1 ${isAgent ? 'text-right text-indigo-500' : 'text-left text-slate-500'}`}>
                        {isAgent ? 'You' : isBot ? 'AI Assistant' : getVisitorDisplayName(activeConv)}
                      </span>
                      
                      {/* Bubble */}
                      <div className={`px-5 py-3.5 shadow-sm text-[15px] leading-relaxed relative ${
                        isAgent 
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm shadow-indigo-600/20' 
                          : isBot 
                            ? 'bg-slate-800 text-white rounded-2xl rounded-tl-sm shadow-slate-900/10' 
                            : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm shadow-slate-200/50'
                      }`}>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Floating Style */}
            <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-20 relative">
              
              {/* Canned Responses Floating Suggest Popup */}
              {showSuggestPopup && suggestedReplies.length > 0 && (
                <div className="absolute bottom-full left-6 right-6 mb-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-30 max-h-[180px] overflow-y-auto custom-scrollbar">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canned Reply Suggestions</span>
                    <span className="text-[9px] text-slate-400 font-medium font-mono">Use ↑↓ keys + Enter</span>
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {suggestedReplies.map((reply, idx) => {
                      const isSelected = idx === selectedSuggestIdx;
                      return (
                        <li 
                          key={reply.id}
                          onClick={() => insertQuickReply(reply)}
                          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="overflow-hidden pr-2">
                            <span className="font-bold text-xs">/{reply.shortcut}</span>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{reply.text}</p>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-md">
                              Enter to apply
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-full shadow-inner focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                <input
                  type="text"
                  placeholder="Type a message to reply (type / for shortcuts)..."
                  className="flex-1 bg-transparent border-none px-4 py-2 text-slate-700 focus:outline-none placeholder-slate-400"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onKeyPress={(e) => e.key === 'Enter' && !showSuggestPopup && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="flex items-center justify-center w-10 h-10 rounded-full shadow-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </div>
              {activeConv.bot_status !== 'MUTED' && (
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                    </svg>
                    Sending a message will mute AI replies
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 p-8 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2 tracking-tight">Your Workspace</h2>
            <p className="text-slate-500 max-w-sm">Select a conversation from the left panel to start assisting your visitors.</p>
          </div>
        )}
      </div>

      {/* Right Pane: Visitor Profile Drawer */}
      {activeConv && (
        <div className="w-72 flex flex-col bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden shrink-0 relative z-10 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Visitor Insights</h3>
            <p className="text-xs text-slate-400 mt-0.5">Session specs and metadata.</p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            {/* Contact Card */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Info</span>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block font-medium">Name</label>
                  <span className="text-xs font-semibold text-slate-800">{activeConv.visitor?.name || 'Anonymous Guest'}</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-medium">Email Address</label>
                  <span className="text-xs font-semibold text-slate-800 truncate block">{activeConv.visitor?.email || 'Not registered'}</span>
                </div>
              </div>
            </div>

            {/* Session Metadata Card */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Device & Location</span>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shadow-sm">
                    {getCountryFlag(activeConv.visitor?.country || null)}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block font-medium">Location</label>
                    <span className="text-xs font-semibold text-slate-800">
                      {activeConv.visitor?.city && activeConv.visitor?.country 
                        ? `${activeConv.visitor.city}, ${activeConv.visitor.country}` 
                        : 'Resolving Location...'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm">
                    💻
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block font-medium">Operating System</label>
                    <span className="text-xs font-semibold text-slate-800">{activeConv.visitor?.device_os || 'Unknown OS'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm">
                    🌐
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block font-medium">Web Browser</label>
                    <span className="text-xs font-semibold text-slate-800">{activeConv.visitor?.device_browser || 'Unknown Browser'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
