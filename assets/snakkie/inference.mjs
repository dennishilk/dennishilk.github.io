// Lazy worker adapter: load(), generate({messages,language,signal,onToken}),
// dispose(), clearCache(). No worker or model download on page load.
export class LocalInference {
  constructor() { this.worker = null; this.pending = null; this.serial = 0; this.ready = false; }
  request(type, payload = {}, {onStatus,onToken,signal} = {}) {
    if (this.pending) return Promise.reject(new Error('BUSY'));
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted','AbortError'));
    if (!this.worker) {
      this.worker = new Worker(new URL('./inference-worker.mjs?v=2',import.meta.url),{type:'module'});
      this.worker.onmessage = ({data}) => {
        const current = this.pending;
        if (!current || data.id !== current.id) return;
        if (data.type === 'status') current.onStatus?.(data);
        else if (data.type === 'token') current.onToken?.(data.text);
        else if (data.type === 'done') { this.finish(); current.resolve(data.result); }
        else if (data.type === 'error') { this.finish(); current.reject(Object.assign(new Error(data.message),{name:data.name})); }
      };
      this.worker.onerror = event => { event.preventDefault(); this.destroy(new Error('WORKER_FAILED')); };
      this.worker.onmessageerror = () => this.destroy(new Error('WORKER_FAILED'));
    }
    return new Promise((resolve,reject) => {
      const id = ++this.serial;
      const abort = () => {
        this.worker?.postMessage({type:'cancel',id});
        this.stopTimer = setTimeout(() => this.destroy(new DOMException('Aborted','AbortError')),3000);
      };
      this.pending = {id,resolve,reject,onStatus,onToken,signal,abort};
      signal?.addEventListener('abort',abort,{once:true});
      this.timer = setTimeout(() => this.destroy(new Error(type === 'load' ? 'LOAD_TIMEOUT' : 'GENERATION_TIMEOUT')),type === 'load' ? 600000 : 180000);
      this.worker.postMessage({type,id,...payload});
    });
  }
  finish() {
    this.pending?.signal?.removeEventListener('abort',this.pending.abort);
    clearTimeout(this.timer); clearTimeout(this.stopTimer); this.pending = null;
  }
  destroy(error = new Error('MODEL_UNLOADED')) {
    const current = this.pending;
    this.finish(); this.worker?.terminate(); this.worker = null; this.ready = false;
    current?.reject(error);
  }
  async load({model='qwen17',backend='auto',...options} = {}) {
    if (this.pending) throw new Error('BUSY');
    if (this.ready) throw new Error('MODEL_ALREADY_LOADED');
    try { const result = await this.request('load',{model,backend},options); this.ready = true; return result; }
    catch (error) { this.destroy(); throw error; }
  }
  generate({messages,language,signal,onToken}) {
    if (!this.ready) return Promise.reject(new Error('MODEL_NOT_READY'));
    return this.request('generate',{messages,language},{signal,onToken});
  }
  dispose() { this.destroy(); }
  async clearCache() { const result = await this.request('clear-cache'); this.dispose(); return result; }
}
