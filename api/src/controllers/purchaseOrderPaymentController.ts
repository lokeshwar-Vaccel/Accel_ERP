import { Response, NextFunction } from 'express';
import { PurchaseOrderPayment, IPaymentMethodDetails } from '../models/PurchaseOrderPayment';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest, APIResponse } from '../types';
import { generatePaymentReceiptPDF } from '../utils/paymentReceiptPdf';

// @desc    Create a new purchase order payment with detailed method info
// @route   POST /api/v1/purchase-order-payments
// @access  Private
export const createPurchaseOrderPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      purchaseOrderId,
      poNumber,
      supplierId,
      amount,
      currency = 'INR',
      paymentMethod,
      paymentMethodDetails,
      paymentDate,
      notes,
      receiptNumber
    } = req.body;

    // Validate required fields
    if (!purchaseOrderId || !poNumber || !supplierId || !amount || !paymentMethod) {
      return next(new AppError('Missing required fields', 400));
    }

    if (amount <= 0) {
      return next(new AppError('Payment amount must be greater than 0', 400));
    }

    // Validate payment method details based on payment method
    const validationError = validatePaymentMethodDetails(paymentMethod, paymentMethodDetails);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    // Check if purchase order exists
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
    if (!purchaseOrder) {
      return next(new AppError('Purchase order not found', 404));
    }

    // Structure payment method details based on the selected payment method
    // Convert frontend keys to backend keys
    const keyMapping: { [key: string]: string } = {
      'bank_transfer': 'bankTransfer',
      'bankTransfer': 'bankTransfer',
      'cheque': 'cheque',
      'upi': 'upi',
      'card': 'card',
      'cash': 'cash',
      'other': 'other'
    };
    
    const backendKey = keyMapping[paymentMethod] || paymentMethod;
    
    // Get the payment method details from the correct key
    let methodDetails = {};
    if (paymentMethodDetails[paymentMethod]) {
      // If data is in the payment method key (e.g., bank_transfer)
      methodDetails = paymentMethodDetails[paymentMethod];
    } else if (paymentMethodDetails[backendKey]) {
      // If data is in the backend key (e.g., bankTransfer)
      methodDetails = paymentMethodDetails[backendKey];
    }
    
    // Debug logging
    console.log('=== Payment Method Details Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Backend Key:', backendKey);
    console.log('Payment Method Details:', JSON.stringify(paymentMethodDetails, null, 2));
    console.log('Method Details:', JSON.stringify(methodDetails, null, 2));
    console.log('=====================================');
    
    const structuredPaymentMethodDetails = {
      [backendKey]: methodDetails
    };

    // Create the payment record
    const payment = new PurchaseOrderPayment({
      purchaseOrderId,
      poNumber,
      supplierId,
      amount,
      currency,
      paymentMethod,
      paymentMethodDetails: structuredPaymentMethodDetails,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      receiptNumber,
      createdBy: req.user?.id,
      paymentStatus: 'completed'
    });

    await payment.save();

    // Update the purchase order payment status
    await updatePurchaseOrderPaymentStatus(purchaseOrderId, amount);

    const response: APIResponse = {
      success: true,
      message: 'Purchase order payment created successfully',
      data: { payment }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for a specific purchase order
// @route   GET /api/v1/purchase-order-payments/po/:poId
// @access  Private
export const getPaymentsByPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { poId } = req.params;

    const payments = await PurchaseOrderPayment.find({ purchaseOrderId: poId })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const response: APIResponse = {
      success: true,
      message: 'Payments retrieved successfully',
      data: { payments }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by ID
// @route   GET /api/v1/purchase-order-payments/:id
// @access  Private
export const getPaymentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await PurchaseOrderPayment.findById(id)
      .populate('purchaseOrderId', 'poNumber totalAmount')
      .populate({
        path: 'supplierId',
        model: 'Customer',
        select: 'name email'
      })
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment retrieved successfully',
      data: { payment }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment details
// @route   PUT /api/v1/purchase-order-payments/:id
// @access  Private
export const updatePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate payment method details if payment method is being updated
    if (updateData.paymentMethod && updateData.paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(updateData.paymentMethod, updateData.paymentMethodDetails);
      if (validationError) {
        return next(new AppError(validationError, 400));
      }
      
      // Structure payment method details based on the selected payment method
      // Convert frontend keys to backend keys
      const keyMapping: { [key: string]: string } = {
        'bank_transfer': 'bankTransfer',
        'bankTransfer': 'bankTransfer',
        'cheque': 'cheque',
        'upi': 'upi',
        'card': 'card',
        'cash': 'cash',
        'other': 'other'
      };
      
      const backendKey = keyMapping[updateData.paymentMethod] || updateData.paymentMethod;
      
      // Get the payment method details from the correct key
      let methodDetails = {};
      if (updateData.paymentMethodDetails[updateData.paymentMethod]) {
        // If data is in the payment method key (e.g., bank_transfer)
        methodDetails = updateData.paymentMethodDetails[updateData.paymentMethod];
      } else if (updateData.paymentMethodDetails[backendKey]) {
        // If data is in the backend key (e.g., bankTransfer)
        methodDetails = updateData.paymentMethodDetails[backendKey];
      }
      
      updateData.paymentMethodDetails = {
        [backendKey]: methodDetails
      };
    }

    const payment = await PurchaseOrderPayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('purchaseOrderId', 'poNumber totalAmount')
     .populate({
       path: 'supplierId',
       model: 'Customer',
       select: 'name email'
     })
     .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/v1/purchase-order-payments/:id
// @access  Private
export const deletePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await PurchaseOrderPayment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Recalculate purchase order payment status
    await recalculatePurchaseOrderPaymentStatus(payment.purchaseOrderId.toString(), payment.amount);

    await PurchaseOrderPayment.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'Payment deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate PDF receipt for a payment
// @route   GET /api/v1/purchase-order-payments/:id/pdf
// @access  Private
export const generatePaymentReceiptPDFEndpoint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await PurchaseOrderPayment.findById(id)
      .populate('purchaseOrderId', 'poNumber totalAmount')
      .populate({
        path: 'supplierId',
        model: 'Customer',
        select: 'name email phone addresses'
      })
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const pdfBuffer = await generatePaymentReceiptPDF(payment as any);

    // Set headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="payment-receipt-${payment._id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
};

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, details: IPaymentMethodDetails): string | null => {
  switch (paymentMethod) {
    case 'cash':
      // Cash is simple, no required validation
      return null;

    case 'cheque':
      if (!details.cheque?.chequeNumber || !details.cheque?.bankName || !details.cheque?.issueDate) {
        return 'Cheque payment requires cheque number, bank name, and issue date';
      }
      return null;

    case 'bank_transfer':
      if (!details.bankTransfer?.transferDate) {
        return 'Bank transfer requires transfer date';
      }
      return null;

    case 'upi':
      // No required fields for UPI - transaction ID is optional
      return null;

    case 'card':
      // No required fields for card - transaction ID is optional
      return null;

    case 'other':
      if (!details.other?.methodName) {
        return 'Other payment method requires method name';
      }
      return null;

    default:
      return 'Invalid payment method';
  }
};

