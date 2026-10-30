// Only local URLs are used by the browser. Large artifacts are provisioned separately.
export const runtime = Object.freeze({
  version: '3.8.1', base: '/assets/snakkie/local-ai/wllama-3.8.1/',
  archive: 'https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz',
  sha256: 'bbe65fcc6d128d7853aed6d1699db7541e51a0363dc0135b8b68153acbf74670',
  moduleSHA256: 'e5506753e41a59c11f61f2c52422045be9fc76e32a7e47f037aaad5df4ec723e',
  wasmSHA256: '551f13439366eff11e057b1b91fe46a7fdac29d56d67372d4c5f19a549dfe70c',
});
export const models = Object.freeze({
  qwen17: Object.freeze({
    id:'qwen17',name:'Qwen3 1.7B · Q4_K_M',bytes:1107409472,
    file:'qwen3-1.7b-q4_k_m-b139949c.gguf',license:'Apache-2.0',
    sha256:'b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897',
    source:'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/d7f544eead698dbd1f15126ef60b45a1e1933222/Qwen3-1.7B-Q4_K_M.gguf',
  }),
  qwen3: Object.freeze({
    id: 'qwen3', name: 'Qwen3 0.6B · Q4_K_M', bytes: 396705472,
    file: 'qwen3-0.6b-q4_k_m-ac2d9771.gguf', license: 'Apache-2.0',
    sha256: 'ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a',
    source: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/50968a4468ef4233ed78cd7c3de230dd1d61a56b/Qwen3-0.6B-Q4_K_M.gguf',
  }),
  qwen25: Object.freeze({
    id: 'qwen25', name: 'Qwen2.5 0.5B Instruct · Q4_K_M', bytes: 491400032,
    file: 'qwen2.5-0.5b-instruct-q4_k_m-74a4da8c.gguf', license: 'Apache-2.0',
    sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
    source: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  }),
});
export const modelURL = model => `/assets/snakkie/local-ai/models/${model.file}`;
export const limits = Object.freeze({ inputBytes:800, promptBytes:1450, exchanges:3, outputTokens:256, contextTokens:2048 });
export function systemPrompt(language = 'de') {
  return language === 'de'
    ? 'Du bist Snakkie, ein freundlicher Pinguin aus Ostfriesland von Dennis Hilk. Nebby ist dein Cousin. Du trägst ein Streifenhemd und eine Kapitänsmütze. Antworte kurz und hilfreich auf Deutsch. Ein trockener Witz passt manchmal. Sei respektvoll. Du hast keinen Internetzugriff und keine aktuellen Wetterdaten. Sage ehrlich, wenn du etwas nicht weißt. Behaupte nicht, authentisches Platt zu beherrschen. Befolge einen ausdrücklichen Sprachwechsel. /no_think'
    : "You are Snakkie, a friendly penguin from East Frisia, created by Dennis Hilk. Nebby is your cousin. You wear a striped shirt and a captain's hat. Answer briefly and helpfully in English, with occasional dry humour. Be respectful. You have no internet access or live weather. Admit uncertainty. Do not claim authentic Low German. Follow an explicit request to switch languages. /no_think";
}
export function prepareMessages(history, language) {
  const system = {role:'system',content:systemPrompt(language)};
  const encode = text => new TextEncoder().encode(text).length;
  const last = history.at(-1);
  if (!last || last.role !== 'user' || !last.content.trim()) throw new Error('EMPTY_INPUT');
  if (encode(last.content) > limits.inputBytes) throw new Error('INPUT_TOO_LONG');
  let messages = history.slice(-(limits.exchanges * 2 + 1)).map(({role,content}) => ({role,content}));
  while (messages[0]?.role !== 'user') messages.shift();
  while (messages.length > 1 && encode(system.content + messages.map(m => m.content).join('')) > limits.promptBytes) messages.splice(0,2);
  return [system,...messages];
}
export function shouldSend(event) {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
