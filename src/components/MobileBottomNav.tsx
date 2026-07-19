import React from 'react';
import { Grid, Search, Zap, MessageSquare, User, Filter } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface MobileBottomNavProps {
  currentView: 'listings' | 'contact';
  setCurrentView: (view: 'listings' | 'contact') => void;
  onOpenPostAd: () => void;
  onToggleFilters: () => void;
  isFilterActive: boolean;
  user: FirebaseUser | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onToggleAccountSheet: () => void;
}

export default function MobileBottomNav({
  currentView,
  setCurrentView,
  onOpenPostAd,
  onToggleFilters,
  isFilterActive,
  user,
  onOpenAuth,
  onToggleAccountSheet
}: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-obsidian-950/95 border-t border-gray-900 backdrop-blur-lg px-2 py-2 flex justify-around items-center h-16 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
      {/* 1. Browse Tab */}
      <button
        onClick={() => {
          setCurrentView('listings');
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer ${
          currentView === 'listings' && !isFilterActive
            ? 'text-vibrant-teal'
            : 'text-gray-400 hover:text-white'
        }`}
        id="mobile-nav-browse"
      >
        <Grid className="w-5 h-5" />
        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider scale-95">Browse</span>
      </button>

      {/* 2. Filters Tab */}
      <button
        onClick={() => {
          setCurrentView('listings');
          onToggleFilters();
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative cursor-pointer ${
          isFilterActive ? 'text-vibrant-teal' : 'text-gray-400 hover:text-white'
        }`}
        id="mobile-nav-filters"
      >
        <div className="relative">
          <Filter className="w-5 h-5" />
          {isFilterActive && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibrant-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-vibrant-teal"></span>
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider scale-95">Filters</span>
      </button>

      {/* 3. Sell Item Button (Central, Elevated FAB) */}
      <div className="relative -top-4 px-2">
        <button
          onClick={onOpenPostAd}
          className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-electric-amber to-orange-500 text-obsidian-950 shadow-[0_4px_20px_rgba(255,159,10,0.45)] hover:scale-105 active:scale-95 transition-all border-2 border-obsidian-950 cursor-pointer"
          id="mobile-nav-sell"
          aria-label="Sell your Item"
        >
          <Zap className="w-6 h-6 fill-current stroke-[2.5]" />
        </button>
        <span className="block text-[9px] font-black uppercase tracking-widest text-electric-amber text-center mt-1 scale-90 whitespace-nowrap">
          Sell
        </span>
      </div>

      {/* 4. Contact Us Tab */}
      <button
        onClick={() => {
          setCurrentView('contact');
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer ${
          currentView === 'contact'
            ? 'text-vibrant-teal'
            : 'text-gray-400 hover:text-white'
        }`}
        id="mobile-nav-contact"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider scale-95">Contact</span>
      </button>

      {/* 5. Account Tab */}
      <button
        onClick={() => {
          if (user) {
            onToggleAccountSheet();
          } else {
            onOpenAuth('login');
          }
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer ${
          user ? 'text-vibrant-teal' : 'text-gray-400 hover:text-white'
        }`}
        id="mobile-nav-account"
      >
        {user ? (
          <div className="h-5 w-5 rounded-full bg-vibrant-teal/10 border border-vibrant-teal/30 text-vibrant-teal flex items-center justify-center font-bold text-[10px] uppercase">
            {user.email?.charAt(0) || 'U'}
          </div>
        ) : (
          <User className="w-5 h-5" />
        )}
        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider scale-95">
          {user ? 'Account' : 'Log In'}
        </span>
      </button>
    </div>
  );
}
