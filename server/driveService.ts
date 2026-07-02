import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { ProductListing, UserProfile } from '../src/types';

// Storage directories for local backup / images
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.NETLIFY);
const LOCAL_DATA_DIR = isServerless ? '/tmp/data' : path.join(process.cwd(), 'data');
export const LOCAL_LISTINGS_DIR = path.join(LOCAL_DATA_DIR, 'listings');

let db: any = null;
let storageMode: 'firebase' | 'local_fallback' = 'local_fallback';
let initError: string | null = null;
let memoryRegistry: ProductListing[] = [];

/**
 * Initialize Storage Engine (Firebase Firestore)
 */
export async function initStorage() {
  console.log('Initializing FlashmyDeal Firebase Storage Engine...');
  
  // Create local listings directory for image serving
  try {
    if (!fs.existsSync(LOCAL_LISTINGS_DIR)) {
      fs.mkdirSync(LOCAL_LISTINGS_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create local listings directory:', e);
  }

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const firebaseConfig = JSON.parse(configContent);
      
      console.log('Initializing Firebase App with Project ID:', firebaseConfig.projectId);
      const app = initializeApp(firebaseConfig);
      
      // Initialize Firestore with custom databaseId if specified
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      db = getFirestore(app, dbId);
      storageMode = 'firebase';
      console.log('Firebase Firestore successfully initialized.');

      // Validate connection to Firestore
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log('Firestore connection verified successfully.');
      } catch (connErr: any) {
        console.warn('Firestore connection check completed. Initialization continues:', connErr.message);
      }
      
      // Hydrate registry memory cache from Firestore
      await refreshRegistry();
    } else {
      console.warn('firebase-applet-config.json not found. Falling back to memory storage.');
      storageMode = 'local_fallback';
    }
  } catch (err: any) {
    console.error('Failed to initialize Firebase Storage:', err);
    storageMode = 'local_fallback';
    initError = err.message || String(err);
  }
}

/**
 * Get Storage Status
 */
export function getStorageStatus() {
  return {
    mode: storageMode === 'firebase' ? 'firebase' : 'local_fallback',
    rootFolderId: 'firebase_firestore',
    connected: storageMode === 'firebase',
    itemCount: memoryRegistry.length,
    serviceAccountEmail: null,
    error: initError,
  };
}

/**
 * Get Global Listings Registry
 */
export async function getGlobalRegistry(): Promise<ProductListing[]> {
  if (memoryRegistry.length === 0) {
    await refreshRegistry();
  }
  return memoryRegistry;
}

/**
 * Refresh/Sync registry from storage source
 */
export async function refreshRegistry(): Promise<ProductListing[]> {
  if (storageMode === 'firebase' && db) {
    try {
      console.log('Fetching listings from Firestore...');
      const querySnapshot = await getDocs(collection(db, 'listings'));
      const listings: ProductListing[] = [];
      querySnapshot.forEach((document) => {
        listings.push(document.data() as ProductListing);
      });
      // Sort listings by timestamp descending to show new deals first
      listings.sort((a, b) => b.timestamp - a.timestamp);
      memoryRegistry = listings;
      console.log(`Successfully fetched ${listings.length} listings from Firestore.`);
    } catch (e: any) {
      console.error('Failed to refresh listings from Firestore:', e);
    }
  }
  return memoryRegistry;
}

/**
 * Get User Profile
 */
export async function getUser(userId: string): Promise<UserProfile | null> {
  const safeId = userId.replace(/[^a-zA-Z0-9_\-]/g, '');
  if (storageMode === 'firebase' && db) {
    try {
      const userDoc = await getDoc(doc(db, 'users', safeId));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
    } catch (e) {
      console.error(`Failed to read user ${userId} from Firestore:`, e);
    }
  }
  return null;
}

/**
 * Save User Profile
 */
export async function saveUser(userId: string, profile: UserProfile): Promise<void> {
  const safeId = userId.replace(/[^a-zA-Z0-9_\-]/g, '');
  if (storageMode === 'firebase' && db) {
    try {
      await setDoc(doc(db, 'users', safeId), profile);
      console.log(`User ${userId} successfully saved to Firestore.`);
    } catch (e) {
      console.error(`Failed to save user ${userId} to Firestore:`, e);
      throw e;
    }
  }
}

/**
 * Save New Product Listing (including image uploads)
 */
