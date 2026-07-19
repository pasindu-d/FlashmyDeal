import React, { useState, useEffect } from 'react';
import { Zap, LogIn, LogOut, User as UserIcon, ShieldAlert, CheckCircle2, Server, HelpCircle, FileText, Check } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import { User } from '../lib/firebase';
import { getAppsScriptUrl, setAppsScriptUrl } from '../lib/appsScript';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPostAd: () => void;
  storageStatus: {
    mode: string;
    connected: boolean;
    itemCount: number;
    url?: string;
  } | null;
  onAppsScriptUrlChange: () => void;
}

export default function Navbar({ user, onOpenAuth, onOpenPostAd, storageStatus, onAppsScriptUrlChange }: NavbarProps) {
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInputUrl(getAppsScriptUrl());
  }, [storageStatus?.url]);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setAppsScriptUrl(inputUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onAppsScriptUrlChange();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-800/80 bg-obsidian-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-vibrant-teal to-blue-600 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Zap className="h-5 w-5 text-obsidian-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white sm:block">
                Flash<span className="bg-gradient-to-r from-vibrant-teal to-blue-400 bg-clip-text text-transparent">myDeal</span>
              </span>
              <span className="block text-[10px] font-mono tracking-wider text-gray-500 uppercase leading-none">Classifieds</span>
            </div>
          </div>

          {/* Database & Connection Indicator */}
          <div className="hidden md:flex items-center gap-4">
            <div 
              className="relative"
            >
              <div 
                onClick={() => setShowStatusTooltip(!showStatusTooltip)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all ${
                  storageStatus?.mode === 'apps_script'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-400 hover:bg-amber-950/50'
                }`}
              >
                <Server className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {storageStatus?.mode === 'apps_script' ? 'Sheets Live' : 'Local Storage (Sim)'}
                </span>
              </div>

              {/* Status Tooltip / Config Dropdown */}
              {showStatusTooltip && (
                <>
                  {/* Click outside backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusTooltip(false)} />
                  
                  <div className="absolute top-10 right-0 w-85 p-5 rounded-2xl border border-gray-800 bg-obsidian-950 shadow-2xl backdrop-blur-md z-50 text-xs space-y-4 text-gray-300">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <p className="font-extrabold text-white text-sm">Storage Engine Status</p>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        storageStatus?.mode === 'apps_script' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-amber-950 text-amber-400 border border-amber-500/20'
                      }`}>
                        {storageStatus?.mode === 'apps_script' ? 'Google Sheet' : 'Offline'}
                      </span>
                    </div>

                    <div className="space-y-1.5 leading-relaxed text-gray-400">
                      <p>
                        <strong className="text-white font-semibold">Registry Cache:</strong> {storageStatus?.itemCount || 0} active ads
                      </p>
                      {storageStatus?.mode === 'apps_script' ? (
                        <p className="text-emerald-400 text-[11px]">
                          ✔ FlashmyDeal is connected directly to your Google Sheet database and Google Drive. All listings, uploads, and profiles are synced automatically.
                        </p>
                      ) : (
                        <p className="text-amber-400 text-[11px]">
                          💡 Currently running in local offline storage simulation mode. Deployed items are cached inside your web browser. Connect your Google Sheet below to save items permanently in Google Drive!
                        </p>
                      )}
                    </div>

                    {/* Google Apps Script URL Input Form */}
                    <form onSubmit={handleSaveUrl} className="space-y-2 border-t border-gray-800 pt-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Google Apps Script Web App URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          required
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="flex-1 bg-obsidian-900 border border-gray-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-vibrant-teal"
                        />
                        <button
                          type="submit"
                          className="bg-vibrant-teal hover:opacity-90 text-obsidian-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all flex items-center justify-center shrink-0 min-w-[70px]"
                        >
                          {saveSuccess ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            'Connect'
                          )}
                        </button>
                      </div>
                      {saveSuccess && (
                        <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                          ✔ Backend connection updated! Reloading data...
                        </span>
                      )}
                    </form>

                    {/* Setup Guide Link */}
                    <div className="bg-obsidian-900/60 p-2.5 rounded-xl border border-gray-850 text-[10px] text-gray-400 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-vibrant-teal" />
                      <span>Need your own serverless API?</span>
                      <a 
                        href="/GOOGLE_APPS_SCRIPT.md" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-vibrant-teal hover:underline font-bold ml-auto"
                      >
                        Read Guide
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="flex items-center gap-3">
            {/* User Profile Info */}
            {user ? (
              <div className="flex items-center gap-3 mr-1">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-semibold text-white">{user.displayName || 'Seller'}</span>
                  <span className={`text-[10px] flex items-center gap-1 justify-end font-medium ${
                    user.emailVerified ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {user.emailVerified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3 h-3" /> Unverified
                      </>
                    )}
                  </span>
                </div>
                
                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all border border-gray-800"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 hover:border-gray-600 transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Post Ad Button */}
            <button
              onClick={onOpenPostAd}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-electric-amber to-orange-500 text-obsidian-950 hover:opacity-90 active:scale-95 shadow-[0_0_15px_rgba(255,159,10,0.25)] transition-all uppercase tracking-wider"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Sell your Item
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
