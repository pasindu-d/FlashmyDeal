import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { initStorage, getStorageStatus, getGlobalRegistry, getUser, saveUser, saveListing, updateListingStatus, refreshRegistry, LOCAL_LISTINGS_DIR, deleteListing } from './server/driveService';
import { ProductListing, UserProfile } from './src/types';

// Load .env if exists (for local testing)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsing
app.use(express.json({ limit: '10mb' }));

// Set up multer for file uploads (max 4 images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 4,
  }
});

// Lazy Dual-mode storage engine initializer middleware
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!isInitialized) {
    if (!initPromise) {
      console.log('Initializing FlashmyDeal storage engine...');
      initPromise = initStorage().then(() => {
        isInitialized = true;
        console.log('FlashmyDeal storage engine successfully initialized.');
      }).catch(err => {
        initPromise = null; // Reset to allow retry on next request
        throw err;
      });
    }
    await initPromise;
  }
}

// Global initialization check for all API routes
app.use('/api', async (req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err: any) {
    console.error('Initialization error during API call:', err);
    res.status(500).json({ error: 'Server initialization failed: ' + err.message });
  }
});

// API ENDPOINTS

// 1. Health & Storage Status
app.get('/api/status', (req, res) => {
  res.json(getStorageStatus());
});

// 2. Serve Local Fallback Images
app.get('/api/images/:listingId/:imgName', (req, res) => {
  const { listingId, imgName } = req.params;
  // Clean params to prevent directory traversal
  const safeListingId = listingId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const safeImgName = imgName.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  
  const imgPath = path.join(LOCAL_LISTINGS_DIR, safeListingId, safeImgName);
  if (fs.existsSync(imgPath)) {
    res.sendFile(imgPath);
  } else {
    res.status(404).send('Image not found');
  }
});

// 3. Get all Listings (Search & Filters)
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await getGlobalRegistry();
    res.json(listings);
  } catch (err: any) {
    console.error('Error getting listings:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Force Registry Refresh
app.post('/api/listings/refresh', async (req, res) => {
  try {
    const listings = await refreshRegistry();
    res.json({ success: true, count: listings.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get User Profile
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await getUser(uid);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create / Update User Profile
app.post('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const profile = req.body as UserProfile;
    await saveUser(uid, profile);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Post New Listing with Images
// We use upload.array('images', 4) conditionally to support both Multipart and JSON Base64 payloads
app.post('/api/listings', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.array('images', 4)(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    let rawMetadata;
    let filesToSave: { originalname: string; buffer: Buffer; mimetype: string }[] = [];

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Multipart form-data mode (multer parsed)
      const metadataStr = req.body.metadata;
      if (!metadataStr) {
        return res.status(400).json({ error: 'Missing metadata' });
      }
      rawMetadata = JSON.parse(metadataStr);
      const files = (req.files as Express.Multer.File[]) || [];
      filesToSave = files.map(f => ({
        originalname: f.originalname,
        buffer: f.buffer,
        mimetype: f.mimetype || 'image/jpeg',
      }));
    } else {
      // JSON mode (base64 images)
      rawMetadata = req.body;
      if (!rawMetadata.title) {
        return res.status(400).json({ error: 'Missing title in listing data' });
      }
      // Extract base64 images
      const base64Images = req.body.images || []; // Array of { name: string, data: string, type: string }
      filesToSave = base64Images.map((img: any, i: number) => {
        let base64Data = img.data || '';
        let mimeType = img.type || 'image/jpeg';
        if (base64Data.includes(';base64,')) {
          const parts = base64Data.split(';base64,');
          base64Data = parts[1];
          const match = parts[0].match(/data:(.*?)$/);
          if (match) mimeType = match[1];
        }
        return {
          originalname: img.name || `image_${i + 1}.jpg`,
          buffer: Buffer.from(base64Data, 'base64'),
          mimetype: mimeType,
        };
      });
    }

    // Validate metadata
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const listing: ProductListing = {
      id: listingId,
      title: rawMetadata.title,
      price: Number(rawMetadata.price),
      originalPrice: rawMetadata.originalPrice ? Number(rawMetadata.originalPrice) : undefined,
      currency: rawMetadata.currency || 'LKR',
      category: rawMetadata.category,
      condition: rawMetadata.condition || 'Good',
      location: rawMetadata.location,
      description: rawMetadata.description,
      tags: Array.isArray(rawMetadata.tags) ? rawMetadata.tags : [],
      timestamp: Date.now(),
      sellerId: rawMetadata.sellerId,
      sellerName: rawMetadata.sellerName,
      status: 'active',
      images: [], // will be populated by service
      phone: rawMetadata.phone,
    };

    console.log(`Processing listing creation via ${contentType.includes('multipart') ? 'multipart' : 'JSON'}: "${listing.title}" by user ${listing.sellerId}`);

    const savedListing = await saveListing(listing, filesToSave);
    res.json(savedListing);
  } catch (err: any) {
    console.error('Error creating listing:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Update Listing Status (e.g., mark as sold)
app.patch('/api/listings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'sold', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await updateListingStatus(id, status);
    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Delete Listing
app.delete('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteListing(id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Global error handling middleware to capture crashes and respond with a clean JSON payload
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER CRASH / UNHANDLED ERROR]:', err);
  res.status(500).json({ 
    error: err.message || 'An unexpected unhandled server-side crash occurred.',
    isServerError: true 
  });
});

// VITE DEV SERVER OR STATIC SERVING MIDDLEWARE (Only run if not in Vercel environment)
async function startLocalServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in dev mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files serving loaded.');
  }

  // Bind to PORT and host '0.0.0.0'
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlashmyDeal fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel, serverless routes /api to the default export without calling listen()
if (!process.env.VERCEL) {
  startLocalServer().catch(err => {
    console.error('Failed to start local server:', err);
  });
}

// Export app as default for Vercel
export default app;
