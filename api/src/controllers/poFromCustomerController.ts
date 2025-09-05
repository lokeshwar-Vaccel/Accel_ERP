import { Request, Response, NextFunction } from 'express';
import POFromCustomer, { IPOFromCustomerSchema } from '../models/POFromCustomer';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';

// @desc    Get all PO from customers with pagination and filtering
// @route   GET /api/v1/po-from-customers
// @access  Private
export const getPOFromCustomers = async (
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
    const poFromCustomers = await POFromCustomer.find(query)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate({
        path: 'quotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
          {
            path: 'items.product',
            select: 'name partNo hsnNumber brand category gndp'
          }
        ]
      })
      .populate('items.product', 'name partNo hsnNumber brand category gndp')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await POFromCustomer.countDocuments(query);

    res.json({
      success: true,
      data: poFromCustomers,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching PO from customers:', error);
    next(new AppError('Failed to fetch PO from customers', 500));
  }
};

// @desc    Get single PO from customer by ID
// @route   GET /api/v1/po-from-customers/:id
// @access  Private
export const getPOFromCustomerById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const poFromCustomer = await POFromCustomer.findById(id)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate({
        path: 'quotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
          {
            path: 'items.product',
            select: 'name partNo hsnNumber brand category gndp'
          }
        ]
      })
      .populate('items.product', 'name partNo hsnNumber brand category gndp');

    if (!poFromCustomer) {
      next(new AppError('PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      data: poFromCustomer
    });
  } catch (error) {
    console.error('Error fetching PO from customer:', error);
    next(new AppError('Failed to fetch PO from customer', 500));
  }
};

// @desc    Create new PO from customer
// @route   POST /api/v1/po-from-customers
// @access  Private
export const createPOFromCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('=== CREATE PO FROM CUSTOMER DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    console.log('=====================================');

    const {
      poNumber,
      customer,
      customerEmail,
      customerAddress,
      quotationNumber,
      items,
      expectedDeliveryDate,
      department,
      notes,
      priority,
      sourceType,
      sourceId,
      poDate,
      status,
      poPdf
    } = req.body;

    // Handle PDF file path (file will be uploaded separately)
    const pdfPath = req.file?.path ?? "";
    console.log('Create PO - File path from body:', pdfPath);

    // Validate required fields
    if (!customer || !customerAddress || !items || !Array.isArray(items) || items.length === 0) {
      next(new AppError('Customer, address, and items are required', 400));
      return;
    }

    // Validate manual PO number if provided
    if (poNumber) {
      // Check if PO number already exists
      const existingPO = await POFromCustomer.findOne({ poNumber });
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

    // Validate products exist
    const productIds = items.map((item: any) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      next(new AppError('One or more products not found', 404));
      return;
    }

    // Calculate total amount
    let totalAmount = 0;
    const processedItems = items.map((item: any) => {
      const subtotal = item.quantity * item.unitPrice;
      const totalPrice = subtotal * (1 + (item.taxRate || 0) / 100);
      totalAmount += totalPrice;

      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        taxRate: item.taxRate || 0,
        description: item.description,
        uom: item.uom || 'nos',
        hsnNumber: item.hsnNumber
      };
    });

    // Create PO from customer
    const poFromCustomerData = {
      ...(poNumber && { poNumber }), // Include manual PO number if provided
      customer,
      customerEmail,
      customerAddress,
      ...(quotationNumber && { quotationNumber }), // Include quotation number if provided
      items: processedItems,
      totalAmount,
      remainingAmount: totalAmount,
      orderDate: poDate ? new Date(poDate) : new Date(), // Use provided PO date or current date
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      department: department || 'retail',
      notes,
      priority: priority || 'medium',
      sourceType: sourceType || 'manual',
      sourceId,
      status: status || 'draft',
      poPdf: poPdf || undefined,
      createdBy: req.user?.id
    };

    const poFromCustomer = new POFromCustomer(poFromCustomerData);
    await poFromCustomer.save();

    // Populate the created PO from customer
    await poFromCustomer.populate([
      { path: 'customer', select: 'name email phone addresses' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { 
        path: 'quotationNumber', 
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
          {
            path: 'items.product',
            select: 'name partNo hsnNumber brand category gndp'
          }
        ]
      },
      { path: 'items.product', select: 'name partNo hsnNumber brand category gndp' }
    ]);

    res.status(201).json({
      success: true,
      data: poFromCustomer,
      message: 'PO from customer created successfully'
    });
  } catch (error) {
    console.error('Error creating PO from customer:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    next(new AppError(`Failed to create PO from customer: ${error instanceof Error ? error.message : 'Unknown error'}`, 500));
  }
};

