import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle, IndianRupee, Calculator } from 'lucide-react';

interface UpdatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any; // Can be Invoice or Quotation
  itemType: 'invoice' | 'quotation';
  onSubmit: (paymentData: any) => Promise<void>;
  submitting?: boolean;
}

interface PaymentData {
  paymentStatus: string;
  paymentMethod: string;
  paymentDate: string;
  paidAmount: number;
  notes: string;
  useRazorpay: boolean;
  paymentMethodDetails?: {
    cash?: {
      receivedBy?: string;
      receiptNumber?: string;
    };
    cheque?: {
      chequeNumber: string;
      bankName: string;
      branchName?: string;
      issueDate: string;
      clearanceDate?: string;
      accountHolderName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
    bankTransfer?: {
      bankName: string;
      branchName?: string;
      accountNumber: string;
      ifscCode: string;
      transactionId: string;
      transferDate: string;
      accountHolderName?: string;
      referenceNumber?: string;
    };
    upi?: {
      upiId: string;
      transactionId: string;
      transactionReference?: string;
      payerName?: string;
      payerPhone?: string;
    };
    card?: {
      cardType: 'credit' | 'debit' | 'prepaid';
      cardNetwork: 'visa' | 'mastercard' | 'amex' | 'rupay' | 'other';
      lastFourDigits: string;
      transactionId: string;
      authorizationCode?: string;
      cardHolderName?: string;
    };
    other?: {
      methodName: string;
      referenceNumber?: string;
      additionalDetails?: Record<string, any>;
    };
  };
}

const UpdatePaymentModal: React.FC<UpdatePaymentModalProps> = ({
  isOpen,
  onClose,
  item,
  itemType,
  onSubmit,
  submitting = false
}) => {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paymentStatus: 'pending',
    paymentMethod: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    notes: '',
    useRazorpay: false,
    paymentMethodDetails: {}
  });

  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize payment data - always start with a clean form for new payments
  useEffect(() => {
    if (item) {
      // Always start with a clean payment form for new payments
      setPaymentData({
        paymentStatus: 'pending',
        paymentMethod: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paidAmount: 0,
        notes: '',
        useRazorpay: false,
        paymentMethodDetails: {}
      });
    }
  }, [item, itemType]);

  const getTotalAmount = () => {
    if (itemType === 'quotation') {
      return item.grandTotal || 0;
    } else {
      // For invoices, check both totalAmount and grandTotal
      return item.grandTotal || item.totalAmount || 0;
    }
  };

  const getPaidAmount = () => {
    if (itemType === 'quotation') {
      return item.paidAmount || 0;
    } else {
      return item.paidAmount || 0;
    }
  };

  const getRemainingAmount = () => {
    if (itemType === 'quotation') {
      return item.remainingAmount || (getTotalAmount() - getPaidAmount());
    } else {
      return item.remainingAmount || (getTotalAmount() - getPaidAmount());
    }
  };

  // Calculate total tax amount from items
  const getTotalTaxAmount = () => {
    if (!item) return 0;
    
    // For AMC invoices, use the pre-calculated totalTax
    if (itemType === 'invoice' && item.totalTax) {
      return item.totalTax;
    }
    
    // For quotations or other invoices, calculate from items
    if (item.items) {
      return item.items.reduce((total: number, item: any) => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        const discountAmount = (itemTotal * (item.discount || 0)) / 100;
        const discountedAmount = itemTotal - discountAmount;
        const taxAmount = (discountedAmount * (item.taxRate || 0)) / 100;
        return total + taxAmount;
      }, 0);
    }
    
    return 0;
  };

  // Calculate amount without GST (for GST Pending status)
  const getAmountWithoutGST = () => {
    return getTotalAmount() - getTotalTaxAmount();
  };

  // Get the payable amount based on payment status
  const getPayableAmount = () => {
    if (paymentData.paymentStatus === 'gst_pending') {
      return getAmountWithoutGST();
    }
    return getTotalAmount();
  };

  // Get remaining amount based on payment status
  const getRemainingPayableAmount = () => {
    const payableAmount = getPayableAmount();
    return payableAmount - getPaidAmount();
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'gst_pending':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partial':
        return 'Partial';
      case 'gst_pending':
        return 'GST Pending';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getPaymentMethodLabel = (value: string) => {
    switch (value) {
      case 'cash':
        return 'Cash';
      case 'cheque':
        return 'Cheque';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'upi':
        return 'UPI';
      case 'card':
        return 'Credit/Debit Card';
      case 'other':
        return 'Other';
      default:
        return 'Select payment method';
    }
  };

  // Helper function to update payment method details
  const updatePaymentMethodDetails = (method: string, field: string, value: string) => {
    setPaymentData(prev => ({
      ...prev,
      paymentMethodDetails: {
        ...prev.paymentMethodDetails,
        [method]: {
          ...prev.paymentMethodDetails?.[method as keyof typeof prev.paymentMethodDetails],
          [field]: value
        }
      }
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!paymentData.paidAmount || paymentData.paidAmount <= 0) {
      errors.paidAmount = 'Payment amount must be greater than 0';
    }

    if (paymentData.paidAmount > getRemainingPayableAmount()) {
      errors.paidAmount = `Payment amount cannot exceed remaining amount (₹${getRemainingPayableAmount().toLocaleString()})`;
    }

    if (!paymentData.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    if (!paymentData.paymentDate) {
      errors.paymentDate = 'Payment date is required';
    }

    // Validate payment method details
    if (paymentData.paymentMethod && paymentData.paymentMethodDetails) {
      switch (paymentData.paymentMethod) {
        case 'cheque':
          const chequeDetails = paymentData.paymentMethodDetails.cheque;
          if (!chequeDetails?.chequeNumber) {
            errors.chequeNumber = 'Cheque number is required';
          }
          if (!chequeDetails?.bankName) {
            errors.bankName = 'Bank name is required';
          }
          if (!chequeDetails?.issueDate) {
            errors.issueDate = 'Issue date is required';
          }
          break;
        case 'bank_transfer':
          const bankTransferDetails = paymentData.paymentMethodDetails.bankTransfer;
          if (!bankTransferDetails?.transferDate) {
            errors.transferDate = 'Transfer date is required';
          }
          break;
        case 'upi':
          // No required fields for UPI - transaction ID is optional
          break;
        case 'card':
          // No required fields for card - transaction ID is optional
          break;
        case 'other':
          const otherDetails = paymentData.paymentMethodDetails.other;
          if (!otherDetails?.methodName) {
            errors.methodName = 'Method name is required';
          }
          break;
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    await onSubmit(paymentData);
  };

  const handleAmountChange = (amount: number) => {
    let newPaymentStatus = paymentData.paymentStatus;
    
    // Don't auto-change status if it's already set to gst_pending
    if (paymentData.paymentStatus !== 'gst_pending') {
      if (amount >= getRemainingPayableAmount()) {
        newPaymentStatus = 'paid';
      } else if (amount > 0) {
        newPaymentStatus = 'partial';
      } else {
        newPaymentStatus = 'pending';
      }
    }

    setPaymentData({
      ...paymentData,
      paidAmount: amount,
      paymentStatus: newPaymentStatus
    });

    if (formErrors.paidAmount && amount > 0 && amount <= getRemainingPayableAmount()) {
      setFormErrors(prev => ({ ...prev, paidAmount: '' }));
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Update Payment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Record a new payment for {itemType === 'quotation' ? 'quotation' : 'invoice'} #{itemType === 'quotation' ? item.quotationNumber : item.invoiceNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="px-6 pt-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column - Summary & Payment Info */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold text-sm">₹</span>
                  </div>
                  {itemType === 'quotation' ? 'Quotation' : 'Invoice'} Summary
                </h3>

                <div className="text-sm text-gray-600 mb-4">
                  {itemType === 'quotation' ? 'Quotation' : 'Invoice'}: <span className="font-medium text-gray-900">
                    {itemType === 'quotation' ? item.quotationNumber : item.invoiceNumber}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <span className="text-gray-500 text-sm">Total Amount</span>
                    <div className="text-2xl font-bold text-gray-900">₹{getTotalAmount().toLocaleString()}</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <span className="text-gray-500 text-sm">Already Paid</span>
                    <div className="text-2xl font-bold text-green-600">₹{getPaidAmount().toLocaleString()}</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <span className="text-gray-500 text-sm">
                      {paymentData.paymentStatus === 'gst_pending' ? 'Payable Amount' : 'Remaining'}
                    </span>
                    <div className="text-2xl font-bold text-red-600">₹{getRemainingPayableAmount().toLocaleString()}</div>
                  </div>
                </div>

                {/* GST Breakdown - Show when GST Pending is selected */}
                {paymentData.paymentStatus === 'gst_pending' && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-orange-800 mb-2">GST Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-orange-600">Amount without GST:</span>
                        <div className="font-semibold text-orange-800">₹{getAmountWithoutGST().toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-orange-600">GST Amount:</span>
                        <div className="font-semibold text-orange-800">₹{getTotalTaxAmount().toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-orange-600">
                      GST amount (₹{getTotalTaxAmount().toLocaleString()}) will be paid separately
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">Payment Status:</span>
                  <span className={`ml-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(paymentData.paymentStatus)}`}>
                    {getPaymentStatusLabel(paymentData.paymentStatus)}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">
                    {itemType === 'quotation' ? 'Customer' : item.invoiceType === 'purchase' ? 'Supplier' : 'Customer'}:
                  </div>
                  <div className="font-medium text-gray-900">
                    {itemType === 'quotation' ? item.customer?.name : (item.invoiceType === 'purchase' ? item.supplier?.name : item.customer?.name)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {itemType === 'quotation' ? item.customer?.email : (item.invoiceType === 'purchase' ? item.supplier?.email : item.customer?.email)}
                  </div>
                </div>
              </div>

              {/* Payment Gateway Selection */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-3" />
                  Payment Gateway
                </h3>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="manual-payment"
                        name="payment-gateway"
                        checked={!paymentData.useRazorpay}
                        onChange={() => setPaymentData({ ...paymentData, useRazorpay: false })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="manual-payment" className="text-sm font-medium text-blue-800">
                        Manual Payment Entry
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 ml-7">Record payment received through other means</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="razorpay-payment"
                        name="payment-gateway"
                        checked={paymentData.useRazorpay}
                        onChange={() => setPaymentData({ ...paymentData, useRazorpay: true })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="razorpay-payment" className="text-sm font-medium text-blue-800">
                        Razorpay Gateway
                      </label>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Secure</span>
                    </div>

                    {paymentData.useRazorpay && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-blue-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Secure payment page redirect</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-blue-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>UPI, Cards, Net Banking, Wallets</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-blue-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Real-time verification</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              {paymentData.paidAmount > 0 && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-3" />
                    Payment Summary
                  </h3>

                  <div className="space-y-3">
                    {getPaidAmount() > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-yellow-200">
                        <span className="text-yellow-700">Previously Paid:</span>
                        <span className="font-semibold text-yellow-800">₹{getPaidAmount().toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-2 border-b border-yellow-200">
                      <span className="text-yellow-700">New Payment:</span>
                      <span className="font-semibold text-yellow-800">₹{paymentData.paidAmount.toLocaleString()}</span>
                    </div>

                    <div className="border-t border-yellow-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-yellow-800 font-semibold">Total After This Payment:</span>
                        <span className="font-bold text-yellow-800">₹{(getPaidAmount() + paymentData.paidAmount).toLocaleString()}</span>
                      </div>
                    </div>

                    {paymentData.paidAmount < getRemainingPayableAmount() && (
                      <div className="border-t border-yellow-200 pt-3">
                        <div className="flex justify-between">
                          <span className="text-yellow-700">Remaining After This Payment:</span>
                          <span className="font-semibold text-red-600">₹{(getRemainingPayableAmount() - paymentData.paidAmount).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {paymentData.paidAmount >= getRemainingPayableAmount() && (
                      <div className="bg-green-100 p-3 rounded-lg mt-3">
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          <span className="font-semibold">
                            {paymentData.paymentStatus === 'gst_pending' 
                              ? 'Amount without GST will be marked as PAID'
                              : (itemType === 'quotation' ? 'Quotation will be marked as PAID' : 'Invoice will be marked as PAID')
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {/* GST Pending Status Message */}
                    {paymentData.paymentStatus === 'gst_pending' && (
                      <div className="bg-orange-100 p-3 rounded-lg mt-3">
                        <div className="flex items-center text-orange-800">
                          <span className="font-semibold text-sm">
                            GST amount (₹{getTotalTaxAmount().toLocaleString()}) will be paid separately
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Payment Form */}
            <div className="space-y-6">
              {/* Payment Amount */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <IndianRupee className="w-5 h-5 mr-3 text-green-600" />
                  Payment Amount
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getPaidAmount() > 0 ? 'Additional Payment Amount (₹) *' : 'Payment Amount (₹) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      max={getRemainingPayableAmount()}
                      step="1"
                      value={paymentData.paidAmount ||''}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      className={`w-full pl-8 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold ${formErrors.paidAmount ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="0"
                    />
                  </div>
                  {formErrors.paidAmount && (
                    <p className="text-red-500 text-sm mt-2">{formErrors.paidAmount}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Max: ₹{getRemainingPayableAmount().toLocaleString()}
                  </p>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAmountChange(Math.round(getRemainingPayableAmount() * 0.5))}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Half Remaining
                    <div className="text-xs">₹{Math.round(getRemainingPayableAmount() * 0.5).toLocaleString()}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAmountChange(getRemainingPayableAmount())}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                  >
                    Full Remaining
                    <div className="text-xs">₹{getRemainingPayableAmount().toLocaleString()}</div>
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold text-sm">i</span>
                  </div>
                  Payment Details
                </h3>

                <div className="space-y-4">
                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setShowPaymentStatusDropdown(!showPaymentStatusDropdown)}
                        className={`flex items-center justify-between w-full px-4 py-3 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50 ${formErrors.paymentStatus ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <span className="text-gray-700 font-medium">{getPaymentStatusLabel(paymentData.paymentStatus)}</span>
                        <span className="text-gray-400">▼</span>
                      </button>
                      {formErrors.paymentStatus && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.paymentStatus}</p>
                      )}
                      {showPaymentStatusDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                          {[
                            { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
                            { value: 'partial', label: 'Partial Payment', color: 'text-blue-600' },
                            { value: 'paid', label: 'Paid in Full', color: 'text-green-600' },
                            { value: 'gst_pending', label: 'GST Pending', color: 'text-orange-600' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                let newPaidAmount = paymentData.paidAmount;
                                if (option.value === 'partial' && paymentData.paidAmount === 0) {
                                  newPaidAmount = Math.round(getRemainingAmount() * 0.5);
                                } else if (option.value === 'paid') {
                                  newPaidAmount = getRemainingAmount();
                                } else if (option.value === 'gst_pending') {
                                  // For GST Pending, set amount to the amount without GST
                                  newPaidAmount = getAmountWithoutGST();
                                }

                                setPaymentData({
                                  ...paymentData,
                                  paidAmount: newPaidAmount,
                                  paymentStatus: option.value
                                });
                                setShowPaymentStatusDropdown(false);

                                if (formErrors.paymentStatus) {
                                  setFormErrors(prev => ({ ...prev, paymentStatus: '' }));
                                }
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${option.color} ${paymentData.paymentStatus === option.value ? 'bg-blue-50' : ''}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                        className={`flex items-center justify-between w-full px-4 py-3 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50 ${formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <span className="text-gray-700 font-medium">{getPaymentMethodLabel(paymentData.paymentMethod)}</span>
                        <span className="text-gray-400">▼</span>
                      </button>
                      {formErrors.paymentMethod && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.paymentMethod}</p>
                      )}
                      {showPaymentMethodDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                          {[
                            { value: '', label: 'Select payment method' },
                            { value: 'cash', label: 'Cash' },
                            { value: 'cheque', label: 'Cheque' },
                            { value: 'bank_transfer', label: 'Bank Transfer' },
                            { value: 'upi', label: 'UPI' },
                            { value: 'card', label: 'Credit/Debit Card' },
                            { value: 'other', label: 'Other' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setPaymentData({ ...paymentData, paymentMethod: option.value });
                                setShowPaymentMethodDropdown(false);

                                if (formErrors.paymentMethod && option.value) {
                                  setFormErrors(prev => ({ ...prev, paymentMethod: '' }));
                                }
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${paymentData.paymentMethod === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={paymentData.paymentDate}
                      onChange={(e) => {
                        setPaymentData({ ...paymentData, paymentDate: e.target.value });
                        if (formErrors.paymentDate && e.target.value) {
                          setFormErrors(prev => ({ ...prev, paymentDate: '' }));
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 ${formErrors.paymentDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.paymentDate && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.paymentDate}</p>
                    )}
                  </div>

                  {/* Dynamic Payment Method Details */}
                  {paymentData.paymentMethod && paymentData.paymentMethod !== '' && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Payment Method Details - {getPaymentMethodLabel(paymentData.paymentMethod)}
                      </h4>

                      {/* Cash Payment Details */}
                      {paymentData.paymentMethod === 'cash' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Received By
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.cash?.receivedBy || ''}
                              onChange={(e) => updatePaymentMethodDetails('cash', 'receivedBy', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Who received the cash?"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Receipt Number
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.cash?.receiptNumber || ''}
                              onChange={(e) => updatePaymentMethodDetails('cash', 'receiptNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Receipt number (optional)"
                            />
                          </div>
                        </div>
                      )}

                      {/* Cheque Payment Details */}
                      {paymentData.paymentMethod === 'cheque' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Cheque Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.cheque?.chequeNumber || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('cheque', 'chequeNumber', e.target.value);
                                if (formErrors.chequeNumber) {
                                  setFormErrors(prev => ({ ...prev, chequeNumber: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.chequeNumber ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter cheque number"
                              required
                            />
                            {formErrors.chequeNumber && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.chequeNumber}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bank Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.cheque?.bankName || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('cheque', 'bankName', e.target.value);
                                if (formErrors.bankName) {
                                  setFormErrors(prev => ({ ...prev, bankName: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.bankName ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter bank name"
                              required
                            />
                            {formErrors.bankName && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.bankName}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Branch Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.cheque?.branchName || ''}
                              onChange={(e) => updatePaymentMethodDetails('cheque', 'branchName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter branch name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Issue Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={paymentData.paymentMethodDetails?.cheque?.issueDate || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('cheque', 'issueDate', e.target.value);
                                if (formErrors.issueDate) {
                                  setFormErrors(prev => ({ ...prev, issueDate: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.issueDate ? 'border-red-500' : 'border-gray-300'}`}
                              required
                            />
                            {formErrors.issueDate && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.issueDate}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.cheque?.accountHolderName || ''}
                              onChange={(e) => updatePaymentMethodDetails('cheque', 'accountHolderName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter account holder name"
                            />
                          </div>
                        </div>
                      )}

                      {/* Bank Transfer Details */}
                      {paymentData.paymentMethod === 'bank_transfer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Transaction ID
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.bankTransfer?.transactionId || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('bankTransfer', 'transactionId', e.target.value);
                                if (formErrors.transactionId) {
                                  setFormErrors(prev => ({ ...prev, transactionId: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transactionId ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter transaction ID"
                            />
                            {formErrors.transactionId && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.transactionId}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Transfer Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={paymentData.paymentMethodDetails?.bankTransfer?.transferDate || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('bankTransfer', 'transferDate', e.target.value);
                                if (formErrors.transferDate) {
                                  setFormErrors(prev => ({ ...prev, transferDate: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transferDate ? 'border-red-500' : 'border-gray-300'}`}
                              required
                            />
                            {formErrors.transferDate && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.transferDate}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reference Number
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.bankTransfer?.referenceNumber || ''}
                              onChange={(e) => updatePaymentMethodDetails('bankTransfer', 'referenceNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter reference number"
                            />
                          </div>
                        </div>
                      )}

                      {/* UPI Payment Details */}
                      {paymentData.paymentMethod === 'upi' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Transaction ID
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.upi?.transactionId || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('upi', 'transactionId', e.target.value);
                                if (formErrors.transactionId) {
                                  setFormErrors(prev => ({ ...prev, transactionId: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transactionId ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter transaction ID"
                            />
                            {formErrors.transactionId && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.transactionId}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Payer Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.upi?.payerName || ''}
                              onChange={(e) => updatePaymentMethodDetails('upi', 'payerName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter payer name"
                            />
                          </div>
                        </div>
                      )}

                      {/* Card Payment Details */}
                      {paymentData.paymentMethod === 'card' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Transaction ID
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.card?.transactionId || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('card', 'transactionId', e.target.value);
                                if (formErrors.transactionId) {
                                  setFormErrors(prev => ({ ...prev, transactionId: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transactionId ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter transaction ID"
                            />
                            {formErrors.transactionId && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.transactionId}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Payer Name
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.card?.cardHolderName || ''}
                              onChange={(e) => updatePaymentMethodDetails('card', 'cardHolderName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter payer name"
                            />
                          </div>
                        </div>
                      )}

                      {/* Other Payment Method Details */}
                      {paymentData.paymentMethod === 'other' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Method Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.other?.methodName || ''}
                              onChange={(e) => {
                                updatePaymentMethodDetails('other', 'methodName', e.target.value);
                                if (formErrors.methodName) {
                                  setFormErrors(prev => ({ ...prev, methodName: '' }));
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.methodName ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter payment method name"
                              required
                            />
                            {formErrors.methodName && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.methodName}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reference Number
                            </label>
                            <input
                              type="text"
                              value={paymentData.paymentMethodDetails?.other?.referenceNumber || ''}
                              onChange={(e) => updatePaymentMethodDetails('other', 'referenceNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter reference number"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Notes
                    </label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50"
                      placeholder="Transaction ID, reference number, or other payment details..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="font-medium">
              {itemType === 'quotation' ? 'Quotation' : 'Invoice'}:
            </span> {itemType === 'quotation' ? item.quotationNumber : item.invoiceNumber} | 
            <span className="font-medium ml-2">
              {itemType === 'quotation' ? 'Customer' : item.invoiceType === 'purchase' ? 'Supplier' : 'Customer'}:
            </span> {itemType === 'quotation' ? item.customer?.name : (item.invoiceType === 'purchase' ? item.supplier?.name : item.customer?.name)}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!paymentData.paidAmount || submitting}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                paymentData.useRazorpay ? 'Proceed to Payment' : 'Add Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePaymentModal; 