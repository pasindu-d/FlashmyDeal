import express from 'express';
import path from 'path';

// Load .env if exists (for local testing)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' })); // support large base64 image uploads

// Server-side Apps Script Proxy to bypass browser CORS / Redirect blocks
app.get('/api/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target URL' });
    }

    const parsedUrl = new URL(targetUrl);
    for (const [key, val] of Object.entries(req.query)) {
      if (key !== 'url') {
        parsedUrl.searchParams.set(key, val as string);
      }
    }

    console.log(`[Proxy GET] Forwarding to: ${parsedUrl.toString()}`);
    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch {
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        let helpfulMessage = "Google Apps Script returned an HTML page instead of JSON. Please make sure that: 1. You deployed the Web App with 'Who has access' set to 'Anyone'. 2. You authorized all Google permissions requested during deployment. 3. The Web App URL is copied correctly.";
        if (text.includes('Google Accounts') || text.includes('ServiceLogin') || text.includes('sign-in')) {
          helpfulMessage = "Google Apps Script is requesting sign-in (Access Denied). This means 'Who has access' was NOT set to 'Anyone' during deployment. Please redeploy as a Web App and select 'Who has access: Anyone'.";
        } else if (text.includes('script_error') || text.includes('Script error') || text.includes('runtime')) {
          helpfulMessage = "Your Google Apps Script encountered a runtime execution error. Please open your Google Sheet -> Extensions -> Apps Script, check for any syntax/type errors, and inspect the Execution Logs.";
        }
        return res.status(400).json({ error: helpfulMessage, htmlSnippet: text.slice(0, 300) });
      }
      return res.status(400).json({ error: "Invalid response from Apps Script", raw: text.slice(0, 300) });
    }
  } catch (err: any) {
    console.error('Proxy GET failed:', err);
    return res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
});

app.post('/api/proxy', async (req, res) => {
  try {
    const { url, payload } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing target URL' });
    }

    console.log(`[Proxy POST] Forwarding to: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch {
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        let helpfulMessage = "Google Apps Script returned an HTML page instead of JSON. Please make sure that: 1. You deployed the Web App with 'Who has access' set to 'Anyone'. 2. You authorized all Google permissions requested during deployment. 3. The Web App URL is copied correctly.";
        if (text.includes('Google Accounts') || text.includes('ServiceLogin') || text.includes('sign-in')) {
          helpfulMessage = "Google Apps Script is requesting sign-in (Access Denied). This means 'Who has access' was NOT set to 'Anyone' during deployment. Please redeploy as a Web App and select 'Who has access: Anyone'.";
        } else if (text.includes('script_error') || text.includes('Script error') || text.includes('runtime')) {
          helpfulMessage = "Your Google Apps Script encountered a runtime execution error. Please open your Google Sheet -> Extensions -> Apps Script, check for any syntax/type errors, and inspect the Execution Logs.";
        }
        return res.status(400).json({ error: helpfulMessage, htmlSnippet: text.slice(0, 300) });
      }
      return res.status(400).json({ error: "Invalid response from Apps Script", raw: text.slice(0, 300) });
    }
  } catch (err: any) {
    console.error('Proxy POST failed:', err);
    return res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
});

// VITE DEV SERVER OR STATIC SERVING MIDDLEWARE
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
    console.log(`FlashmyDeal server running on http://0.0.0.0:${PORT}`);
  });
}

startLocalServer().catch(err => {
  console.error('Failed to start server:', err);
});

export default app;
