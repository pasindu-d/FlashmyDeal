import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Grid, MapPin, SlidersHorizontal, RotateCcw, Heart, TrendingDown } from 'lucide-react';
import { CATEGORIES, LOCATIONS } from '../types';

interface MobileFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  conditionFilter: string;
  setConditionFilter: (cond: string) => void;
  minPrice: string;
  setMinPrice: (price: string) => void;
  maxPrice: string;
  setMaxPrice: (price: string) => void;
  onlyDealsFilter: boolean;
  setOnlyDealsFilter: (val: boolean) => void;
  onlyFavoritesFilter: boolean;
  setOnlyFavoritesFilter: (val: boolean) => void;
  favoritesCount: number;
  onClearFilters: () => void;
  hasFilters: boolean;
  matchedCount: number;
}

export default function MobileFiltersDrawer({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedLocation,
  setSelectedLocation,
  conditionFilter,
  setConditionFilter,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  onlyDealsFilter,
  setOnlyDealsFilter,
  onlyFavoritesFilter,
  setOnlyFavoritesFilter,
  favoritesCount,
  onClearFilters,
  hasFilters,
  matchedCount
}: MobileFiltersDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Slide-over Container */}
          <motion.div
            ref={containerRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[290px] h-full bg-obsidian-950 border-r border-gray-900 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-vibrant-teal" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Search & Filters
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-obsidian-900 border border-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
                id="close-filters-drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
              
              {/* Keyword Search Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Search Keywords
                </label>
                <div className="relative flex items-center bg-obsidian-900 border border-gray-800 rounded-xl focus-within:border-vibrant-teal/40 transition-all">
                  <Search className="absolute left-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles, tags..."
                    className="w-full bg-transparent py-2.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none font-medium"
                    id="drawer-search-input"
                  />
                </div>
              </div>

              {/* Toggles Group */}
              <div className="space-y-3">
                {/* Hot Deals Only */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-gray-850">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-electric-amber" /> Dropped Prices
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={onlyDealsFilter}
                      onChange={(e) => setOnlyDealsFilter(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-vibrant-teal peer-checked:after:bg-obsidian-950" />
                  </label>
                </div>

                {/* Saved Favorites */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-gray-850">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Heart className={`w-4 h-4 ${favoritesCount > 0 ? "text-rose-500 fill-rose-500" : "text-gray-400"}`} /> Favorites ({favoritesCount})
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={onlyFavoritesFilter}
                      onChange={(e) => setOnlyFavoritesFilter(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-vibrant-teal peer-checked:after:bg-obsidian-950" />
                  </label>
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
                <div className="relative flex items-center bg-obsidian-900 border border-gray-800 rounded-xl">
                  <Grid className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-transparent py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none cursor-pointer appearance-none font-medium"
                    id="drawer-category-select"
                  >
                    <option value="" className="bg-obsidian-950 text-gray-400">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-obsidian-950 text-white">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">District</label>
                <div className="relative flex items-center bg-obsidian-900 border border-gray-800 rounded-xl">
                  <MapPin className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-transparent py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none cursor-pointer appearance-none font-medium"
                    id="drawer-location-select"
                  >
                    <option value="" className="bg-obsidian-950 text-gray-400">Whole Island</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc} className="bg-obsidian-950 text-white">{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Condition Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Condition</label>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none font-medium"
                  id="drawer-condition-select"
                >
                  <option value="">Any Condition</option>
                  <option value="Brand New">Brand New</option>
                  <option value="Like New">Like New</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="For Parts">For Parts</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Price Range (LKR)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-obsidian-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-mono font-semibold"
                    id="drawer-price-min"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-obsidian-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none font-mono font-semibold"
                    id="drawer-price-max"
                  />
                </div>
              </div>

              {/* Safety Lock Card */}
              <div className="p-3 rounded-xl border border-gray-800 bg-obsidian-900/40 text-[10px] text-gray-400 leading-relaxed">
                <p className="font-bold text-white flex items-center gap-1 text-[11px] mb-1">
                  🛡 Safety Lock
                </p>
                <p>Always inspect items physically before handing over any cash. Meet in safe public zones.</p>
              </div>

            </div>

            {/* Sticky bottom summary & apply bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-900 bg-obsidian-950/95 backdrop-blur-md flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Matched: <strong>{matchedCount} ads</strong></span>
                {hasFilters && (
                  <button
                    onClick={onClearFilters}
                    className="text-vibrant-teal hover:underline flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset All
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-center text-xs font-extrabold rounded-xl bg-vibrant-teal hover:bg-vibrant-teal/90 text-obsidian-950 uppercase tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.2)] cursor-pointer"
                id="apply-filters-btn"
              >
                Apply & View Listings
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
