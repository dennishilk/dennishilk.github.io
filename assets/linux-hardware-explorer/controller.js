// Browser-independent lifecycle: one local Worker, no report persistence or network calls.
export class LocalAnalysis {
  constructor({ createWorker, onResult, onError, schedule = setTimeout, cancel = clearTimeout, timeout = 15000 }) {
    Object.assign(this, { createWorker, onResult, onError, schedule, cancel, timeout });
    this.generation = 0; this.worker = null; this.timer = null;
  }
  clear() {
    this.generation++;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.worker?.terminate(); this.worker = null;
  }
  run(report, format = 'auto') {
    this.clear(); const id = this.generation;
    try {
      const worker = this.createWorker(); this.worker = worker;
      const finish = (error, data) => {
        if (id !== this.generation) return;
        this.clear();
        if (error) this.onError(error); else this.onResult(data);
      };
      worker.onmessage = event => {
        if (event.data?.id !== id) return;
        finish(event.data.error || null, event.data.result);
      };
      worker.onerror = event => { event.preventDefault?.(); finish('worker-unavailable'); };
      this.timer = this.schedule(() => finish('analysis-timeout'), this.timeout);
      worker.postMessage({ id, report, format });
    } catch { this.clear(); this.onError('worker-unavailable'); }
  }
}
