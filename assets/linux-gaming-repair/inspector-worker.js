import { parseLog } from './core.js';

// A fresh dedicated Worker keeps the bounded parser off the UI thread.
// The UI owns cancellation and stale-job rejection; no input is retained here.
self.onmessage = event => {
  const message = event.data;
  const requestedId = message && typeof message === 'object' ? message.id : null;
  const id = Number.isSafeInteger(requestedId) || typeof requestedId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(requestedId) ? requestedId : null;
  self.postMessage({ id, report: parseLog(message && typeof message === 'object' ? message.input : null) });
};
