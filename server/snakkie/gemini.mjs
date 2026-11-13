const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';
const BLOCKED = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'MODEL_ARMOR']);

export async function askGemini({ requestJson, fetcher, signal, apiKey, prompt, persona, language, maxTokens }) {
  const result = await requestJson(fetcher, ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: persona }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingLevel: 'MINIMAL' }
      }
    })
  }, signal, 6000, 48 * 1024);

  const candidate = result?.candidates?.[0];
  if (result?.promptFeedback?.blockReason || BLOCKED.has(candidate?.finishReason)) {
    const text = language === 'de'
      ? 'Darauf kann ich dir gerade keine Antwort geben.'
      : 'I can’t give you an answer to that right now.';
    return { text, sources: [], search: 'unused' };
  }
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const text = parts.filter(part => !part?.thought && typeof part?.text === 'string')
    .map(part => part.text).join('').trim();
  if (!text || text.length > 2400 || candidate.finishReason !== 'STOP') {
    throw new Error('Incomplete Gemini reply');
  }
  return { text, sources: [], search: 'unused' };
}
