import { PrismaClient, InvoiceStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { getLLMProvider } from '../providers/index.js';
import { UpdateInvoiceInput } from '../types/invoice.js';
import { NotFoundError, LLMError } from '../utils/errors.js';

const prisma = new PrismaClient();

export class InvoiceService {
  async createInvoice(file: Express.Multer.File) {
    const invoice = await prisma.invoice.create({
      data: {
        filePath: file.path,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'UPLOADED',
      },
    });

    return invoice;
  }

  async extractInvoiceData(invoiceId: string, providerName?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${invoiceId} not found`);
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PROCESSING' },
    });

    try {
      const fileBuffer = await fs.readFile(invoice.filePath);
      const provider = getLLMProvider(providerName);
      const { data, rawResponse } = await provider.extractInvoiceData(
        fileBuffer,
        invoice.fileType
      );

      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'EXTRACTED',
          supplierName: data.supplierName,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          currency: data.currency,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          total: data.total,
          confidence: data.confidence,
          rawLlmJson: rawResponse as any,
          llmProvider: provider.name,
        },
        include: { lineItems: true },
      });

      if (data.lineItems && data.lineItems.length > 0) {
        await prisma.lineItem.createMany({
          data: data.lineItems.map((item) => ({
            invoiceId: invoiceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        });
      }

      return await this.getInvoice(invoiceId);
    } catch (error) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'ERROR' },
      });
      throw error;
    }
  }

  async getInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async listInvoices(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lineItems: true },
      }),
      prisma.invoice.count(),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateInvoice(id: string, data: UpdateInvoiceInput) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${id} not found`);
    }

    const updateData: any = {
      supplierName: data.supplierName,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      currency: data.currency,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      total: data.total,
      status: data.status || 'SAVED',
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    if (data.lineItems) {
      await prisma.lineItem.deleteMany({
        where: { invoiceId: id },
      });

      if (data.lineItems.length > 0) {
        await prisma.lineItem.createMany({
          data: data.lineItems.map((item) => ({
            invoiceId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        });
      }
    }

    return await this.getInvoice(id);
  }

  async deleteInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${id} not found`);
    }

    try {
      await fs.unlink(invoice.filePath);
    } catch (error) {
      console.error(`Failed to delete file: ${invoice.filePath}`);
    }

    await prisma.invoice.delete({
      where: { id },
    });

    return { success: true };
  }
}

export const invoiceService = new InvoiceService();
