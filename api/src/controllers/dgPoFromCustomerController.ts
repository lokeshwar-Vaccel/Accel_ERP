import { Request, Response, NextFunction } from 'express';
import DGPoFromCustomer, { IDGPoFromCustomerSchema } from '../models/DGPoFromCustomer';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';

// @desc    Get all DG PO from customers with pagination and filtering
// @route   GET /api/v1/dg-po-from-customers
// @access  Private
export const getDGPoFromCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      status,
      customer,
      department,
      startDate,
      endDate
    } = req.query as {
      page?: string;
      limit?: string;
      sort?: string;
      search?: string;
      status?: string;
      customer?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
    };

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (department) query.department = department;

    // Date filtering
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Parse sort parameter
    const sortObj: any = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Execute query with population
    const dgPoFromCustomers = await DGPoFromCustomer.find(query)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
        ]
      })
      .populate('dgEnquiry', 'enquiryNo enquiryDate customerName phoneNumber email kva phase enquiryStatus referredBy panNumber designation')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await DGPoFromCustomer.countDocuments(query);

    res.json({
      success: true,
      data: dgPoFromCustomers,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching DG PO from customers:', error);
    next(new AppError('Failed to fetch DG PO from customers', 500));
  }
};

// @desc    Get single DG PO from customer by ID
// @route   GET /api/v1/dg-po-from-customers/:id
// @access  Private
export const getDGPoFromCustomerById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const dgPoFromCustomer = await DGPoFromCustomer.findById(id)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
        ]
      })
      .populate('dgEnquiry', 'enquiryNo enquiryDate customerName phoneNumber email kva phase enquiryStatus')
;

    if (!dgPoFromCustomer) {
      next(new AppError('DG PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      data: dgPoFromCustomer
    });
  } catch (error) {
    console.error('Error fetching DG PO from customer:', error);
    next(new AppError('Failed to fetch DG PO from customer', 500));
  }
};

// @desc    Create new DG PO from customer
// @route   POST /api/v1/dg-po-from-customers
// @access  Private
export const createDGPoFromCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('=== CREATE DG PO FROM CUSTOMER DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    console.log('=====================================');

    const {
      poNumber,
      customer,
      customerEmail,
      billToAddress,
      shipToAddress,
      dgQuotationNumber,
      dgEnquiry,
      items,
      expectedDeliveryDate,
      department,
      notes,
      priority,
      poDate,
      status,
      poPdf,
      transport,
      unloading,
      scopeOfWork,
      taxRate = 18
    } = req.body;

    // Handle PDF file path (file will be uploaded separately)
    const pdfPath = req.file?.path ?? "";
    console.log('Create DG PO - File path from body:', pdfPath);

    // Validate required fields
    if (!customer || !billToAddress || !shipToAddress || !items || !Array.isArray(items) || items.length === 0) {
      next(new AppError('Customer, bill to address, ship to address, and items are required', 400));
      return;
    }

    // Validate manual PO number if provided
    if (poNumber) {
      // Check if PO number already exists
      const existingPO = await DGPoFromCustomer.findOne({ poNumber });
      if (existingPO) {
        next(new AppError('PO number already exists. Please use a different number.', 400));
        return;
      }
    }

    // Validate customer exists
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      next(new AppError('Customer not found', 404));
      return;
    }

    // Validate items structure
    if (!items || !Array.isArray(items) || items.length === 0) {
      next(new AppError('Items are required and must be a non-empty array', 400));
      return;
    }

    // Calculate amounts
    let subtotal = 0;
    let totalDiscount = 0;
    
    const processedItems = items.map((item: any) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      const itemDiscountedAmount = item.discountedAmount || 0;
      const itemTotalPrice = itemSubtotal - itemDiscountedAmount;
      
      subtotal += itemTotalPrice;
      totalDiscount += itemDiscountedAmount;

      return {
        product: item.product || '',
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotalPrice,
        uom: item.uom || 'nos',
        discount: itemDiscount,
        discountedAmount: itemDiscountedAmount,
        kva: item.kva || '',
        phase: item.phase || '',
        annexureRating: item.annexureRating || '',
        dgModel: item.dgModel || '',
        numberOfCylinders: item.numberOfCylinders || 0,
        subject: item.subject || '',
        isActive: item.isActive !== undefined ? item.isActive : true,
        hsnNumber: item.hsnNumber || ''
      };
    });

    // Calculate GST at PO level
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    // Create DG PO from customer
    const dgPoFromCustomerData = {
      ...(poNumber && { poNumber }), // Include manual PO number if provided
      customer,
      customerEmail,
      billToAddress,
      shipToAddress,
      ...(dgQuotationNumber && { dgQuotationNumber }), // Include DG quotation number if provided
      ...(dgEnquiry && { dgEnquiry }), // Include DG enquiry if provided
      items: processedItems,
      subtotal,
      totalDiscount,
      taxRate,
      taxAmount,
      totalAmount,
      remainingAmount: totalAmount,
      orderDate: poDate ? new Date(poDate) : new Date(), // Use provided PO date or current date
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      department: department || 'retail',
      notes,
      priority: priority || 'medium',
      status: status || 'draft',
      poPdf: poPdf || undefined,
      transport,
      unloading,
      scopeOfWork,
      createdBy: req.user?.id
    };

    const dgPoFromCustomer = new DGPoFromCustomer(dgPoFromCustomerData);
    await dgPoFromCustomer.save();

    // Populate the created DG PO from customer
    await dgPoFromCustomer.populate([
      { path: 'customer', select: 'name email phone addresses' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { 
        path: 'dgQuotationNumber', 
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
        ]
      },
      { path: 'dgEnquiry', select: 'enquiryNo enquiryDate customerName phoneNumber email kva phase enquiryStatus' },
      { path: 'items.product', select: 'name partNo hsnNumber brand category gndp' }
    ]);

    res.status(201).json({
      success: true,
      data: dgPoFromCustomer,
      message: 'DG PO from customer created successfully'
    });
  } catch (error) {
    console.error('Error creating DG PO from customer:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    next(new AppError(`Failed to create DG PO from customer: ${error instanceof Error ? error.message : 'Unknown error'}`, 500));
  }
};

