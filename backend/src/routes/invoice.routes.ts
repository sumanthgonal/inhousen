import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/upload', upload.single('file'), invoiceController.upload.bind(invoiceController));
router.post('/upload-and-extract', upload.single('file'), invoiceController.uploadAndExtract.bind(invoiceController));
router.post('/:id/extract', invoiceController.extract.bind(invoiceController));
router.get('/:id', invoiceController.get.bind(invoiceController));
router.get('/', invoiceController.list.bind(invoiceController));
router.put('/:id', invoiceController.update.bind(invoiceController));
router.delete('/:id', invoiceController.delete.bind(invoiceController));

export default router;
