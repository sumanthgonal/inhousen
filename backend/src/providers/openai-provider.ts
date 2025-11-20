import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { LLMProvider, EXTRACTION_PROMPT } from './llm-provider.js';
import { ExtractedInvoice, ExtractedInvoiceSchema } from '../types/invoice.js';
import { LLMError } from '../utils/errors.js';
import { config } from '../utils/config.js';

const TEXT_EXTRACTION_PROMPT = `You are an invoice data extraction expert. Analyze the following invoice text and extract structured data.
${EXTRACTION_PROMPT.split('Extract these fields:')[1]}`;

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor() {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.client = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async extractInvoiceData(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ data: ExtractedInvoice; rawResponse: unknown }> {
    try {
      let response;

      if (mimeType === 'application/pdf') {
        let text: string;
        try {
          const pdfData = await pdf(fileBuffer);
          text = pdfData.text;
        } catch (pdfError) {
          throw new LLMError(
            `Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}. Try uploading as JPG/PNG instead.`
          );
        }

        if (!text || text.trim().length < 10) {
          throw new LLMError('PDF appears to be empty or contains only images. Please upload as JPG/PNG instead.');
        }

        response = await this.client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: `${TEXT_EXTRACTION_PROMPT}\n\nInvoice Text:\n${text}`,
            },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        });
      } else {
        const base64Image = fileBuffer.toString('base64');
        const imageUrl = `data:${mimeType};base64,${base64Image}`;

        response = await this.client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: EXTRACTION_PROMPT },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        });
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new LLMError('No response content from OpenAI');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new LLMError('Could not parse JSON from OpenAI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ExtractedInvoiceSchema.parse(parsed);

      return {
        data: validated,
        rawResponse: response,
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        `OpenAI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