// @desc    Update DG PO from customer
// @route   PUT /api/v1/dg-po-from-customers/:id
// @access  Private
export const updateDGPoFromCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If items are being updated, recalculate amounts
    if (updateData.items && Array.isArray(updateData.items)) {
      const { taxRate = 18 } = updateData;
      
      let subtotal = 0;
      let totalDiscount = 0;
      
      const processedItems = updateData.items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemDiscount = item.discount || 0;
        const itemDiscountedAmount = item.discountedAmount || 0;
        const itemTotalPrice = itemSubtotal - itemDiscountedAmount;
        
        subtotal += itemTotalPrice;
        totalDiscount += itemDiscountedAmount;

        return {
          product: item.product || '',
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotalPrice,
          uom: item.uom || 'nos',
          discount: itemDiscount,
          discountedAmount: itemDiscountedAmount,
          kva: item.kva || '',
          phase: item.phase || '',
          annexureRating: item.annexureRating || '',
          dgModel: item.dgModel || '',
          numberOfCylinders: item.numberOfCylinders || 0,
          subject: item.subject || '',
          isActive: item.isActive !== undefined ? item.isActive : true,
          hsnNumber: item.hsnNumber || ''
        };
      });

      // Calculate GST at PO level
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      updateData.items = processedItems;
      updateData.subtotal = subtotal;
      updateData.totalDiscount = totalDiscount;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;
      updateData.remainingAmount = totalAmount - (updateData.paidAmount || 0);
    }

    // Find and update DG PO from customer
    const dgPoFromCustomer = await DGPoFromCustomer.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
        ]
      })
      .populate('dgEnquiry', 'enquiryNo enquiryDate customerName phoneNumber email kva phase enquiryStatus')
;

    if (!dgPoFromCustomer) {
      next(new AppError('DG PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      data: dgPoFromCustomer,
      message: 'DG PO from customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating DG PO from customer:', error);
    next(new AppError('Failed to update DG PO from customer', 500));
  }
};

