import React, { useState, useEffect, useRef } from 'react';
import { Zap, LogIn, LogOut, ShieldAlert, CheckCircle2, Sun, Moon, Trash2, ChevronDown } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import { User, deleteUser as deleteFirebaseAuthUser } from 'firebase/auth';
import { getAppsScriptUrl } from '../lib/appsScript';
import { UserProfile } from '../types';

interface NavbarProps {
  user: User | null;
  userProfile: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPostAd: () => void;
}

export default function Navbar({ user, userProfile, onOpenAuth, onOpenPostAd }: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // default
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowDropdown(false);
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "WARNING: This will permanently delete your seller profile and credentials. This action is irreversible. Do you wish to continue?"
    );
    if (!confirmDelete) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const uid = currentUser.uid;
      const appsScriptUrl = getAppsScriptUrl();
      
      // 1. Send delete request to Google Sheets
      if (appsScriptUrl) {
        await fetch('/api/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: appsScriptUrl,
            payload: {
              action: 'deleteUser',
              uid
            }
          })
        });
      }

      // 2. Delete from Firebase Authentication
      await deleteFirebaseAuthUser(currentUser);
      
      alert("Your account and all linked details have been permanently deleted.");
      window.location.reload();
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      if (err.code === 'auth/requires-recent-login') {
        alert("For security reasons, deleting your account requires a recent sign-in. Please log out, sign in again, and retry.");
      } else {
        alert("Failed to delete account: " + (err.message || err));
      }
    }
  };

  const isVerified = userProfile?.verifiedStatus || user?.emailVerified;

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

          {/* Action Area */}
          <div className="flex items-center gap-3">
            {/* User Profile Info with Dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-800/20 hover:bg-gray-800/50 border border-gray-800 transition-all select-none cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-lg bg-vibrant-teal/10 border border-vibrant-teal/20 text-vibrant-teal flex items-center justify-center font-bold text-xs uppercase">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0) : user.displayName ? user.displayName.charAt(0) : user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col text-left hidden sm:block max-w-[120px]">
                    <span className="text-xs font-semibold text-white truncate block">
                      {userProfile?.displayName || user.displayName || 'Seller'}
                    </span>
                    <span className={`text-[9px] flex items-center gap-0.5 font-semibold ${
                      isVerified ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-2.5 h-2.5 animate-pulse" /> Unverified
                        </>
                      )}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-800 bg-obsidian-950 p-3 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User profile header */}
                    <div className="border-b border-gray-800 pb-2.5 mb-2.5 px-2">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Account Details</p>
                      <p className="text-sm font-semibold text-vibrant-teal truncate mt-1">
                        {userProfile?.displayName || user.displayName || 'Seller'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      {userProfile?.phone && (
                        <p className="text-[10px] text-gray-500 mt-0.5">📞 {userProfile.phone}</p>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="space-y-1">
                      {/* Daylight / Nightlight Mode Toggle Option */}
                      <div className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <span className="flex items-center gap-2">
                          {theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
                          Theme Settings
                        </span>
                        <button
                          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800 text-[10px] font-bold uppercase transition-all hover:bg-gray-700"
                        >
                          {theme === 'light' ? 'Day Light' : 'Night Light'}
                        </button>
                      </div>

                      {/* Spacer/Divider */}
                      <div className="border-t border-gray-800 my-1" />

                      {/* Sign Out Action */}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <LogOut className="w-4 h-4 text-gray-400" />
                        Sign Out
                      </button>

                      {/* Delete Account Action */}
                      <button
                        onClick={handleDeleteAccount}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}
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
