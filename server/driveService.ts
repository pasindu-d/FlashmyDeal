import fs from 'fs';
import path from 'path';
import { JWT } from 'google-auth-library';
import { ProductListing, UserProfile } from '../src/types';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1uogikRic7Gm7ZipK5GRGRyOvt9hSKiQM';
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'my-listings-drive@flashmydeal-501107.iam.gserviceaccount.com';
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC8ar6LDY+qqzzy\nWeK+VxhC5/b4g0ONGUvzomJi6XDv1kS5xa/XtZALPOl1MTyATXxpE4WgNa+aYn73\n5Iy96eBQClyFyxTG7cvSda5FIfDEbUNm2lLfYZyYvKDEUhPf2pNBpexhLT/1Q4L3\nj+sxlwNO4YeEPCx4HsTLEVkaVWR9d8w1fLhLJyOfYdNOF2MCNpmPCu3xVMx+io7I\nWvj/g2LZtv9xdQHvT/ddY1drWp7k+Zl80ORx4zAU3uAc6sMrL3IEfkTkFZPDMQPO\nTncMPqsg5XAwYtYylddMc87IkqnFr5aWJoHVJKmj3zulvuVYUxHjHWWm986G+oZe\nKlUCGWjRAgMBAAECggEAOUT4xatJj8acr81Cbjhq12tKVh8P2UNnIpao8QejnEK0\ngQLlf9tf/Qp2q3hbu2PR/N5CL4Ah7/sgPJjrbo438Bw2IzSnDBAbc8zxO3IljI7p\nfcm+hsdUodgzxXhtMg1t1PZp8t+eIR50IGtOQbR0/PTwC/F+UsSHbHHJc4ehE8Fg\nLpEwd631ccOq3keT2gbhb9BSkDG6/E8kq5hr0vCBXbXR1RK2xiAw/xOT9Bk0hpk+\n8CPYT6rXev+pr98J94fnbN9lEap5HDa4dOwKl7S+eylsbIXLxXMTQreAh1Zzo1Lg\nFw3NoTXlWtmhkYyUd+V3KQtd16KBwQQMFAS6COL2QQKBgQDrFEp5tNr2c3KtIoWX\n0/lwQCASxKHG7Z3Ju0ZdwGUd+Kpu3vjiASfynQ9shtmAnSOIKKrWrHAs8FaqFmB3\n+0wimtN1isfTkv7+FhvTnlxnP1lp6LDRYgakyCQtVN1apVoSWgtgnyHDqfBvAnzs\ndNjj42hOonVKUEdh6lWMoJYEkwKBgQDNL13ZTo433hd+kBZkjevLDBFG6gW+cigu\mmFp9O+JlHcVQ6xLM/p8BZBU5ShiWBvofq0+qg+a0SnFJRDZmVklMuJNlmEleWYw\nwCjGVj7r4DYuthYM5SLtjxIbm029a4IXvn9pzvL7JVUKLkhE6VAKCLjogiQD3Ca9\nVPo7JiB/iwKBgGfg74gYgymkmmgneSE+altP+txQR6zAE5mxR8bl3ckAuU+E+DXm\njOCIxugOLs7GoYzpa5SxXmB9U86VVMuwIFSqVgb67JJxwnxFCMbak7qMI9bJHFlq\nF8V5K4NcnPQRXVv+rkhkCWeNENH9J3bVq4IIW29kGrBcCS8bffJGhARBAoGAMnGi\nsPoPHM0NGaBy4OXDQngFB1ohb2DBYDO0H0iIW1qUrDWm9hYhTrxPb4+nDgZ7Vf1O\nnukk07OrfSgiCy/xXXj3URR7jY0MlTHbxj1FExtioeXNqmGD85Up3OTJFOnxjz1K\nIH0wX24eKhKW0dpKQy1ByGe2UvycyY9KtZ/5/WECgYBHiiKmGm6xBn9OnCJHrOC4\nRS4S7dJMu/4RggBp27xMyWQap8oXhmzPZSOtLWJtnDQOrzLlnPurPFeuX6ZgEBHs\nsPDATt4P87yoN2aAbT+uyvHsR1P1pnhvT5lt3ay524GPf9Rf4/UHaleEDJ8NewQq\nd3dadMROPGqmFHeaFl/NqA==\n-----END PRIVATE KEY-----\n';

