(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined') module.exports = api;
  if (root) root.CryptoLab = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const mod = (n, m) => ((n % m) + m) % m;
  function caesar(text, shift) { return String(text).replace(/[a-z]/gi, c => { const base = c <= 'Z' ? 65 : 97; return String.fromCharCode(base + mod(c.charCodeAt(0) - base + shift, 26)); }); }
  const rot13 = text => caesar(text, 13);
  function validAlphabet(map) { return typeof map === 'string' && map.length === 26 && new Set(map.toUpperCase()).size === 26 && /^[A-Z]+$/i.test(map); }
  function substitute(text, map) { if (!validAlphabet(map)) throw new Error('A substitution alphabet must contain 26 unique letters.'); return String(text).replace(/[a-z]/gi, c => { const i = c.toUpperCase().charCodeAt(0) - 65; const mapped = map[i]; return c === c.toLowerCase() ? mapped.toLowerCase() : mapped.toUpperCase(); }); }
  function xorBytes(message, key) { if (!key) return []; return Array.from(String(message), (c, i) => c.charCodeAt(0) ^ key.charCodeAt(i % key.length)); }
  function xorText(message, key) { return String.fromCharCode(...xorBytes(message, key)); }
  return { ALPHABET, caesar, rot13, validAlphabet, substitute, xorBytes, xorText };
});
