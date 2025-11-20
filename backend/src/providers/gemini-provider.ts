import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';
import { LLMProvider, EXTRACTION_PROMPT } from './llm-provider.js';
import { ExtractedInvoice, ExtractedInvoiceSchema } from '../types/invoice.js';
import { LLMError } from '../utils/errors.js';
import { config } from '../utils/config.js';

const TEXT_EXTRACTION_PROMPT = `You are an invoice data extraction expert. Analyze the following invoice text and extract structured data.
${EXTRACTION_PROMPT.split('Extract these fields:')[1]}`;

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.client = new GoogleGenerativeAI(config.geminiApiKey);
  }

  async extractInvoiceData(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ data: ExtractedInvoice; rawResponse: unknown }> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });
      let result;

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

        result = await model.generateContent([
          `${TEXT_EXTRACTION_PROMPT}\n\nInvoice Text:\n${text}`,
        ]);
      } else {
        const base64Image = fileBuffer.toString('base64');
        result = await model.generateContent([
          EXTRACTION_PROMPT,
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ]);
      }

      const response = result.response;
      const content = response.text();

      if (!content) {
        throw new LLMError('No response content from Gemini');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new LLMError('Could not parse JSON from Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ExtractedInvoiceSchema.parse(parsed);

      return {
        data: validated,
        rawResponse: {
          text: content,
          candidates: response.candidates,
        },
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        `Gemini extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
