import {runtime,models,modelURL,limits,prepareMessages} from './model-config.mjs';
import {createModelStorage,downloadSessionBlob} from './model-storage.mjs';
let engine, engineModule, controller, busy = false;
const silentLogger = {debug(){},log(){},warn(){},error(){}};
const status = (id,state,extra={}) => postMessage({id,type:'status',state,...extra});
async function checkLocalFile(path,bytes,signal) {
  const url = new URL(path,self.location.origin);
  if (url.origin !== self.location.origin) throw new Error('REMOTE_URL_BLOCKED');
  const response = await fetch(url,{method:'HEAD',redirect:'error',cache:'no-cache',signal});
  if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('ASSETS_NOT_PROVISIONED');
  const size = Number(response.headers.get('content-length'));
  if (bytes && size && size !== bytes) throw new Error('MODEL_SIZE_MISMATCH');
}
self.onmessage = async ({data}) => {
  const {id,type} = data;
  if (type === 'cancel') { controller?.abort(); return; }
  if (busy) { postMessage({id,type:'error',message:'BUSY'}); return; }
  busy = true; controller = new AbortController();
  try {
    let result;
    if (type === 'load') {
      const selected = models[data.model];
      if (!selected) throw new Error('UNKNOWN_MODEL');
      status(id,'checking');
      await checkLocalFile(runtime.base+'index.js',null,controller.signal);
      await checkLocalFile(runtime.base+'wllama.wasm',null,controller.signal);
      await checkLocalFile(modelURL(selected),selected.bytes,controller.signal);
      engineModule ||= await import(runtime.base+'index.js');
      const storage = await createModelStorage();
      const cacheManager = new engineModule.CacheManager([storage.backend]);
      const makeEngine = () => new engineModule.Wllama({default:runtime.base+'wllama.wasm'}, {
        suppressNativeLog:true,logger:silentLogger,allowOffline:true,cacheManager,
      });
      engine = makeEngine(); engine.setCompat(null);
      const url = new URL(modelURL(selected),self.location.origin).href;
      const cached = storage.persistent ? await engine.cacheManager.open(url) : null;
      const fromCache = cached?.size === selected.bytes;
      if (cached && !fromCache) await engine.cacheManager.delete(url);
      let gpu = false;
      if (data.backend !== 'cpu' && engine.isSupportWebGPU()) gpu = Boolean(await navigator.gpu?.requestAdapter());
      if (data.backend === 'webgpu' && !gpu) throw new Error('WEBGPU_UNAVAILABLE');
      status(id,fromCache ? 'cached' : 'downloading',{loaded:0,total:selected.bytes,persistent:storage.persistent});
      const onProgress = ({loaded,total}) => status(id,loaded >= total && total > 0 ? 'initializing' : 'downloading',{loaded,total:total || selected.bytes,persistent:storage.persistent});
      const params = () => ({
        n_ctx:limits.contextTokens,n_batch:128,n_ubatch:64,n_threads:1,
        n_gpu_layers:gpu ? 999 : 0,useCache:true,signal:controller.signal,
        default_template_kwargs:{enable_thinking:false},
        progressCallback:onProgress,
      });
      const sessionBlob = storage.persistent ? null : await downloadSessionBlob(url,selected.bytes,controller.signal,onProgress);
      const load = () => storage.persistent ? engine.loadModelFromUrl(url,params()) : engine.loadModel([sessionBlob],params());
      try { await load(); }
      catch (error) {
        if (!gpu || data.backend !== 'auto' || controller.signal.aborted) throw error;
        await engine.exit().catch(()=>{}); gpu = false;
        status(id,'cpu-fallback'); engine = makeEngine(); engine.setCompat(null); await load();
      }
      result = {model:selected.id,backend:gpu ? 'webgpu' : 'cpu',fromCache,persistent:storage.persistent,context:engine.getLoadedContextInfo().n_ctx};
    } else if (type === 'generate') {
      if (!engine?.isModelLoaded()) throw new Error('MODEL_NOT_READY');
      const messages = prepareMessages(data.messages,data.language);
      const started = performance.now(); let firstToken = null, text = '', usage, timings;
      const stream = await engine.createChatCompletion({
        messages,max_tokens:limits.outputTokens,temperature:0.65,top_p:0.9,seed:42,
        stream:true,abortSignal:controller.signal,chat_template_kwargs:{enable_thinking:false},cache_prompt:true,
      });
      for await (const chunk of stream) {
        if (controller.signal.aborted) throw new DOMException('Aborted','AbortError');
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) { firstToken ??= performance.now()-started; text += token; postMessage({id,type:'token',text:token}); }
        usage = chunk.usage || usage; timings = chunk.timings || timings;
      }
      if (!text.trim()) throw new Error('EMPTY_RESPONSE');
      result = {text,firstTokenMs:firstToken,elapsedMs:performance.now()-started,usage,timings};
    } else if (type === 'clear-cache') {
      const storage = await createModelStorage();
      // Only our dedicated origin-private folder; no runtime download is needed.
      for (const entry of await storage.backend.list()) await storage.backend.delete(entry.key);
      result = {cleared:true};
    } else throw new Error('UNKNOWN_REQUEST');
    if (controller.signal.aborted) throw new DOMException('Aborted','AbortError');
    postMessage({id,type:'done',result});
  } catch (error) {
    postMessage({id,type:'error',message:String(error.message || error).slice(0,300),name:error.name});
  } finally { busy = false; controller = null; }
};