export async function saveListing(
  listing: ProductListing,
  uploadedImages: { originalname: string; buffer: Buffer; mimetype: string }[]
): Promise<ProductListing> {
  const listingId = listing.id;
  const safeListingId = listingId.replace(/[^a-zA-Z0-9_\-]/g, '');
  
  const savedImagesUrls: string[] = [];

  // Local directory setup for storing images
  const localListingDir = path.join(LOCAL_LISTINGS_DIR, safeListingId);
  try {
    if (!fs.existsSync(localListingDir)) {
      fs.mkdirSync(localListingDir, { recursive: true });
    }
  } catch (e) {
    console.error(`Failed to create local directory for listing ${listingId}:`, e);
  }

  // Save images locally and generate URLs
  for (let i = 0; i < uploadedImages.length; i++) {
    const img = uploadedImages[i];
    const imgName = `img${i + 1}.jpg`;
    try {
      fs.writeFileSync(path.join(localListingDir, imgName), img.buffer);
    } catch (localWriteErr) {
      console.error(`Failed to write local image ${imgName}:`, localWriteErr);
    }
    // Serve via local express route `/api/images/:listingId/:imgName`
    savedImagesUrls.push(`/api/images/${safeListingId}/${imgName}`);
  }

  const finalizedListing: ProductListing = {
    ...listing,
    images: savedImagesUrls,
  };

  // Write metadata file locally as a backup
  try {
    fs.writeFileSync(
      path.join(localListingDir, 'metadata.json'),
      JSON.stringify(finalizedListing, null, 2)
    );
  } catch (e) {
    console.error(`Failed to write metadata for ${listingId} locally:`, e);
  }

  // Write to Firestore
  if (storageMode === 'firebase' && db) {
    try {
      await setDoc(doc(db, 'listings', safeListingId), finalizedListing);
      console.log(`Listing ${listingId} successfully saved to Firestore.`);
    } catch (e) {
      console.error(`Failed to save listing ${listingId} to Firestore:`, e);
      throw e;
    }
  }

  // Update memory cache
  const updatedListings = memoryRegistry.filter(l => l.id !== listingId);
  updatedListings.unshift(finalizedListing);
  memoryRegistry = updatedListings;

  // Update Seller's profile listingRefs
  const seller = await getUser(listing.sellerId);
  if (seller) {
    const listingRefs = seller.listingRefs || [];
    if (!listingRefs.includes(listingId)) {
      listingRefs.push(listingId);
      await saveUser(listing.sellerId, {
        ...seller,
        listingRefs,
      });
    }
  }

  return finalizedListing;
}

/**
 * Update Listing Status (e.g., mark as SOLD)
 */
export async function updateListingStatus(listingId: string, status: 'active' | 'sold' | 'inactive'): Promise<void> {
  const safeId = listingId.replace(/[^a-zA-Z0-9_\-]/g, '');

  // Update in memory cache
  const index = memoryRegistry.findIndex(l => l.id === listingId);
  if (index !== -1) {
    memoryRegistry[index].status = status;
  }

  // Update local metadata file
  const localPath = path.join(LOCAL_LISTINGS_DIR, safeId, 'metadata.json');
  if (fs.existsSync(localPath)) {
    try {
      const content = fs.readFileSync(localPath, 'utf8');
      const data = JSON.parse(content);
      data.status = status;
      fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Failed to update local metadata for ${listingId}:`, e);
    }
  }

  // Update in Firestore
  if (storageMode === 'firebase' && db) {
    try {
      await updateDoc(doc(db, 'listings', safeId), { status });
      console.log(`Listing ${listingId} status updated to "${status}" in Firestore.`);
    } catch (e) {
      console.error(`Failed to update listing status for ${listingId} in Firestore:`, e);
      throw e;
    }
  }
}

/**
 * Delete a Product Listing from the registry, local files, and Firestore
 */
export async function deleteListing(listingId: string): Promise<void> {
  const safeId = listingId.replace(/[^a-zA-Z0-9_\-]/g, '');

  const listingToDelete = memoryRegistry.find(l => l.id === listingId);
  memoryRegistry = memoryRegistry.filter(l => l.id !== listingId);

  // Remove from Seller's profile listingRefs if listingToDelete exists
  if (listingToDelete) {
    const sellerId = listingToDelete.sellerId;
    const seller = await getUser(sellerId);
    if (seller) {
      const listingRefs = (seller.listingRefs || []).filter(ref => ref !== listingId);
      await saveUser(sellerId, {
        ...seller,
        listingRefs,
      });
    }
  }

  // Delete local directory and files
  const localListingDir = path.join(LOCAL_LISTINGS_DIR, safeId);
  if (fs.existsSync(localListingDir)) {
    try {
      fs.rmSync(localListingDir, { recursive: true, force: true });
      console.log(`Local directory deleted for listing ${listingId}`);
    } catch (e) {
      console.error(`Failed to delete local directory for listing ${listingId}:`, e);
    }
  }

  // Delete from Firestore
  if (storageMode === 'firebase' && db) {
    try {
      await deleteDoc(doc(db, 'listings', safeId));
      console.log(`Listing ${listingId} deleted from Firestore.`);
    } catch (e) {
      console.error(`Failed to delete listing ${listingId} from Firestore:`, e);
      throw e;
    }
  }
}
