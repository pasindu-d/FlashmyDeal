import { ProductListing, UserProfile } from '../types';

// Storage keys
const APPS_SCRIPT_URL_KEY = 'flashmydeal_apps_script_url';
const LOCAL_LISTINGS_KEY = 'flashmydeal_local_listings';
const LOCAL_USERS_KEY = 'flashmydeal_local_users';

// Seed initial data for local offline mode if none exists
const SEED_LISTINGS: ProductListing[] = [
  {
    id: 'listing_seed_1',
    title: 'iPhone 14 Pro Max 256GB - Space Black',
    price: 295000,
    originalPrice: 340000,
    currency: 'LKR',
    category: 'Electronics',
    condition: 'Excellent',
    location: 'Colombo',
    description: 'Selling my personal iPhone 14 Pro Max 256GB in Space Black. Zero scratches, kept in a Spigen case since day one. Battery health is at 91%. Comes with original box, unused USB-C to Lightning cable, and a free premium screen protector already applied. Selling due to upgrading.',
    tags: ['apple', 'iphone', 'mobile', 'phone'],
    timestamp: Date.now() - 3600000 * 2, // 2 hours ago
    sellerId: 'seed_seller_1',
    sellerName: 'Shanaka Perera',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80'],
    phone: '0771234567'
  },
  {
    id: 'listing_seed_2',
    title: 'Toyota Vitz 2018 Safety Edition III',
    price: 6850000,
    originalPrice: 7200000,
    currency: 'LKR',
    category: 'Vehicles',
    condition: 'Like New',
    location: 'Kandy',
    description: 'Toyota Vitz Safety Edition 3, manufactured in 2018, registered in 2019 (CBG-XXXX). First owner, genuine low mileage of 42,000 km with complete Toyota Lanka service history. Pearl White color, black interior, auto braking system, lane departure warning, and original Japanese player with reverse camera. Absolutely mint condition car.',
    tags: ['toyota', 'vitz', 'car', 'vehicle'],
    timestamp: Date.now() - 3600000 * 5, // 5 hours ago
    sellerId: 'seed_seller_2',
    sellerName: 'Nishantha Silva',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80'],
    phone: '0714567890'
  },
  {
    id: 'listing_seed_3',
    title: 'Modern Fabric L-Shape Sofa Set',
    price: 55000,
    originalPrice: 75000,
    currency: 'LKR',
    category: 'Home & Garden',
    condition: 'Excellent',
    location: 'Gampaha',
    description: 'Contemporary L-shaped 5-seater sofa with premium grey fabric upholstery. Super comfortable high-density foam cushions and sturdy solid wood frame. Only used for 8 months in a pet-free and smoke-free home. Selling because we are moving to a smaller apartment. No stains or tears.',
    tags: ['sofa', 'furniture', 'living', 'home'],
    timestamp: Date.now() - 3600000 * 12, // 12 hours ago
    sellerId: 'seed_seller_3',
    sellerName: 'Dilini Fernando',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80'],
    phone: '0769876543'
  },
  {
    id: 'listing_seed_4',
    title: 'Sony WH-1000XM4 Noise Cancelling Headphones',
    price: 49000,
    originalPrice: 65000,
    currency: 'LKR',
    category: 'Electronics',
    condition: 'Like New',
    location: 'Colombo',
    description: 'Sony WH-1000XM4 wireless active noise-cancelling over-ear headphones in Silver. Industry-leading ANC, amazing sound quality, and up to 30 hours of battery life. Used extremely rarely for zoom calls. Practically brand new with original carrying case, 3.5mm cable, and USB charging cable.',
    tags: ['sony', 'headphones', 'audio', 'anc'],
    timestamp: Date.now() - 3600000 * 24, // 1 day ago
    sellerId: 'seed_seller_4',
    sellerName: 'Ruwan Wijesinghe',
    status: 'sold',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
    phone: '0751112223'
  }
];

