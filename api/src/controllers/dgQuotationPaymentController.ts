import { Response, NextFunction } from 'express';
import { DGQuotationPayment } from '../models/DGQuotationPayment';
import { DGQuotation } from '../models/DGQuotation';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest, APIResponse } from '../types';

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, paymentMethodDetails: any): string | null => {
  if (!paymentMethodDetails) return null;

  switch (paymentMethod) {
    case 'cheque':
      if (!paymentMethodDetails.cheque?.chequeNumber) return 'Cheque number is required';
      if (!paymentMethodDetails.cheque?.bankName) return 'Bank name is required';
      if (!paymentMethodDetails.cheque?.issueDate) return 'Issue date is required';
      break;
    case 'bank_transfer':
      if (!paymentMethodDetails.bankTransfer?.transferDate) return 'Transfer date is required';
      break;
    case 'upi':
      // No required fields for UPI - transaction ID is optional
      break;
    case 'card':
      // No required fields for card - transaction ID is optional
      break;
    case 'other':
      if (!paymentMethodDetails.other?.methodName) return 'Method name is required';
      break;
  }
  return null;
};

// Helper function to update DG quotation payment status
const updateDGQuotationPaymentStatus = async (quotationId: string, paymentAmount: number): Promise<void> => {
  const quotation = await DGQuotation.findById(quotationId);
  if (!quotation) {
    throw new AppError('DG Quotation not found', 404);
  }

  const newPaidAmount = (quotation.paidAmount || 0) + paymentAmount;
  const remainingAmount = Math.max(0, quotation.grandTotal - newPaidAmount);

  let paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  if (newPaidAmount === 0) {
    paymentStatus = 'Pending';
  } else if (newPaidAmount >= quotation.grandTotal) {
    paymentStatus = 'Paid';
  } else {
    paymentStatus = 'Partial';
  }

  await DGQuotation.findByIdAndUpdate(quotationId, {
    paidAmount: newPaidAmount,
    remainingAmount: remainingAmount,
    paymentStatus: paymentStatus
  });
};

