// Admission estimates, not a claim that the browser exposes free RAM.
export function resourcePlan(format,workers,blobBytes,{deviceMemory=globalThis.navigator?.deviceMemory,engine='cpu'}={}){
 if(!Number.isInteger(workers)||workers<1||workers>16)throw Object.assign(new Error('worker-count'),{code:'worker-count'});
 const count=engine==='gpu'?0:workers;
 // Reserve potential engine growth, MEMFS input copies and extraction scratch.
 const perWorkerMiB=(format==='ZIP'?32:320)+Math.ceil(blobBytes/1024**2)*3;
 const budgetMiB=Math.min(2048,deviceMemory?Math.max(256,deviceMemory*1024/4):1024);
 const estimateMiB=count*perWorkerMiB+(engine==='cpu'?0:format==='ZIP'?96:416);
 return {allowed:estimateMiB<=budgetMiB,perWorkerMiB,budgetMiB,estimateMiB,workers:count};
}
