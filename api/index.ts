// @ts-ignore
import appModule from '../dist/server.cjs';

// Safely unwrap double default export caused by ESM/CJS interop bundling
let app = appModule;
if (app && typeof app === 'object' && 'default' in app) {
  app = app.default;
}
if (app && typeof app === 'object' && 'default' in app) {
  app = app.default;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;