// Helper function to update purchase order payment status
const updatePurchaseOrderPaymentStatus = async (purchaseOrderId: string, amount: number): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
    if (!purchaseOrder) return;

    const existingPaidAmount = purchaseOrder.paidAmount || 0;
    const newTotalPaidAmount = existingPaidAmount + amount;
    const totalAmount = purchaseOrder.totalAmount || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    let newPaymentStatus: 'pending' | 'partial' | 'paid';
    if (newTotalPaidAmount === 0) {
      newPaymentStatus = 'pending';
    } else if (newTotalPaidAmount >= totalAmount) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partial';
    }

    await PurchaseOrder.findByIdAndUpdate(purchaseOrderId, {
      paidAmount: newTotalPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus
    });
  } catch (error) {
    console.error('Error updating purchase order payment status:', error);
  }
};

// Helper function to recalculate purchase order payment status after payment deletion
const recalculatePurchaseOrderPaymentStatus = async (purchaseOrderId: string, deletedAmount: number): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
    if (!purchaseOrder) return;

    const existingPaidAmount = purchaseOrder.paidAmount || 0;
    const newTotalPaidAmount = Math.max(0, existingPaidAmount - deletedAmount);
    const totalAmount = purchaseOrder.totalAmount || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    let newPaymentStatus: 'pending' | 'partial' | 'paid';
    if (newTotalPaidAmount === 0) {
      newPaymentStatus = 'pending';
    } else if (newTotalPaidAmount >= totalAmount) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partial';
    }

    await PurchaseOrder.findByIdAndUpdate(purchaseOrderId, {
      paidAmount: newTotalPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus
    });
  } catch (error) {
    console.error('Error recalculating purchase order payment status:', error);
  }
}; 