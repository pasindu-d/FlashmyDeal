import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Phone, ShieldAlert, Calendar, User, Tag, ShieldCheck, HelpCircle, Heart } from 'lucide-react';
import { ProductListing } from '../types';

interface ListingDetailModalProps {
  listing: ProductListing | null;
  onClose: () => void;
  onMarkAsSold?: (id: string) => void;
  onDeleteListing?: (id: string) => void;
  currentUserId?: string | null;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function ListingDetailModal({ 
  listing, 
  onClose, 
  onMarkAsSold, 
  onDeleteListing, 
  currentUserId,
  isFavorite = false,
  onToggleFavorite
}: ListingDetailModalProps) {
  if (!listing) return null;

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [revealPhone, setRevealPhone] = useState(false);
  const [confirmSold, setConfirmSold] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const images = listing.images && listing.images.length > 0 
    ? listing.images 
    : ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60'];

  const isOwner = currentUserId && currentUserId === listing.sellerId;
  const isSold = listing.status === 'sold';

  // Calculate savings
  const savings = listing.originalPrice ? listing.originalPrice - listing.price : 0;
  const savingsPct = listing.originalPrice ? Math.round((savings / listing.originalPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl glass-panel glow-teal z-10 max-h-[90vh] flex flex-col bg-obsidian-900/95"
      >
        {/* Glow Top Strip */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-vibrant-teal via-electric-amber to-vibrant-teal" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors p-2 rounded-xl bg-obsidian-950/80 border border-gray-800 hover:bg-obsidian-950"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Body - Scrollable */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Left Side: Images & Gallery (7 cols on Desktop) */}
            <div className="md:col-span-7 space-y-3">
              {/* Main Image View */}
              <div className="relative aspect-video rounded-xl bg-obsidian-950 overflow-hidden border border-gray-800/80 flex items-center justify-center">
                {isSold && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                    <span className="rounded-xl border border-red-500/30 bg-red-950/80 px-4 py-2 text-sm font-black uppercase tracking-widest text-red-400">
                      Sold Out
                    </span>
                  </div>
                )}
                <img
                  src={images[activeImageIdx]}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60';
                  }}
                />
              </div>