// Paths for local fallback storage
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.NETLIFY);
const LOCAL_DATA_DIR = isServerless ? '/tmp/data' : path.join(process.cwd(), 'data');
const LOCAL_USERS_DIR = path.join(LOCAL_DATA_DIR, 'users');
export const LOCAL_LISTINGS_DIR = path.join(LOCAL_DATA_DIR, 'listings');
const LOCAL_REGISTRY_PATH = path.join(LOCAL_DATA_DIR, 'global_registry.json');

// Memory cache to avoid excessive reads
let memoryRegistry: ProductListing[] = [];
let storageMode: 'google_drive' | 'local_fallback' = 'local_fallback';
let jwtClient: JWT | null = null;

// Initialize folder caches for Drive IDs to prevent lookups
let driveFolderCache: {
  root?: string;
  users?: string;
  listings?: string;
  registryFileId?: string;
} = {};

/**
 * Safely validates if the configured Google Service Account credentials are real and working.
 * Prevents throwing errors or stack traces for dummy '1999' sandbox inputs or mock placeholder keys.
 */
function isValidGoogleCredentials(email: string | null | undefined, key: string | null | undefined): boolean {
  if (!email || !key) return false;
  
  const trimmedEmail = email.trim();
  const trimmedKey = key.trim();
  
  // Exclude sandbox container placeholder values
  if (trimmedEmail === '1999' || trimmedKey === '1999') return false;
  
  // Must be a valid format email
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) return false;
  
  // Must be a PEM formatted private key block
  if (!trimmedKey.includes('-----BEGIN')) return false;
  
  // Must not be the hardcoded mockup placeholder key (which is not a real working key)
  if (trimmedKey.includes('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9CBi')) {
    return false;
  }
  
  return true;
}

/**
 * Clean private key for JWT
 */
function getCleanPrivateKey() {
  if (!PRIVATE_KEY) return null;
  
  let key = PRIVATE_KEY.trim();
  
  // Strip enclosing quotes if they exist (both single and double)
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  
  // Replace literal escaped '\n' sequences with actual newlines
  key = key.replace(/\\n/g, '\n');
  key = key.replace(/\r/g, '');
  
  // Dynamically find and re-format the PEM header, body, and footer
  const match = key.match(/(-----BEGIN [A-Z ]+-----)([\s\S]*?)(-----END [A-Z ]+-----)/);
  if (match) {
    const header = match[1];
    let body = match[2].trim();
    const footer = match[3];
    
    // If the body is formatted as a single line with spaces, replace spaces with newlines
    if (!body.includes('\n') && body.includes(' ')) {
      body = body.split(/\s+/).join('\n');
    }
    
    // Normalize newlines in body to ensure lines are clean base64 chunks
    body = body.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    key = `${header}\n${body}\n${footer}\n`;
  }
  
  return key;
}

/**
 * Initialize JWT client for Google Auth
 */
function getJwtClient(): JWT | null {
  if (jwtClient) return jwtClient;
  const key = getCleanPrivateKey();
  if (!isValidGoogleCredentials(SA_EMAIL, key)) {
    return null;
  }
  try {
    jwtClient = new JWT({
      email: SA_EMAIL!,
      key: key!,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    console.log('Google Auth JWT Client initialized successfully.');
    return jwtClient;
  } catch (e) {
    console.error('Failed to initialize JWT client:', e);
    return null;
  }
}

/**
 * Fetch with Google Auth Token
 */
async function driveApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const client = getJwtClient();
  if (!client) {
    throw new Error('Google Auth not initialized');
  }
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('Failed to obtain Google Access Token');
  }

  const url = endpoint.startsWith('http') ? endpoint : `https://www.googleapis.com/drive/v3${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token.token}`,
    ...(options.headers || {}),
  } as Record<string, string>;

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive API Error: ${response.status} - ${errText}`);
  }
  return response.json();
}

/**
 * Search for a folder or file under a parent ID
 */
async function findDriveItem(name: string, parentId: string, isFolder = false): Promise<string | null> {
  try {
    const mimeQuery = isFolder ? "and mimeType = 'application/vnd.google-apps.folder'" : "";
    const query = encodeURIComponent(`name = '${name}' and '${parentId}' in parents and trashed = false ${mimeQuery}`);
    const data = await driveApiRequest(`/files?q=${query}&fields=files(id)`);
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error finding item "${name}" in parent "${parentId}":`, err);
    return null;
  }
}

