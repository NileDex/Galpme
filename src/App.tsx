/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { MapUser, ActivityFeedItem, UserCategory } from './types';
import { 
  INITIAL_USERS, 
  INITIAL_FEED, 
  BOT_NAMES, 
  BOT_BIOS, 
  PRESET_CITIES, 
  CATEGORY_DETAILS 
} from './mockData';
import MapComponent from './components/MapComponent';
import SignUpPanel from './components/SignUpPanel';
import { Globe, Users, Radio, MessageSquare, Info, Github, UserPlus, Waves, Heart } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  // 1. Initial State Loaders (Supabase backed)
  const [dbUsers, setDbUsers] = useState<MapUser[]>([]);
  const [currentUser, setCurrentUser] = useState<MapUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null);
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState<boolean>(false);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>(['Board synchronized successfully']);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);

  const users = dbUsers;

  // Close the signup modal when coordinate map selection mode goes active
  useEffect(() => {
    if (isSelectMode) {
      setIsSignUpModalOpen(false);
    }
  }, [isSelectMode]);

  // Coordinate selection handler: updates the position, deactivates map selection mode, and re-opens the signup modal
  const handlePinPositionChange = useCallback((pos: [number, number]) => {
    setPinPosition(pos);
    setIsSelectMode(false);
    setIsSignUpModalOpen(true);
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('rt_map_theme');
      return (saved as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('rt_map_theme', next);
      return next;
    });
  }, []);

  // Sync dark class on the HTML document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch a single profile from the database
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      const mappedUser: MapUser = {
        id: data.id,
        username: data.username,
        role: data.role as any,
        bio: data.bio || '',
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date(data.timestamp),
        likes: data.likes,
        avatarSeed: data.avatar_seed,
        avatarUrl: data.avatar_url || undefined,
        isSelf: true,
        isOnline: data.is_online
      };
      setCurrentUser(mappedUser);
    } else {
      setCurrentUser(null);
    }
  }, []);

  // Check initial session & listen to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Load all profiles from Supabase database
  useEffect(() => {
    const fetchAllProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('timestamp', { ascending: false });

      if (data) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          username: d.username,
          role: d.role as any,
          bio: d.bio || '',
          lat: d.lat,
          lng: d.lng,
          timestamp: new Date(d.timestamp),
          likes: d.likes,
          avatarSeed: d.avatar_seed,
          avatarUrl: d.avatar_url || undefined,
          isSelf: currentUser ? d.id === currentUser.id : false,
          isOnline: d.is_online
        }));
        setDbUsers(mapped);
      }
    };

    fetchAllProfiles();
  }, [currentUser]);

  // Load activities from Supabase database
  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (data) {
        const mapped = data.map((act: any) => ({
          id: act.id,
          userId: act.user_id || 'system',
          username: act.username,
          type: act.type as any,
          detail: act.detail,
          timestamp: new Date(act.timestamp)
        }));
        setActivities(mapped);
      }
    };

    fetchActivities();
  }, []);

  // Real-time Postgres Changes Subscription
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT') {
            const mapped: MapUser = {
              id: newRow.id,
              username: newRow.username,
              role: newRow.role as any,
              bio: newRow.bio || '',
              lat: newRow.lat,
              lng: newRow.lng,
              timestamp: new Date(newRow.timestamp),
              likes: newRow.likes,
              avatarSeed: newRow.avatar_seed,
              avatarUrl: newRow.avatar_url || undefined,
              isSelf: currentUser ? newRow.id === currentUser.id : false,
              isOnline: newRow.is_online
            };
            setDbUsers((prev) => {
              if (prev.some((u) => u.id === mapped.id)) return prev;
              return [mapped, ...prev];
            });
          } else if (eventType === 'UPDATE') {
            const mapped: MapUser = {
              id: newRow.id,
              username: newRow.username,
              role: newRow.role as any,
              bio: newRow.bio || '',
              lat: newRow.lat,
              lng: newRow.lng,
              timestamp: new Date(newRow.timestamp),
              likes: newRow.likes,
              avatarSeed: newRow.avatar_seed,
              avatarUrl: newRow.avatar_url || undefined,
              isSelf: currentUser ? newRow.id === currentUser.id : false,
              isOnline: newRow.is_online
            };
            setDbUsers((prev) => prev.map((u) => (u.id === mapped.id ? mapped : u)));

            setSelectedUser((prev) => {
              if (prev && prev.id === mapped.id) return mapped;
              return prev;
            });

            if (currentUser && newRow.id === currentUser.id) {
              setCurrentUser(mapped);
            }
          } else if (eventType === 'DELETE') {
            setDbUsers((prev) => prev.filter((u) => u.id !== oldRow.id));
            setSelectedUser((prev) => {
              if (prev && prev.id === oldRow.id) return null;
              return prev;
            });
            if (currentUser && oldRow.id === currentUser.id) {
              setCurrentUser(null);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          const act = payload.new;
          const newActivity: ActivityFeedItem = {
            id: act.id,
            userId: act.user_id || 'system',
            username: act.username,
            type: act.type as any,
            detail: act.detail,
            timestamp: new Date(act.timestamp)
          };
          setActivities((prev) => {
            if (prev.some((a) => a.id === newActivity.id)) return prev;
            return [newActivity, ...prev.slice(0, 19)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // 2. Interaction Handlers
  const handleSignUp = useCallback(async (profileData: Omit<MapUser, 'id' | 'timestamp' | 'likes' | 'isOnline'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Authentication session not found. Please register or log in first.");
      return;
    }

    const newProfile = {
      id: user.id,
      username: profileData.username,
      role: profileData.role,
      bio: profileData.bio,
      lat: profileData.lat,
      lng: profileData.lng,
      avatar_seed: profileData.avatarSeed,
      avatar_url: profileData.avatarUrl || null,
      likes: 0,
      is_online: true
    };

    const { error } = await supabase
      .from('profiles')
      .insert([newProfile]);

    if (error) {
      console.error(error);
      alert(`Error creating profile: ${error.message}`);
      return;
    }

    // Insert an activity record
    const { error: actError } = await supabase
      .from('activities')
      .insert([{
        user_id: user.id,
        username: profileData.username,
        type: 'signup',
        detail: `joined the map pinboard! 🚀`
      }]);

    if (actError) console.error(actError);

    // Update currentUser state
    const mappedUser: MapUser = {
      id: newProfile.id,
      username: newProfile.username,
      role: newProfile.role as any,
      bio: newProfile.bio,
      lat: newProfile.lat,
      lng: newProfile.lng,
      timestamp: new Date(),
      likes: newProfile.likes,
      avatarSeed: newProfile.avatar_seed,
      avatarUrl: newProfile.avatar_url || undefined,
      isSelf: true,
      isOnline: newProfile.is_online
    };
    setCurrentUser(mappedUser);
    setSelectedUser(mappedUser);
    setSystemLogs(prev => [`New pin planted for @${profileData.username}`, ...prev]);
  }, []);

  const handleDeleteSelf = useCallback(async () => {
    if (!currentUser) return;
    const oldUsername = currentUser.username;

    // Delete profile
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', currentUser.id);

    if (error) {
      alert(`Error deleting profile: ${error.message}`);
      return;
    }

    // Sign out from Supabase Auth
    await supabase.auth.signOut();

    // Log the activity
    await supabase.from('activities').insert([{
      username: oldUsername,
      type: 'wave',
      detail: 'removed their pin from the global grid.'
    }]);

    setCurrentUser(null);
    setSelectedUser(null);
    setPinPosition(null);
    setIsSelectMode(false);
    setSystemLogs(prev => [`Pin removed for @${oldUsername}`, ...prev]);
  }, [currentUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedUser(null);
    setPinPosition(null);
    setIsSelectMode(false);
  };

  const handleWaveAtUser = useCallback(async (targetUserId: string) => {
    const senderName = currentUser ? currentUser.username : 'AnonymousGuest';
    const target = users.find(u => u.id === targetUserId);
    if (!target) return;

    const { error } = await supabase
      .from('activities')
      .insert([{
        user_id: currentUser?.id || null,
        username: senderName,
        type: 'wave',
        detail: `sent a friendly wave hello to @${target.username}! 👋`
      }]);

    if (error) console.error(error);
  }, [currentUser, users]);

  const handleLikeUser = useCallback(async (targetUserId: string) => {
    const senderName = currentUser ? currentUser.username : 'AnonymousGuest';
    const target = users.find(u => u.id === targetUserId);
    if (!target) return;

    // Trigger RPC to securely increment likes on database for real users
    const { error } = await supabase.rpc('increment_likes', { target_id: targetUserId });
    if (error) {
      console.error(error);
      return;
    }

    // Insert an activity record
    const { error: actError } = await supabase
      .from('activities')
      .insert([{
        user_id: currentUser?.id || null,
        username: senderName,
        type: 'like',
        detail: `liked @${target.username}'s pin location! 💖`
      }]);
    if (actError) console.error(actError);
  }, [currentUser, users]);

  // 3. Simulated multiplayer loop disabled - only real users are shown

  return (
    <div className="flex flex-col min-h-screen frosted-glass-bg text-slate-800 dark:text-slate-100 font-sans antialiased overflow-x-hidden relative transition-colors duration-300">
      
      {/* Ambient background glowing elements to capture the Frosted Glass essence */}
      <div className="absolute top-[120px] left-[15%] w-72 h-72 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[80px] right-[10%] w-[450px] h-[350px] bg-indigo-300/15 dark:bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[50%] left-[45%] w-64 h-64 bg-emerald-300/10 dark:bg-emerald-600/5 rounded-full blur-[110px] pointer-events-none" />

      {/* 1. Sticky Glass Header */}
      <header id="app-header" className="sticky top-0 z-[1000] bg-white/45 dark:bg-slate-900/60 border-b border-slate-200/50 dark:border-white/5 backdrop-blur-xl px-4 py-3 md:px-8 flex items-center justify-between shadow-sm transition-all">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-indigo-400 rounded-xl shadow-md flex items-center justify-center">
            <Globe className="w-5 h-5 text-slate-950 animate-spin-slow" />
          </div>
          <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight md:text-lg font-roboto">
            Glapme
          </h1>
        </div>

        {/* Global Tracker HUD Status row & Sign Up Button */}
        <div className="flex items-center gap-3 md:gap-4">


          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
            <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Total: <span className="font-extrabold text-slate-700 dark:text-slate-200">{users.length}</span> pins</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>

          {!currentUser ? (
            <button
              onClick={() => setIsSignUpModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition-all cursor-pointer select-none"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSignUpModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer select-none"
              >
                {currentUser.avatarUrl ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-350 dark:border-slate-650 flex-shrink-0">
                    <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
                <span className="max-w-[70px] sm:max-w-[100px] truncate">@{currentUser.username}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Primary Layout Workspace Container */}
      <main className="flex-grow flex flex-col h-[calc(100vh-56px)] min-h-0 relative z-10">
        
        {/* Large Interactive Leaflet Canvas Mapper (Full Screen) */}
        <section id="map-section" className="map-section z-0">
          <MapComponent
            users={users}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            pinPosition={pinPosition}
            onChangePinPosition={handlePinPositionChange}
            isSelectMode={isSelectMode}
            mapCenter={[22.0, 15.0]} // Gorgeous centered view representation
            onUserWave={handleWaveAtUser}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />

          {/* Selected User Floating Details Card */}
          {selectedUser && (
            <div className="absolute bottom-6 left-6 z-[999] w-[calc(100%-3rem)] sm:w-80 md:w-96 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
              {/* Highlight top banner color relative to role */}
              <div 
                className="absolute top-0 inset-x-0 h-1.5 opacity-80" 
                style={{ backgroundColor: CATEGORY_DETAILS[selectedUser.role].color.includes('emerald') ? '#10b981' : CATEGORY_DETAILS[selectedUser.role].color.includes('pink') ? '#f43f5e' : CATEGORY_DETAILS[selectedUser.role].color.includes('amber') ? '#f59e0b' : CATEGORY_DETAILS[selectedUser.role].color.includes('cyan') ? '#06b6d4' : CATEGORY_DETAILS[selectedUser.role].color.includes('purple') ? '#a855f7' : '#3b82f6' }}
              />

              <div className="flex items-start justify-between mb-3 mt-1">
                <div className="flex gap-3 items-center">
                  {selectedUser.avatarUrl ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200/60 flex-shrink-0 mt-1 shadow-sm">
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
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-650 dark:bg-amber-450 text-white dark:text-slate-950 font-black tracking-wide leading-none select-none">
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
                  onClick={() => setSelectedUser(null)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-zinc-405 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm font-bold"
                >
                  Close
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-150 dark:border-slate-850 mb-4">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 dark:text-slate-500 block mb-0.5 font-mono">ABOUT THE PINNER</span>
                <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed font-semibold">
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
                  onClick={() => handleWaveAtUser(selectedUser.id)}
                  className="py-2.5 px-3 rounded-xl bg-indigo-550/5 dark:bg-indigo-550/10 border border-indigo-200/50 dark:border-indigo-500/20 hover:border-indigo-400/50 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-350 hover:text-indigo-900 dark:hover:text-indigo-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                >
                  <Waves className="w-4 h-4 animate-wave text-indigo-650 dark:text-indigo-400" />
                  Wave Hello
                </button>
                <button
                  disabled={selectedUser.isSelf}
                  onClick={() => handleLikeUser(selectedUser.id)}
                  className="py-2.5 px-3 rounded-xl bg-rose-550/5 dark:bg-rose-550/10 border border-rose-200/50 dark:border-rose-500/20 hover:border-rose-450 hover:bg-rose-100/50 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-355 hover:text-rose-900 dark:hover:text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none group shadow-sm"
                >
                  <Heart className="w-4 h-4 text-rose-600 dark:text-rose-500 transition-transform group-hover:scale-125" />
                  <span>{selectedUser.likes}</span> Likes
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 3. Signup & Location Modal (Shadcn-style) */}
      {isSignUpModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
            onClick={() => setIsSignUpModalOpen(false)}
          />
          
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
            {/* Close Button */}
            <button
              onClick={() => setIsSignUpModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <SignUpPanel
              currentUser={currentUser}
              onSignUp={(profile) => {
                handleSignUp(profile);
                setIsSignUpModalOpen(false);
                setOnboardingStep(1); // reset step state
              }}
              onDeleteSelf={() => {
                handleDeleteSelf();
                setIsSignUpModalOpen(false);
                setOnboardingStep(1);
              }}
              isSelectMode={isSelectMode}
              setIsSelectMode={setIsSelectMode}
              pinPosition={pinPosition}
              onChangePinPosition={setPinPosition}
              onboardingStep={onboardingStep}
              setOnboardingStep={setOnboardingStep}
            />
          </div>
        </div>
      )}
    </div>
  );
}
