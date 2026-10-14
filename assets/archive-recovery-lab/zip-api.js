import './vendor/zip.js';
const zip=globalThis.zip;
zip.configure({useWebWorkers:false,useCompressionStream:true,chunkSize:65536});
export default zip;