// Get Apps Script URL from env or local storage config
export function getAppsScriptUrl(): string {
  const customUrl = localStorage.getItem(APPS_SCRIPT_URL_KEY);
  if (customUrl && customUrl.trim().startsWith('http')) {
    return customUrl.trim();
  }
  // Try to use environment variable if set
  const envUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL;
  if (envUrl && envUrl.trim().startsWith('http')) {
    return envUrl.trim();
  }
  // Default fallback to user's deployed production Google Apps Script Web App
  return 'https://script.google.com/macros/s/AKfycbwa8W5RrBnTWRkNEbl3thkO_KsmXKi1OMbWcsaNb1glVe2w8TSV-k63l_1u5Ce9UK5GtA/exec';
}

export function setAppsScriptUrl(url: string): void {
  if (url && url.trim().startsWith('http')) {
    localStorage.setItem(APPS_SCRIPT_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(APPS_SCRIPT_URL_KEY);
  }
}

export function isUsingAppsScript(): boolean {
  return getAppsScriptUrl().length > 0;
}

// Local listings persistence helper
export function sanitizeListings(rawListings: any[]): ProductListing[] {
  if (!Array.isArray(rawListings)) return [];
  return rawListings
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => {
      const cleanItem: any = { ...item };
      
      if (!cleanItem.id) {
        cleanItem.id = 'listing_' + Math.random().toString(36).substring(2, 11);
      }
      
      const parsedPrice = parseFloat(cleanItem.price);
      cleanItem.price = isNaN(parsedPrice) ? 0 : parsedPrice;
      
      if (cleanItem.originalPrice !== undefined && cleanItem.originalPrice !== null && cleanItem.originalPrice !== '') {
        const parsedOrig = parseFloat(cleanItem.originalPrice);
        cleanItem.originalPrice = isNaN(parsedOrig) ? undefined : parsedOrig;
      } else {
        cleanItem.originalPrice = undefined;
      }
      
      const parsedTime = Number(cleanItem.timestamp);
      cleanItem.timestamp = isNaN(parsedTime) || !parsedTime ? Date.now() : parsedTime;
      
      let imgList: string[] = [];
      if (cleanItem.images) {
        if (Array.isArray(cleanItem.images)) {
          imgList = cleanItem.images;
        } else if (typeof cleanItem.images === 'string') {
          try {
            const parsedImages = JSON.parse(cleanItem.images);
            if (Array.isArray(parsedImages)) {
              imgList = parsedImages;
            } else {
              imgList = [cleanItem.images];
            }
          } catch {
            imgList = cleanItem.images.split(',').map((u: string) => u.trim()).filter(Boolean);
          }
        }
      }
      cleanItem.images = imgList.map(cleanGoogleDriveUrl);
      if (cleanItem.images.length === 0) {
        cleanItem.images = ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60'];
      }
      
      let tagList: string[] = [];
      if (cleanItem.tags) {
        if (Array.isArray(cleanItem.tags)) {
          tagList = cleanItem.tags;
        } else if (typeof cleanItem.tags === 'string') {
          try {
            const parsedTags = JSON.parse(cleanItem.tags);
            if (Array.isArray(parsedTags)) {
              tagList = parsedTags;
            } else {
              tagList = [cleanItem.tags];
            }
          } catch {
            tagList = cleanItem.tags.split(/[,\s]+/).map((t: string) => t.trim()).filter(Boolean);
          }
        }
      }
      cleanItem.tags = tagList.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean);
      
      cleanItem.title = cleanItem.title ? String(cleanItem.title).trim() : 'Untitled Deal';
      cleanItem.category = cleanItem.category ? String(cleanItem.category).trim() : 'Other';
      cleanItem.condition = cleanItem.condition ? String(cleanItem.condition).trim() : 'Good';
      cleanItem.location = cleanItem.location ? String(cleanItem.location).trim() : 'Colombo';
      cleanItem.description = cleanItem.description ? String(cleanItem.description).trim() : '';
      cleanItem.status = cleanItem.status === 'sold' || cleanItem.status === 'inactive' ? cleanItem.status : 'active';
      cleanItem.phone = cleanItem.phone ? String(cleanItem.phone).trim() : '';
      
      return cleanItem as ProductListing;
    });
}

