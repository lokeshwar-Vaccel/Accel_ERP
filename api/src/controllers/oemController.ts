import { Response, NextFunction } from 'express';
import { OEM } from '../models/OEM';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { TransactionCounter } from '../models/TransactionCounter';

// Generate next OEM code
const generateOEMCode = async () => {
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'oem' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `OEM-${String(counter.sequence).padStart(3, '0')}`;
};

// @desc    Create new OEM
// @route   POST /api/v1/oems
// @access  Private
export const createOEM = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate OEM code if not provided
    if (!req.body.oemCode) {
      req.body.oemCode = await generateOEMCode();
    }

    const oem = await OEM.create({
      ...req.body,
      createdBy: req.user?.id
    });

    await oem.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'OEM created successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all OEMs
// @route   GET /api/v1/oems
// @access  Private
export const getOEMs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, status, rating } = req.query;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { oemCode: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (rating) filter.rating = { $gte: Number(rating) };

    const total = await OEM.countDocuments(filter);
    const oems = await OEM.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: oems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single OEM
// @route   GET /api/v1/oems/:id
// @access  Private
export const getOEM = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    res.json({
      success: true,
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM
// @route   PUT /api/v1/oems/:id
// @access  Private
export const updateOEM = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM updated successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM status
// @route   PATCH /api/v1/oems/:id/status
// @access  Private
export const updateOEMStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    
    const oem = await OEM.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM status updated successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM rating
// @route   PATCH /api/v1/oems/:id/rating
// @access  Private
export const updateOEMRating = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rating } = req.body;
    
    if (rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400));
    }

    const oem = await OEM.findByIdAndUpdate(
      req.params.id,
      { rating },
      { new: true, runValidators: true }
    );

    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM rating updated successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to OEM
// @route   POST /api/v1/oems/:id/products
// @access  Private
export const addOEMProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    oem.products.push(req.body);
    await oem.save();

    res.json({
      success: true,
      message: 'Product added to OEM successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM product
// @route   PUT /api/v1/oems/:id/products/:productId
// @access  Private
export const updateOEMProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    const productIndex = oem.products.findIndex(
      (product: any) => product._id?.toString() === req.params.productId
    );

    if (productIndex === -1) {
      return next(new AppError('Product not found', 404));
    }

    oem.products[productIndex] = { ...oem.products[productIndex], ...req.body };
    await oem.save();

    res.json({
      success: true,
      message: 'OEM product updated successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from OEM
// @route   DELETE /api/v1/oems/:id/products/:productId
// @access  Private
export const removeOEMProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    oem.products = oem.products.filter(
      (product: any) => product._id?.toString() !== req.params.productId
    );
    await oem.save();

    res.json({
      success: true,
      message: 'Product removed from OEM successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get OEM products by KVA
// @route   GET /api/v1/oems/products/search
// @access  Private
export const searchOEMProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { kva, phase, fuelType, availability } = req.query;
    
    const matchConditions: any = { status: 'active' };
    const productMatch: any = {};
    
    if (kva) productMatch['products.kva'] = kva;
    if (phase) productMatch['products.phase'] = phase;
    if (fuelType) productMatch['products.fuelType'] = fuelType;
    if (availability) productMatch['products.availability'] = availability;

    const oems = await OEM.find(matchConditions);
    
    const results = oems.map(oem => ({
      oem: {
        _id: oem._id,
        oemCode: oem.oemCode,
        companyName: oem.companyName,
        contactPerson: oem.contactPerson,
        phone: oem.phone,
        email: oem.email,
        rating: oem.rating,
        paymentTerms: oem.paymentTerms,
        deliveryTerms: oem.deliveryTerms
      },
      products: oem.products.filter(product => {
        let matches = true;
        if (kva && product.kva !== kva) matches = false;
        if (phase && product.phase !== phase) matches = false;
        if (fuelType && product.fuelType !== fuelType) matches = false;
        if (availability && product.availability !== availability) matches = false;
        return matches;
      })
    })).filter(result => result.products.length > 0);

    res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete OEM
// @route   DELETE /api/v1/oems/:id
// @access  Private
export const deleteOEM = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findByIdAndDelete(req.params.id);

    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}; 