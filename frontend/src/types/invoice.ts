export type InvoiceStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'NEEDS_REVIEW'
  | 'SAVED'
  | 'ERROR';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  status: InvoiceStatus;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string;
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
  confidence: number | null;
  rawLlmJson: unknown;
  llmProvider: string | null;
  lineItems: LineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateInvoiceData {
  supplierName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  subtotal?: number | null;
  taxAmount?: number | null;
  total?: number | null;
  lineItems?: Omit<LineItem, 'id'>[];
  status?: InvoiceStatus;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