function getLocalListings(): ProductListing[] {
  const localData = localStorage.getItem(LOCAL_LISTINGS_KEY);
  let list: any[] = [];
  if (!localData) {
    localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(SEED_LISTINGS));
    list = SEED_LISTINGS;
  } else {
    try {
      list = JSON.parse(localData);
    } catch {
      list = SEED_LISTINGS;
    }
  }
  return sanitizeListings(list);
}

function saveLocalListings(listings: ProductListing[]): void {
  localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(listings));
}

// Local users persistence helper
function getLocalUserProfile(uid: string): UserProfile | null {
  const localUsers = localStorage.getItem(LOCAL_USERS_KEY);
  if (!localUsers) return null;
  try {
    const users: Record<string, UserProfile> = JSON.parse(localUsers);
    const profile = users[uid] || null;
    if (profile && typeof profile === 'object') {
      if (typeof profile.verifiedStatus === 'string') {
        profile.verifiedStatus = (profile.verifiedStatus as string).toLowerCase() === 'true';
      } else {
        profile.verifiedStatus = !!profile.verifiedStatus;
      }
    }
    return profile;
  } catch {
    return null;
  }
}

function saveLocalUserProfile(profile: UserProfile): void {
  const localUsers = localStorage.getItem(LOCAL_USERS_KEY);
  let users: Record<string, UserProfile> = {};
  if (localUsers) {
    try {
      users = JSON.parse(localUsers);
    } catch {
      users = {};
    }
  }
  users[profile.uid] = profile;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

// Helper to transform Google Drive direct URLs into bulletproof hotlinking display URLs
export function cleanGoogleDriveUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;
  
  const match = url.match(/(?:id=|d\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
  }
  return url;
}

/**
 * FETCH ALL LISTINGS
 */
export async function apiFetchListings(): Promise<ProductListing[]> {
  const url = getAppsScriptUrl();
  if (!url) {
    console.log('[AppsScript Client] No Apps Script URL configured. Using local mock storage listings.');
    return getLocalListings();
  }

  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&action=listings`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.error) {
      throw new Error(data.error);
    }
    
    const rawListings = Array.isArray(data) ? data : [];
    return sanitizeListings(rawListings);
  } catch (err: any) {
    console.error('[AppsScript Client] Fetching from Apps Script failed, using local fallback:', err);
    // Keep local storage listings intact in case Google is down or URL has CORS issues
    return getLocalListings();
  }
}

/**
 * GET USER PROFILE
 */
export async function apiGetUserProfile(uid: string): Promise<UserProfile | null> {
  const url = getAppsScriptUrl();
  if (!url) {
    return getLocalUserProfile(uid);
  }

  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&action=getUser&uid=${encodeURIComponent(uid)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.error) {
      // User probably not found or sheet error - check if they exist locally to sync up
      const localProfile = getLocalUserProfile(uid);
      if (localProfile) {
        console.log('[AppsScript Client] Auto-syncing local user profile to Google Sheets:', localProfile);
        apiSaveUserProfile(localProfile).catch((e) => {
          console.error('[AppsScript Client] Failed to auto-sync local profile:', e);
        });
      }
      return localProfile;
    }
    
    // Normalize verifiedStatus to boolean
    if (data && typeof data === 'object') {
      if (typeof data.verifiedStatus === 'string') {
        data.verifiedStatus = data.verifiedStatus.toLowerCase() === 'true';
      } else {
        data.verifiedStatus = !!data.verifiedStatus;
      }
    }
    return data;
  } catch (err) {
    console.error('[AppsScript Client] Fetching user from Apps Script failed:', err);
    return getLocalUserProfile(uid);
  }
}

/**
 * SAVE USER PROFILE
 */
export async function apiSaveUserProfile(profile: UserProfile): Promise<boolean> {
  // Always update locally for snappy UX
  saveLocalUserProfile(profile);

  const url = getAppsScriptUrl();
  if (!url) return true;

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        payload: {
          action: 'saveUser',
          profile
        }
      })
    });
    return true;
  } catch (err) {
    console.error('[AppsScript Client] Saving user profile to Apps Script failed:', err);
    return false;
  }
}

/**
 * CREATE A NEW PRODUCT LISTING
 */
export async function apiCreateListing(
  metadata: Omit<ProductListing, 'id' | 'timestamp' | 'status' | 'images'>,
  images: { name: string; data: string; type: string }[]
): Promise<ProductListing> {
  const url = getAppsScriptUrl();
  if (!url) {
    console.log('[AppsScript Client] Offline Mode: Saving listing locally.');
    // Generate mock listing locally
    const mockId = `listing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockListing: ProductListing = {
      ...metadata,
      id: mockId,
      timestamp: Date.now(),
      status: 'active',
      images: images.map(img => img.data) // save base64 string directly for client preview
    };

    const listings = getLocalListings();
    listings.unshift(mockListing);
    saveLocalListings(listings);
    return mockListing;
  }

  try {
    // Send to Google Apps Script Web App
    const payload = {
      action: 'createListing',
      ...metadata,
      images
    };

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        payload
      })
    });

    if (!response.ok) {
      let errMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }

    const newListing = await response.json();
    if (newListing && newListing.error) {
      throw new Error(newListing.error);
    }

    if (newListing && newListing.images && Array.isArray(newListing.images)) {
      newListing.images = newListing.images.map(cleanGoogleDriveUrl);
    }

    // Sync locally
    const listings = getLocalListings();
    listings.unshift(newListing);
    saveLocalListings(listings);

    return newListing;
  } catch (err: any) {
    console.error('[AppsScript Client] Publishing to Apps Script failed:', err);
    throw new Error(err.message || err);
  }
}

