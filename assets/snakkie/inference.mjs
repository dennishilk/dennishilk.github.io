/**
 * Future adapter contract: generate({ messages, language, translationLanguage,
 * signal }) -> AsyncIterable<{ type: 'text', text: string }>.
 * messages: { role: 'user'|'assistant', content: string }[];
 * language: 'de'|'en'|'nds'; translationLanguage: 'de'|'en'|null.
 * An adapter owns model loading, capabilities, errors and cancellation.
 * The UI must explicitly enable an adapter before accepting real AI requests.
 * No engine, remote endpoint, model download or credential is configured here.
 */
export class InferenceUnavailableError extends Error {
  constructor() {
    super('Snakkie is an interface preview. No inference adapter is connected.');
    this.name = 'InferenceUnavailableError';
  }
}

export const previewAdapter = Object.freeze({
  id: 'interface-preview',
  capabilities: Object.freeze({ inference: false, languages: [], streaming: false }),
  async *generate() { throw new InferenceUnavailableError(); },
});
