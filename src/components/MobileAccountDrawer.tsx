import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Trash2, Sun, Moon, Gift, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';

interface MobileAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userProfile: UserProfile | null;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  isDeleting: boolean;
  deleteError: string | null;
  setDeleteError: (err: string | null) => void;
}

export default function MobileAccountDrawer({
  isOpen,
  onClose,
  user,
  userProfile,
  onSignOut,
  onDeleteAccount,
  isDeleting,
  deleteError,
  setDeleteError
}: MobileAccountDrawerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // default
  });

  const isVerified = userProfile?.verifiedStatus || user?.emailVerified;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle clicking backdrop to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Slide-up bottom sheet */}
          <motion.div
            ref={containerRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full bg-obsidian-950 border-t border-gray-900 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh]"
          >
            {/* Header / Drag handle indicator */}
            <div className="pt-3 pb-2 flex flex-col items-center border-b border-gray-900">
              <div className="w-12 h-1.5 rounded-full bg-gray-800 mb-3" />
              <div className="w-full px-6 flex items-center justify-between">
                <span className="text-sm font-black text-white uppercase tracking-wider">Account Settings</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-obsidian-900 border border-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
                  id="close-account-drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content list */}
            <div className="p-6 space-y-6 overflow-y-auto pb-12">
              {/* User Bio Card */}
              {user && (
                <div className="p-4 rounded-2xl bg-obsidian-900 border border-gray-850 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-vibrant-teal/10 border border-vibrant-teal/20 text-vibrant-teal flex items-center justify-center font-black text-base uppercase">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0) : user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {userProfile?.displayName || user.displayName || 'Premium Seller'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {userProfile?.phone && (
                      <p className="text-[10px] text-gray-500 mt-0.5">📞 {userProfile.phone}</p>
                    )}
                    <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1.5 ${
                      isVerified ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Verified Member
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3 animate-pulse" /> Email Unverified
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Gift Card Countdown */}
              <MobileGiftCountdown 
                verifiedDate={userProfile?.verifiedDate}
                joinedDate={userProfile?.joinedDate}
              />

              {/* Settings Action Items */}
              {!showDeleteConfirm ? (
                <div className="space-y-2">
                  {/* Theme Settings Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-900/50 border border-gray-900">
                    <div className="flex items-center gap-2.5">
                      {theme === 'light' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-blue-400" />}
                      <span className="text-xs font-semibold text-gray-200">Visual Theme</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="px-3 py-1.5 rounded-lg bg-obsidian-900 border border-gray-800 text-[10px] font-bold uppercase tracking-wider text-vibrant-teal hover:text-white transition-all cursor-pointer"
                    >
                      {theme === 'light' ? 'Day Light' : 'Night Light'}
                    </button>
                  </div>

                  {/* Log Out */}
                  <button
                    onClick={async () => {
                      await onSignOut();
                      onClose();
                    }}
                    className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-obsidian-900/50 border border-gray-900 hover:border-gray-800 transition-all text-left cursor-pointer text-xs font-semibold text-gray-200"
                  >
                    <LogOut className="w-4.5 h-4.5 text-gray-400" />
                    Sign Out Session
                  </button>

                  {/* Trigger Delete Account */}
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setDeleteError(null);
                    }}
                    className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/10 border border-red-950/20 hover:bg-red-950/20 hover:border-red-950/30 transition-all text-left cursor-pointer text-xs font-semibold text-red-400"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    Delete Account & Listings
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 rounded-2xl bg-red-950/20 border border-red-500/20">
                  <div className="text-xs text-red-200 font-medium leading-relaxed">
                    ⚠️ <span className="font-bold">CRITICAL WARNING:</span> Deleting your account will immediately remove all your active listings, local caches, and verification history permanently. This is irreversible.
                  </div>

                  {deleteError && (
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-300 font-semibold leading-relaxed">
                      {deleteError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteError(null);
                      }}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await onDeleteAccount();
                      }}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-950/50 cursor-pointer flex items-center justify-center gap-1"
                    >
                      {isDeleting ? (
                        <>
                          <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MobileGiftCountdown({ verifiedDate, joinedDate }: { verifiedDate?: string; joinedDate?: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    let baseTime = Date.now();
    if (joinedDate) {
      const parsed = new Date(joinedDate).getTime();
      if (!isNaN(parsed)) baseTime = parsed;
    } else if (verifiedDate) {
      const parsed = new Date(verifiedDate).getTime();
      if (!isNaN(parsed)) baseTime = parsed;
    }

    const expireTime = baseTime + 30 * 24 * 60 * 60 * 1000;

    const updateTimer = () => {
      const diff = expireTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [verifiedDate, joinedDate]);

  if (!timeLeft) return null;

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/15">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
        <Gift className="w-4 h-4" />
        <span>30-Day Welcome Privileges</span>
      </div>
      {isExpired ? (
        <p className="text-xs text-gray-500 font-medium mt-1">
          Your 30-day free welcome gift has expired.
        </p>
      ) : (
        <div className="mt-2.5">
          {/* Display countdown digits */}
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-1 rounded-lg bg-obsidian-900 border border-emerald-500/10 min-w-[28px] text-center">
              <span className="font-mono text-xs font-black text-white">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="block text-[6px] text-gray-400 font-bold uppercase leading-none mt-0.5">Days</span>
            </div>
            <span className="text-emerald-500/40 font-mono text-[10px]">:</span>
            <div className="px-2 py-1 rounded-lg bg-obsidian-900 border border-emerald-500/10 min-w-[28px] text-center">
              <span className="font-mono text-xs font-black text-white">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="block text-[6px] text-gray-400 font-bold uppercase leading-none mt-0.5">Hrs</span>
            </div>
            <span className="text-emerald-500/40 font-mono text-[10px]">:</span>
            <div className="px-2 py-1 rounded-lg bg-obsidian-900 border border-emerald-500/10 min-w-[28px] text-center">
              <span className="font-mono text-xs font-black text-white">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="block text-[6px] text-gray-400 font-bold uppercase leading-none mt-0.5">Min</span>
            </div>
            <span className="text-emerald-500/40 font-mono text-[10px]">:</span>
            <div className="px-2 py-1 rounded-lg bg-obsidian-900 border border-emerald-500/10 min-w-[28px] text-center">
              <span className="font-mono text-xs font-black text-emerald-400">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="block text-[6px] text-gray-400 font-bold uppercase leading-none mt-0.5">Sec</span>
            </div>
            <span className="text-xs font-black text-emerald-400 ml-1.5">active!</span>
          </div>
          <span className="block text-[10px] text-gray-400 mt-2.5 leading-normal">
            Your premium seller tier is currently fully active. Enjoy zero listing delays!
          </span>
        </div>
      )}
    </div>
  );
}
