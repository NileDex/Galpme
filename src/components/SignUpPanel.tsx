/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { MapUser, UserCategory } from '../types';
import { Sparkles, Check, Trash2, Edit2, LogIn, UserPlus, MapPin, Compass, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CATEGORY_DETAILS } from '../mockData';

interface SignUpPanelProps {
  currentUser: MapUser | null;
  onSignUp: (u: Omit<MapUser, 'id' | 'timestamp' | 'likes' | 'isOnline'>) => void;
  onDeleteSelf: () => void;
  isSelectMode: boolean;
  setIsSelectMode: (b: boolean) => void;
  pinPosition: [number, number] | null;
  onChangePinPosition: (pos: [number, number]) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
}

export default function SignUpPanel({
  currentUser,
  onSignUp,
  onDeleteSelf,
  isSelectMode,
  setIsSelectMode,
  pinPosition,
  onChangePinPosition,
  onboardingStep,
  setOnboardingStep,
}: SignUpPanelProps) {
  // Authentication states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Profile setup states
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserCategory>('explorer');
  const [bio, setBio] = useState('Exploring the global grid directory! 🗺️');

  // File Upload states
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);

  // Monitor Supabase Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user || null);
      if (session?.user) {
        const derived = session.user.email?.split('@')[0] || 'explorer';
        setUsername(derived.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
      if (session?.user) {
        const derived = session.user.email?.split('@')[0] || 'explorer';
        setUsername(derived.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Handle selected image file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be under 5MB.");
        return;
      }
      setPfpFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPfpPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Auth form submissions
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);

    try {
      if (authMode === 'signup') {
        // 1. Sign Up in Supabase Auth (no profile details yet, those are completed in steps!)
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        const user = authData.user;
        if (!user) {
          alert("Registration request completed! If you already have an account, please click 'Sign In' to log in. Otherwise, please check your email inbox to confirm registration and activate your account.");
          setAuthMode('signin');
          return;
        }

        if (!authData.session) {
          alert("Account successfully created! Please check your email inbox to confirm registration and activate your account.");
          return;
        }

        // Advance to step 1 of onboarding wizard
        setOnboardingStep(1);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setOnboardingStep(1);
      }
    } catch (err: any) {
      alert(`Authentication failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      alert(`Google Auth failed: ${err.message}`);
    }
  };

  // Profile creation submission (called at the end of the onboarding wizard)
  const handleProfileSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) return alert('Please specify a username');
    if (!sessionUser) return alert('Session not found.');
    if (!pinPosition) return alert('Please select a workspace location on the map in Step 2.');
    setLoading(true);

    try {
      // 1. Upload Profile Picture to Storage Bucket (if selected)
      let uploadedUrl = '';
      if (pfpFile) {
        const fileExt = pfpFile.name.split('.').pop();
        const filePath = `${sessionUser.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('PFP')
          .upload(filePath, pfpFile);
        
        if (uploadError) {
          console.error("Storage upload failed: ", uploadError);
          alert(`Profile details saved, but profile picture upload failed: ${uploadError.message}`);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('PFP')
            .getPublicUrl(filePath);
          uploadedUrl = publicUrl;
        }
      }

      // 2. Publish Pin Profile Card
      onSignUp({
        username: username.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18),
        role,
        bio,
        lat: pinPosition[0],
        lng: pinPosition[1],
        avatarSeed: '',
        avatarUrl: uploadedUrl || undefined
      });
      
      alert("Welcome to Glapme! Your location pin is published.");
    } catch (err: any) {
      alert(`Error publishing pin: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onChangePinPosition([latitude, longitude]);
      },
      () => {
        alert('Could not determine physical location. Please click on the map manually.');
      }
    );
  };

  const renderOnboardingFields = () => {
    return (
      <div className="flex flex-col gap-4 mt-2">
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Display Username / Name</label>
          <input
            type="text"
            required
            maxLength={18}
            placeholder="e.g. Alex_Dev"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 transition-all font-semibold"
          />
        </div>

        {/* Role Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Primary Category</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserCategory)}
            className="bg-white/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 transition-all font-semibold capitalize"
          >
            {Object.keys(CATEGORY_DETAILS).map((catKey) => (
              <option key={catKey} value={catKey}>
                {CATEGORY_DETAILS[catKey as UserCategory].label}
              </option>
            ))}
          </select>
        </div>


        {/* Profile Picture Upload Box */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Upload Profile Picture (PFP)</label>
          <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
            <div className="relative w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
              {pfpPreview ? (
                <img src={pfpPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-grow">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="pfp-upload-signup-input"
              />
              <label
                htmlFor="pfp-upload-signup-input"
                className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-250 rounded-xl text-center text-xs font-extrabold transition-all cursor-pointer shadow-sm select-none"
              >
                Select Image File
              </label>
              {pfpFile ? (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-mono truncate max-w-[180px] font-bold">
                  📄 {pfpFile.name} ({(pfpFile.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold leading-tight">Max 5MB file upload</span>
              )}
            </div>
          </div>
        </div>

        {/* Short Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Short Bio</label>
          <textarea
            maxLength={120}
            placeholder="Share what you are up to..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 transition-all font-semibold h-16 resize-none"
          />
        </div>

        {/* Geolocation Coordinate Setter HUD */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-2.5">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 block font-mono">WORKSPACE LOCATION</span>
          
          {pinPosition ? (
            <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-semibold font-mono">
              <span className="flex items-center gap-1">📍 Lat: {pinPosition[0].toFixed(5)}, Lng: {pinPosition[1].toFixed(5)}</span>
              <button
                type="button"
                onClick={() => setIsSelectMode(!isSelectMode)}
                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                Adjust Pin
              </button>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
              No custom coordinate pinned. Select a target:
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsSelectMode(!isSelectMode)}
              className={`py-2 px-3 rounded-lg border text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${isSelectMode ? 'bg-amber-500 border-amber-600 text-slate-950 animate-pulse' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {isSelectMode ? 'Click Map Now' : 'Select on Map'}
            </button>
            
            <button
              type="button"
              onClick={handleLocateMe}
              className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              Use My Location
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProgressBar = () => {
    const steps = [
      { num: 1, label: 'Details' },
      { num: 2, label: 'Location' },
      { num: 3, label: 'Photo' }
    ];

    return (
      <div className="flex items-center justify-between w-full mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            {/* Step circle */}
            <div className="flex items-center gap-2">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                  onboardingStep === s.num
                    ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-500/20'
                    : onboardingStep > s.num
                    ? 'bg-emerald-500 text-white font-extrabold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                {onboardingStep > s.num ? '✓' : s.num}
              </div>
              <span 
                className={`text-[10px] font-extrabold transition-colors ${
                  onboardingStep === s.num
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Line connector */}
            {idx < steps.length - 1 && (
              <div className="h-0.5 flex-grow mx-2 rounded bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                  style={{ width: onboardingStep > s.num ? '100%' : onboardingStep === s.num ? '50%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="frosted-glass-card rounded-2xl transition-all duration-300">
      {/* 1. Unauthenticated Mode */}
      {!sessionUser && (
        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-650 dark:text-amber-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {authMode === 'signup' ? 'Create an account' : 'Welcome Back'}
              </h3>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${authMode === 'signup' ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${authMode === 'signin' ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sign In
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {authMode === 'signup' 
              ? 'Register to join the global board directory and pin your workspace location.' 
              : 'Log in to manage your active coordinates, wave hello, and interact.'}
          </p>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 text-xs font-bold shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-grow"></div>
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">or email setup</span>
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-grow"></div>
          </div>

          {/* Email Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. yourname@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 transition-all placeholder:text-zinc-400 font-semibold"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 transition-all placeholder:text-zinc-400 font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-extrabold py-2.5 rounded-xl shadow-lg shadow-emerald-550/10 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : authMode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4 stroke-[2.5px]" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5px]" />
                Sign In
              </>
            )}
          </button>
        </form>
      )}

      {/* 2. Authenticated but No Profile Created Mode (Step-by-step Onboarding Wizard) */}
      {sessionUser && !currentUser && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 mb-2">
            <Compass className="w-5 h-5 text-indigo-650 dark:text-amber-400 animate-spin-slow" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Complete Your Profile</h3>
          </div>

          {renderProgressBar()}

          {onboardingStep === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Step 1: Introduce yourself! Enter your workspace name, role, and a brief description for your profile card.
              </p>
              
              {/* Display Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Display Username / Name</label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  placeholder="e.g. Alex_Dev"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 transition-all font-semibold"
                />
              </div>

              {/* Role Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Primary Category</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserCategory)}
                  className="bg-white/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 transition-all font-semibold capitalize"
                >
                  {Object.keys(CATEGORY_DETAILS).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_DETAILS[catKey as UserCategory].label}
                    </option>
                  ))}
                </select>
              </div>


              {/* Short Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Short Bio</label>
                <textarea
                  maxLength={120}
                  placeholder="Share what you are up to..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 transition-all font-semibold h-16 resize-none"
                />
              </div>

              {/* Nav buttons */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!username.trim()) {
                      alert("Please specify a display name.");
                      return;
                    }
                    setOnboardingStep(2);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Continue to Location →
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Step 2: Workspace Location. Click "Select on Map" to manually point to your spot on the globe, or use your current browser location.
              </p>

              {/* HUD Coordinates */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-3">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 block font-mono">SELECTED POSITION</span>
                
                {pinPosition ? (
                  <div className="flex flex-col gap-1 text-slate-850 dark:text-slate-100 font-mono">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-amber-400">
                      📍 Latitude: {pinPosition[0].toFixed(6)}
                    </span>
                    <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-amber-400">
                      📍 Longitude: {pinPosition[1].toFixed(6)}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-rose-500 dark:text-rose-450 font-bold leading-relaxed flex items-center gap-1">
                    ⚠️ No position pinned yet. Please set your workspace location on the map.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSelectMode(!isSelectMode)}
                    className={`py-3 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${isSelectMode ? 'bg-amber-500 border-amber-600 text-slate-950 animate-pulse' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <MapPin className="w-4 h-4" />
                    {isSelectMode ? 'Click Map Now' : 'Select on Map'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="py-3 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Compass className="w-4 h-4" />
                    Use My Location
                  </button>
                </div>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pinPosition) {
                      alert("Please specify a custom workspace location by clicking the map or clicking 'Use My Location'.");
                      return;
                    }
                    setOnboardingStep(3);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Continue to Photo →
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Step 3: Upload a profile photo. This is optional — you can always skip it.
              </p>

              {/* Profile Photo Uploader Box */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
                  <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-xl flex-shrink-0">
                    {pfpPreview ? (
                      <img src={pfpPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pfp-upload-signup-input"
                    />
                    <label
                      htmlFor="pfp-upload-signup-input"
                      className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-center text-xs font-extrabold transition-all cursor-pointer shadow-sm select-none mx-auto block w-fit"
                    >
                      Choose Image File
                    </label>
                    {pfpFile ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-mono truncate max-w-[280px] mx-auto font-bold">
                        📄 {pfpFile.name} ({(pfpFile.size / 1024).toFixed(1)} KB)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-450 dark:text-slate-505 font-semibold leading-tight">Optional. Max 5MB file upload</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nav / Finish */}
              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setOnboardingStep(2)}
                  className="bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 transition-all cursor-pointer disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleProfileSubmit()}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-550/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5px]" />
                      Finish & Enter App
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Fully Logged In & Active Session Mode */}
      {currentUser && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active Session</h3>
          </div>

          {/* Current user details card */}
          <div className="p-4 bg-white/70 dark:bg-slate-950 border border-slate-200 dark:border-emerald-500/20 rounded-xl relative overflow-hidden flex flex-col gap-3 shadow-sm">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none"></div>
            
            <div className="flex gap-3 items-center">
              {currentUser.avatarUrl ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200/60 flex-shrink-0 shadow-sm">
                  <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm">
                  <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  @{currentUser.username}
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-650 dark:bg-amber-450 text-white dark:text-slate-950 uppercase font-black tracking-wide leading-none select-none">
                    You
                  </span>
                </h4>
                <div className="mt-1">
                  <span className="text-[9px] font-black uppercase text-slate-550 dark:text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded">
                    Active Account
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs italic text-slate-700 dark:text-slate-350 leading-relaxed font-sans font-medium mt-1">
              "{currentUser.bio}"
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3.5 mt-2">
            <button
              onClick={onDeleteSelf}
              className="py-3 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-550/10 hover:border-rose-500/30 text-rose-650 dark:text-rose-450 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Remove Pin
            </button>
            <button
              onClick={onDeleteSelf}
              className="py-3 px-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 border border-orange-550/15 hover:border-orange-500/35 text-orange-650 dark:text-orange-450 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              Reset Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
