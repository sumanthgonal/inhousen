import axios from 'axios';
import { Invoice, UpdateInvoiceData, PaginationInfo } from '../types/invoice';

const API_BASE = '/api/invoices';

const api = axios.create({
  baseURL: API_BASE,
});

export interface UploadResponse {
  success: boolean;
  message: string;
  data: Invoice;
}

export interface ListResponse {
  success: boolean;
  data: Invoice[];
  pagination: PaginationInfo;
}

export interface InvoiceResponse {
  success: boolean;
  data: Invoice;
  message?: string;
}

export const invoiceApi = {
  uploadAndExtract: async (
    file: File,
    provider?: string,
    onProgress?: (progress: number) => void
  ): Promise<Invoice> => {
    const formData = new FormData();
    formData.append('file', file);

    const url = provider ? `upload-and-extract?provider=${provider}` : 'upload-and-extract';

    const response = await api.post<UploadResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  },

  upload: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Invoice> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  },

  extract: async (id: string, provider?: string): Promise<Invoice> => {
    const url = provider ? `${id}/extract?provider=${provider}` : `${id}/extract`;
    const response = await api.post<InvoiceResponse>(url);
    return response.data.data;
  },

  get: async (id: string): Promise<Invoice> => {
    const response = await api.get<InvoiceResponse>(id);
    return response.data.data;
  },

  list: async (page: number = 1, limit: number = 10): Promise<ListResponse> => {
    const response = await api.get<ListResponse>('', {
      params: { page, limit },
    });
    return response.data;
  },

  update: async (id: string, data: UpdateInvoiceData): Promise<Invoice> => {
    const response = await api.put<InvoiceResponse>(id, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(id);
  },
};
