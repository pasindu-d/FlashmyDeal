import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Upload, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Sparkles, TrendingDown } from 'lucide-react';
import { CATEGORIES, LOCATIONS, ProductListing } from '../types';
import { apiCreateListing } from '../lib/appsScript';

interface AdPostingFormProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userPhone: string;
  onSuccess: (newListing: ProductListing) => void;
}

export default function AdPostingForm({ isOpen, onClose, userId, userName, userPhone, onSuccess }: AdPostingFormProps) {
  if (!isOpen) return null;

  // Step 1: General Info, Step 2: Upload Images, Step 3: Publish
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState(''); // to support price drop
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<any>('Good');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState(userPhone ? String(userPhone) : '');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Image states
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side image compression
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          // Maintain Aspect Ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.8 quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Blob generation failed'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Helper to convert Blob to Base64 string for reliable serverless JSON payload transfer
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (selectedImages.length + files.length > 4) {
      alert('You can only upload up to exactly 4 product images.');
      return;
    }

    const newImages = files.map((file) => ({
      file: file as File,
      preview: URL.createObjectURL(file as any),
    }));

    setSelectedImages((prev) => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      // Validation for step 1
      if (!title.trim()) { setError('Title is required'); return; }
      if (!price || Number(price) <= 0) { setError('A valid Price is required'); return; }
      if (!category) { setError('Please select a Category'); return; }
      if (!location) { setError('Please select a Location'); return; }
      if (!String(phone || '').trim()) { setError('Contact phone number is required'); return; }
      if (!description.trim()) { setError('Description is required'); return; }
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep((s) => s - 1);
  };

  const handlePublish = async () => {
    if (selectedImages.length === 0) {
      setError('At least one product image is required to publish an ad.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct metadata JSON
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const metadata = {
        title,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        currency: 'LKR' as const,
        category,
        condition,
        location,
        phone,
        description,
        tags,
        sellerId: userId,
        sellerName: userName,
      };

      console.log('Preparing images as Base64 for Google Drive upload...');
      const base64Images = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const imgObj = selectedImages[i];
        let blobToUse: Blob;
        try {
          blobToUse = await compressImage(imgObj.file);
        } catch (compErr) {
          console.warn('Image compression failed, falling back to original file:', compErr);
          blobToUse = imgObj.file;
        }
        
        const base64Data = await blobToBase64(blobToUse);
        base64Images.push({
          name: imgObj.file.name || `compressed_img_${i + 1}.jpg`,
          data: base64Data,
          type: imgObj.file.type || 'image/jpeg'
        });
      }

      console.log('Publishing listing to Google Sheets database...');
      const newListing = await apiCreateListing(metadata, base64Images);
      console.log('Deal published successfully:', newListing);
      
      onSuccess(newListing);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while posting your ad.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      {/* Form Container */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl glass-panel glow-teal bg-obsidian-900/95 max-h-[90vh] flex flex-col z-10"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-electric-amber to-orange-500" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 rounded-xl bg-obsidian-950/80 border border-gray-800 hover:bg-obsidian-950"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Form Header */}
        <div className="p-6 sm:p-8 border-b border-gray-800/80">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-electric-amber fill-current" /> Flash a New Deal
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Publish your ad in Sri Lanka's premium fast-sale catalog.
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-electric-amber' : 'bg-gray-800'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-electric-amber' : 'bg-gray-800'}`} />
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            /* Step 1: General Details */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Listing Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. iPhone 15 Pro Max 256GB"
                  className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Deal Flash Price (LKR)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="E.g. 350000"
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Original Price (LKR) <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="E.g. 400000"
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all font-mono"
                  />
                  {originalPrice && Number(originalPrice) > Number(price) && (
                    <span className="text-[10px] font-bold text-emerald-400 mt-1 block">
                      ✔ Price drop calculation active!
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal transition-all"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal transition-all"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="For Parts">For Parts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">District / Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal transition-all"
                  >
                    <option value="">Select Location</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Contact Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="E.g. 0771234567"
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Keywords / Tags <span className="text-gray-500 font-normal">(Comma-separated)</span></label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="E.g. Apple, Mobile, Sale"
                    className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Item Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about condition, specifications, accessories, warranty, etc."
                  className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                />
              </div>
            </div>
          ) : (
            /* Step 2: Upload Images with Client Side Compression constraint */
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-vibrant-teal/20 bg-vibrant-teal/5 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-vibrant-teal shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 leading-relaxed">
                  <p className="font-bold text-white mb-0.5">Automated Client-Side Image Squeeze Engine Active</p>
                  <p>All product photos are automatically compressed before transmission. This makes publishing extremely fast and keeps the Google Drive hosting folder lightweight and organized.</p>
                </div>
              </div>

              {/* Drag and Drop Uploader Zone */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Product Photos <span className="text-electric-amber font-mono">(Strict ceiling: exactly 1 to 4 images)</span>
                </span>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-800 hover:border-vibrant-teal/40 hover:bg-white/5 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="h-12 w-12 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto text-gray-400 group-hover:text-vibrant-teal group-hover:bg-vibrant-teal/10 transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">Drag & drop or Click to Upload</p>
                  <p className="text-xs text-gray-500">Supports JPEG, PNG, WebP up to 5MB. Compressed automatically.</p>
                </div>
              </div>

              {/* Uploaded Images Previews */}
              {selectedImages.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-gray-400">Selected Photos ({selectedImages.length}/4)</span>
                  <div className="grid grid-cols-4 gap-3">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-gray-800 bg-obsidian-950 group">
                        <img src={img.preview} alt="Upload preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-gray-400 hover:text-white hover:bg-red-600 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 sm:p-8 border-t border-gray-800/80 bg-obsidian-950/30 flex items-center justify-between">
          {step === 2 ? (
            <button
              onClick={handlePrevStep}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-800 text-gray-300 hover:bg-white/5 transition-all uppercase"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              onClick={handleNextStep}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-vibrant-teal to-blue-500 text-obsidian-950 hover:opacity-95 transition-all uppercase tracking-wider"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={loading || selectedImages.length === 0}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-electric-amber to-orange-500 text-obsidian-950 hover:opacity-95 disabled:opacity-50 transition-all uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </>
              ) : (
                'Publish Flash Deal'
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