// @desc    Update PO from customer
// @route   PUT /api/v1/po-from-customers/:id
// @access  Private
export const updatePOFromCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find and update PO from customer
    const poFromCustomer = await POFromCustomer.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate({
        path: 'quotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
          {
            path: 'items.product',
            select: 'name partNo hsnNumber brand category gndp'
          }
        ]
      })
      .populate('items.product', 'name partNo hsnNumber brand category gndp');

    if (!poFromCustomer) {
      next(new AppError('PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      data: poFromCustomer,
      message: 'PO from customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating PO from customer:', error);
    next(new AppError('Failed to update PO from customer', 500));
  }
};

// @desc    Delete PO from customer
// @route   DELETE /api/v1/po-from-customers/:id
// @access  Private
export const deletePOFromCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const poFromCustomer = await POFromCustomer.findByIdAndDelete(id);

    if (!poFromCustomer) {
      next(new AppError('PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      message: 'PO from customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting PO from customer:', error);
    next(new AppError('Failed to delete PO from customer', 500));
  }
};

// @desc    Update PO from customer status
// @route   PATCH /api/v1/po-from-customers/:id/status
// @access  Private
export const updatePOFromCustomerStatus = async (
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

    const poFromCustomer = await POFromCustomer.findByIdAndUpdate(
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
      .populate('approvedBy', 'firstName lastName email')
      .populate({
        path: 'quotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
          {
            path: 'items.product',
            select: 'name partNo hsnNumber brand category gndp'
          }
        ]
      })
      .populate('items.product', 'name partNo hsnNumber brand category gndp');

    if (!poFromCustomer) {
      next(new AppError('PO from customer not found', 404));
      return;
    }

    res.json({
      success: true,
      data: poFromCustomer,
      message: 'PO from customer status updated successfully'
    });
  } catch (error) {
    console.error('Error updating PO from customer status:', error);
    next(new AppError('Failed to update PO from customer status', 500));
  }
};

// @desc    Export PO from customers to Excel
// @route   GET /api/v1/po-from-customers/export
// @access  Private
export const exportPOFromCustomers = async (
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

    // Get all PO from customers matching the filter
    const poFromCustomers = await POFromCustomer.find(filter)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'quotationNumber',
        select: 'quotationNumber issueDate validUntil grandTotal status paymentStatus paidAmount remainingAmount items serviceCharges batteryBuyBack subject engineSerialNumber kva hourMeterReading serviceRequestDate qrCodeImage',
        populate: [
          {
            path: 'customer',
            select: 'name email phone addresses pan'
          },
          {
            path: 'items.product',
            select: 'name partNo hsnNumber brand category gndp'
          }
        ]
      })
      .populate('items.product', 'name partNo hsnNumber brand category gndp')
      .sort({ orderDate: -1 });

    // Prepare data for Excel export with proper formatting
    const exportData = poFromCustomers.map((po: any, index: number) => ({
      'S.No': index + 1,
      'PO Number': po.poNumber || '',
      'Customer Name': po.customer?.name || '',
      'Customer Email': po.customer?.email || '',
      'Customer Phone': po.customer?.phone || '',
      'Order Date': po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-GB') : '',
      'Expected Delivery': po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB') : '',
      'Status': po.status || 'Draft',
      'Department': po.department || 'Retail',
      'Priority': po.priority || 'Medium',
      'Total Amount': `₹${(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Paid Amount': `₹${(po.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Remaining Amount': `₹${(po.remainingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Payment Status': po.paymentStatus || 'Pending',
      'Created By': po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : '',
      'Created At': po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB') : '',
    }));

    res.json({ success: true, data: exportData, message: 'PO from customers data prepared for export' });
  } catch (error) {
    console.error('Error exporting PO from customers:', error);
    next(new AppError('Failed to export PO from customers', 500));
  }
};

// Upload PDF for PO from customer
// export const uploadPOPdf = async (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;

//     console.log('Upload request received:', {
//       id,
//       hasFile: !!req.file,
//       fileInfo: req.file ? {
//         originalname: req.file.originalname,
//         filename: req.file.filename,
//         mimetype: req.file.mimetype,
//         size: req.file.size
//       } : null
//     });

//     if (!req.file) {
//       next(new AppError('No file uploaded. Please select a PDF or image file.', 400));
//       return;
//     }

//     // Check if PO exists
//     const poFromCustomer = await POFromCustomer.findById(id);
//     if (!poFromCustomer) {
//       next(new AppError('PO from customer not found', 404));
//       return;
//     }

//     // Update PO with file path
//     poFromCustomer.poPdf = req.file.path;
//     await poFromCustomer.save();

//     const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'PDF';
    
//     res.status(200).json({
//       success: true,
//       message: `${fileType} uploaded successfully`,
//       data: {
//         poPdf: poFromCustomer.poPdf,
//         fileType: req.file.mimetype,
//         originalName: req.file.originalname
//       }
//     });
//   } catch (error) {
//     next(new AppError(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500));
//   }
// };
