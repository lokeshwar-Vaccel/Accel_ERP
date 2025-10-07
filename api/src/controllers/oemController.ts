import { Response, NextFunction } from 'express';
import OEM from '../models/OEM';
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
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const validationErrors: any = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        error: 'ValidationError'
      });
      return;
    }
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
        { alias: { $regex: search, $options: 'i' } },
        { contactPersonName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNo: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;

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
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const validationErrors: any = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        error: 'ValidationError'
      });
      return;
    }
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

// @desc    Add address to OEM
// @route   POST /api/v1/oems/:id/addresses
// @access  Private
export const addOEMAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    oem.addresses.push(req.body);
    await oem.save();

    res.json({
      success: true,
      message: 'Address added to OEM successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM address
// @route   PUT /api/v1/oems/:id/addresses/:addressId
// @access  Private
export const updateOEMAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    const addressIndex = oem.addresses.findIndex(
      (address: any) => address._id?.toString() === req.params.addressId
    );

    if (addressIndex === -1) {
      return next(new AppError('Address not found', 404));
    }

    oem.addresses[addressIndex] = { ...oem.addresses[addressIndex], ...req.body };
    await oem.save();

    res.json({
      success: true,
      message: 'OEM address updated successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove address from OEM
// @route   DELETE /api/v1/oems/:id/addresses/:addressId
// @access  Private
export const removeOEMAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    if (oem.addresses.length <= 1) {
      return next(new AppError('Cannot remove the last address', 400));
    }

    oem.addresses = oem.addresses.filter(
      (address: any) => address._id?.toString() !== req.params.addressId
    );
    await oem.save();

    res.json({
      success: true,
      message: 'Address removed from OEM successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add bank detail to OEM
// @route   POST /api/v1/oems/:id/bank-details
// @access  Private
export const addOEMBankDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    // If this is the first bank detail, set it as default
    if (oem.bankDetails.length === 0) {
      req.body.isDefault = true;
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      oem.bankDetails.forEach((bank: any) => {
        bank.isDefault = false;
      });
    }

    oem.bankDetails.push(req.body);
    await oem.save();

    res.json({
      success: true,
      message: 'Bank detail added to OEM successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM bank detail
// @route   PUT /api/v1/oems/:id/bank-details/:bankDetailId
// @access  Private
export const updateOEMBankDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    const bankDetailIndex = oem.bankDetails.findIndex(
      (bank: any) => bank._id?.toString() === req.params.bankDetailId
    );

    if (bankDetailIndex === -1) {
      return next(new AppError('Bank detail not found', 404));
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      oem.bankDetails.forEach((bank: any, index: number) => {
        if (index !== bankDetailIndex) {
          bank.isDefault = false;
        }
      });
    }

    oem.bankDetails[bankDetailIndex] = { ...oem.bankDetails[bankDetailIndex], ...req.body };
    await oem.save();

    res.json({
      success: true,
      message: 'OEM bank detail updated successfully',
      data: oem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove bank detail from OEM
// @route   DELETE /api/v1/oems/:id/bank-details/:bankDetailId
// @access  Private
export const removeOEMBankDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oem = await OEM.findById(req.params.id);
    
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    const bankDetailIndex = oem.bankDetails.findIndex(
      (bank: any) => bank._id?.toString() === req.params.bankDetailId
    );

    if (bankDetailIndex === -1) {
      return next(new AppError('Bank detail not found', 404));
    }

    const bankToRemove = oem.bankDetails[bankDetailIndex];
    
    // If removing the default bank detail, set another one as default
    if (bankToRemove.isDefault && oem.bankDetails.length > 1) {
      const nextBankIndex = bankDetailIndex === 0 ? 1 : 0;
      oem.bankDetails[nextBankIndex].isDefault = true;
    }

    oem.bankDetails = oem.bankDetails.filter(
      (bank: any) => bank._id?.toString() !== req.params.bankDetailId
    );
    await oem.save();

    res.json({
      success: true,
      message: 'Bank detail removed from OEM successfully',
      data: oem
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