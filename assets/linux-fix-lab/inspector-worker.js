import { inspectLog } from './core.js';
import { catalog } from './catalog.js';
self.onmessage = event => {
  try { self.postMessage({result:inspectLog(event.data,catalog.patterns)}); }
  catch (error) { self.postMessage({error:error.message}); }
};
