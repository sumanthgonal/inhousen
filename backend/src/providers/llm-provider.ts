import { ExtractedInvoice } from '../types/invoice.js';

export interface LLMProvider {
  name: string;
  extractInvoiceData(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{
    data: ExtractedInvoice;
    rawResponse: unknown;
  }>;
}

export const EXTRACTION_PROMPT = `You are an invoice data extraction expert. Analyze the provided invoice image/document and extract the following information in JSON format.

Extract these fields:
- supplierName: The company/vendor name on the invoice
- invoiceNumber: The invoice number/ID
- invoiceDate: The invoice date (format: YYYY-MM-DD)
- dueDate: The payment due date (format: YYYY-MM-DD)
- currency: The currency code (e.g., USD, EUR, INR)
- subtotal: The subtotal amount before tax (number)
- taxAmount: The tax amount (number)
- total: The total amount due (number)
- lineItems: Array of items with:
  - description: Item description
  - quantity: Quantity (number)
  - unitPrice: Price per unit (number)
  - lineTotal: Total for this line (number)
- confidence: Your confidence in the extraction accuracy (0-1)

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown or explanations
2. Use null for fields you cannot find
3. Parse numbers without currency symbols
4. If a field is ambiguous, use your best judgment and lower confidence
5. Always include the confidence field (0-1 scale)

Return the JSON object directly.`;

export const JSON_SCHEMA = {
  type: 'object',
  properties: {
    supplierName: { type: ['string', 'null'] },
    invoiceNumber: { type: ['string', 'null'] },
    invoiceDate: { type: ['string', 'null'] },
    dueDate: { type: ['string', 'null'] },
    currency: { type: 'string' },
    subtotal: { type: ['number', 'null'] },
    taxAmount: { type: ['number', 'null'] },
    total: { type: ['number', 'null'] },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'number' },
          lineTotal: { type: 'number' },
        },
        required: ['description', 'quantity', 'unitPrice', 'lineTotal'],
      },
    },
    confidence: { type: 'number' },
  },
  required: ['currency', 'confidence'],
};