/**
 * Create a folder in Google Drive
 */
async function createDriveFolder(name: string, parentId: string): Promise<string> {
  console.log(`Creating Drive folder: "${name}" inside parent "${parentId}"`);
  const data = await driveApiRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  return data.id;
}

/**
 * Create or Update a File in Google Drive using multipart upload
 */
async function saveDriveFile(
  filename: string,
  parentFolderId: string,
  content: string | Buffer,
  mimeType: string,
  existingFileId?: string | null
): Promise<{ id: string; webContentLink?: string }> {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  
  const client = getJwtClient();
  if (!client) throw new Error('Auth client not initialized');
  const token = await client.getAccessToken();

  const boundary = 'xx_boundary_xx';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: filename,
    parents: existingFileId ? undefined : [parentFolderId],
    mimeType: mimeType,
  };

  const multipartBody = Buffer.concat([
    Buffer.from(delimiter),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(delimiter),
    Buffer.from(`Content-Type: ${mimeType}\r\n`),
    Buffer.from('Content-Transfer-Encoding: base64\r\n\r\n'),
    Buffer.from(buffer.toString('base64')),
    Buffer.from(closeDelimiter),
  ]);

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${token.token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive file upload failed: ${response.status} - ${text}`);
  }

  const fileData = await response.json();
  
  // Make the file readable to "anyone" so that image links can load directly
  try {
    await driveApiRequest(`/files/${fileData.id}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (e) {
    console.warn(`Could not set public permissions on file ${fileData.id}. This is fine if already public or running restricted:`, e);
  }

  // Get webContentLink
  const fileInfo = await driveApiRequest(`/files/${fileData.id}?fields=id,webContentLink,webViewLink`);
  
  return {
    id: fileInfo.id,
    webContentLink: fileInfo.webContentLink || `https://docs.google.com/uc?export=download&id=${fileData.id}`,
  };
}

/**
 * Read File Content from Google Drive
 */
