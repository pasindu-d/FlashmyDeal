import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  SlidersHorizontal, 
  Zap, 
  Sparkles, 
  TrendingDown, 
  RotateCcw, 
  Grid, 
  List, 
  ShieldAlert, 
  TrendingUp, 
  ChevronRight,
  Filter,
  DollarSign,
  Briefcase,
  AlertCircle,
  X,
  Heart
} from 'lucide-react';
import { auth, onAuthStateChanged } from './lib/firebase';
import { User } from './lib/firebase';
import { ProductListing, UserProfile, LOCATIONS, CATEGORIES } from './types';
import { safeFetchJson, safeParseJson } from './lib/api';

// Import custom components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ListingCard from './components/ListingCard';
import ListingDetailModal from './components/ListingDetailModal';
import AuthModal from './components/AuthModal';
import AdPostingForm from './components/AdPostingForm';

export default function App() {
  // Global auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 6000);
  };

  // Ad posting form state
  const [postAdOpen, setPostAdOpen] = useState(false);

  // Selected Listing state for details modal
  const [selectedListing, setSelectedListing] = useState<ProductListing | null>(null);

  // Data states
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageStatus, setStorageStatus] = useState<any>(null);

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyDealsFilter, setOnlyDealsFilter] = useState(false);

  // Layout preference
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Favorites local persistence state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('flashmydeal_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [onlyFavoritesFilter, setOnlyFavoritesFilter] = useState(false);

  useEffect(() => {
    localStorage.setItem('flashmydeal_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const next = isFav ? prev.filter(fId => fId !== id) : [...prev, id];
      showToast(
        isFav ? 'Removed from favorites' : 'Saved to favorites list!',
        isFav ? 'error' : 'success'
      );
      return next;
    });
  };

  // Load storage status and listings on load
  useEffect(() => {
    fetchStorageStatus();
    fetchListings();
  }, []);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch full profile details
        try {
          const profile = await safeFetchJson(`/api/users/${user.uid}`);
          setUserProfile(profile);
        } catch (e: any) {
          console.error('Error fetching profile:', e);
          setUserProfile(null);
          // Only show error if it is not the expected 'User not found' or 'not found' or 404 for a new user
          const errorMsg = String(e?.message || e || '').toLowerCase();
          if (errorMsg.includes('user not found') || errorMsg.includes('not found') || errorMsg.includes('404')) {
            // New user or unregistered profile, completely normal on initial auth
            console.log('No registered profile found yet for this user. A profile will be created upon first ad posting.');
          } else {
            showToast(`Profile Sync Error: ${e.message || e}`);
          }
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchStorageStatus = async () => {
    try {
      const data = await safeFetchJson('/api/status');
      setStorageStatus(data);
    } catch (e: any) {
      console.error('Error fetching storage status:', e);
      showToast(`Database Engine Status Error: ${e.message || e}`);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson('/api/listings');
      setListings(data);
    } catch (e: any) {
      console.error('Error fetching listings:', e);
      showToast(`Listing Sync Error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async (listingId: string) => {
    try {
      await safeFetchJson(`/api/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sold' }),
      });
      // Update local state listing
      setListings(prev => 
        prev.map(l => l.id === listingId ? { ...l, status: 'sold' } : l)
      );
      // Also update details modal
      setSelectedListing(prev => prev && prev.id === listingId ? { ...prev, status: 'sold' } : prev);
      // Refresh cache
      fetchStorageStatus();
      showToast('Deal marked as sold successfully!', 'success');
    } catch (e: any) {
      console.error('Error marking listing as sold:', e);
      showToast(`Action Failed: ${e.message || e}`);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await safeFetchJson(`/api/listings/${listingId}`, {
        method: 'DELETE',
      });
      // Remove from state
      setListings(prev => prev.filter(l => l.id !== listingId));
      // Close detail modal
      setSelectedListing(null);
      // Refresh cache
      fetchStorageStatus();
      showToast('Deal listing deleted permanently!', 'success');
    } catch (e: any) {
      console.error('Error deleting listing:', e);
      showToast(`Delete Failed: ${e.message || e}`);
    }
  };

  const handlePostAdClick = () => {
    if (!currentUser) {
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      return;
    }

    // Force reload Firebase user to check latest verified status
    auth.currentUser?.reload().then(async () => {
      const isVerified = auth.currentUser?.emailVerified;
      if (!isVerified) {
        setAuthInitialMode('login'); // will automatically go to verify screen
        setAuthModalOpen(true);
      } else {
        setPostAdOpen(true);
      }
    }).catch(() => {
      // fallback
      if (!currentUser.emailVerified) {
        setAuthInitialMode('login');
        setAuthModalOpen(true);
      } else {
        setPostAdOpen(true);
      }
    });
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    try {
      const profile = await safeFetchJson(`/api/users/${user.uid}`);
      setUserProfile(profile);
      showToast('Authentication successful!', 'success');
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.includes('User not found')) {
        // User has authenticated but hasn't created a profile yet - this is successful authentication!
        showToast('Authentication successful!', 'success');
      } else {
        showToast(`Auth sync failed: ${e.message || e}`);
      }
    }
  };

  const handleNewListingSuccess = (newListing: ProductListing) => {
    setListings(prev => [newListing, ...prev]);
    // Refresh counters
    fetchStorageStatus();
    showToast('Deal listing published successfully!', 'success');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setConditionFilter('');
    setMinPrice('');
    setMaxPrice('');
    setOnlyDealsFilter(false);
    setOnlyFavoritesFilter(false);
  };

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedCategory !== '' || 
    selectedLocation !== '' || 
    conditionFilter !== '' || 
    minPrice !== '' || 
    maxPrice !== '' || 
    onlyDealsFilter ||
    onlyFavoritesFilter;

  // Filter listings based on criteria
  const filteredListings = listings.filter((item) => {
    // Only saved favorites filter
    if (onlyFavoritesFilter && !favorites.includes(item.id)) return false;

    // Search keyword match (title, description, tags, category, location)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchLocation = item.location.toLowerCase().includes(q);
      const matchTags = item.tags.some(tag => tag.toLowerCase().includes(q));

      if (!matchTitle && !matchDesc && !matchCategory && !matchLocation && !matchTags) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory && item.category !== selectedCategory) return false;

    // Location filter
    if (selectedLocation && item.location !== selectedLocation) return false;

    // Condition filter
    if (conditionFilter && item.condition !== conditionFilter) return false;

    // Min price
    if (minPrice && item.price < Number(minPrice)) return false;

    // Max price
    if (maxPrice && item.price > Number(maxPrice)) return false;

    // Only hot flash deals (items with an original price higher than standard price)
    if (onlyDealsFilter) {
      const isDeal = item.originalPrice && item.originalPrice > item.price;
      if (!isDeal) return false;
    }

    return true;
  });

  // Calculate separate list for "Hot Flash Deals" (recently dropped in price)
  const hotFlashDeals = listings
    .filter(item => item.originalPrice && item.originalPrice > item.price && item.status === 'active')
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-obsidian-900 text-gray-200">
      
      {/* Navbar Component */}
      <Navbar 
        user={currentUser} 
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setAuthModalOpen(true);
        }} 
        onOpenPostAd={handlePostAdClick}
        storageStatus={storageStatus}
      />

      {/* Google Drive Setup Warning Banner */}
      {storageStatus?.mode === 'google_drive_error' && (
        <div className="bg-red-950/20 border-b border-red-500/30 py-6 px-4">
          <div className="mx-auto max-w-4xl rounded-2xl bg-obsidian-950/90 p-6 border border-red-500/20 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-red-950/80 text-rose-400 border border-red-500/20">
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Google Drive Connection Limit (Service Account Storage Quota)
                </h3>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Your Google Service Account email <code className="text-vibrant-teal">{storageStatus.serviceAccountEmail}</code> is connected to folder ID <code className="text-vibrant-teal">{storageStatus.rootFolderId}</code>. However, Google personal drives (e.g. standard @gmail.com folders) enforce a <strong>0 byte storage quota</strong> for Service Accounts, which causes file uploads to fail with error: <code className="text-rose-400 font-mono text-xs">{storageStatus.error}</code>.
                </p>
              </div>
            </div>

            <div className="pl-14 space-y-3 border-t border-gray-800/60 pt-4">
              <p className="text-xs font-semibold text-vibrant-teal uppercase tracking-wider">
                How to resolve this in 3 quick steps:
              </p>
              <ol className="text-xs text-gray-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                <li>
                  In your Google Drive, create or use a <strong className="text-white">Shared Drive</strong> (requires a Google Workspace business/enterprise tier, or being invited to one).
                </li>
                <li>
                  Create a folder inside that Shared Drive and <strong className="text-white">Share</strong> the Shared Drive or folder with your Service Account email (<code className="text-vibrant-teal break-all">{storageStatus.serviceAccountEmail}</code>) as an <strong className="text-emerald-400">Editor</strong> or <strong className="text-emerald-400">Content Manager</strong>.
                </li>
                <li>
                  Update your <code className="text-white">GOOGLE_DRIVE_FOLDER_ID</code> environment variable in your settings to use the ID of that new folder inside your Shared Drive.
                </li>
              </ol>
              <div className="text-xs text-amber-400/80 mt-2 bg-amber-950/20 border border-amber-500/10 rounded-xl p-3 leading-relaxed">
                <strong>Read-Only Mode Active:</strong> To protect database consistency, creating, updating, or deleting listings is temporarily disabled until the Drive storage configuration is finalized.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header with Search Panel */}
      <Hero 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        onClearFilters={handleClearFilters}
        hasFilters={hasActiveFilters}
      />

      {/* Unverified Email Warning bar if logged in but not verified */}
      {currentUser && !currentUser.emailVerified && (
        <div className="bg-amber-950/40 border-b border-amber-500/20 py-3.5 px-4 text-center">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-amber-200 font-medium">
            <ShieldAlert className="w-4 h-4 text-electric-amber" />
            <span>You haven't verified your email yet. Please verify to unlock the ability to post ads.</span>
            <button 
              onClick={() => {
                setAuthInitialMode('login');
                setAuthModalOpen(true);
              }}
              className="text-white underline font-extrabold hover:text-electric-amber ml-1 transition-colors"
            >
              Verify Now
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        
        {/* Hot Flash Deals Carousel/Row (Only show when there are deals and no active searches) */}
        {!hasActiveFilters && hotFlashDeals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-electric-amber/10 flex items-center justify-center text-electric-amber border border-electric-amber/30">
                  <TrendingDown className="w-4 h-4 fill-current animate-bounce" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white uppercase sm:text-2xl">
                    Hot Flash Deals
                  </h2>
                  <p className="text-xs text-gray-500">Biggest price cuts dropped in the last 24 hours</p>
                </div>
              </div>
              <div className="text-xs font-semibold text-electric-amber bg-electric-amber/10 px-2.5 py-1 rounded-full border border-electric-amber/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live Prices Drop
              </div>
            </div>

            {/* horizontal grid for hot deals */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {hotFlashDeals.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  onClick={() => setSelectedListing(listing)} 
                  isFavorite={favorites.includes(listing.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* Catalog Search & Browse Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Sidebar Filters (3 Cols on Desktop) */}
          <div className="lg:col-span-3 rounded-2xl border border-gray-800 bg-obsidian-950/60 p-6 space-y-6 sticky top-20 backdrop-blur-md">
            
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <span className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-vibrant-teal" /> Filters
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Deals Filter Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-gray-850">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-electric-amber" /> Dropped Prices Only
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={onlyDealsFilter}
                  onChange={(e) => setOnlyDealsFilter(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vibrant-teal peer-checked:after:bg-obsidian-950" />
              </label>
            </div>

            {/* Saved Favorites Filter Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-gray-850">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Heart className={`w-4 h-4 ${favorites.length > 0 ? "text-rose-500 fill-rose-500 animate-pulse" : "text-gray-400"}`} /> Saved Favorites ({favorites.length})
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={onlyFavoritesFilter}
                  onChange={(e) => setOnlyFavoritesFilter(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vibrant-teal peer-checked:after:bg-obsidian-950" />
              </label>
            </div>

            {/* Filter by Category */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-obsidian-900/80 border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-vibrant-teal"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Filter by Location */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">District</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-obsidian-900/80 border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-vibrant-teal"
              >
                <option value="">Whole Island</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Filter by Condition */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Condition</label>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="w-full bg-obsidian-900/80 border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-vibrant-teal"
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

            {/* Filter by Price Range */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Price Range (LKR)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-vibrant-teal font-mono"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-vibrant-teal font-mono"
                />
              </div>
            </div>

            {/* Static Safety Tips */}
            <div className="p-4 rounded-xl border border-gray-800 bg-obsidian-900/40 text-[11px] text-gray-400 leading-relaxed space-y-1">
              <p className="font-bold text-white flex items-center gap-1 text-xs">
                🛡 Safety Lock
              </p>
              <p>Meet in public places. Hand over payment only after fully inspecting the item yourself.</p>
            </div>

          </div>

          {/* Right Side: Catalog Listings (9 Cols on Desktop) */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Toolbar row */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-white uppercase flex items-center gap-1.5">
                  <Grid className="w-4.5 h-4.5 text-vibrant-teal" /> Matched Ads 
                  <span className="text-xs font-normal text-gray-500 lowercase font-sans ml-1">
                    ({filteredListings.length} items found)
                  </span>
                </h3>
              </div>
              
              {/* layout picker */}
              <div className="flex gap-1 bg-obsidian-950 border border-gray-850 p-1 rounded-lg">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${
                    layoutMode === 'grid' ? 'bg-gray-800 text-vibrant-teal' : 'text-gray-500 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-1.5 rounded-md transition-all ${
                    layoutMode === 'list' ? 'bg-gray-800 text-vibrant-teal' : 'text-gray-500 hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Catalog Grid View or List view */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse flex flex-col rounded-2xl border border-gray-850 bg-obsidian-950/40 p-5 space-y-4">
                    <div className="aspect-video w-full rounded-xl bg-gray-800/40" />
                    <div className="h-4 w-3/4 rounded bg-gray-800/40" />
                    <div className="h-3 w-1/2 rounded bg-gray-800/40" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-5 w-1/3 rounded bg-gray-800/40" />
                      <div className="h-5 w-1/4 rounded bg-gray-800/40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              layoutMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredListings.map((listing) => (
                    <ListingCard 
                      key={listing.id} 
                      listing={listing} 
                      onClick={() => setSelectedListing(listing)} 
                      isFavorite={favorites.includes(listing.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                /* List View layout */
                <div className="space-y-4">
                  {filteredListings.map((listing) => (
                    <div 
                      key={listing.id}
                      onClick={() => setSelectedListing(listing)}
                      className="group flex flex-col sm:flex-row gap-5 p-4 rounded-xl border border-gray-800/80 bg-obsidian-950/60 hover:border-vibrant-teal/30 cursor-pointer transition-all items-center"
                    >
                      <div className="relative aspect-video w-full sm:w-44 shrink-0 rounded-lg overflow-hidden bg-obsidian-950">
                        {listing.status === 'sold' && (
                          <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center text-[10px] font-bold text-red-400 uppercase">
                            Sold Out
                          </div>
                        )}
                        <img 
                          src={listing.images[0]} 
                          alt={listing.title} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60';
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <span className="text-[10px] uppercase font-bold text-vibrant-teal">
                          {listing.category} • {listing.condition}
                        </span>
                        <h4 className="text-base font-bold text-white group-hover:text-vibrant-teal transition-colors">
                          {listing.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{listing.description}</p>
                        <p className="text-xs text-gray-400 font-medium">📍 {listing.location} • Posted {new Date(listing.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0 mt-3 sm:mt-0 flex flex-col items-end gap-2">
                        <div>
                          {listing.originalPrice && (
                            <span className="text-xs text-gray-500 line-through font-mono block">
                              LKR {listing.originalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="text-base font-black text-electric-amber font-mono">
                            LKR {listing.price.toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(listing.id);
                          }}
                          className="p-1.5 rounded-lg bg-obsidian-900 border border-gray-800 hover:border-rose-500/50 hover:bg-obsidian-950 text-gray-400 hover:text-rose-500 transition-all"
                          title={favorites.includes(listing.id) ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.includes(listing.id) ? "text-rose-500 fill-rose-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Empty state */
              <div className="text-center py-20 rounded-2xl border border-dashed border-gray-800 bg-obsidian-950/20 space-y-3">
                <AlertCircle className="w-10 h-10 text-gray-600 mx-auto" />
                <h4 className="text-base font-bold text-white">No Matched Ads found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Try clearing your active filters or searching for another keyword. Let's list some items!
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition-all"
                >
                  Clear Active Filters
                </button>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer Block */}
      <footer className="border-t border-gray-900 bg-obsidian-950/60 py-10 mt-20 text-center text-xs text-gray-500 space-y-2">
        <p className="font-bold text-gray-400">FlashmyDeal Premium Classifieds Catalog</p>
        <p>Decentralized storage engine utilizing secure Firebase authentication and Google Drive REST API worker.</p>
        <p className="font-mono text-[10px]">Version 1.0.0 • Root Node Connected</p>
      </footer>

      {/* Auth Modal Component */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess}
        initialMode={authInitialMode}
      />

      {/* Ad Posting Form Component */}
      {currentUser && (
        <AdPostingForm
          isOpen={postAdOpen}
          onClose={() => setPostAdOpen(false)}
          userId={currentUser.uid}
          userName={currentUser.displayName || userProfile?.displayName || 'Seller'}
          userPhone={userProfile?.phone || ''}
          onSuccess={handleNewListingSuccess}
        />
      )}

      {/* Listing Detail Modal Component */}
      <AnimatePresence>
        {selectedListing && (
          <ListingDetailModal 
            listing={selectedListing} 
            onClose={() => setSelectedListing(null)}
            onMarkAsSold={handleMarkAsSold}
            onDeleteListing={handleDeleteListing}
            currentUserId={currentUser?.uid}
            isFavorite={favorites.includes(selectedListing.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </AnimatePresence>

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-md max-w-md bg-neutral-900 border-neutral-800 text-white"
          >
            {toast.type === 'error' ? (
              <div className="p-1.5 rounded-full bg-red-950 text-red-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1.5 rounded-full bg-emerald-950 text-emerald-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {toast.type === 'error' ? 'Notification / Error' : 'Success'}
              </h4>
              <p className="text-sm text-gray-200 mt-0.5">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-gray-500 hover:text-white transition-colors p-1 cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
