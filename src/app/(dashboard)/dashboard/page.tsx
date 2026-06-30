'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface DailyStat {
  date: string;
  chats: number;
}

interface AnalyticsStats {
  total_chats: number;
  open_chats: number;
  ai_chats: number;
  agent_chats: number;
  containment_rate: number;
  daily_stats: DailyStat[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await apiFetch<AnalyticsStats>('/analytics/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load analytics stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh stats every 10 seconds to keep analytics live
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = stats || {
    total_chats: 0,
    open_chats: 0,
    ai_chats: 0,
    agent_chats: 0,
    containment_rate: 100,
    daily_stats: []
  };

  // Find max chat volume to scale custom SVG bar chart
  const maxChats = Math.max(...s.daily_stats.map(d => d.chats), 1);
  const chartHeight = 160;
  const chartWidth = 500;
  const barWidth = 40;
  const gap = 30;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 custom-scrollbar animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time engagement, AI containment, and chat logs.</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Analytics Connected
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6">
        {/* Metric 1: Total Conversations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Chats</span>
          <h3 className="text-3xl font-extrabold text-slate-950 mt-2">{s.total_chats}</h3>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-indigo-500">
              <path d="M3.505 2.365A1.2 1.2 0 0 1 4.72 1.35h10.56a1.2 1.2 0 0 1 1.215 1.015l1.013 6.078a3.11 3.11 0 0 1-.77 2.45c-.482.545-1.18.857-1.928.857-.75 0-1.446-.312-1.928-.857-.367-.415-.597-.954-.658-1.524a.6.6 0 0 0-.594-.536h-.726a.6.6 0 0 0-.594.536c-.06.57-.29 1.11-.658 1.524-.482.545-1.18.857-1.928.857-.75 0-1.446-.312-1.928-.857-.367-.415-.597-.954-.658-1.524A.6.6 0 0 0 6.643 8.35h-.726a.6.6 0 0 0-.594.536c-.06.57-.29 1.11-.658 1.524-.482.545-1.18.857-1.928.857-.75 0-1.446-.312-1.928-.857a3.11 3.11 0 0 1-.77-2.45l1.013-6.078ZM2.894 12.89a4.314 4.314 0 0 0 3.036-.534c.325.267.72.43 1.155.485a4.321 4.321 0 0 0 5.83 0c.435-.055.83-.218 1.155-.485a4.322 4.322 0 0 0 3.036.534.6.6 0 0 0 .594-.593v-.063a5.952 5.952 0 0 1-1.3-.923 2.115 2.115 0 0 1-.502-.693H13.6a2.118 2.118 0 0 1-.502.693 4.322 4.322 0 0 1-6.196 0 2.122 2.122 0 0 1-.502-.693H4.102c-.1.272-.27.514-.502.693a5.97 5.97 0 0 1-1.3.923v.063a.6.6 0 0 0 .594.593Z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
            </svg>
            All-time volume count
          </p>
        </div>

        {/* Metric 2: Open Chats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Open Chats</span>
          <h3 className="text-3xl font-extrabold text-slate-950 mt-2">{s.open_chats}</h3>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Awaiting agent response
          </p>
        </div>

        {/* Metric 3: AI Handled */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/40 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI Solved</span>
          <h3 className="text-3xl font-extrabold text-slate-950 mt-2">{s.ai_chats}</h3>
          <p className="text-xs text-purple-600 mt-2 flex items-center gap-1 font-medium">
            🤖 Fully closed by automated bot
          </p>
        </div>

        {/* Metric 4: AI Containment Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/40 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI Containment Rate</span>
          <h3 className="text-3xl font-extrabold text-slate-950 mt-2">{s.containment_rate}%</h3>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              style={{ width: `${s.containment_rate}%` }} 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
            />
          </div>
        </div>
      </div>

      {/* Visual Charts Layout */}
      <div className="grid grid-cols-5 gap-6">
        
        {/* Left Card: Chat Volume (3 Cols) */}
        <div className="col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Weekly Chat Volume</h3>
            <p className="text-xs text-slate-400 mt-0.5">Conversations initiated per day (Last 7 Days)</p>
          </div>

          {/* Pure SVG Custom Bar Chart */}
          <div className="flex justify-center items-center py-6">
            {s.daily_stats.length === 0 ? (
              <p className="text-slate-400 text-xs py-10">No data available for last 7 days</p>
            ) : (
              <svg width="100%" height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 45}`} className="overflow-visible">
                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = chartHeight * (1 - ratio) + 15;
                  const labelVal = Math.round(maxChats * ratio);
                  return (
                    <g key={index} className="opacity-30">
                      <line x1="40" y1={y} x2={chartWidth} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                      <text x="5" y={y + 4} fill="#64748b" className="text-[10px] font-bold">{labelVal}</text>
                    </g>
                  );
                })}

                {/* Bars & Labels */}
                {s.daily_stats.map((d, i) => {
                  const x = 50 + i * (barWidth + gap);
                  const barHeight = (d.chats / maxChats) * chartHeight;
                  const y = chartHeight - barHeight + 15;
                  
                  return (
                    <g key={i} className="group cursor-pointer">
                      {/* Interactive hover tooltip value */}
                      <rect 
                        x={x + barWidth / 2 - 16} 
                        y={y - 25} 
                        width="32" 
                        height="18" 
                        rx="4" 
                        fill="#0f172a" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      />
                      <text 
                        x={x + barWidth / 2} 
                        y={y - 13} 
                        fill="white" 
                        textAnchor="middle" 
                        className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        {d.chats}
                      </text>

                      {/* The Animated SVG Gradient Bar */}
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" />
                          <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                      </defs>
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        rx="6" 
                        fill="url(#barGrad)" 
                        className="transition-all duration-300 group-hover:fill-indigo-700" 
                      />

                      {/* X Axis Labels */}
                      <text 
                        x={x + barWidth / 2} 
                        y={chartHeight + 35} 
                        textAnchor="middle" 
                        fill="#64748b" 
                        className="text-[11px] font-semibold"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Right Card: Handoff Share (2 Cols) */}
        <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <h3 className="text-base font-bold text-slate-800">Support Allocation</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of chat resolutions.</p>
          </div>

          {/* Custom SVG Donut progress ring */}
          <div className="relative flex items-center justify-center py-4">
            <svg width="150" height="150" className="transform -rotate-90">
              {/* Outer Ring */}
              <circle 
                cx="75" 
                cy="75" 
                r="55" 
                stroke="#e2e8f0" 
                strokeWidth="14" 
                fill="transparent" 
              />
              {/* Inner Donut Value Fill */}
              <circle 
                cx="75" 
                cy="75" 
                r="55" 
                stroke="#6366f1" 
                strokeWidth="14" 
                fill="transparent" 
                strokeDasharray={2 * Math.PI * 55}
                strokeDashoffset={2 * Math.PI * 55 * (1 - s.containment_rate / 100)}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900">{s.containment_rate}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Solved</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="w-full space-y-2 mt-2">
            <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                <span className="text-slate-600 font-medium">AI Contained</span>
              </div>
              <span className="font-bold text-slate-800">{s.ai_chats} Chats ({s.containment_rate}%)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="text-slate-600 font-medium">Agent Handled</span>
              </div>
              <span className="font-bold text-slate-800">{s.agent_chats} Chats ({100 - s.containment_rate}%)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
