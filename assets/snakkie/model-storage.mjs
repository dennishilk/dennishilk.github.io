// Explicit origin-private storage; no extension or cross-origin storage backend.
export async function createModelStorage() {
  let directory;
  try {
    directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('snakkie-models-v2',{create:true});
  } catch { /* Private browsing / insecure test origins: session-only loading. */ }
  const backend = {
    isSupported:()=>true,
    async read(key) { try { return await (await directory.getFileHandle(key)).getFile(); } catch { return null; } },
    async write(key,stream) {
      const writer = await (await directory.getFileHandle(key,{create:true})).createWritable();
      await stream.pipeTo(writer);
    },
    async getSize(key) { return (await this.read(key))?.size ?? -1; },
    async list() {
      const entries = [];
      if (directory) for await (const [key,handle] of directory.entries()) if (handle.kind === 'file') entries.push({key,size:(await handle.getFile()).size});
      return entries;
    },
    async delete(key) { if (directory) try { await directory.removeEntry(key); } catch (e) { if(e.name !== 'NotFoundError') throw e; } },
  };
  return {persistent:Boolean(directory),backend};
}

export async function downloadSessionBlob(url,bytes,signal,onProgress) {
  const response = await fetch(url,{signal,redirect:'error',cache:'no-store'});
  if (!response.ok) throw new Error('MODEL_DOWNLOAD_FAILED');
  const reader = response.body.getReader(), parts = []; let loaded = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if(done) break;
      loaded += value.byteLength;
      if (loaded > bytes) throw new Error('MODEL_SIZE_MISMATCH');
      parts.push(value); onProgress({loaded,total:bytes});
    }
  } finally { reader.releaseLock(); }
  if (loaded !== bytes) throw new Error('MODEL_SIZE_MISMATCH');
  return new Blob(parts);
}
