import { LLMProvider } from './llm-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { config } from '../utils/config.js';

export function getLLMProvider(providerName?: string): LLMProvider {
  const name = providerName || config.llmProvider;

  switch (name) {
    case 'openai':
      return new OpenAIProvider();
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}

export { LLMProvider } from './llm-provider.js';
export { OpenAIProvider } from './openai-provider.js';
export { GeminiProvider } from './gemini-provider.js';