// @desc    Delete DG PO from customer
// @route   DELETE /api/v1/dg-po-from-customers/:id
// @access  Private
export const deleteDGPoFromCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const dgPoFromCustomer = await DGPoFromCustomer.findByIdAndDelete(id);

    if (!dgPoFromCustomer) {
      next(new AppError('DG PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      message: 'DG PO from customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting DG PO from customer:', error);
    next(new AppError('Failed to delete DG PO from customer', 500));
  }
};

// @desc    Update DG PO from customer status
// @route   PATCH /api/v1/dg-po-from-customers/:id/status
// @access  Private
export const updateDGPoFromCustomerStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      next(new AppError('Invalid status', 400));
      return;
    }

    const dgPoFromCustomer = await DGPoFromCustomer.findByIdAndUpdate(
      id,
      { 
        status, 
        updatedBy: req.user?.id,
        ...(notes && { notes: `${notes}\n${new Date().toISOString()}: ${notes}`.trim() })
      },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
        ]
      })
      .populate('dgEnquiry', 'enquiryNo enquiryDate customerName phoneNumber email kva phase enquiryStatus')
;

    if (!dgPoFromCustomer) {
      next(new AppError('DG PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      data: dgPoFromCustomer,
      message: 'DG PO from customer status updated successfully'
    });
  } catch (error) {
    console.error('Error updating DG PO from customer status:', error);
    next(new AppError('Failed to update DG PO from customer status', 500));
  }
};

