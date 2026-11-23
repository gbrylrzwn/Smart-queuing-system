import { Router } from 'express';
import { authMiddleware } from '../Middlewares/authMiddleware';
import { InvoiceController } from '../Controllers/invoiceController';

const router = Router();

router.get('/my', authMiddleware, InvoiceController.getMyInvoices);
router.post('/create', authMiddleware, InvoiceController.createInvoice);

export default router;
