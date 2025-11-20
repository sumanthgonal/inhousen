import { Request, Response, NextFunction } from 'express';
import { invoiceService } from '../services/invoice.service.js';
import { UpdateInvoiceSchema } from '../types/invoice.js';
import { ValidationError, FileUploadError } from '../utils/errors.js';

export class InvoiceController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new FileUploadError('No file uploaded');
      }

      const invoice = await invoiceService.createInvoice(req.file);

      res.status(201).json({
        success: true,
        message: 'Invoice uploaded successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async extract(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { provider } = req.query;

      const invoice = await invoiceService.extractInvoiceData(
        id,
        provider as string | undefined
      );

      res.json({
        success: true,
        message: 'Invoice data extracted successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAndExtract(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new FileUploadError('No file uploaded');
      }

      const { provider } = req.query;

      // Create invoice
      const invoice = await invoiceService.createInvoice(req.file);

      // Extract data
      const extractedInvoice = await invoiceService.extractInvoiceData(
        invoice.id,
        provider as string | undefined
      );

      res.status(201).json({
        success: true,
        message: 'Invoice uploaded and extracted successfully',
        data: extractedInvoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoice(id);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await invoiceService.listInvoices(page, limit);

      res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Validate input
      const parseResult = UpdateInvoiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError(
          `Invalid input: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
        );
      }

      const invoice = await invoiceService.updateInvoice(id, parseResult.data);

      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await invoiceService.deleteInvoice(id);

      res.json({
        success: true,
        message: 'Invoice deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const invoiceController = new InvoiceController();
