import { z } from 'zod';

// Schema for extracted invoice data
export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const ExtractedInvoiceSchema = z.object({
  supplierName: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  currency: z.string().nullable().optional().transform(val => val || 'USD'),
  subtotal: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  lineItems: z.array(LineItemSchema).optional().default([]),
  confidence: z.number().min(0).max(1).optional().default(0),
});

export const UpdateInvoiceSchema = z.object({
  supplierName: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  currency: z.string().optional(),
  subtotal: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  lineItems: z.array(LineItemSchema).optional(),
  status: z.enum(['UPLOADED', 'PROCESSING', 'EXTRACTED', 'NEEDS_REVIEW', 'SAVED', 'ERROR']).optional(),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

export interface LLMExtractionResult {
  data: ExtractedInvoice;
  rawResponse: unknown;
  provider: string;
}
