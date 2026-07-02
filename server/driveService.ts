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
import firebaseAppletConfig from '../firebase-applet-config.json';

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
    let firebaseConfig: any = null;

    // 1. Try Environment Variables
    if (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY) {
      console.log('Firebase credentials detected in environment variables.');
      firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || process.env.VITE_FIREBASE_MEASUREMENT_ID || "",
        firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-flashmydeal-39b0a400-2e3e-40fe-9014-754e57123583"
      };
    } else if (process.env.FIREBASE_CONFIG) {
      console.log('FIREBASE_CONFIG JSON detected in environment variables.');
      try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch (parseErr) {
        console.error('Failed to parse FIREBASE_CONFIG env variable:', parseErr);
      }
    }

    // 2. Try file-system check (local development)
    if (!firebaseConfig) {
      const pathsToTry = [
        path.join(process.cwd(), 'firebase-applet-config.json'),
        path.join(process.cwd(), '..', 'firebase-applet-config.json'),
        path.join(__dirname, 'firebase-applet-config.json'),
        path.join(__dirname, '..', 'firebase-applet-config.json'),
        path.join(__dirname, '..', '..', 'firebase-applet-config.json')
      ];

      for (const configPath of pathsToTry) {
        if (fs.existsSync(configPath)) {
          console.log(`Found firebase-applet-config.json at: ${configPath}`);
          try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            firebaseConfig = JSON.parse(configContent);
            break;
          } catch (readErr) {
            console.error(`Failed to read/parse config from ${configPath}:`, readErr);
          }
        }
      }
    }

    // 3. Static bundle-time import fallback (embedded directly inside the bundle output)
    if (!firebaseConfig) {
      try {
        console.log('Attempting to use statically bundled firebase credentials fallback...');
        firebaseConfig = firebaseAppletConfig;
      } catch (staticErr) {
        console.warn('Statically bundled config not available or failed:', staticErr);
      }
    }

    // 4. Override or fallback to user's "flashmydeal" Firebase config when running on Vercel (or if config is empty)
    const isVercel = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.NETLIFY);
    const hasCustomEnv = !!(process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_CONFIG);
    
    if ((isVercel && !hasCustomEnv) || !firebaseConfig) {
      console.log('Vercel environment or empty config detected. Defaulting to production "flashmydeal" Firebase configuration.');
      firebaseConfig = {
        apiKey: "AIzaSyDQpQA5eiW8aHgl6P-s1JNnhQRaX_tpnD0",
        authDomain: "flashmydeal.firebaseapp.com",
        projectId: "flashmydeal",
        storageBucket: "flashmydeal.firebasestorage.app",
        messagingSenderId: "239151602196",
        appId: "1:239151602196:web:83804b1242027c5a566501",
        measurementId: "G-JDP6ZGWGNL",
        firestoreDatabaseId: "(default)"
      };
    }

    if (firebaseConfig && firebaseConfig.projectId) {
      console.log('Initializing Firebase App with Project ID:', firebaseConfig.projectId);
      const app = initializeApp(firebaseConfig);
      
      // Initialize Firestore with custom databaseId if specified
      let dbId = '(default)';
      if (firebaseConfig.firestoreDatabaseId) {
        dbId = firebaseConfig.firestoreDatabaseId;
      } else if (firebaseConfig.projectId === 'soulmatch-d86d7') {
        dbId = 'ai-studio-flashmydeal-39b0a400-2e3e-40fe-9014-754e57123583';
      }

      db = getFirestore(app, dbId);
      storageMode = 'firebase';
      console.log(`Firebase Firestore successfully initialized using database: ${dbId}`);

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
      console.warn('No Firebase configuration could be resolved. Falling back to local/memory storage.');
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
