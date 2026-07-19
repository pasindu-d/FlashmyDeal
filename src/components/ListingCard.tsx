import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Tag, Calendar, Sparkles, TrendingDown, ShieldCheck, Heart } from 'lucide-react';
import { ProductListing } from '../types';

interface ListingCardProps {
  key?: any;
  listing: ProductListing;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function ListingCard({ listing, onClick, isFavorite = false, onToggleFavorite }: ListingCardProps) {
  const isSold = listing.status === 'sold';
  
  // Format price drop percentage
  const price = Number(listing.price) || 0;
  const originalPrice = listing.originalPrice ? Number(listing.originalPrice) : undefined;
  const priceDropAmount = originalPrice ? originalPrice - price : 0;
  const priceDropPct = originalPrice 
    ? Math.round((priceDropAmount / originalPrice) * 100) 
    : 0;

  // Format date relative or neat format
  const timestamp = Number(listing.timestamp) || Date.now();
  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      layout
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl glass-panel glass-panel-hover cursor-pointer"
    >
      {/* Sold Overlay */}
      {isSold && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="rounded-xl border border-red-500/30 bg-red-950/80 px-4 py-2 text-sm font-black uppercase tracking-widest text-red-400 rotate-[-5deg]">
            Sold Out
          </div>
        </div>
      )}

      {/* Image Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-obsidian-950">
        
        {/* Price Drop Badge (Top Left) */}
        {originalPrice && originalPrice > price && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-electric-amber text-obsidian-950 shadow-[0_4px_10px_rgba(255,159,10,0.3)] animate-bounce">
            <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />
            <span>-{priceDropPct}% Price Flash</span>
          </div>
        )}

        {/* Category Badge (Top Right) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-obsidian-900/90 text-vibrant-teal border border-vibrant-teal/20 backdrop-blur-md">
          <Tag className="w-2.5 h-2.5" />
          <span>{listing.category}</span>
        </div>

        {/* Listing Image */}
        {listing.images && listing.images.length > 0 ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Fallback placeholder image if Google Drive link fails to load
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-obsidian-900 text-gray-500 text-xs">
            No Images Available
          </div>
        )}

        {/* Condition tag */}
        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider bg-black/60 text-gray-300 backdrop-blur-sm">
          {listing.condition}
        </div>

        {/* Favorite Heart Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(listing.id);
            }}
            className="absolute bottom-2.5 right-3 z-20 p-1.5 rounded-lg bg-obsidian-900/90 border border-gray-800 hover:border-rose-500/50 hover:bg-obsidian-950 text-gray-400 hover:text-rose-500 transition-all backdrop-blur-md"
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? "text-rose-500 fill-rose-500" : ""}`} />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-vibrant-teal transition-colors line-clamp-1 leading-snug mb-2">
          {listing.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4 font-medium">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-600" />
            {listing.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-600" />
            {formattedDate}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-800/80 mb-4" />

        {/* Price Section */}
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-gray-500 line-through font-mono">
                LKR {originalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-lg font-black text-electric-amber font-mono tracking-tight">
              LKR {price.toLocaleString()}
            </span>
          </div>

          {/* Seller Verified badge */}
          {listing.sellerName && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Seller
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