// @desc    Export DG PO from customers to Excel
// @route   GET /api/v1/dg-po-from-customers/export
// @access  Private
export const exportDGPoFromCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const customer = req.query.customer as string;
    const department = req.query.department as string;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.orderDate = filter.orderDate || {};
      filter.orderDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.orderDate = filter.orderDate || {};
      filter.orderDate.$lte = new Date(endDate);
    }

    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    if (department) filter.department = department;

    // Get all DG PO from customers matching the filter
    const dgPoFromCustomers = await DGPoFromCustomer.find(filter)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
        ]
      })
      .populate('dgEnquiry', 'enquiryNo enquiryDate customerName phoneNumber email kva phase enquiryStatus')
      .sort({ orderDate: -1 });

    // Prepare data for Excel export with separate rows for each item
    const exportData: any[] = [];
    let globalIndex = 1;

    dgPoFromCustomers.forEach((po: any, poIndex: number) => {
      // If PO has items, create a row for each item
      if (po.items && po.items.length > 0) {
        po.items.forEach((item: any, itemIndex: number) => {
          exportData.push({
            'S.No': globalIndex++,
            'PO Number': po.poNumber || '',
            'Customer Name': po.customer?.name || '',
            'Customer Email': po.customer?.email || '',
            'Customer Phone': po.customer?.phone || '',
            'Bill To Address ID': po.billToAddress?.id || '',
            'Ship To Address ID': po.shipToAddress?.id || '',
            'Order Date': po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-GB') : '',
            'Expected Delivery': po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB') : '',
            'Status': po.status || 'Draft',
            'Department': po.department || 'Retail',
            'Priority': po.priority || 'Medium',
            'Quotation Number': po.dgQuotationNumber?.quotationNumber || '',
            'Quotation Date': po.dgQuotationNumber?.issueDate ? new Date(po.dgQuotationNumber.issueDate).toLocaleDateString('en-GB') : '',
            'Item Number': itemIndex + 1,
            'Total Items': po.items.length,
            'Product Name': item.product || '',
            'Description': item.description || '',
            'Quantity': item.quantity || 0,
            'Unit Price': `₹${(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Total Price': `₹${(item.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'UOM': item.uom || '',
            'Discount (%)': item.discount || 0,
            'Discounted Amount': `₹${(item.discountedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'KVA': item.kva || '',
            'Phase': item.phase || '',
            'Annexure Rating': item.annexureRating || '',
            'DG Model': item.dgModel || '',
            'Number of Cylinders': item.numberOfCylinders || 0,
            'Subject': item.subject || '',
            'HSN Number': item.hsnNumber || '',
            'Is Active': item.isActive ? 'Yes' : 'No',
            'Sub Total': `₹${(po.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Total Discount': `₹${(po.totalDiscount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Tax Rate (%)': `${po.taxRate || 0}%`,
            'Tax Amount': `₹${(po.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Total Amount': `₹${(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Paid Amount': `₹${(po.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Remaining Amount': `₹${(po.remainingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'Payment Status': po.paymentStatus || 'Pending',
            'Payment Method': po.paymentMethod || '',
            'Payment Date': po.paymentDate ? new Date(po.paymentDate).toLocaleDateString('en-GB') : '',
            'Transport': po.transport || '',
            'Unloading': po.unloading || '',
            'Scope of Work': po.scopeOfWork || '',
            'Notes': po.notes || '',
            'DG Enquiry Number': po.dgEnquiry?.enquiryNo || '',
            'DG Enquiry Date': po.dgEnquiry?.enquiryDate ? new Date(po.dgEnquiry.enquiryDate).toLocaleDateString('en-GB') : '',
            'Created By': po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : '',
            'Created At': po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB') : '',
            'Updated At': po.updatedAt ? new Date(po.updatedAt).toLocaleDateString('en-GB') : '',
          });
        });
      } else {
        // If PO has no items, create a single row with empty item fields
        exportData.push({
          'S.No': globalIndex++,
          'PO Number': po.poNumber || '',
          'Customer Name': po.customer?.name || '',
          'Customer Email': po.customer?.email || '',
          'Customer Phone': po.customer?.phone || '',
          'Bill To Address ID': po.billToAddress?.id || '',
          'Ship To Address ID': po.shipToAddress?.id || '',
          'Order Date': po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-GB') : '',
          'Expected Delivery': po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB') : '',
          'Status': po.status || 'Draft',
          'Department': po.department || 'Retail',
          'Priority': po.priority || 'Medium',
          'Quotation Number': po.dgQuotationNumber?.quotationNumber || '',
          'Quotation Date': po.dgQuotationNumber?.issueDate ? new Date(po.dgQuotationNumber.issueDate).toLocaleDateString('en-GB') : '',
          'Item Number': 0,
          'Total Items': 0,
          'Product Name': '',
          'Description': '',
          'Quantity': 0,
          'Unit Price': '₹0.00',
          'Total Price': '₹0.00',
          'UOM': '',
          'Discount (%)': 0,
          'Discounted Amount': '₹0.00',
          'KVA': '',
          'Phase': '',
          'Annexure Rating': '',
          'DG Model': '',
          'Number of Cylinders': 0,
          'Subject': '',
          'HSN Number': '',
          'Is Active': 'No',
          'Sub Total': `₹${(po.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Total Discount': `₹${(po.totalDiscount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Tax Rate (%)': `${po.taxRate || 0}%`,
          'Tax Amount': `₹${(po.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Total Amount': `₹${(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Paid Amount': `₹${(po.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Remaining Amount': `₹${(po.remainingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Payment Status': po.paymentStatus || 'Pending',
          'Payment Method': po.paymentMethod || '',
          'Payment Date': po.paymentDate ? new Date(po.paymentDate).toLocaleDateString('en-GB') : '',
          'Transport': po.transport || '',
          'Unloading': po.unloading || '',
          'Scope of Work': po.scopeOfWork || '',
          'Notes': po.notes || '',
          'DG Enquiry Number': po.dgEnquiry?.enquiryNo || '',
          'DG Enquiry Date': po.dgEnquiry?.enquiryDate ? new Date(po.dgEnquiry.enquiryDate).toLocaleDateString('en-GB') : '',
          'Created By': po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : '',
          'Created At': po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB') : '',
          'Updated At': po.updatedAt ? new Date(po.updatedAt).toLocaleDateString('en-GB') : '',
        });
      }
    });

    res.json({ success: true, data: exportData, message: 'DG PO from customers data prepared for export' });
  } catch (error) {
    console.error('Error exporting DG PO from customers:', error);
    next(new AppError('Failed to export DG PO from customers', 500));
  }
};