async function readDriveFile(fileId: string): Promise<string> {
  const client = getJwtClient();
  if (!client) throw new Error('Auth client not initialized');
  const token = await client.getAccessToken();

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${token.token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file ${fileId}: ${response.status}`);
  }

  return response.text();
}

/**
 * Initialize Storage Engine (Dual-mode)
 */
export async function initStorage() {
  console.log('Initializing FlashmyDeal Storage Engine...');
  
  // Ensure local directories exist (fallback always ready)
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    if (!fs.existsSync(LOCAL_USERS_DIR)) fs.mkdirSync(LOCAL_USERS_DIR, { recursive: true });
    if (!fs.existsSync(LOCAL_LISTINGS_DIR)) fs.mkdirSync(LOCAL_LISTINGS_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create local data directories, continuing with memory fallback:', e);
  }
  
  try {
    if (!fs.existsSync(LOCAL_REGISTRY_PATH)) {
      fs.writeFileSync(LOCAL_REGISTRY_PATH, JSON.stringify({ listings: [] }, null, 2));
      memoryRegistry = [];
    } else {
      const data = fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8');
      memoryRegistry = JSON.parse(data).listings || [];
    }
  } catch (e) {
    console.error('Error handling local registry initialization:', e);
    memoryRegistry = [];
  }

  // Check if we can use Google Drive
  const hasRealCreds = isValidGoogleCredentials(SA_EMAIL, PRIVATE_KEY);
  if (!hasRealCreds) {
    console.log('Google Drive credentials not configured or using sandbox placeholders. Operating in Local Fallback mode.');
    storageMode = 'local_fallback';
    return;
  }

  try {
    console.log('Validating Google Drive permissions for root folder:', ROOT_FOLDER_ID);
    // Try a simple API call to check folder
    const rootMeta = await driveApiRequest(`/files/${ROOT_FOLDER_ID}?fields=id,name`);
    console.log(`Successfully connected to Google Drive folder: "${rootMeta.name}" (${rootMeta.id})`);
    
    driveFolderCache.root = ROOT_FOLDER_ID;
    
    // Look up or create directories
    let usersFolderId = await findDriveItem('users', ROOT_FOLDER_ID, true);
    if (!usersFolderId) {
      usersFolderId = await createDriveFolder('users', ROOT_FOLDER_ID);
    }
    driveFolderCache.users = usersFolderId;

    let listingsFolderId = await findDriveItem('listings', ROOT_FOLDER_ID, true);
    if (!listingsFolderId) {
      listingsFolderId = await createDriveFolder('listings', ROOT_FOLDER_ID);
    }
    driveFolderCache.listings = listingsFolderId;

    let registryFileId = await findDriveItem('global_registry.json', ROOT_FOLDER_ID, false);
    if (!registryFileId) {
      // Create empty registry file in Drive
      const upload = await saveDriveFile('global_registry.json', ROOT_FOLDER_ID, JSON.stringify({ listings: [] }), 'application/json');
      registryFileId = upload.id;
    }
    driveFolderCache.registryFileId = registryFileId;

    // Load registry from Drive into memory cache
    console.log('Loading global registry from Google Drive...');
    const content = await readDriveFile(registryFileId);
    const parsed = JSON.parse(content);
    memoryRegistry = parsed.listings || [];
    storageMode = 'google_drive';
    console.log(`FlashmyDeal is successfully running on Google Drive database with ${memoryRegistry.length} active listings.`);
  } catch (err) {
    console.error('Failed to initialize Google Drive storage. Switching to Local Fallback mode.', err);
    storageMode = 'local_fallback';
  }
}

/**
 * Get Storage Status
 */
export function getStorageStatus() {
  return {
    mode: storageMode,
    rootFolderId: ROOT_FOLDER_ID,
    connected: storageMode === 'google_drive',
    itemCount: memoryRegistry.length,
    serviceAccountEmail: SA_EMAIL || null,
  };
}

/**
 * Get Global Listings Registry
 */
export async function getGlobalRegistry(): Promise<ProductListing[]> {
  // Always return memory cache for extreme speed, synced on writes
  return memoryRegistry;
}

/**
 * Refresh/Sync registry from storage source
 */
export async function refreshRegistry(): Promise<ProductListing[]> {
  if (storageMode === 'google_drive' && driveFolderCache.registryFileId) {
    try {
      const content = await readDriveFile(driveFolderCache.registryFileId);
      const parsed = JSON.parse(content);
      memoryRegistry = parsed.listings || [];
    } catch (e) {
      console.error('Error refreshing Drive registry:', e);
    }
  } else {
    try {
      if (fs.existsSync(LOCAL_REGISTRY_PATH)) {
        const data = fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8');
        memoryRegistry = JSON.parse(data).listings || [];
      }
    } catch (e) {
      console.error('Error refreshing local registry:', e);
    }
  }
  return memoryRegistry;
}

/**
 * Save Global Registry
 */
async function saveGlobalRegistry(listings: ProductListing[]) {
  memoryRegistry = listings;
  
  // Always write locally
  try {
    fs.writeFileSync(LOCAL_REGISTRY_PATH, JSON.stringify({ listings }, null, 2));
  } catch (e) {
    console.error('Failed to save local registry backup:', e);
  }

  // Save to Drive if active
  if (storageMode === 'google_drive' && driveFolderCache.registryFileId) {
    try {
      await saveDriveFile(
        'global_registry.json',
        ROOT_FOLDER_ID,
        JSON.stringify({ listings }),
        'application/json',
        driveFolderCache.registryFileId
      );
      console.log('Global registry successfully synced to Google Drive.');
    } catch (e) {
      console.error('Failed to sync global registry to Google Drive:', e);
    }
  }
}

/**
 * Get User Profile
 */
export async function getUser(userId: string): Promise<UserProfile | null> {
  // Clean userId
  const safeId = userId.replace(/[^a-zA-Z0-9_\-]/g, '');

  if (storageMode === 'google_drive' && driveFolderCache.users) {
    try {
      const fileId = await findDriveItem(`${safeId}.json`, driveFolderCache.users, false);
      if (fileId) {
        const content = await readDriveFile(fileId);
        return JSON.parse(content);
      }
    } catch (e) {
      console.error(`Failed to read user ${userId} from Drive:`, e);
    }
  }

  // Fallback to local
  const localPath = path.join(LOCAL_USERS_DIR, `${safeId}.json`);
  if (fs.existsSync(localPath)) {
    try {
      const content = fs.readFileSync(localPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`Failed to read user ${userId} locally:`, e);
    }
  }

  return null;
}

/**
 * Save User Profile
 */
export async function saveUser(userId: string, profile: UserProfile): Promise<void> {
  const safeId = userId.replace(/[^a-zA-Z0-9_\-]/g, '');

  // Local write
  try {
    const localPath = path.join(LOCAL_USERS_DIR, `${safeId}.json`);
    fs.writeFileSync(localPath, JSON.stringify(profile, null, 2));
  } catch (e) {
    console.error(`Failed to save user ${userId} locally:`, e);
  }

  // Drive write
  if (storageMode === 'google_drive' && driveFolderCache.users) {
    try {
      const existingFileId = await findDriveItem(`${safeId}.json`, driveFolderCache.users, false);
      await saveDriveFile(
        `${safeId}.json`,
        driveFolderCache.users,
        JSON.stringify(profile),
        'application/json',
        existingFileId
      );
      console.log(`User ${userId} successfully synced to Google Drive.`);
    } catch (e) {
      console.error(`Failed to sync user ${userId} to Google Drive:`, e);
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

  // Local storage setup
  const localListingDir = path.join(LOCAL_LISTINGS_DIR, safeListingId);
  try {
    if (!fs.existsSync(localListingDir)) {
      fs.mkdirSync(localListingDir, { recursive: true });
    }
  } catch (e) {
    console.error(`Failed to create local directory for listing ${listingId}:`, e);
  }

  // 1. Handle Images
  if (storageMode === 'google_drive' && driveFolderCache.listings) {
    try {
      // Create listing folder in Drive
      let driveListingFolderId = await findDriveItem(safeListingId, driveFolderCache.listings, true);
      if (!driveListingFolderId) {
        driveListingFolderId = await createDriveFolder(safeListingId, driveFolderCache.listings);
      }

      // Upload each image
      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        const imgName = `img${i + 1}.jpg`;
        
        // Save local copy first
        try {
          fs.writeFileSync(path.join(localListingDir, imgName), img.buffer);
        } catch (localWriteErr) {
          console.warn(`Failed to write local backup of image ${imgName}:`, localWriteErr);
        }

        // Save to Google Drive
        console.log(`Uploading ${imgName} for listing ${listingId} to Drive...`);
        const existingImgId = await findDriveItem(imgName, driveListingFolderId, false);
        const uploadResult = await saveDriveFile(imgName, driveListingFolderId, img.buffer, img.mimetype, existingImgId);
        
        if (uploadResult.webContentLink) {
          savedImagesUrls.push(uploadResult.webContentLink);
        }
      }
    } catch (e) {
      console.error(`Failed to upload images for listing ${listingId} to Drive, falling back to local:`, e);
    }
  }

  // Fallback / local image paths if Drive didn't populate them or we are offline
  if (savedImagesUrls.length === 0) {
    for (let i = 0; i < uploadedImages.length; i++) {
      const img = uploadedImages[i];
      const imgName = `img${i + 1}.jpg`;
      try {
        fs.writeFileSync(path.join(localListingDir, imgName), img.buffer);
      } catch (localWriteErr) {
        console.error(`Failed to write local fallback image ${imgName}:`, localWriteErr);
      }
      // Serve via local express route `/api/images/:listingId/:imgName`
      savedImagesUrls.push(`/api/images/${safeListingId}/${imgName}`);
    }
  }

  // Create full listing object with images populated
  const finalizedListing: ProductListing = {
    ...listing,
    images: savedImagesUrls,
  };

  // Write metadata file
  try {
    fs.writeFileSync(
      path.join(localListingDir, 'metadata.json'),
      JSON.stringify(finalizedListing, null, 2)
    );
  } catch (e) {
    console.error(`Failed to write metadata for ${listingId} locally:`, e);
  }

  if (storageMode === 'google_drive' && driveFolderCache.listings) {
    try {
      const driveListingFolderId = await findDriveItem(safeListingId, driveFolderCache.listings, true);
      if (driveListingFolderId) {
        const existingMetaId = await findDriveItem('metadata.json', driveListingFolderId, false);
        await saveDriveFile(
          'metadata.json',
          driveListingFolderId,
          JSON.stringify(finalizedListing),
          'application/json',
          existingMetaId
        );
        console.log(`Listing metadata for ${listingId} successfully synced to Drive.`);
      }
    } catch (e) {
      console.error(`Failed to sync listing metadata for ${listingId} to Drive:`, e);
    }
  }

  // 2. Add to global_registry.json
  const currentRegistry = await getGlobalRegistry();
  // Filter out any existing item with same ID (just in case of update)
  const updatedListings = currentRegistry.filter(l => l.id !== listingId);
  updatedListings.unshift(finalizedListing); // Prepend to show new deals first
  await saveGlobalRegistry(updatedListings);

  // 3. Update Seller's profile listingRefs
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

  // Find in registry
  const registry = await getGlobalRegistry();
  const index = registry.findIndex(l => l.id === listingId);
  if (index === -1) {
    throw new Error(`Listing ${listingId} not found in registry`);
  }

  // Update memory/registry listing object
  const listing = registry[index];
  listing.status = status;
  await saveGlobalRegistry([...registry]);

  // Update local file metadata
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

  // Update Drive metadata
  if (storageMode === 'google_drive' && driveFolderCache.listings) {
    try {
      const folderId = await findDriveItem(safeId, driveFolderCache.listings, true);
      if (folderId) {
        const metaId = await findDriveItem('metadata.json', folderId, false);
        await saveDriveFile(
          'metadata.json',
          folderId,
          JSON.stringify(listing),
          'application/json',
          metaId
        );
        console.log(`Listing ${listingId} status updated to "${status}" in Google Drive.`);
      }
    } catch (e) {
      console.error(`Failed to sync listing status update for ${listingId} to Drive:`, e);
    }
  }
}

/**
 * Delete an item from Google Drive
 */
async function deleteDriveItem(itemId: string): Promise<void> {
  try {
    const client = getJwtClient();
    if (!client) throw new Error('Google Auth not initialized');
    const token = await client.getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${itemId}`;
    const headers = {
      'Authorization': `Bearer ${token.token}`,
    };
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn(`Failed to delete Drive item ${itemId}: ${response.status} - ${text}`);
    } else {
      console.log(`Drive item ${itemId} deleted successfully.`);
    }
  } catch (err) {
    console.error(`Error deleting Drive item ${itemId}:`, err);
  }
}