              {/* Grid of Thumbnails (strictly up to 4 images) */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2.5">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 bg-obsidian-950 transition-all ${
                        activeImageIdx === idx ? 'border-vibrant-teal scale-[0.98]' : 'border-transparent hover:border-gray-700'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=200&auto=format&fit=crop&q=60';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Mock Map Placeholder */}
              <div className="rounded-xl border border-gray-800/80 bg-obsidian-950/60 p-4 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">Item Location Map</span>
                <div className="relative h-28 rounded-lg bg-obsidian-900 border border-gray-800 overflow-hidden flex items-center justify-center bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="absolute text-center space-y-1">
                    <MapPin className="w-6 h-6 text-vibrant-teal mx-auto animate-bounce" />
                    <span className="text-xs font-semibold text-white">{listing.location}, Sri Lanka</span>
                  </div>
                  {/* Styled grids simulating coordinates */}
                  <span className="absolute bottom-2 right-3 font-mono text-[9px] text-gray-600">6.9271° N, 79.8612° E</span>
                </div>
              </div>
            </div>

            {/* Right Side: Ad Details & Action Area (5 cols on Desktop) */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Category & Condition tags */}
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-obsidian-950 text-vibrant-teal border border-vibrant-teal/20">
                    {listing.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-obsidian-950 text-gray-300 border border-gray-800">
                    {listing.condition}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  {listing.title}
                </h2>

                {/* Location & Date Row */}
                <div className="flex items-center gap-4 text-xs text-gray-400 font-medium border-b border-gray-800 pb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-500" /> {listing.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-500" /> Posted {new Date(listing.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {/* Pricing & Savings */}
                <div className="p-4 rounded-xl bg-obsidian-950/80 border border-gray-800">
                  <span className="text-xs text-gray-500 uppercase font-mono block mb-1">Price</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-electric-amber font-mono tracking-tight">
                      LKR {listing.price.toLocaleString()}
                    </span>
                    {listing.originalPrice && listing.originalPrice > listing.price && (
                      <span className="text-sm text-gray-500 line-through font-mono">
                        LKR {listing.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {listing.originalPrice && listing.originalPrice > listing.price && (
                    <div className="mt-2 text-xs font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-1 rounded-lg inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Save LKR {savings.toLocaleString()} ({savingsPct}% Flash drop!)
                    </div>
                  )}
                </div>

                {/* Seller Info Card */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-obsidian-900">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-vibrant-teal/10 border border-vibrant-teal/30 flex items-center justify-center text-vibrant-teal">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Listed by</p>
                      <p className="text-sm font-bold text-white">{listing.sellerName || 'Verified Seller'}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/10 border border-emerald-500/10 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Profile
                  </span>
                </div>

                {/* Contact phone number button with reveal logic */}
                <div className="space-y-2">
                  {!revealPhone ? (
                    <button
                      onClick={() => setRevealPhone(true)}
                      className="w-full bg-gradient-to-r from-vibrant-teal to-blue-500 hover:opacity-90 text-obsidian-950 font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all"
                    >
                      <Phone className="w-4 h-4 fill-current" />
                      Reveal Seller's Phone Number
                    </button>
                  ) : (
                    <a
                      href={`tel:${listing.phone}`}
                      className="w-full border-2 border-vibrant-teal bg-vibrant-teal/5 text-vibrant-teal hover:bg-vibrant-teal/10 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-mono transition-all glow-teal text-center"
                    >
                      <Phone className="w-4 h-4 fill-current" />
                      {listing.phone}
                      <span className="text-xs font-sans font-normal text-gray-400 ml-2">(Click to Call)</span>
                    </a>
                  )}
                </div>

                {/* Favorite Item Toggle Button */}
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(listing.id)}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all border ${
                      isFavorite
                        ? 'bg-rose-950/20 border-rose-500/40 text-rose-300 hover:bg-rose-950/40 hover:border-rose-500'
                        : 'bg-obsidian-950 border-gray-800 hover:border-gray-700 text-gray-300 hover:bg-obsidian-900'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'text-rose-500 fill-rose-500' : ''}`} />
                    {isFavorite ? 'Saved in Favorites' : 'Keep as Favorite'}
                  </button>
                )}

                {/* Inline Safety Advice Box */}
                <div className="flex items-start gap-3 p-4 bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed">
                  <ShieldAlert className="w-5 h-5 text-electric-amber shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-white">Deal Safety Advice</p>
                    <p>Always inspect items before purchase. Meet in a secure public place. Never pay any advances or transfer money before verifying the product.</p>
                  </div>
                </div>
              </div>

              {/* Owner Actions */}
              {isOwner && (
                <div className="pt-4 border-t border-gray-800 flex flex-col gap-2">
                  {!isSold && onMarkAsSold && (
                    confirmSold ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onMarkAsSold(listing.id);
                            setConfirmSold(false);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          Confirm Mark Sold
                        </button>
                        <button
                          onClick={() => setConfirmSold(false)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmSold(true)}
                        className="w-full bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-500/30 hover:border-emerald-500 text-emerald-200 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
                      >
                        Mark Item as Sold
                      </button>
                    )
                  )}
                  {onDeleteListing && (
                    confirmDelete ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onDeleteListing(listing.id);
                            setConfirmDelete(false);
                          }}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          Confirm Permanently Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full bg-red-950/40 hover:bg-red-950/80 border border-red-500/30 hover:border-red-500 text-red-200 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
                      >
                        Delete Listing Permanently
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Description Block */}
          <div className="space-y-3 pt-6 border-t border-gray-800">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Description</h4>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-obsidian-950/40 p-5 rounded-xl border border-gray-800/60 font-sans">
              {listing.description}
            </p>
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">Keywords</span>
              <div className="flex flex-wrap gap-1.5">
                {listing.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-obsidian-950 border border-gray-800 text-gray-400">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
