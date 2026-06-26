import React, { useState, useEffect } from 'react';
import { Search, MapPin, Grid, Sparkles, Filter, Gift } from 'lucide-react';
import { CATEGORIES, LOCATIONS } from '../types';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  onClearFilters: () => void;
  hasFilters: boolean;
}

export default function Hero({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedLocation,
  setSelectedLocation,
  onClearFilters,
  hasFilters
}: HeroProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const COUNTDOWN_KEY = 'flashmydeal_promo_countdown_end_v1';
    let endTimeStr = localStorage.getItem(COUNTDOWN_KEY);
    
    if (!endTimeStr) {
      // 30 days from now
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const endTime = Date.now() + thirtyDaysInMs;
      localStorage.setItem(COUNTDOWN_KEY, endTime.toString());
      endTimeStr = endTime.toString();
    }
    
    const targetTime = parseInt(endTimeStr, 10);
    
    const updateCountdown = () => {
      const now = Date.now();
      const difference = targetTime - now;
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden py-16 sm:py-20 border-b border-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-obsidian-800 via-obsidian-950 to-obsidian-950">
      
      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Glow ambient spots */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 rounded-full bg-vibrant-teal/5 blur-[120px]" />
      <div className="absolute top-10 right-1/4 translate-x-1/2 w-96 h-96 rounded-full bg-electric-amber/5 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
        {/* Banner badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-gradient-to-r from-vibrant-teal/10 to-blue-500/10 border border-vibrant-teal/20 text-vibrant-teal mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Sri Lanka's Premium Classifieds
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Flash Your Deal. <br />
          <span className="bg-gradient-to-r from-electric-amber via-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Sell It Fast.
          </span>
        </h1>

        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
          The ultimate high-conversion marketplace. <strong className="text-vibrant-teal">100% Free to sell</strong> — zero commissions, zero listing fees. Upload compressed images instantly, secure deals with verified profiles, and reach buyers directly.
        </p>

        {/* Promotion Countdown & Free Selling Offer */}
        {timeLeft && (
          <div className="mx-auto max-w-md mb-10 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Gift className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="block text-xs font-bold text-white uppercase tracking-wider">
                  New Seller Launch Gift
                </span>
                <span className="block text-[11px] text-emerald-400 font-medium">
                  30 Days Premium Fast-Track Listing
                </span>
              </div>
            </div>
            
            {/* Timer digits */}
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center px-2 py-1 rounded bg-obsidian-950/80 border border-emerald-500/20 min-w-[32px]">
                <span className="font-mono text-xs font-black text-white">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[8px] text-gray-400 uppercase font-bold">Days</span>
              </div>
              <span className="text-emerald-500/50 font-mono font-bold">:</span>
              <div className="flex flex-col items-center px-2 py-1 rounded bg-obsidian-950/80 border border-emerald-500/20 min-w-[32px]">
                <span className="font-mono text-xs font-black text-white">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[8px] text-gray-400 uppercase font-bold">Hrs</span>
              </div>
              <span className="text-emerald-500/50 font-mono font-bold">:</span>
              <div className="flex flex-col items-center px-2 py-1 rounded bg-obsidian-950/80 border border-emerald-500/20 min-w-[32px]">
                <span className="font-mono text-xs font-black text-white">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[8px] text-gray-400 uppercase font-bold">Min</span>
              </div>
              <span className="text-emerald-500/50 font-mono font-bold">:</span>
              <div className="flex flex-col items-center px-2 py-1 rounded bg-obsidian-950/80 border border-emerald-500/20 min-w-[32px]">
                <span className="font-mono text-xs font-black text-emerald-400 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[8px] text-gray-400 uppercase font-bold">Sec</span>
              </div>
            </div>
          </div>
        )}

        {/* Semantic Search Panel */}
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-800 bg-obsidian-900/50 p-2 sm:p-3 backdrop-blur-lg shadow-2xl glow-teal">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
            
            {/* Search input (4/12) */}
            <div className="relative md:col-span-5 flex items-center bg-obsidian-950/80 border border-gray-800 rounded-xl focus-within:border-vibrant-teal/40 transition-all">
              <Search className="absolute left-3.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you looking for today?"
                className="w-full bg-transparent py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            {/* Category selection (3/12) */}
            <div className="relative md:col-span-3 flex items-center bg-obsidian-950/80 border border-gray-800 rounded-xl focus-within:border-vibrant-teal/40 transition-all">
              <Grid className="absolute left-3.5 w-4 h-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent py-3 pl-11 pr-4 text-sm text-white appearance-none focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-obsidian-950 text-gray-400">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-obsidian-950 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location selection (3/12) */}
            <div className="relative md:col-span-3 flex items-center bg-obsidian-950/80 border border-gray-800 rounded-xl focus-within:border-vibrant-teal/40 transition-all">
              <MapPin className="absolute left-3.5 w-4 h-4 text-gray-500" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-transparent py-3 pl-11 pr-4 text-sm text-white appearance-none focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-obsidian-950 text-gray-400">Whole Island</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} className="bg-obsidian-950 text-white">
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Search trigger or count badge (1/12) */}
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-vibrant-teal/10 border border-vibrant-teal/30 text-vibrant-teal shadow-[0_0_10px_rgba(0,242,254,0.1)]">
                <Search className="w-5 h-5" />
              </div>
            </div>

          </div>
        </div>

        {/* Clear Filters bar */}
        {hasFilters && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500">Active filters applied:</span>
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition-all"
            >
              <Filter className="w-3 h-3" />
              Clear Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
