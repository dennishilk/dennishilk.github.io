const OPERATORS = new Set(['|', '>', '<', ';', '&', '`', '$']);
export const MAX_COMMAND_LENGTH = 512;

export function parseCommand(source) {
  if (source.length > MAX_COMMAND_LENGTH) return { error: 'bash: command too long' };
  const input = source.trim();
  if (!input) return { tokens: [] };
  const tokens = [];
  let token = '', quote = null, escaped = false;
  for (const char of input) {
    if (escaped) { token += char; escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; else token += char; continue; }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (OPERATORS.has(char)) return { error: 'bash: shell operators are not supported in this environment' };
    if (/\s/.test(char)) { if (token) { tokens.push(token); token = ''; } } else token += char;
  }
  if (quote) return { error: `bash: unexpected EOF while looking for matching \`${quote}'` };
  if (escaped) token += '\\';
  if (token) tokens.push(token);
  return { tokens };
}
