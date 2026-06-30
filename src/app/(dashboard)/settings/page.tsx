'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface Business {
  id: string;
  name: string;
  widget_domain_whitelist: string;
  ai_context: string | null;
  widget_color: string;
  widget_title: string;
  widget_welcome_message: string;
  widget_avatar_url: string | null;
  widget_require_lead: boolean;
}

const PRESET_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#0f172a', // Slate Dark
];

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  
  // General State
  const [name, setName] = useState('');
  const [whitelist, setWhitelist] = useState('');
  
  // Customizer State
  const [widgetColor, setWidgetColor] = useState('#4f46e5');
  const [widgetTitle, setWidgetTitle] = useState('Live Support');
  const [widgetWelcome, setWidgetWelcome] = useState('Welcome! How can we help you today?');
  const [widgetAvatar, setWidgetAvatar] = useState('');
  const [widgetRequireLead, setWidgetRequireLead] = useState(false);
  const [widgetGreetingEnabled, setWidgetGreetingEnabled] = useState(true);
  const [widgetGreetingMessage, setWidgetGreetingMessage] = useState("Hi there! Have any questions? I'm here to help.");
  const [widgetGreetingDelay, setWidgetGreetingDelay] = useState(5);

  // Live preview interactive states
  const [isMockOpen, setIsMockOpen] = useState(false);
  const [previewBubbleOpen, setPreviewBubbleOpen] = useState(true);

  // Quick Replies states
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [newShortcut, setNewShortcut] = useState('');
  const [newText, setNewText] = useState('');
  const [replyMsg, setReplyMsg] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<Business>('/businesses/me').then(data => {
      setBusiness(data);
      setName(data.name || '');
      setWhitelist(data.widget_domain_whitelist || '');
      setWidgetColor(data.widget_color || '#4f46e5');
      setWidgetTitle(data.widget_title || 'Live Support');
      setWidgetWelcome(data.widget_welcome_message || 'Welcome! How can we help you today?');
      setWidgetAvatar(data.widget_avatar_url || '');
      setWidgetRequireLead(data.widget_require_lead || false);
      // Backend fields
      const d = data as any;
      setWidgetGreetingEnabled(d.widget_greeting_enabled ?? true);
      setWidgetGreetingMessage(d.widget_greeting_message ?? "Hi there! Have any questions? I'm here to help.");
      setWidgetGreetingDelay(d.widget_greeting_delay ?? 5);
    });

    // Load active quick reply shortcuts
    apiFetch<any[]>('/quick-replies').then(data => {
      setQuickReplies(data);
    }).catch(err => console.error("Failed to load quick replies", err));
  }, []);

  const handleAddQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.trim() || !newText.trim()) return;
    setReplyMsg('');
    try {
      const res = await apiFetch<any>('/quick-replies', {
        method: 'POST',
        body: JSON.stringify({ shortcut: newShortcut.trim(), text: newText.trim() })
      });
      setQuickReplies(prev => [...prev, res]);
      setNewShortcut('');
      setNewText('');
      setReplyMsg('Shortcut added!');
      setTimeout(() => setReplyMsg(''), 2500);
    } catch (err: any) {
      setReplyMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    try {
      await apiFetch(`/quick-replies/${id}`, { method: 'DELETE' });
      setQuickReplies(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true); setMsg('');
    try {
      const updated = await apiFetch<Business>('/businesses/me', {
        method: 'PUT',
        body: JSON.stringify({ 
          name, 
          widget_domain_whitelist: whitelist,
          widget_color: widgetColor,
          widget_title: widgetTitle,
          widget_welcome_message: widgetWelcome,
          widget_avatar_url: widgetAvatar || null,
          widget_require_lead: widgetRequireLead,
          widget_greeting_enabled: widgetGreetingEnabled,
          widget_greeting_message: widgetGreetingMessage,
          widget_greeting_delay: widgetGreetingDelay,
        }),
      });
      setBusiness(updated);
      setMsg('Settings saved successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const widgetCode = business
    ? `<script src="http://localhost:8080/widget.js" data-business-id="${business.id}"></script>`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!business) return (
    <div className="flex h-full items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full overflow-hidden bg-slate-50/50 flex">
      {/* ── Left Pane: Configurations Form ── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your workspace configuration and widget branding.</p>
        </div>

        {/* General Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800 text-sm">General Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. LuxeStep Footwear"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Domain Whitelist</label>
              <input
                type="text"
                value={whitelist}
                onChange={e => setWhitelist(e.target.value)}
                placeholder="example.com, mysite.net"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
              <p className="text-xs text-slate-400 mt-1.5">Comma-separated list of allowed domains.</p>
            </div>
          </div>
        </div>

        {/* Widget Branding */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800 text-sm">Widget Customization</h2>
            <p className="text-xs text-slate-400 mt-0.5">Style the chat bubble embedded on your site.</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Color Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Theme Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setWidgetColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full transition-transform active:scale-90 border-2 ${
                      widgetColor.toLowerCase() === color.toLowerCase()
                        ? 'border-slate-800 scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={widgetColor}
                  onChange={e => setWidgetColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={widgetColor}
                  onChange={e => setWidgetColor(e.target.value)}
                  placeholder="#4f46e5"
                  className="w-32 border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Custom Texts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Widget Header Title</label>
                <input
                  type="text"
                  value={widgetTitle}
                  onChange={e => setWidgetTitle(e.target.value)}
                  placeholder="Live Support"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bot Avatar URL</label>
                <input
                  type="text"
                  value={widgetAvatar}
                  onChange={e => setWidgetAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default Welcome Message</label>
              <textarea
                value={widgetWelcome}
                onChange={e => setWidgetWelcome(e.target.value)}
                placeholder="Welcome! How can we help you today?"
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            {/* Lead Capture Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 mt-2">
              <div>
                <label className="block text-sm font-semibold text-slate-800">Require Contact Details (Pre-Chat Form)</label>
                <p className="text-xs text-slate-500 mt-0.5">Force visitors to enter name and email before starting a chat.</p>
              </div>
              <button
                type="button"
                onClick={() => setWidgetRequireLead(!widgetRequireLead)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  widgetRequireLead ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    widgetRequireLead ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Greeting Trigger Settings */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">Auto-Greeting Trigger</label>
                  <p className="text-xs text-slate-500 mt-0.5">Show a friendly floating greeting bubble to visitors automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWidgetGreetingEnabled(!widgetGreetingEnabled);
                    setPreviewBubbleOpen(true);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    widgetGreetingEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      widgetGreetingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {widgetGreetingEnabled && (
                <div className="grid grid-cols-3 gap-4 p-4 border border-slate-100 rounded-xl bg-white shadow-inner animate-fade-in">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Greeting Bubble Message</label>
                    <input
                      type="text"
                      value={widgetGreetingMessage}
                      onChange={e => {
                        setWidgetGreetingMessage(e.target.value);
                        setPreviewBubbleOpen(true);
                      }}
                      placeholder="Hi there! Have any questions?"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Trigger Delay (Sec)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={widgetGreetingDelay}
                      onChange={e => setWidgetGreetingDelay(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Replies Manager */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Quick Replies & Canned Responses</h2>
              <p className="text-xs text-slate-400 mt-0.5">Define shortcut macros to paste long templates instantly in agent chats.</p>
            </div>
            {replyMsg && (
              <span className={`text-xs font-semibold ${replyMsg.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                {replyMsg}
              </span>
            )}
          </div>
          <div className="p-6 space-y-6">
            {/* Create form */}
            <form onSubmit={handleAddQuickReply} className="grid grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Shortcut Key</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">/</span>
                  <input
                    type="text"
                    value={newShortcut}
                    onChange={e => setNewShortcut(e.target.value)}
                    placeholder="welcome"
                    className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Canned Text Response</label>
                <input
                  type="text"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Hello! Welcome to our store. How can I assist you today?"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-xl transition-all shadow-sm active:scale-95 h-[34px]"
              >
                Add Shortcut
              </button>
            </form>

            {/* List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Macros ({quickReplies.length})</span>
              {quickReplies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No canned replies defined yet. Create your first macro shortcut above!</p>
              ) : (
                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="p-3">Trigger Shortcut</th>
                        <th className="p-3">Template Response Text</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {quickReplies.map((reply) => (
                        <tr key={reply.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-semibold text-indigo-600">/{reply.shortcut}</td>
                          <td className="p-3 font-medium truncate max-w-md">{reply.text}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuickReply(reply.id)}
                              className="text-slate-300 hover:text-red-400 font-semibold transition-colors p-1"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path fillRule="evenodd" d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            )}
            Save Configuration
          </button>
          {msg && (
            <span className={`text-sm font-medium ${msg.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
              {msg}
            </span>
          )}
        </div>

        {/* Widget Code */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800 text-sm">Widget Embed Code</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste this before the closing <code className="bg-slate-100 text-slate-700 px-1 rounded text-xs">&lt;/body&gt;</code> tag on your website.
            </p>
          </div>
          <div className="p-6">
            <div className="relative bg-slate-900 rounded-xl p-4 group">
              <pre className="text-xs text-green-400 font-mono overflow-x-auto leading-relaxed">{widgetCode}</pre>
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 transition-all opacity-0 group-hover:opacity-100"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Pane: Live Interactive Mock Widget Preview ── */}
      <div className="w-[380px] shrink-0 border-l border-slate-200 bg-slate-100/50 flex flex-col items-center justify-center p-8 relative overflow-hidden select-none">
        <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Live Widget Preview</div>
        
        {isMockOpen ? (
          /* Mock Chat Window Container */
          <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[420px] transition-all duration-300 animate-slide-up">
            
            {/* Mock Header (uses customized primary color & title) */}
            <div 
              style={{ background: `linear-gradient(135deg, ${widgetColor} 0%, ${darkenColor(widgetColor, 12)} 100%)` }}
              className="px-4 py-3.5 flex justify-between items-center text-white font-semibold transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                {widgetAvatar ? (
                  <img 
                    src={widgetAvatar} 
                    alt="Avatar" 
                    className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-sm" 
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shadow-inner">
                    🤖
                  </div>
                )}
                <span className="text-sm tracking-wide truncate max-w-[180px]">{widgetTitle}</span>
              </div>
              <span className="text-lg opacity-80 cursor-pointer hover:opacity-100 font-bold" onClick={() => setIsMockOpen(false)}>×</span>
            </div>

            {/* Mock Chat Body */}
            {widgetRequireLead ? (
              <div className="flex-1 bg-slate-50 p-5 flex flex-col justify-center gap-3">
                <p className="text-[11px] text-slate-500 text-center leading-relaxed mb-1">
                  Please introduce yourself to start the support session.
                </p>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    disabled 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    disabled 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                  />
                </div>
                <button 
                  style={{ backgroundColor: widgetColor }}
                  className="w-full text-white text-xs font-semibold py-2 rounded-full mt-1 opacity-90"
                  disabled
                >
                  Start Chat
                </button>
              </div>
            ) : (
              <div className="flex-1 bg-slate-50 p-4 space-y-3 overflow-y-auto custom-scrollbar flex flex-col justify-start">
                
                {/* Welcome Bubble */}
                <div className="bg-white border border-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%] self-start leading-relaxed animate-fade-in">
                  {widgetWelcome}
                </div>

                {/* Mock Chat Conversation */}
                <div className="bg-white border border-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%] self-start leading-relaxed">
                  Hello! I'm interested in leather oxford shoes.
                </div>

                <div 
                  style={{ backgroundColor: widgetColor }}
                  className="text-white text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] self-end leading-relaxed transition-colors duration-300"
                >
                  We have the Classic Leather Oxford available for Rs. 8,999. Would you like to order?
                </div>
              </div>
            )}

            {/* Mock Chat Footer */}
            {!widgetRequireLead && (
              <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  disabled
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-full text-xs bg-slate-50 outline-none"
                />
                <button 
                  style={{ backgroundColor: widgetColor }}
                  className="text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors duration-300 opacity-90"
                  disabled
                >
                  Send
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Launcher and Greeting Speech Bubble Preview */
          <div className="w-full max-w-[320px] flex flex-col items-end gap-3 mt-auto mb-4 px-2 relative">
            
            {/* Mock Speech Bubble (Greeting Message) */}
            {widgetGreetingEnabled && previewBubbleOpen && (
              <div 
                onClick={() => setIsMockOpen(true)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-4 py-3 rounded-2xl rounded-br-sm shadow-xl max-w-[260px] cursor-pointer hover:bg-slate-50 transition-all flex items-start gap-2 relative border-l-4 animate-slide-up"
                style={{ borderLeftColor: widgetColor }}
              >
                <div className="flex-1 pr-1 leading-relaxed font-medium">
                  {widgetGreetingMessage}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPreviewBubbleOpen(false); }}
                  className="text-slate-400 hover:text-slate-600 font-bold px-1 text-xs shrink-0 select-none"
                >
                  ×
                </button>
                {/* Visual little caret pointing down */}
                <div className="absolute right-4 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
              </div>
            )}
            
            {/* Circular launcher icon */}
            <div 
              onClick={() => setIsMockOpen(true)}
              style={{ 
                background: `linear-gradient(135deg, ${widgetColor} 0%, ${darkenColor(widgetColor, 12)} 100%)`,
                boxShadow: `0 4px 14px ${hexToRgba(widgetColor, 0.4)}`
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions for mock color variables
function darkenColor(hex: string, percent: number): string {
  try {
    let num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  } catch {
    return hex;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  try {
    let c = hex.substring(1).split('');
    if(c.length === 3){
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    let num = parseInt(c.join(''), 16);
    return `rgba(${(num>>16)&255}, ${(num>>8)&255}, ${num&255}, ${alpha})`;
  } catch {
    return 'rgba(79, 70, 229, 0.4)';
  }
}