/**
 * Delete a Product Listing from the registry, local files, and Google Drive
 */
export async function deleteListing(listingId: string): Promise<void> {
  const safeId = listingId.replace(/[^a-zA-Z0-9_\-]/g, '');

  // 1. Remove from global registry
  const registry = await getGlobalRegistry();
  const listingToDelete = registry.find(l => l.id === listingId);
  const updatedListings = registry.filter(l => l.id !== listingId);
  await saveGlobalRegistry(updatedListings);

  // 2. Remove from Seller's profile listingRefs if listingToDelete exists
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

  // 3. Delete local directory and files
  const localListingDir = path.join(LOCAL_LISTINGS_DIR, safeId);
  if (fs.existsSync(localListingDir)) {
    try {
      fs.rmSync(localListingDir, { recursive: true, force: true });
      console.log(`Local directory deleted for listing ${listingId}`);
    } catch (e) {
      console.error(`Failed to delete local directory for listing ${listingId}:`, e);
    }
  }

  // 4. Delete from Google Drive if active
  if (storageMode === 'google_drive' && driveFolderCache.listings) {
    try {
      const folderId = await findDriveItem(safeId, driveFolderCache.listings, true);
      if (folderId) {
        await deleteDriveItem(folderId);
        console.log(`Drive folder deleted for listing ${listingId}`);
      }
    } catch (e) {
      console.error(`Failed to delete listing ${listingId} from Google Drive:`, e);
    }
  }
}