/**
 * UPDATE STATUS OF LISTING
 */
export async function apiUpdateListingStatus(id: string, status: 'active' | 'sold' | 'inactive'): Promise<boolean> {
  // Update locally first
  const listings = getLocalListings();
  const listingIdx = listings.findIndex(l => l.id === id);
  if (listingIdx > -1) {
    listings[listingIdx].status = status;
    saveLocalListings(listings);
  }

  const url = getAppsScriptUrl();
  if (!url) return true;

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        payload: {
          action: 'updateStatus',
          id,
          status
        }
      })
    });

    if (!response.ok) {
      let errMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (result && result.error) {
      throw new Error(result.error);
    }
    return !!(result && result.success);
  } catch (err: any) {
    console.error('[AppsScript Client] Updating status in Apps Script failed:', err);
    throw new Error(err.message || err);
  }
}

/**
 * DELETE LISTING
 */
export async function apiDeleteListing(id: string): Promise<boolean> {
  // Update locally first
  const listings = getLocalListings();
  const updated = listings.filter(l => l.id !== id);
  saveLocalListings(updated);

  const url = getAppsScriptUrl();
  if (!url) return true;

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        payload: {
          action: 'deleteListing',
          id
        }
      })
    });

    if (!response.ok) {
      let errMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (result && result.error) {
      throw new Error(result.error);
    }
    return !!(result && result.success);
  } catch (err: any) {
    console.error('[AppsScript Client] Deleting listing in Apps Script failed:', err);
    throw new Error(err.message || err);
  }
}

/**
 * SEND CUSTOM VERIFICATION EMAIL VIA GOOGLE APPS SCRIPT
 */
export async function apiSendVerificationEmail(email: string, name: string, code: string): Promise<boolean> {
  const url = getAppsScriptUrl();
  if (!url) {
    console.log('[AppsScript Client] Offline Mode: Mock sending verification email.');
    return true;
  }

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        payload: {
          action: 'sendVerificationEmail',
          email,
          name,
          code
        }
      })
    });
    const data = await response.json();
    return !!(data && data.success);
  } catch (err) {
    console.error('[AppsScript Client] Sending verification email failed:', err);
    return false;
  }
}
