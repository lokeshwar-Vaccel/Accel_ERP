import { Request, Response } from 'express';
import { InvoicePayment, IInvoicePayment } from '../models/InvoicePayment';
import { Invoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { generateInvoicePaymentReceiptPDF as generateInvoicePaymentPDF } from '../utils/paymentReceiptPdf';

// Validation helper for payment method details
const validatePaymentMethodDetails = (paymentMethod: string, paymentMethodDetails: any): string | null => {
  if (!paymentMethodDetails || typeof paymentMethodDetails !== 'object') {
    return 'Payment method details are required';
  }

  switch (paymentMethod) {
    case 'cash':
      // Cash payment details are optional
      return null;

    case 'cheque':
      if (!paymentMethodDetails.cheque) {
        return 'Cheque payment details are required';
      }
      const chequeDetails = paymentMethodDetails.cheque;
      if (!chequeDetails.chequeNumber || !chequeDetails.bankName || !chequeDetails.issueDate) {
        return 'Cheque number, bank name, and issue date are required for cheque payments';
      }
      break;

    case 'bank_transfer':
      if (!paymentMethodDetails.bankTransfer) {
        return 'Bank transfer details are required';
      }
      const bankTransferDetails = paymentMethodDetails.bankTransfer;
      if (!bankTransferDetails.transferDate) {
        return 'Transfer date is required for bank transfers';
      }
      break;

    case 'upi':
      // No required fields for UPI - transaction ID is optional
      break;

    case 'card':
      // No required fields for card - transaction ID is optional
      break;

    case 'other':
      if (!paymentMethodDetails.other) {
        return 'Other payment method details are required';
      }
      const otherDetails = paymentMethodDetails.other;
      if (!otherDetails.methodName) {
        return 'Payment method name is required for other payment methods';
      }
      break;

    default:
      return 'Invalid payment method';
  }

  return null;
};

// Create a new invoice payment
export const createInvoicePayment = async (req: Request, res: Response) => {
  try {
    const {
      invoiceId,
      invoiceNumber,
      customerId,
      amount,
      currency = 'INR',
      paymentMethod,
      paymentMethodDetails,
      paymentStatus = 'pending',
      paymentDate,
      notes,
      receiptNumber
    } = req.body;

    const userId = (req as any).user?.id;

    // Validate required fields
    if (!invoiceId || !invoiceNumber || !customerId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: invoiceId, invoiceNumber, customerId, amount, paymentMethod'
      });
    }

    // Validate payment method details
    const validationError = validatePaymentMethodDetails(paymentMethod, paymentMethodDetails);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Verify invoice exists
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Create payment record
    const paymentData: Partial<IInvoicePayment> = {
      invoiceId,
      invoiceNumber,
      customerId,
      amount,
      currency,
      paymentMethod,
      paymentMethodDetails,
      paymentStatus,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      receiptNumber,
      createdBy: userId
    };

    const payment = new InvoicePayment(paymentData);
    await payment.save();

    // Update invoice payment summary
    await updateInvoicePaymentStatus(invoiceId);

    return res.status(201).json({
      success: true,
      message: 'Invoice payment created successfully',
      data: payment
    });

  } catch (error) {
    console.error('Error creating invoice payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get payments by invoice ID
export const getPaymentsByInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const payments = await InvoicePayment.find({ invoiceId })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get payment by ID
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await InvoicePayment.findById(id)
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    return res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update payment
export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate payment method details if provided
    if (updateData.paymentMethod && updateData.paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(updateData.paymentMethod, updateData.paymentMethodDetails);
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError
        });
      }
    }

    const payment = await InvoicePayment.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update invoice payment summary
    await updateInvoicePaymentStatus(payment.invoiceId.toString());

    return res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete payment
export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await InvoicePayment.findByIdAndDelete(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update invoice payment summary
    await updateInvoicePaymentStatus(payment.invoiceId.toString());

    return res.json({
      success: true,
      message: 'Payment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to update invoice payment status
export const updateInvoicePaymentStatus = async (invoiceId: string) => {
  try {
    // Get all payments for this invoice
    const payments = await InvoicePayment.find({ 
      invoiceId, 
      paymentStatus: { $in: ['completed', 'processing'] } 
    });

    // Calculate total paid amount
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get invoice details
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;

    const totalAmount = invoice.totalAmount;
    const remainingAmount = totalAmount - totalPaid;

    // Determine payment status
    let paymentStatus = 'pending';
    if (totalPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    // Update invoice
    await Invoice.findByIdAndUpdate(invoiceId, {
      paidAmount: totalPaid,
      remainingAmount: remainingAmount,
      paymentStatus: paymentStatus
    });

  } catch (error) {
    console.error('Error updating invoice payment status:', error);
  }
};

// Generate PDF receipt for an invoice payment
export const generateInvoicePaymentReceiptPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await InvoicePayment.findById(id)
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('customerId', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    const pdfBuffer = await generateInvoicePaymentPDF(payment as any);

    // Set headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-payment-receipt-${payment._id}.pdf"`,
      'Content-Length': pdfBuffer.length.toString()
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
