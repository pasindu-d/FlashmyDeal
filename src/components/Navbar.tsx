import React, { useState, useEffect } from 'react';
import { Zap, LogIn, LogOut, User as UserIcon, ShieldAlert, CheckCircle2, Server, HelpCircle } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import { User } from '../lib/firebase';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPostAd: () => void;
  storageStatus: {
    mode: string;
    connected: boolean;
    rootFolderId: string;
    itemCount: number;
    error?: string | null;
    serviceAccountEmail?: string | null;
  } | null;
}

export default function Navbar({ user, onOpenAuth, onOpenPostAd, storageStatus }: NavbarProps) {
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);

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
              className="relative cursor-pointer"
              onMouseEnter={() => setShowStatusTooltip(true)}
              onMouseLeave={() => setShowStatusTooltip(false)}
              onClick={() => setShowStatusTooltip(!showStatusTooltip)}
            >
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                storageStatus?.mode === 'firebase'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-400'
              }`}>
                <Server className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {storageStatus?.mode === 'firebase' ? 'Firebase Live' : 'Local Database'}
                </span>
              </div>

              {/* Status Tooltip */}
              {showStatusTooltip && (
                <div className="absolute top-10 right-0 w-80 p-4 rounded-xl border border-gray-800 bg-obsidian-950/95 shadow-2xl backdrop-blur-md z-50 text-xs space-y-2 text-gray-300">
                  <p className="font-bold text-white mb-1">Storage Engine Status</p>
                  <p>
                    <strong className="text-vibrant-teal">Engine Mode:</strong> {
                      storageStatus?.mode === 'firebase' 
                        ? 'Google Firebase Firestore (Cloud)' 
                        : 'Local File JSON Database'
                    }
                  </p>
                  <p>
                    <strong className="text-vibrant-teal">Registry Cache:</strong> {storageStatus?.itemCount || 0} active ads
                  </p>
                  <p className="text-emerald-400 text-[11px] leading-relaxed">
                    {storageStatus?.mode === 'firebase' ? (
                      '✔ FlashmyDeal is successfully running on Google Firebase Firestore database. All listings, uploads, and profiles are safely synced with the cloud.'
                    ) : (
                      '✔ FlashmyDeal is running on local offline JSON database storage backup.'
                    )}
                  </p>
                </div>
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
