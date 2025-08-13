import { Router, Request, Response } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import {
  generateQuotation,
  getQuotationPreview,
  downloadQuotationPDF,
  getQuotationById,
  getQuotations,
  createQuotation,
  createQuotationFromImage,
  updateQuotation,
  deleteQuotation,
  createDGSalesQuotation,
  listDGSalesQuotations,
  updateQuotationPayment,
  sendQuotationEmailToCustomer
} from '../controllers/quotationController';

const router = Router();

router.use(protect);
router.use(checkModuleAccess('billing'));

router.post('/generate/:invoiceId', checkPermission('read'), generateQuotation);
router.get('/preview/:invoiceId', checkPermission('read'), getQuotationPreview);
router.get('/download/:invoiceId', checkPermission('read'), downloadQuotationPDF);

// DG Sales specific routes (must come before /:id routes)
router.get('/dg-sales', checkPermission('read'), listDGSalesQuotations);
router.post('/dg-sales', checkPermission('write'), createDGSalesQuotation);

// CRUD routes for Quotation
router.get('/', checkPermission('read'), getQuotations);
router.get('/:id', checkPermission('read'), getQuotationById);
router.post('/', checkPermission('write'), createQuotation);
router.post('/from-image', checkPermission('write'), createQuotationFromImage);
router.put('/:id', checkPermission('write'), updateQuotation);
router.put('/:id/payment', checkPermission('write'), updateQuotationPayment);
router.post('/:id/send-email', checkPermission('write'), sendQuotationEmailToCustomer);

// Test endpoint for email functionality (development only)
// if (process.env.NODE_ENV === 'development') {
//   router.post('/test-email', checkPermission('write'), (req: Request, res: Response) => {
//     try {
//       const { toEmail, subject, content } = req.body as { toEmail: string; subject: string; content: string };
      
//       if (!toEmail || !subject || !content) {
//         return res.status(400).json({
//           success: false,
//           message: 'Missing required fields: toEmail, subject, content'
//         });
//       }

//       // For now, just log the email attempt
//       console.log('=== TEST EMAIL ENDPOINT ===');
//       console.log('To:', toEmail);
//       console.log('Subject:', subject);
//       console.log('Content Length:', content.length);
//       console.log('=== END TEST EMAIL ===');
      
//       res.status(200).json({
//         success: true,
//         message: 'Test email logged successfully (SMTP not configured)'
//       });
//     } catch (error) {
//       console.error('Test email error:', error);
//       res.status(500).json({
//         success: false,
//         message: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   });
// }

router.delete('/:id', checkPermission('delete'), deleteQuotation);

export default router; 