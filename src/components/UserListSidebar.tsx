/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MapUser, ActivityFeedItem, UserCategory } from '../types';
import { CATEGORY_DETAILS } from '../mockData';
import { Search, Heart, UserPlus, Star, Activity, Sparkles, MessageCircle, Waves, Globe } from 'lucide-react';

interface UserListSidebarProps {
  users: MapUser[];
  selectedUser: MapUser | null;
  onSelectUser: (user: MapUser | null) => void;
  activities: ActivityFeedItem[];
  onWaveAtUser: (userId: string) => void;
  onLikeUser: (userId: string) => void;
}

export default function UserListSidebar({
  users,
  selectedUser,
  onSelectUser,
  activities,
  onWaveAtUser,
  onLikeUser,
}: UserListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<UserCategory | 'all'>('all');

  // Filtered users matching search string & active filter tab
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedTab === 'all' || user.role === selectedTab;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 1. focused Selected User Detail Panel */}
      {selectedUser ? (
        <div className="relative overflow-hidden frosted-glass-card p-5 rounded-2xl animate-fade-in duration-300">
          {/* Highlight top banner color relative to role */}
          <div 
            className="absolute top-0 inset-x-0 h-1.5 opacity-80" 
            style={{ backgroundColor: CATEGORY_DETAILS[selectedUser.role].color.includes('emerald') ? '#10b981' : CATEGORY_DETAILS[selectedUser.role].color.includes('pink') ? '#f43f5e' : CATEGORY_DETAILS[selectedUser.role].color.includes('amber') ? '#f59e0b' : CATEGORY_DETAILS[selectedUser.role].color.includes('cyan') ? '#06b6d4' : CATEGORY_DETAILS[selectedUser.role].color.includes('purple') ? '#a855f7' : '#3b82f6' }}
          />

          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-3 items-center">
              {selectedUser.avatarUrl ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200/60 flex-shrink-0 mt-1 shadow-sm">
                  <img src={selectedUser.avatarUrl} alt={selectedUser.username} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm mt-1">
                  <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight flex items-center gap-1.5 flex-wrap">
                  @{selectedUser.username}
                  {selectedUser.isSelf && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-600 dark:bg-amber-400 text-white dark:text-slate-950 font-black tracking-wide leading-none select-none">
                      YOU
                    </span>
                  )}
                  {selectedUser.isOnline ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  ) : null}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">
                  📍 Lat: {selectedUser.lat.toFixed(4)}, Lng: {selectedUser.lng.toFixed(4)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onSelectUser(null)}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-slate-200 transition-colors bg-white/80 dark:bg-slate-950 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-250/80 dark:border-slate-800 shadow-sm font-bold"
            >
              Clear view
            </button>
          </div>

          <div className="p-3 bg-slate-50/70 dark:bg-zinc-950/80 rounded-xl border border-slate-200/60 dark:border-slate-850/55 mb-4">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 block mb-0.5 font-mono">ABOUT THE PINNER</span>
            <p className="text-xs text-slate-755 dark:text-slate-200 italic leading-relaxed font-semibold">
              "{selectedUser.bio}"
            </p>
            <div className="flex gap-2 items-center mt-2.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${CATEGORY_DETAILS[selectedUser.role].bg} ${CATEGORY_DETAILS[selectedUser.role].color}`}>
                {CATEGORY_DETAILS[selectedUser.role].label}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">⏱️ {new Date(selectedUser.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>

          {/* User Interaction Hub */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={selectedUser.isSelf}
              onClick={() => onWaveAtUser(selectedUser.id)}
              className="py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-550/10 border border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-400/50 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-350 hover:text-indigo-900 dark:hover:text-indigo-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-sm"
            >
              <Waves className="w-4 h-4 animate-wave text-indigo-650 dark:text-indigo-400" />
              Wave Hello
            </button>
            <button
              disabled={selectedUser.isSelf}
              onClick={() => onLikeUser(selectedUser.id)}
              className="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-550/10 border border-rose-200 dark:border-rose-500/20 hover:border-rose-450 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-355 hover:text-rose-900 dark:hover:text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none group shadow-sm"
            >
              <Heart className="w-4 h-4 text-rose-600 dark:text-rose-500 transition-transform group-hover:scale-125" />
              <span>{selectedUser.likes}</span> Likes
            </button>
          </div>
        </div>
      ) : (
        /* Empty layout display guidelines */
        <div className="frosted-glass-card p-4 rounded-xl text-center text-slate-500 dark:text-slate-400 flex flex-col justify-center items-center py-6">
          <Globe className="w-8 h-8 text-indigo-605 dark:text-slate-500 animate-spin-slow mb-2.5 opacity-75" />
          <h4 className="text-xs font-bold text-slate-805 dark:text-slate-300">No pin selected</h4>
          <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto mt-1 leading-relaxed font-semibold">
            Click on any user bubble on the map or explore the search index below to connect.
          </p>
        </div>
      )}

      {/* 2. Search Index & Directory */}
      <div className="frosted-glass-card p-4 rounded-2xl flex flex-col gap-4 flex-grow min-h-[280px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-emerald-400" /> Board Directory
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-305 font-bold font-mono border border-slate-205 dark:border-slate-700">
            {users.length} Pin{users.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Custom Input Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-550 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users or statuses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
          />
        </div>

        {/* Tab filters horizontal bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] -mt-1 font-bold">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
              selectedTab === 'all'
                ? 'bg-indigo-600 dark:bg-white text-white dark:text-slate-950 border-indigo-600 dark:border-white font-extrabold shadow-sm'
                : 'bg-white/55 dark:bg-slate-950/45 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_DETAILS).map(([catKey, val]) => (
            <button
              key={catKey}
              onClick={() => setSelectedTab(catKey as UserCategory)}
              className={`px-2.5 py-1.5 rounded-lg border capitalize cursor-pointer select-none transition-all ${
                selectedTab === catKey
                  ? `${val.bg} ${val.color} ${val.border} font-extrabold shadow-sm`
                  : 'bg-white/55 dark:bg-slate-950/45 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>

        {/* User Card listing */}
        <div className="flex-grow overflow-y-auto max-h-[220px] md:max-h-[280px] pr-1 flex flex-col gap-2 scrollbar-thin">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const theme = CATEGORY_DETAILS[user.role];
              const isSelected = selectedUser?.id === user.id;
              
              return (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-center group relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-105 dark:bg-slate-950 border-indigo-500/20 dark:border-white/10 ring-1 ring-indigo-500/10 dark:ring-white/5 shadow-sm'
                      : 'bg-white/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-950 hover:border-slate-250 dark:hover:border-slate-800'
                  }`}
                >
                  {user.avatarUrl ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200/60 flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                      <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between font-sans">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[130px] flex items-center gap-1.5">
                        {user.username}
                        {user.isSelf && <span className="text-[8px] px-1 bg-yellow-400 text-slate-950 font-black rounded scale-90">ME</span>}
                      </p>
                      <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono font-bold">⏱️ {new Date(user.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5 font-medium">
                      {user.bio}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${theme.bg} ${theme.color}`}>
                        {theme.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-400 dark:text-zinc-600 text-xs font-semibold">
              No matching board directory records
            </div>
          )}
        </div>
      </div>

      {/* 3. Live real-time activities ticker feed */}
      <div className="frosted-glass-card p-4 rounded-2xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5 mb-2 px-1 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Sparkles className="w-4 h-4 text-indigo-605 dark:text-indigo-400" />
          <span>Real-time Map Activity</span>
        </div>
        <div className="overflow-y-auto max-h-[110px] md:max-h-[140px] flex flex-col gap-2 pr-1 text-[11px] leading-relaxed select-none">
          {activities.length > 0 ? (
            activities.map((item) => (
              <div key={item.id} className="p-2 rounded-lg bg-slate-100/50 dark:bg-slate-950/65 border border-slate-200/50 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-800 flex gap-2 items-start animate-slide-in shadow-sm">
                <span className="text-xs pt-0.5">
                  {item.type === 'signup' && '✨'}
                  {item.type === 'pin' && '📍'}
                  {item.type === 'like' && '💖'}
                  {item.type === 'wave' && '👋'}
                </span>
                <div className="flex-grow text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-slate-900 dark:text-slate-200">@{item.username}</span>{' '}
                  <span className="text-slate-550 dark:text-zinc-400 font-medium">{item.detail}</span>
                  <span className="block text-[8px] text-slate-400 dark:text-zinc-600 font-mono mt-0.5 font-bold">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-slate-400 dark:text-zinc-600 italic font-semibold">No feed updates active</div>
          )}
        </div>
      </div>
    </div>
  );
}