// @desc    Create a new DG quotation payment with detailed method info
// @route   POST /api/v1/dg-quotation-payments
// @access  Private
export const createDGQuotationPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      quotationId,
      quotationNumber,
      customerId,
      amount,
      currency = 'INR',
      paymentMethod,
      paymentMethodDetails,
      paymentDate,
      notes,
      receiptNumber
    } = req.body;

    // Validate required fields
    if (!quotationId || !quotationNumber || !customerId || !amount || !paymentMethod) {
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

    // Check if DG quotation exists
    const dgQuotation = await DGQuotation.findById(quotationId);
    if (!dgQuotation) {
      return next(new AppError('DG Quotation not found', 404));
    }

    // Check if payment amount is reasonable (not more than 2x the grand total)
    if (amount > (dgQuotation.grandTotal * 2)) {
      return next(new AppError(`Payment amount (₹${amount}) seems unusually high compared to quotation total (₹${dgQuotation.grandTotal}). Please verify the amount.`, 400));
    }

    // Debug logging
    console.log('Payment Debug Info:', {
      quotationId,
      grandTotal: dgQuotation.grandTotal,
      paidAmount: dgQuotation.paidAmount,
      remainingAmount: dgQuotation.remainingAmount,
      paymentAmount: amount,
      quotationStatus: dgQuotation.status
    });

    // Ensure quotation has a valid grand total
    if (!dgQuotation.grandTotal || dgQuotation.grandTotal <= 0) {
      return next(new AppError(`Quotation does not have a valid total amount (₹${dgQuotation.grandTotal}). Please ensure the quotation has items and is properly calculated.`, 400));
    }

    // Ensure quotation is in a valid status for payment
    if (dgQuotation.status === 'Rejected' || dgQuotation.status === 'Expired') {
      return next(new AppError(`Cannot process payment for quotation in ${dgQuotation.status} status.`, 400));
    }

    // Calculate remaining amount if not properly set
    const grandTotal = dgQuotation.grandTotal || 0;
    const paidAmount = dgQuotation.paidAmount || 0;
    const remainingAmount = Math.max(0, grandTotal - paidAmount);
    
    // Check if payment amount exceeds remaining amount
    if (amount > remainingAmount) {
      // Log the issue for debugging
      console.log('Payment amount exceeds remaining amount:', {
        paymentAmount: amount,
        remainingAmount: remainingAmount,
        grandTotal: grandTotal,
        paidAmount: paidAmount,
        quotationId: quotationId
      });
      
      // Try to fix the quotation's remaining amount by recalculating it
      const recalculatedRemainingAmount = Math.max(0, grandTotal - paidAmount);
      console.log('Recalculated remaining amount:', recalculatedRemainingAmount);
      
      if (amount > recalculatedRemainingAmount) {
        return next(new AppError(`Payment amount (₹${amount}) exceeds remaining amount (₹${recalculatedRemainingAmount}). 
        
Quotation Details:
- Quotation ID: ${quotationId}
- Quotation Number: ${dgQuotation.quotationNumber}
- Grand Total: ₹${grandTotal}
- Paid Amount: ₹${paidAmount}
- Remaining Amount: ₹${recalculatedRemainingAmount}
- Payment Amount: ₹${amount}

This error suggests either:
1. The quotation has no items or invalid pricing
2. The payment amount is incorrect
3. There's a data inconsistency

Please verify the quotation has proper items and pricing before processing payment.`, 400));
      } else {
        console.warn('WARNING: Quotation remaining amount was inconsistent. Fixed by recalculation.');
      }
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
    console.log('=== DG Quotation Payment Method Details Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Backend Key:', backendKey);
    console.log('Payment Method Details:', JSON.stringify(paymentMethodDetails, null, 2));
    console.log('Method Details:', JSON.stringify(methodDetails, null, 2));
    console.log('==============================================');
    
    const structuredPaymentMethodDetails = {
      [backendKey]: methodDetails
    };

    // Create the payment record
    const payment = new DGQuotationPayment({
      quotationId,
      quotationNumber,
      customerId,
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

    // Update the DG quotation payment status
    await updateDGQuotationPaymentStatus(quotationId, amount);

    const response: APIResponse = {
      success: true,
      message: 'DG Quotation payment created successfully',
      data: { payment }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for a specific DG quotation
// @route   GET /api/v1/dg-quotation-payments/quotation/:dgQuotationId
// @access  Private
export const getPaymentsByDGQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quotationId } = req.params;

    const payments = await DGQuotationPayment.find({ quotationId })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ paymentDate: -1 });

    const response: APIResponse = {
      success: true,
      message: 'Payments retrieved successfully',
      data: payments
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by ID
// @route   GET /api/v1/dg-quotation-payments/:id
// @access  Private
export const getPaymentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await DGQuotationPayment.findById(id)
      .populate('quotationId', 'quotationNumber grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment retrieved successfully',
      data: payment
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/v1/dg-quotation-payments/:id
// @access  Private
export const updatePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate payment method details if provided
    if (updateData.paymentMethod && updateData.paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(updateData.paymentMethod, updateData.paymentMethodDetails);
      if (validationError) {
        return next(new AppError(validationError, 400));
      }
    }

    const payment = await DGQuotationPayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('quotationId', 'quotationNumber grandTotal')
     .populate('customerId', 'name email phone')
     .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment updated successfully',
      data: payment
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/v1/dg-quotation-payments/:id
// @access  Private
export const deletePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await DGQuotationPayment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Remove the payment amount from the quotation
    const quotation = await DGQuotation.findById(payment.quotationId);
    if (quotation) {
      const newPaidAmount = Math.max(0, (quotation.paidAmount || 0) - payment.amount);
      const remainingAmount = Math.max(0, quotation.grandTotal - newPaidAmount);

      let paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
      if (newPaidAmount === 0) {
        paymentStatus = 'Pending';
      } else if (newPaidAmount >= quotation.grandTotal) {
        paymentStatus = 'Paid';
      } else {
        paymentStatus = 'Partial';
      }

      await DGQuotation.findByIdAndUpdate(payment.quotationId, {
        paidAmount: newPaidAmount,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus
      });
    }

    await DGQuotationPayment.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'Payment deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
